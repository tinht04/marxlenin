# 📚 MarxLeninEdu - Political Economy & Integration Education Platform

## 🌟 Introduction

**MarxLeninEdu** is a modern educational platform that bridges academic knowledge with interactive technology, as part of MLN122 (Political Economics of Marxism–Leninism). The project aims to make Political Economy engaging for students through:

  - **AI Chatbot**: Discussing curriculum content directly with an AI tutor.
  - **Multiplayer Arena**: Real-time competitive quizzes.
  - **Mini-games**: Interactive activities to reinforce knowledge.
  - **Integration Map**: Visualizing Vietnam's international economic relations.

## ✨ Key Features

### 1\. 🤖 AI Chatbot (RAG Technology)

  - Direct conversation with an AI assistant powered by **Google Gemini**.
  - Answers are grounded in the **"Giáo trình Kinh tế Chính trị Mác - Lênin"** (PDF integrated into the app).
  - Ensures accurate information with citations from the source material, avoiding hallucinations.

### 2\. 🎮 Multiplayer Quiz Game (Realtime)

  - A real-time quiz competition system similar to Kahoot/Quizizz.
  - Built with **Socket.IO** for low-latency communication.
  - **Features**: Create rooms, join via code, live leaderboards, team-based scoring based on speed and accuracy.

### 3\. 🧩 Mini Games & Learning Tools

  - **Term Matching**: Connect economic concepts with their definitions.
  - **Timeline Challenge**: Arrange economic integration events in chronological order.
  - **Quick Quiz**: Review knowledge with a question bank sourced from Google Sheets.

### 4\. 🌏 Data & Maps

  - **Integration Map**: Interactive world map (Leaflet) displaying Vietnam's Strategic Partners, Comprehensive Partners, and FTA status.
  - **FTA Timeline**: A visual history of Vietnam's Free Trade Agreements.

-----

## 🛠️ Tech Stack

**Frontend:**

  - **React** (Vite)
  - **TypeScript**
  - **Tailwind CSS** (Styling)
  - **Framer Motion** (Animation)
  - **React Leaflet** (Maps)
  - **Chart.js** (Data visualization)

**Backend:**

  - **Node.js** & **Express**
  - **Socket.IO** (Realtime WebSocket server)
  - **Google Generative AI SDK** (Gemini integration)

**Data Processing:**

  - **PDF.js** (PDF text extraction)
  - **PapaParse** (CSV/Google Sheets data parsing)

-----

## 🚀 Installation & Local Development

### Prerequisites

  - Node.js (v18 or higher)
  - A Google AI Studio account (to obtain a Gemini API Key)

### 1\. Clone and Install

```bash
git clone <your-repo-url>
cd marxlenin
npm install
```

### 2\. Environment Configuration

Create a `.env` file in the root directory and add the following:

```env
# Google Gemini API Key (Required for Chatbot)
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration (Default)
PORT=3002
VITE_API_URL=http://localhost:3002
VITE_SOCKET_URL=http://localhost:3002

# Google Apps Script URL (Optional - for logging quiz scores)
VITE_SHEET_APPEND_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 3\. Run the Application

You need to open **two terminals**:

**Terminal 1: Start Backend Server**

```bash
npm run start:server
# Server runs at http://localhost:3002
```

**Terminal 2: Start Frontend**

```bash
npm run dev
# Frontend runs at http://localhost:3000 (or other port assigned by Vite)
```

-----

## 📦 Deployment

The project is designed to allow separate or combined deployment of Frontend and Backend.

### Recommended: Vercel (Frontend + Serverless)

Vercel can host the Frontend and API routes.

1.  Import the project into Vercel.
2.  Configure **Environment Variables** in the Vercel Dashboard:
      - `GEMINI_API_KEY`: Your Gemini key.
      - `VITE_API_URL`: `/api` (Use relative path).
      - `VITE_SOCKET_URL`: Your deployed URL (e.g., `https://marxlenin.vercel.app`).
3.  Deploy.

*Note: For the best **Socket.IO** performance in production, it is recommended to deploy the Backend (`api/server/index.js`) on a platform supporting long-lived processes like **Railway** or **Render**, and update `VITE_SOCKET_URL` accordingly.*

See [DEPLOY\_GUIDE.md](https://www.google.com/search?q=DEPLOY_GUIDE.md) and [RAILWAY.md](RAILWAY.md) for details.

-----

## 📂 Project Structure

```
marxlenin/
├── api/
│   ├── genai.js            # Serverless function for Chatbot
│   └── server/             # Express & Socket.IO Server
│       ├── index.js        # Backend entry point
│       └── game-history.json # Multiplayer game logs
├── src/
│   ├── components/         # UI Components (ChatWindow, Map, Game...)
│   ├── services/           # API services (Gemini, Google Sheets)
│   ├── data/               # Static data for mini-games
│   └── utils/              # PDF processing utilities
├── public/
│   ├── docs/               # Educational PDF files
│   └── img/                # Assets, logos, backgrounds
└── ...config files
```

-----

## 🤝 Contribution

Contributions are welcome\! Please create a Pull Request or open an Issue if you encounter any bugs.

## 📄 License & Copyright

This project uses materials from "Giáo trình Kinh tế Chính trị Mác - Lênin" (National Political Publishing House Truth - 2021) for non-profit educational purposes.

-----

*Built with ❤️ by [tinht04] and [Duy-tv1]*
