# 🎮 Hệ Thống Trò Chơi Multiplayer - Hội Nhập Kinh Tế Quốc Tế

## 🚀 Cách Chạy Ứng Dụng

### Bước 1: Cài đặt thư viện
```bash
npm install
```

### Bước 2: Chạy Backend Server (Terminal 1)
```bash
npm run start:server
```
Server sẽ chạy tại: **http://localhost:3002**

### Bước 3: Chạy Frontend (Terminal 2)
```bash
npm run dev
```
Frontend sẽ chạy tại: **http://localhost:3001**

## 🎯 Tính Năng Multiplayer Game

### Chế độ chơi giống Quizizz:
- ✅ **Realtime**: Cập nhật điểm số và câu trả lời ngay lập tức
- ✅ **Theo nhóm**: Nhiều người cùng chơi trong các nhóm khác nhau
- ✅ **Tính điểm thông minh**: Điểm dựa trên độ chính xác + tốc độ trả lời
- ✅ **Lưu lịch sử**: Tự động lưu vào file `game-history.json`
- ✅ **Bảng xếp hạng trực tiếp**: Theo dõi điểm số của các nhóm realtime

### Cách Chơi:

#### Làm Host (Người tạo game):
1. Nhấn **"Tạo Game Mới"**
2. Nhập tên của bạn
3. Nhận mã game 6 ký tự (VD: ABC123)
4. Chia sẻ mã với bạn bè
5. Đợi mọi người tham gia
6. Nhấn **"Bắt Đầu Game"**
7. Điều khiển chuyển câu hỏi

#### Tham Gia Game:
1. Nhấn **"Tham Gia Game"**
2. Nhập mã game (6 ký tự)
3. Nhập tên nhóm của bạn
4. Nhập tên cá nhân
5. Chờ host bắt đầu
6. Trả lời câu hỏi và cạnh tranh điểm số!

### Hệ Thống Điểm:
- **Trả lời đúng**: 100 điểm cơ bản
- **Bonus tốc độ**: +10 điểm cho mỗi 3 giây còn lại
- **Điểm tối đa**: 200 điểm/câu
- **Tổng điểm nhóm**: Tổng điểm của tất cả thành viên

### Lịch Sử Game:
- Tự động lưu vào `server/game-history.json`
- Thông tin lưu trữ:
  - ID game
  - Tên host
  - Danh sách nhóm và điểm số
  - Tổng số câu hỏi
  - Thời gian chơi
  - Chi tiết câu trả lời

## 📊 API Endpoints

### WebSocket Events (Socket.IO):

**Client → Server:**
- `create-game`: Tạo game mới
- `join-game`: Tham gia game
- `start-game`: Bắt đầu game (chỉ host)
- `submit-answer`: Gửi câu trả lời
- `update-score`: Cập nhật điểm
- `next-question`: Chuyển câu tiếp theo (chỉ host)
- `end-game`: Kết thúc game (chỉ host)

**Server → Client:**
- `game-created`: Game được tạo thành công
- `game-updated`: Cập nhật trạng thái game
- `game-started`: Game bắt đầu
- `question-changed`: Chuyển câu hỏi
- `answer-submitted`: Có người trả lời
- `scores-updated`: Cập nhật điểm số
- `game-ended`: Game kết thúc
- `host-disconnected`: Host thoát game
- `error`: Thông báo lỗi

### HTTP REST API:
- `GET /api/game-history`: Lấy lịch sử các game đã chơi

## 🎨 Các Trang Game Khác:

1. **👥 Multiplayer** - Chơi theo nhóm realtime
2. **🎮 Mini Games** - 3 trò chơi đơn:
   - 🔗 Ghép Đôi thuật ngữ
   - 📅 Dòng Thời Gian
   - ❓ Trắc Nghiệm
3. **🗺️ Bản đồ Hội nhập** - Bản đồ tương tác
4. **📝 Quizzz** - Quiz từ Google Sheet
5. **💬 Chatbot** - Chat với PDF

## 🔧 Công Nghệ Sử Dụng:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Realtime**: Socket.IO
- **Storage**: JSON file
- **Styling**: Inline CSS với animations

## 📝 Ghi Chú:

- Game sẽ tự động kết thúc nếu host thoát
- Lịch sử game được lưu tự động sau mỗi game
- Hỗ trợ không giới hạn số lượng nhóm và người chơi
- Responsive, hoạt động tốt trên mobile

## 🎮 Câu Hỏi trong Game:

Hiện tại có **8 câu hỏi** về Hội nhập kinh tế quốc tế:
1. Việt Nam gia nhập WTO
2. EVFTA
3. Tác động hội nhập
4. CPTPP
5. ASEAN
6. Thách thức hội nhập
7. RCEP
8. APEC

---

**Chúc bạn chơi game vui vẻ! 🎉**
