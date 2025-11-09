# 🚀 Deployment Guide

## Environment Variables Configuration

Tất cả các URLs và ports được quản lý qua file `.env` để dễ dàng deploy.

### 📝 Development (.env)

```env
GEMINI_API_KEY=your_key_here
VITE_SHEET_APPEND_URL=https://script.google.com/macros/s/YOUR_ID/exec
PORT=3002
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3002
```

### 🌐 Production (.env)

**⚠️ QUAN TRỌNG**: Frontend và Backend deploy trên **CÙNG 1 DOMAIN**

```env
GEMINI_API_KEY=your_production_key
VITE_SHEET_APPEND_URL=https://script.google.com/macros/s/YOUR_ID/exec
PORT=3002

# Nếu deploy lên Vercel/Netlify - dùng relative URLs
VITE_API_URL=/api
VITE_SOCKET_URL=wss://your-app.vercel.app

# Hoặc nếu frontend và backend cùng domain
VITE_API_URL=https://your-app.vercel.app/api
VITE_SOCKET_URL=https://your-app.vercel.app
```

## 🔧 Kiến Trúc Project

```
your-app.vercel.app/
├── /                    → Frontend (React)
├── /api/genai          → Backend API (Express)
└── Socket.IO Server    → WebSocket (port 3002 hoặc same domain)
```

**Backend của bạn ĐÃ CÓ SẴN** trong `server/index.js`! Không cần deploy riêng.

## 📦 Deploy Steps

### Option 1: Vercel (Recommended - All-in-One)

Vercel có thể host cả Frontend + Backend trong cùng 1 project.

1. **Tạo `vercel.json` để route backend:**
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" },
       { "source": "/socket.io/(.*)", "destination": "/server/index.js" }
     ]
   }
   ```

2. **Push to GitHub và import vào Vercel**

3. **Set Environment Variables trên Vercel Dashboard:**
   ```
   GEMINI_API_KEY=your_key
   VITE_SHEET_APPEND_URL=your_script_url
   PORT=3002
   VITE_SOCKET_URL=https://your-app.vercel.app
   VITE_API_URL=https://your-app.vercel.app/api
   ```

4. **Deploy** - Vercel tự build và host cả FE + BE

### Option 2: Railway (Easiest for Socket.IO)

Railway support WebSocket tốt hơn Vercel.

1. **Connect GitHub repo**
2. **Set Environment Variables:**
   ```
   GEMINI_API_KEY=...
   PORT=3002
   VITE_SOCKET_URL=https://your-app.up.railway.app
   VITE_API_URL=https://your-app.up.railway.app/api
   ```
3. **Deploy** - Railway tự detect Node.js

### Option 3: Render (Free Tier Available)

1. **Create Web Service**
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `node server/index.js`
4. **Environment Variables:**
   ```
   GEMINI_API_KEY=...
   PORT=3002
   VITE_SOCKET_URL=https://your-app.onrender.com
   VITE_API_URL=https://your-app.onrender.com/api
   ```

## 🎯 TL;DR - Quick Answer

**Câu hỏi:** VITE_API_URL và VITE_SOCKET_URL là gì?

**Trả lời:** 
- Deploy lên **Vercel/Railway/Render** → Bạn sẽ được 1 URL duy nhất
- VD: `https://your-app.vercel.app`
- Thì cả 2 biến đều dùng **URL đó**:
  ```env
  VITE_SOCKET_URL=https://your-app.vercel.app
  VITE_API_URL=https://your-app.vercel.app/api
  ```

**Backend không cần deploy riêng** vì đã có sẵn trong project (`server/index.js`)!

## ⚠️ Important Notes

- **NEVER** commit `.env` to git
- Always use `.env.example` as template
- Update URLs before building for production
- Socket.IO needs CORS configuration for different domains

## 🔍 Verify Configuration

Check if env variables are loaded:
```bash
# Development
npm run dev
# Should connect to localhost:3002

# Production
npm run build
# Check console for correct URLs
```

## 🐛 Troubleshooting

**Issue:** Socket connection failed
- ✅ Check `VITE_SOCKET_URL` in `.env`
- ✅ Verify server is running
- ✅ Check CORS settings in `server/index.js`

**Issue:** API calls fail
- ✅ Check `VITE_API_URL` matches backend
- ✅ Verify proxy settings in `vite.config.ts`
