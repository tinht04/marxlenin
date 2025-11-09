# 🎯 Hướng Dẫn Deploy Cho Người Mới

## ❓ Câu Hỏi Thường Gặp

### "VITE_API_URL và VITE_SOCKET_URL là gì? Tôi lấy đâu ra?"

**Trả lời ngắn gọn:**
- Khi bạn deploy lên Vercel/Railway/Render → Bạn được 1 URL duy nhất
- VD: `https://marxlenin.vercel.app`
- Thì **CẢ HAI** biến đều dùng URL đó:
  ```env
  VITE_SOCKET_URL=https://marxlenin.vercel.app
  VITE_API_URL=https://marxlenin.vercel.app/api
  ```

### "Backend của tôi ở đâu? Phải deploy riêng không?"

**KHÔNG!** Backend đã có sẵn trong project:
- `server/index.js` - Express + Socket.IO server
- `api/genai.js` - API endpoint cho Gemini

Cả Frontend và Backend deploy **CÙNG MỘT LẦN** lên cùng domain!

---

## 📱 Deploy Lên Vercel (Recommended)

### Bước 1: Chuẩn Bị

1. Push code lên GitHub
2. Có tài khoản Vercel (đăng ký bằng GitHub)

### Bước 2: Import Project

1. Vào https://vercel.com/new
2. Chọn repository `marxlenin`
3. Click **Import**

### Bước 3: Cấu Hình Environment Variables

Trong màn hình deployment, click **Environment Variables** và thêm:

```
GEMINI_API_KEY = AIzaSyBU_0cZG-Vi1AMpCcPmwRCCMb3De2_wpQw
VITE_SHEET_APPEND_URL = https://script.google.com/macros/s/YOUR_ID/exec
PORT = 3002
```

**LƯU Ý:** Chưa cần set `VITE_SOCKET_URL` và `VITE_API_URL` vì chưa biết URL!

### Bước 4: Deploy Lần 1

1. Click **Deploy**
2. Đợi build xong (2-3 phút)
3. Vercel sẽ cho bạn 1 URL, ví dụ: `https://marxlenin.vercel.app`

### Bước 5: Cập Nhật URLs

1. Copy URL bạn vừa nhận (VD: `https://marxlenin.vercel.app`)
2. Vào **Settings** → **Environment Variables**
3. Thêm 2 biến mới:
   ```
   VITE_SOCKET_URL = https://marxlenin.vercel.app
   VITE_API_URL = https://marxlenin.vercel.app/api
   ```

### Bước 6: Redeploy

1. Vào tab **Deployments**
2. Click menu ⋮ của deployment mới nhất
3. Chọn **Redeploy**

### ✅ Xong!

Giờ app của bạn đã live với đầy đủ:
- Frontend: `https://marxlenin.vercel.app`
- Backend API: `https://marxlenin.vercel.app/api/genai`
- Socket.IO: `wss://marxlenin.vercel.app`

---

## 🚂 Deploy Lên Railway (Alternative)

Railway hỗ trợ WebSocket tốt hơn Vercel.

### Bước 1-2: Giống Vercel

1. Connect GitHub repo tại https://railway.app
2. Thêm env variables (chưa có URLs)

### Bước 3: Deploy và Lấy URL

1. Deploy lần 1
2. Railway cho bạn URL: `https://marxlenin.up.railway.app`

### Bước 4: Update URLs

```
VITE_SOCKET_URL = https://marxlenin.up.railway.app
VITE_API_URL = https://marxlenin.up.railway.app/api
```

### Bước 5: Redeploy

---

## 🐛 Troubleshooting

### Lỗi: "WebSocket connection failed"

**Nguyên nhân:** `VITE_SOCKET_URL` sai hoặc chưa set

**Giải pháp:**
1. Check env variables trên Vercel/Railway
2. Đảm bảo URL là HTTPS (không phải HTTP)
3. Redeploy sau khi sửa

### Lỗi: "API not found"

**Nguyên nhân:** `VITE_API_URL` sai

**Giải pháp:**
1. Phải có `/api` ở cuối: `https://your-app.vercel.app/api`
2. Redeploy

### Backend không chạy

**Nguyên nhân:** Vercel không tìm thấy server

**Giải pháp:**
1. Check file `vercel.json` có cấu hình functions
2. Đảm bảo `server/index.js` tồn tại

---

## 📝 Checklist Deploy

- [ ] Push code to GitHub
- [ ] Import to Vercel/Railway
- [ ] Set env: `GEMINI_API_KEY`, `VITE_SHEET_APPEND_URL`, `PORT`
- [ ] Deploy lần 1
- [ ] Copy URL nhận được
- [ ] Set env: `VITE_SOCKET_URL`, `VITE_API_URL` (cùng URL)
- [ ] Redeploy
- [ ] Test app: Create game, join, play quiz
- [ ] ✅ Done!

---

## 💡 Tips

1. **Dùng Railway nếu Socket.IO bị lỗi trên Vercel** (Railway stable hơn cho WebSocket)
2. **Custom domain:** Vercel cho phép thêm domain riêng miễn phí
3. **Logs:** Check Vercel/Railway logs nếu có lỗi
4. **Environment:** Nhớ chọn "Production" khi set env variables

---

Còn thắc mắc? Đọc [DEPLOYMENT.md](DEPLOYMENT.md) để biết thêm chi tiết!
