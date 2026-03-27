const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Only initialize Google OAuth if credentials are provided
let oauth2Client = null;
let calendar = null;

try {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const { google } = require('googleapis');
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/calendar/oauth2callback'
    );
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    console.log('✅ Google Calendar OAuth2 client initialized');
  } else {
    console.log('ℹ️  Google Calendar credentials not set — Calendar sync disabled');
  }
} catch (err) {
  console.log('ℹ️  googleapis package not installed — Calendar sync disabled');
}

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// GET /calendar/status — check if google is configured & connected for user
router.get('/status', authMiddleware, async (req, res) => {
  if (!oauth2Client) {
    return res.json({ configured: false, connected: false });
  }
  try {
    const [rows] = await db.query(
      'SELECT refresh_token FROM google_tokens WHERE user_id = ?',
      [req.userId]
    );
    const connected = rows.length > 0 && !!rows[0].refresh_token;
    res.json({ configured: true, connected });
  } catch (err) {
    res.json({ configured: true, connected: false });
  }
});

// GET /calendar/auth — redirect user to Google OAuth consent screen
// Note: This route is a browser redirect, JWT is passed in query param
router.get('/auth', (req, res) => {
  if (!oauth2Client) {
    return res.status(503).json({ error: 'Google Calendar is not configured on this server.' });
  }

  // Decode userId from JWT query param (since this is a browser redirect)
  const token = req.query.token;
  if (!token) return res.status(401).send('Missing auth token.');

  let userId;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch {
    return res.status(401).send('Invalid auth token.');
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
  res.redirect(url);
});

// GET /calendar/oauth2callback — handle OAuth callback from Google
router.get('/oauth2callback', async (req, res) => {
  if (!oauth2Client) {
    return res.status(503).send('Google Calendar is not configured.');
  }
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Missing auth code.');

  try {
    let userId;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId;
    } catch {
      return res.status(400).send('Invalid state parameter.');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    await db.query(
      `INSERT INTO google_tokens (user_id, access_token, refresh_token, expiry_date)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
         expiry_date = VALUES(expiry_date)`,
      [userId, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null]
    );

    // Close popup and notify parent window
    res.send(`
      <html>
        <body>
          <script>
            window.opener && window.opener.postMessage('google-calendar-connected', '*');
            window.close();
          </script>
          <p>✅ Google Calendar connected! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Authentication failed. Please try again.');
  }
});

// POST /calendar/sync — sync tasks with deadlines to Google Calendar
router.post('/sync', authMiddleware, async (req, res) => {
  if (!oauth2Client) {
    return res.status(503).json({ error: 'Google Calendar is not configured on this server.' });
  }

  try {
    const [tokenRows] = await db.query(
      'SELECT access_token, refresh_token, expiry_date FROM google_tokens WHERE user_id = ?',
      [req.userId]
    );

    if (tokenRows.length === 0 || !tokenRows[0].refresh_token) {
      return res.status(401).json({ error: 'Google Calendar not connected. Please authorize first.' });
    }

    const storedTokens = tokenRows[0];
    oauth2Client.setCredentials({
      access_token: storedTokens.access_token,
      refresh_token: storedTokens.refresh_token,
      expiry_date: storedTokens.expiry_date,
    });

    // Auto-refresh token if expired
    oauth2Client.on('tokens', async (newTokens) => {
      if (newTokens.access_token) {
        await db.query(
          `UPDATE google_tokens SET access_token = ?, expiry_date = ? WHERE user_id = ?`,
          [newTokens.access_token, newTokens.expiry_date, req.userId]
        );
      }
    });

    // Get tasks with deadlines that are not yet completed
    const [tasks] = await db.query(
      `SELECT id, text, description, deadline, priority FROM tasks
       WHERE user_id = ? AND deadline IS NOT NULL AND completed = 0`,
      [req.userId]
    );

    if (tasks.length === 0) {
      return res.json({ message: 'No tasks with deadlines to sync.', synced: 0 });
    }

    const { google } = require('googleapis');
    const cal = google.calendar({ version: 'v3', auth: oauth2Client });

    let synced = 0;
    for (const task of tasks) {
      const deadlineDate = new Date(task.deadline);
      const startTime = new Date(deadlineDate.getTime() - 60 * 60 * 1000); // 1 hour before deadline

      const event = {
        summary: `[TODO] ${task.text}`,
        description: task.description
          ? `${task.description}\n\nPriority: ${task.priority}`
          : `Priority: ${task.priority}`,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: deadlineDate.toISOString() },
        colorId: task.priority === 'High' ? '11' : task.priority === 'Low' ? '9' : '5',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      await cal.events.insert({ calendarId: 'primary', resource: event });
      synced++;
    }

    res.json({ message: `Successfully synced ${synced} task(s) to Google Calendar.`, synced });
  } catch (err) {
    console.error('Calendar sync error:', err);
    res.status(500).json({ error: 'Failed to sync with Google Calendar.' });
  }
});

module.exports = router;
