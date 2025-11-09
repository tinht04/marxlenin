<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1gf-jLG_8VQgB8dcVVcrsFUjmt7ttiC_q

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your values:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SHEET_APPEND_URL=your_google_script_url
   PORT=3002
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3002
   ```

3. Run the development servers:
   
   **Terminal 1 - Backend Server:**
   ```bash
   cd server
   node index.js
   ```
   
   **Terminal 2 - Frontend:**
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Deploy to Production

### Quick Deploy to Vercel

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and import your repository

3. Set Environment Variables in Vercel Dashboard:
   ```
   GEMINI_API_KEY=your_production_key
   VITE_SHEET_APPEND_URL=your_google_script_url
   PORT=3002
   ```

4. After deployment, Vercel gives you a URL (e.g., `https://your-app.vercel.app`)

5. Update these two variables with **that same URL**:
   ```
   VITE_SOCKET_URL=https://your-app.vercel.app
   VITE_API_URL=https://your-app.vercel.app/api
   ```

6. Redeploy

**That's it!** Frontend and Backend are deployed together on the same domain.

### Alternative: Railway/Render

Same process - you get ONE URL, use it for both `VITE_SOCKET_URL` and `VITE_API_URL`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guide.

**Important:** Never commit `.env` to git! It's already in `.gitignore`.
