# Minecraft Player Hub

Registration/login, player profiles (IGN, skin, UUID via Mojang), posts, friends, and friend-to-friend chat — one Express app serving both the API and the frontend, so it deploys to Render as a single web service.

## Stack
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- Frontend: static HTML/CSS/vanilla JS, served by the same Express app
- External API: Mojang (IGN → UUID) + Crafatar (skin renders), no key needed

## Project structure
```
server.js            entrypoint
routes/               auth, profile, posts, friends, chat
models/               User, Post, Message (Mongoose schemas)
middleware/auth.js     JWT verification
utils/mojang.js        IGN -> UUID/skin resolver
public/                frontend (index.html, css/, js/)
```

## 1. Run locally

You need a MongoDB connection string — the fastest way is a free MongoDB Atlas cluster (atlas.mongodb.com → free M0 cluster → "Connect your application" → copy the URI).

```bash
npm install
cp .env.example .env
# edit .env: paste your MONGODB_URI, set a random JWT_SECRET
npm start
```

Open http://localhost:3000.

## 2. Deploy to Render

1. Push this folder to a GitHub repo.
2. In Render: **New → Web Service**, connect the repo.
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** Node
4. Add environment variables (Render dashboard → Environment):
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — any long random string
   - Render sets `PORT` itself; the app already reads `process.env.PORT`.
5. In Atlas, under **Network Access**, allow `0.0.0.0/0` (or Render's IPs) so Render can reach the cluster.
6. Deploy. Render will build and start the service; the same URL serves both the API (`/api/...`) and the frontend.

## Notes / next steps
- Auth token is stored in `localStorage` for simplicity — fine for a personal project, but for anything public-facing consider httpOnly cookies instead.
- No image upload yet — skins are pulled live from Crafatar based on the linked IGN.
- No pagination on posts yet (capped at 100 results); worth adding once there's real data volume.
- Chat is friends-only, polls every 3 seconds for new messages (simple and reliable on Render's free tier). Swapping in Socket.IO would make it instant if you want to upgrade later.
- On every registration, the server logs the username, email, and requesting IP address to stdout (`console.log`) — visible in Render's **Logs** tab for the service. Keep in mind this means that data lives in your log history; if you ever make logs accessible to others, treat that as sharing personal data.
