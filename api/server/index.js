import { config } from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from project root (if present). On Railway/Render the platform provides env vars.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to load .env from repository root (../../.env relative to this file). If not present, ignore.
config({ path: path.resolve(__dirname, "../../.env"), override: false });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 3002;

app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

// Serve built frontend if it exists (so frontend + socket server can be one Railway service)
const staticPath = path.resolve(__dirname, "../../dist");
fs.access(staticPath)
  .then(() => {
    console.log("📦 Found frontend build at", staticPath, "— serving static files.");
    app.use(express.static(staticPath));
    app.get("/*", (req, res) => {
      res.sendFile(path.resolve(staticPath, "index.html"));
    });
  })
  .catch(() => {
    console.log("ℹ️ No frontend build found at", staticPath);
  });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set in server environment. The proxy will not work without it."
  );
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

app.post("/api/genai", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "AI not configured on server." });
  }

  const { pdfContent, question } = req.body ?? {};
  if (typeof pdfContent !== "string" || typeof question !== "string") {
    return res.status(400).json({
      error: "Invalid request body, expected { pdfContent, question }",
    });
  }

  // Preserve user's prompt & model here (same as previous client prompt)
  const model = "gemini-2.5-flash";
  const prompt = `Bạn là một trợ lý chuyên gia. Nhiệm vụ của bạn là trả lời các câu hỏi chỉ dựa trên văn bản được cung cấp từ tài liệu PDF. Không sử dụng bất kỳ kiến thức bên ngoài nào. Nếu không tìm thấy câu trả lời trong văn bản, hãy nêu rõ điều đó. Trả lời bằng tiếng Việt.

Đây là nội dung của PDF:
---
${pdfContent}
---

Đây là câu hỏi của người dùng:
"${question}"

Câu trả lời:`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return res.json({ answer: response.text });
  } catch (err) {
    console.error("Error calling Gemini on server:", err);
    return res.status(500).json({ error: "Error from AI provider." });
  }
});

// Game state management
const games = new Map();

// Helper functions
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fetch questions from Google Sheet (same as QuizView)
const GOOGLE_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/gviz/tq?tqx=out:csv&sheet=";
const QUIZ_SHEET_URL = `${GOOGLE_SHEET_BASE_URL}Quiz_Sheet`;

let allQuestions = [];

async function loadQuestionsFromGoogleSheet() {
  try {
    const response = await fetch(QUIZ_SHEET_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const csvText = await response.text();
    
    // Parse CSV manually (simple parser for server-side)
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    allQuestions = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parse (handle quoted values)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      // Create question object (use 'options' to match client code)
      const question = {
        id: values[0] || `q${i}`,
        question: values[1] || '',
        options: [
          values[2] || '', // OptionA
          values[3] || '', // OptionB
          values[4] || '', // OptionC
          values[5] || ''  // OptionD
        ],
        correctAnswer: values[6] || '', // CorrectAnswer column
        explanation: values[7] || ''
      };
      
      // Find correct answer index (A=0, B=1, C=2, D=3)
      const correctLetter = question.correctAnswer.toUpperCase().trim();
      let correctIndex = -1;
      if (correctLetter === 'A' || correctLetter === 'OPTIONA') correctIndex = 0;
      else if (correctLetter === 'B' || correctLetter === 'OPTIONB') correctIndex = 1;
      else if (correctLetter === 'C' || correctLetter === 'OPTIONC') correctIndex = 2;
      else if (correctLetter === 'D' || correctLetter === 'OPTIOND') correctIndex = 3;
      
      question.correctAnswerIndex = correctIndex;
      
      if (question.question && question.options.some(a => a)) {
        allQuestions.push(question);
      }
    }
    
    console.log(`✅ Loaded ${allQuestions.length} questions from Google Sheet`);
  } catch (err) {
    console.error("❌ Failed to load questions from Google Sheet:", err);
    allQuestions = [];
  }
}

// Load questions on server start
loadQuestionsFromGoogleSheet();

// Socket.IO event handlers
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-game", ({ hostName, gameSettings }) => {
    const gameId = generateGameId();
    
    const { teamCount, questionCount, timePerQuestion } = gameSettings;
    
    // Create teams
    const teams = Array.from({ length: teamCount }, (_, i) => ({
      name: `Nhóm ${i + 1}`,
      index: i,
      score: 0,
      players: []
    }));

    const game = {
      id: gameId,
      host: socket.id,
      hostName,
      teams,
      players: [],
      phase: "lobby",
      settings: {
        teamCount,
        questionCount,
        timePerQuestion
      },
      currentQuestion: 0,
      questions: [],
      answeredPlayers: new Set() // Track who answered current question
    };

    games.set(gameId, game);
    socket.join(gameId);
    socket.emit("game-created", { gameId, game });
    console.log(`Game ${gameId} created by ${hostName}`);
  });

  socket.on("join-game", ({ gameId, playerName }) => {
    const game = games.get(gameId);
    
    if (!game) {
      socket.emit("error", { message: "Sai mã game! Phòng không tồn tại." });
      return;
    }

    if (game.phase === "playing") {
      socket.emit("error", { message: "Game đang diễn ra, không thể tham gia!" });
      return;
    }

    if (game.phase === "finished") {
      socket.emit("error", { message: "Game đã kết thúc!" });
      return;
    }

    // Check for duplicate name
    const existingPlayer = game.players.find(p => p.name === playerName);
    if (existingPlayer) {
      socket.emit("error", { message: "Tên này đã được sử dụng trong phòng!" });
      return;
    }

    // Add player to waiting list (will be assigned to team when game starts)
    const player = {
      id: socket.id,
      name: playerName,
      teamIndex: -1, // Not assigned yet
      score: 0
    };

    game.players.push(player);

    socket.join(gameId);
    io.to(gameId).emit("game-updated", game);
    console.log(`${playerName} joined game ${gameId}`);
  });

  socket.on("delete-game", ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.host !== socket.id) {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    io.to(gameId).emit("game-deleted");
    games.delete(gameId);
    console.log(`Game ${gameId} deleted by host`);
  });

  socket.on("start-game", ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.host !== socket.id) {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    // Random select questions from Google Sheet
    if (allQuestions.length === 0) {
      socket.emit("error", { message: "Chưa load được câu hỏi từ Google Sheet. Vui lòng thử lại sau." });
      return;
    }
    
    const requestedCount = game.settings.questionCount;
    const availableCount = allQuestions.length;
    const actualCount = Math.min(requestedCount, availableCount);
    
    // Shuffle and take random questions
    const selectedQuestions = shuffleArray([...allQuestions]).slice(0, actualCount);
    game.questions = selectedQuestions;
    
    console.log(`📝 Selected ${actualCount} random questions from ${availableCount} available (requested: ${requestedCount})`);

    // Auto-assign only waiting players (teamIndex === -1) to teams in round-robin fashion
    const waitingPlayers = game.players.filter(p => p.teamIndex === -1);
    const shuffledPlayers = [...waitingPlayers].sort(() => Math.random() - 0.5);
    shuffledPlayers.forEach((player, index) => {
      const teamIndex = index % game.settings.teamCount;
      player.teamIndex = teamIndex;
      
      // Make sure team exists before pushing
      if (!game.teams[teamIndex]) {
        console.error(`Team ${teamIndex} does not exist! Total teams: ${game.teams.length}`);
        return;
      }
      
      game.teams[teamIndex].players.push(player);
    });

    game.phase = "playing";
    game.currentQuestion = 0;

    io.to(gameId).emit("game-started", game);
    console.log(`Game ${gameId} started with ${game.players.length} players and ${selectedQuestions.length} questions`);
  });

  socket.on("update-score", ({ gameId, teamIndex, points }) => {
    const game = games.get(gameId);
    if (!game) return;

    const team = game.teams[teamIndex];
    if (team) {
      team.score += points;

      // Also update the individual player's score (if we can find them by socket id)
      const player = game.players.find((p) => p.id === socket.id);
      if (player) {
        if (!player.score) player.score = 0;
        player.score += points;
      }

      // Broadcast updated scores including per-player scores so clients can render leaderboards
      io.to(gameId).emit("scores-updated", {
        teams: game.teams.map((t, idx) => ({
          name: t.name,
          index: idx,
          score: t.score,
          playerCount: t.players.length,
          players: t.players.map(p => ({ name: p.name, score: p.score || 0 }))
        }))
      });
    }
  });

  socket.on("rejoin-as-host", ({ gameId, hostName }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    game.host = socket.id;
    socket.join(gameId);
    socket.emit("rejoined", { game, isHost: true });
    console.log(`Host ${hostName} rejoined game ${gameId}`);
  });

  socket.on("rejoin-as-player", ({ gameId, playerName }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    const player = game.players.find(p => p.name === playerName);
    if (player) {
      player.id = socket.id;
      socket.join(gameId);
      socket.emit("rejoined", { game, isHost: false });
      console.log(`Player ${playerName} rejoined game ${gameId}`);
    } else {
      socket.emit("error", { message: "Player not found in game" });
    }
  });

  socket.on("leave-room", ({ gameId }) => {
    if (gameId) {
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left room ${gameId}`);
    }
  });

  socket.on("next-question", ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;

    // Allow host OR any player who has answered to trigger next question
    const player = game.players.find(p => p.id === socket.id);
    const isHost = game.host === socket.id;
    const hasAnswered = game.answeredPlayers.has(socket.id);
    
    if (!isHost && (!player || !hasAnswered)) {
      console.log(`Player ${socket.id} tried to next without answering`);
      return;
    }

    game.answeredPlayers.clear(); // Reset answered players
    game.currentQuestion++;
    
    if (game.currentQuestion >= game.questions.length) {
      game.phase = "finished";
      io.to(gameId).emit("game-finished", game);
      console.log(`Game ${gameId} finished`);
    } else {
      io.to(gameId).emit("question-changed", {
        currentQuestion: game.currentQuestion,
        question: game.questions[game.currentQuestion]
      });
      console.log(`Game ${gameId} - Question ${game.currentQuestion + 1} (triggered by ${isHost ? 'host' : player.name})`);
    }
  });

  socket.on("submit-answer", ({ gameId, answerIndex, timeTaken }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if player already answered THIS question
    if (game.answeredPlayers.has(socket.id)) {
      console.log(`${player.name} already answered this question`);
      return;
    }

    const question = game.questions[game.currentQuestion];
    if (!question) {
      console.error(`Question not found at index ${game.currentQuestion}`);
      return;
    }

    console.log(`Player ${player.name} submitted answer:`, {
      answerIndex,
      correctAnswerIndex: question.correctAnswerIndex,
      questionId: question.id,
      currentQuestion: game.currentQuestion
    });

    // SERVER validates the answer (source of truth)
    const isCorrect = answerIndex === question.correctAnswerIndex;
    
    console.log(`Validation result: answerIndex(${answerIndex}) === correctAnswerIndex(${question.correctAnswerIndex}) = ${isCorrect}`);
    
    // Calculate points based on correctness and speed
    let finalPoints = 0;
    if (isCorrect) {
      const timeLimit = game.settings.timePerQuestion || 30;
      const speedRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
      const speedBonus = Math.floor(speedRatio * 50);
      finalPoints = 100 + speedBonus;
      
      // Add to team score
      const team = game.teams[player.teamIndex];
      if (team) {
        team.score += finalPoints;
      }
      
      // Add to player score
      if (!player.score) player.score = 0;
      player.score += finalPoints;
    }

    // Mark player as answered
    game.answeredPlayers.add(socket.id);

    console.log(`${player.name} answered Q${game.currentQuestion + 1} - Correct: ${isCorrect}, Points: ${finalPoints}`);

    // Get correct answer text
    const correctAnswerText = question.options?.[question.correctAnswerIndex];
    console.log('Correct answer:', {
      correctAnswerIndex: question.correctAnswerIndex,
      correctAnswerText,
      optionsLength: question.options?.length,
      hasOptions: !!question.options
    });

    // Send result ONLY to the player who answered (not broadcast)
    socket.emit("answer-result", { 
      isCorrect, 
      points: finalPoints,
      correctAnswer: correctAnswerText
    });

    // Broadcast updated scores to ALL players
    io.to(gameId).emit("scores-updated", {
      teams: game.teams.map(t => ({
        name: t.name,
        index: t.index,
        score: t.score,
        playerCount: t.players.length,
        players: t.players.map(p => ({ name: p.name, score: p.score }))
      }))
    });

    console.log(`${player.name} answered Q${game.currentQuestion + 1} - Correct: ${isCorrect}, Points: ${finalPoints}`);
    
    // NOTE: NO auto-advance here! Each player advances individually on their own client.
  });

  socket.on("end-game", ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.host !== socket.id) return;

    game.phase = "finished";
    
    // Send full game data with player details
    const gameData = {
      ...game,
      teams: game.teams.map(t => ({
        name: t.name,
        index: t.index,
        score: t.score,
        playerCount: t.players.length,
        players: t.players.map(p => ({ name: p.name, score: p.score }))
      }))
    };
    
    io.to(gameId).emit("game-finished", gameData);
    console.log(`Game ${gameId} ended by host`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
