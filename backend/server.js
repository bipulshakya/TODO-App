const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { authMiddleware, adminAuthMiddleware } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Public auth routes
app.use('/auth', authRoutes);

// Protected task routes (require JWT)
app.use('/tasks', authMiddleware, taskRoutes);

// Protected admin routes (require Admin JWT)
app.use('/admin', authMiddleware, adminAuthMiddleware, adminRoutes);

require('dotenv').config();
const PORT = process.env.PORT || 5001;

// Auto-create tables if they don't exist
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add user_id column to tasks if it doesn't already exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'user_id'
    `);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE tasks ADD COLUMN user_id INT, ADD FOREIGN KEY (user_id) REFERENCES users(id)`);
      console.log('✅ Added user_id column to tasks table');
    }

    // Add priority column to tasks if it doesn't already exist
    const [priorityColumns] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'priority'
    `);
    if (priorityColumns.length === 0) {
      await db.query(`ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'Medium'`);
      console.log('✅ Added priority column to tasks table');
    }

    // Ensure users table actually has is_admin if it was created before this update
    const [userColumns] = await db.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_admin'
    `);
    if (userColumns.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE`);
      console.log('✅ Added is_admin column to users table');
    }

    console.log('✅ Database tables ready');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
