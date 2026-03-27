# TODO App

A full-stack task management application with JWT authentication, drag-and-drop Kanban board, deadline tracking, Google Calendar sync, task history, and dark/light mode.

## 🌐 Live Demo

- **Frontend:** https://bipulshakya.github.io/TODO-App/

---

## ✨ Features

### Core
- 🔐 **User Authentication** — Register/login with JWT (7-day token), bcrypt password hashing
- 📋 **Kanban Board** — Drag-and-drop tasks across TODO / IN PROGRESS / COMPLETED columns
- 📝 **List View** — Filterable list with All / Active / Completed filters
- ⚡ **Priority Tags** — High 🔴 / Medium 🟡 / Low 🟢 on every task
- 👑 **Admin Panel** — Admin user can manage all users; bootstrapped via `admin` username

### New Features
- 📅 **Deadline Input** — Set a date/time deadline when creating or editing any task
- 🔴 **Deadline Highlighting** — Tasks are visually flagged:
  - 🔴 **Overdue** — pulsing red badge + red left border
  - 🟠 **Due Soon** — amber badge (within 24 hours)
  - 📅 **Due** — indigo badge (future deadline)
- 📊 **Sort by Deadline** — One-click toggle to reorder tasks closest-deadline-first
- 📋 **Task History** — Full log of all completed ✅ and deleted 🗑 tasks with timestamps, priority, and deadline info. Searchable and filterable.
- ☁️ **Google Calendar Sync** — OAuth2 integration to push tasks with deadlines directly to Google Calendar as events with reminders
- 🌙 **Dark / Light Mode** — Toggle between dark (default) and light themes via ☀️/🌙 button in the navbar; preference saved in localStorage

### Dashboard & Calendar
- 📊 **Dashboard** — Stats cards showing total / in-progress / completed task counts
- 🗓 **Calendar View** — Visual calendar to see task deadlines across the month

---

## 🗂 Project Structure

```
todo/
├── backend/                  # Node.js + Express API
│   ├── routes/
│   │   ├── auth.js           # Register / Login
│   │   ├── tasks.js          # CRUD + history logging
│   │   ├── admin.js          # Admin user management
│   │   └── googleCalendar.js # OAuth2 + Calendar sync
│   ├── middleware/auth.js    # JWT auth middleware
│   ├── db.js                 # MySQL2 connection pool
│   └── server.js             # App entry + DB migrations
├── todo-list/                # React 19 frontend
│   └── src/
│       ├── components/
│       │   ├── TodoBoard.jsx  # Main task board
│       │   ├── TaskHistory.jsx# History timeline
│       │   ├── Dashboard.jsx  # Stats view
│       │   ├── CalendarView.jsx
│       │   ├── AdminPanel.jsx
│       │   └── AuthForm.jsx
│       ├── App.jsx            # Root + theme toggle
│       └── config.js          # API URL config
└── .github/workflows/         # GitHub Pages auto-deploy
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, CSS custom properties, Bootstrap 5 |
| Backend | Node.js, Express.js |
| Auth | JWT, bcrypt |
| Database | MySQL (`mysql2`) |
| Calendar | Google Calendar API v3 (OAuth2) |
| Deployment | GitHub Actions + GitHub Pages (frontend) |

---

## 🚀 Local Setup

### 1. Install dependencies

```bash
# Root (backend)
npm install

# Frontend
cd todo-list && npm install
```

### 2. Configure backend environment

Create `backend/.env` (or copy from `backend/.env.example`):

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=todo_app

# Optional: full connection string (overrides above)
# DATABASE_URL=mysql://user:pass@host:3306/todo_app

# Optional: Google Calendar integration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/calendar/oauth2callback
```

### 3. Configure frontend API URL (optional)

Create `todo-list/.env`:

```env
REACT_APP_API_URL=http://localhost:5001
```

### 4. Run the app

```bash
# Terminal 1 — backend
node backend/server.js

# Terminal 2 — frontend
cd todo-list && npm start
```

- Backend: http://localhost:5001
- Frontend: http://localhost:3000

> **Note:** The database tables (including `deadline`, `task_history`, and `google_tokens`) are auto-created/migrated on first server start.

---

## ☁️ Google Calendar Setup (Optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Create project → Enable **Google Calendar API**
2. Create OAuth 2.0 credentials → Web Application
3. Add authorized redirect URI: `http://localhost:5001/calendar/oauth2callback`
4. Copy **Client ID** and **Client Secret** to `backend/.env`
5. Restart the backend — a **"Connect Google Calendar"** bar appears in the Tasks view
6. Click **"🔗 Connect"** → authorize → then **"☁️ Sync Tasks"** to push deadlines to your calendar

---

## 📦 Build & Deploy

```bash
# Build frontend
cd todo-list && npm run build
```

Frontend deployment is automated from `main` via GitHub Actions → GitHub Pages.

---

## 🔑 Notes

- First user to register with username `admin` is automatically granted admin privileges.
- API base URL is configured in `todo-list/src/config.js`.
- Theme preference (dark/light) is saved in `localStorage` per browser.
