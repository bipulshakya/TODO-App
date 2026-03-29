# Deployment Guide

This project is split into:

- Frontend: `todo-list/` (React)
- Backend: `backend/` (Node + Express)
- Database: MySQL (recommended: Aiven)

## 1) Deploy Frontend to Vercel

1. Import this GitHub repo in Vercel.
2. Set **Root Directory** to `todo-list`.
3. Vercel should detect `vercel.json` in `todo-list/`.
4. Add environment variable in Vercel:
   - `REACT_APP_API_URL=https://<your-backend-domain>`
5. Deploy.

Notes:

- Your frontend calls `REACT_APP_API_URL` from `todo-list/src/config.js`.
- Use your Render or Railway backend URL.

## 2) Deploy Backend to Render

This repo includes `render.yaml`.

Option A: Blueprint deploy (recommended)

1. In Render, create from Blueprint and select this repo.
2. Confirm service `todo-backend`.
3. Set required env vars:
   - `JWT_SECRET`
   - Database vars: either `DATABASE_URL` (or `MYSQL_URL` / `MYSQL_PRIVATE_URL`) or `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
   - (Optional) Google Calendar vars:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI=https://<your-backend-domain>/calendar/oauth2callback`
4. Deploy.

Option B: Manual Web Service

- Build command: `npm install`
- Start command: `node backend/server.js`

## 3) Deploy Backend to Railway

This repo includes `railway.json`.

1. Create a new Railway project from this GitHub repo.
2. Railway will use start command `node backend/server.js`.
3. Add env vars:
   - `JWT_SECRET`
   - Database vars: either `DATABASE_URL` (or `MYSQL_URL` / `MYSQL_PRIVATE_URL`) or `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
   - (Optional) Google Calendar vars as above
4. Deploy.

## 4) Use Aiven MySQL (Database)

1. Create a MySQL service in Aiven.
2. Get connection values from Aiven dashboard:
   - host, port, database, username, password
3. Set these in Render/Railway env vars:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - or use one `DATABASE_URL` / `MYSQL_URL` / `MYSQL_PRIVATE_URL`

The backend already uses SSL mode in `backend/db.js`, which works for managed MySQL providers like Aiven.

## 5) Connect Frontend to Backend

After backend is live, update Vercel env var:

- `REACT_APP_API_URL=https://<render-or-railway-backend-domain>`

Redeploy Vercel frontend after changing env vars.

## 6) Quick Post-Deploy Checks

1. Open frontend URL.
2. Register/login works.
3. Task CRUD works.
4. Admin account can access Admin Panel.
5. If using Google Calendar, OAuth callback URL matches deployed backend domain.

## 7) Troubleshooting: Aiven "Access denied"

If backend logs show:

- `Access denied for user 'avnadmin'@'...' (using password: YES)`

Check these items:

1. Verify credentials in Aiven are correct (username/password/database/host/port).
2. If you use a URL variable (`DATABASE_URL`, `MYSQL_URL`, `MYSQL_PRIVATE_URL`):
   - Ensure password special characters are URL-encoded.
   - Or set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` explicitly.
3. Confirm the database name exists in Aiven (often `defaultdb`).
4. Ensure your service can access Aiven network endpoint (public endpoint or allowed network setup).
