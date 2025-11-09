# Deploying the Socket.IO server to Railway

This project contains both a frontend (Vite + React) and a stateful Socket.IO backend at `api/server/index.js`.

Vercel is a great host for the frontend and serverless functions (`api/*.js`), but it does not run long‑lived Node processes suitable for Socket.IO. Use Railway (or Render/Fly/Render) to host the Socket.IO server.

## Quick steps (Railway)

1. Sign up / sign in to Railway: https://railway.app
2. Create a new project → Deploy from GitHub and connect your repository `tinht04/marxlenin`.
3. Railway will detect a Node.js app. Configure the project:
   - Build command: `npm install` (Railway will install deps). The `start` script will run the frontend build as part of start.
   - Start command: `npm run start` (this will run `npm run build` then `node api/server/index.js` by default)

4. Set Environment Variables in Railway Project Settings (ENV):

```
GEMINI_API_KEY=your_gemini_api_key_here
# PORT is optional; Railway provides one. If you set it, use 3002 or leave blank.
PORT=3002
```

5. Deploy. Railway will provide a domain like `https://your-app.up.railway.app`.

If you deploy the entire repo (frontend + backend) to Railway, the `start` script will build the frontend into `dist` and the Express server in `api/server/index.js` will serve the static files and also expose the Socket.IO endpoints. This allows the whole app to run as one Railway service.

6. If you previously used Vercel, you can ignore Vercel settings. For a full Railway deploy (frontend + backend together) use these envs **on Railway** or locally in `.env`:

```
# When FE+BE are on the same Railway service (recommended):
VITE_API_URL=/api
VITE_SOCKET_URL=/           # relative means same origin (client will use window.location.origin)

# Or, if you host Socket.IO on a separate Railway service, point to that domain:
# VITE_SOCKET_URL=https://your-socket-service.up.railway.app

GEMINI_API_KEY=your_gemini_key_here
```

7. Ensure CORS on the server allows your frontend origin (or use `origin: '*'` for testing). The server at `api/server/index.js` currently sets `origin: '*'` which works for tests but consider tightening it for production.

8. Test: open your Vercel frontend and try Create/Join. You should see socket connections logged in your Railway server logs.

## Notes and hardening

- Use `wss://` in code or `https://` domain; the socket client will upgrade to WebSocket automatically.
- If you plan to scale to multiple instances, add a Redis adapter for Socket.IO so rooms and events are shared across instances.
- Railway assigns a dynamic port via `PORT` env var. `api/server/index.js` already reads `process.env.PORT || 3002`.

## Troubleshooting

- If client cannot connect, check browser console for connect_error and server logs on Railway.
- If the initial polling response contains HTML/index.html, that means requests are routed to the frontend rather than to the socket server — ensure the Railway service is running the Node server and that `VITE_SOCKET_URL` points to the Railway domain.

## Alternative hosts
- Render (Web Service)
- Fly.io
- DigitalOcean App Platform
- VPS (EC2/Droplets) with process manager (pm2/systemd)

If you want, I can also add a small health-check endpoint or adjust CORS and add a Redis adapter example — tell me which you'd like next.
