# TODO App

Full-stack TODO application with authentication, admin access, dashboard/calendar views, and a responsive frontend.

## Live Frontend

- https://bipulshakya.github.io/TODO-App/

## Project Structure

- `todo-list/` - React frontend (Create React App)
- `backend/` - Node.js + Express API
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## Features

- User registration and login with JWT
- Personal task board with priorities
- Dashboard and calendar views
- Admin panel (admin bootstrap user)
- Responsive authentication UI

## Tech Stack

- Frontend: React 19, Bootstrap 5, CSS
- Backend: Node.js, Express, JWT, bcrypt
- Database: MySQL (`mysql2`)
- Deployment: GitHub Actions + GitHub Pages (frontend)

## Local Setup

### 1. Install dependencies

Install backend and frontend dependencies:

```bash
npm install
cd todo-list
npm install
```

### 2. Configure environment

Create a `.env` file in the project root (or set system env vars):

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=todo_app
# Optional: alternative connection string
# DATABASE_URL=mysql://user:pass@host:3306/todo_app
```

For frontend API URL (optional), create `todo-list/.env`:

```env
REACT_APP_API_URL=http://localhost:5001
```

### 3. Run backend

From the repository root:

```bash
node backend/server.js
```

Backend runs at `http://localhost:5001`.

### 4. Run frontend

In a new terminal:

```bash
cd todo-list
npm start
```

Frontend runs at `http://localhost:3000`.

## Build Frontend

```bash
cd todo-list
npm run build
```

## Deployment (GitHub Pages)

Frontend deployment is automated from `main` using GitHub Actions.

1. Push to `main`
2. GitHub runs `.github/workflows/deploy-pages.yml`
3. Site updates at:
   - https://bipulshakya.github.io/TODO-App/

## Notes

- API default URL is set in `todo-list/src/config.js`.
- During first registration, username `admin` is automatically granted admin access.
