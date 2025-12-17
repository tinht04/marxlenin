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
import Papa from "papaparse";

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
    console.log("Found frontend build at", staticPath, "— serving static files.");
    app.use(express.static(staticPath));
    app.get("/*", (req, res) => {
      res.sendFile(path.resolve(staticPath, "index.html"));
    });
  })
  .catch(() => {
    console.log("No frontend build found at", staticPath);
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
    
    // Parse CSV using PapaParse (handles quoted values with commas properly)
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });
    
    allQuestions = [];
    
    parseResult.data.forEach((row, index) => {
      // Normalize column names (handle different naming conventions)
      const getField = (row, ...names) => {
        for (const name of names) {
          const value = row[name];
          if (value !== undefined && value !== null) {
            return typeof value === 'string' ? value.trim() : value;
          }
        }
        return '';
      };
      
      const question = {
        id: getField(row, 'ID', 'Id', 'id') || `q${index + 1}`,
        question: getField(row, 'Question'),
        options: [
          getField(row, 'OptionA', 'Option A', 'Option_A'),
          getField(row, 'OptionB', 'Option B', 'Option_B'),
          getField(row, 'OptionC', 'Option C', 'Option_C'),
          getField(row, 'OptionD', 'Option D', 'Option_D')
        ],
        correctAnswer: getField(row, 'CorrectAnswer', 'Correct Answer', 'Correct_Answer'),
        explanation: getField(row, 'Explanation')
      };
      
      // Find correct answer index (A=0, B=1, C=2, D=3)
      const correctLetter = question.correctAnswer.toUpperCase().trim();
      let correctIndex = -1;
      if (correctLetter === 'A' || correctLetter === 'OPTIONA') correctIndex = 0;
      else if (correctLetter === 'B' || correctLetter === 'OPTIONB') correctIndex = 1;
      else if (correctLetter === 'C' || correctLetter === 'OPTIONC') correctIndex = 2;
      else if (correctLetter === 'D' || correctLetter === 'OPTIOND') correctIndex = 3;
      
      question.correctAnswerIndex = correctIndex;
      
      // Only add valid questions (has question text and at least one option)
      if (question.question && question.options.some(opt => opt)) {
        allQuestions.push(question);
      }
    });
    
    console.log(`✅ Loaded ${allQuestions.length} questions from Google Sheet`);
    
    // Debug: Log headers found in CSV
    if (parseResult.meta && parseResult.meta.fields) {
      console.log('CSV Headers found:', parseResult.meta.fields);
    }
    
    // Debug: Log first question to verify structure
    if (allQuestions.length > 0) {
      console.log('Sample question:', {
        id: allQuestions[0].id,
        question: allQuestions[0].question.substring(0, 50) + '...',
        options: allQuestions[0].options.map(o => o ? o.substring(0, 30) + '...' : '(empty)'),
        correctAnswer: allQuestions[0].correctAnswer,
        correctAnswerIndex: allQuestions[0].correctAnswerIndex,
        explanation: allQuestions[0].explanation ? allQuestions[0].explanation.substring(0, 50) + '...' : '(empty)'
      });
    }
  } catch (err) {
    console.error("❌ Failed to load questions from Google Sheet:", err);
    allQuestions = [];
  }
}

// Load questions on server start
loadQuestionsFromGoogleSheet();

// Socket.IO event handlers
io.on("connection", (socket) => {

  socket.on("create-game", ({ hostName, gameSettings }) => {
    const gameId = generateGameId();
    
    const { teamCount, questionCount, timePerQuestion, gameMode = "team" } = gameSettings;
    
    // Create teams (only for team mode)
    const teams = gameMode === "team" 
      ? Array.from({ length: teamCount }, (_, i) => ({
          name: `Nhóm ${i + 1}`,
          index: i,
          score: 0,
          players: []
        }))
      : []; // No teams in individual mode

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
        timePerQuestion,
        gameMode
      },
      currentQuestion: 0,
      questions: [],
      answeredPlayers: new Set() // Track who answered current question
    };

    games.set(gameId, game);
    socket.join(gameId);
    socket.emit("game-created", { gameId, game });
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
  });

  socket.on("delete-game", ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.host !== socket.id) {
      socket.emit("error", { message: "Unauthorized" });
      return;
    }

    io.to(gameId).emit("game-deleted");
    games.delete(gameId);
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
    

    // Auto-assign players based on game mode
    const waitingPlayers = game.players.filter(p => p.teamIndex === -1);
    const shuffledPlayers = [...waitingPlayers].sort(() => Math.random() - 0.5);
    
    if (game.settings.gameMode === "team") {
      // Team mode: assign players to teams in round-robin fashion
      shuffledPlayers.forEach((player, index) => {
        const teamIndex = index % game.settings.teamCount;
        player.teamIndex = teamIndex;
        
        // Make sure team exists before pushing
        if (!game.teams[teamIndex]) {
          return;
        }
        
        game.teams[teamIndex].players.push(player);
      });
    } else {
      // Individual mode: all players have teamIndex 0 (no actual teams)
      shuffledPlayers.forEach((player) => {
        player.teamIndex = 0;
      });
    }

    game.phase = "playing";
    game.currentQuestion = 0;

    io.to(gameId).emit("game-started", game);
  });

  socket.on("update-score", ({ gameId, teamIndex, points }) => {
    const game = games.get(gameId);
    if (!game) return;

    // Update individual player's score
    const player = game.players.find((p) => p.id === socket.id);
    if (player) {
      if (!player.score) player.score = 0;
      player.score += points;
    }

    if (game.settings.gameMode === "team") {
      // Team mode: update team score
      const team = game.teams[teamIndex];
      if (team) {
        team.score += points;
      }

      // Broadcast team scores
      io.to(gameId).emit("scores-updated", {
        teams: game.teams.map((t, idx) => ({
          name: t.name,
          index: idx,
          score: t.score,
          playerCount: t.players.length,
          players: t.players.map(p => {
            const actualPlayer = game.players.find(gp => gp.id === p.id);
            return { name: p.name, score: actualPlayer?.score || 0 };
          })
        }))
      });
    } else {
      // Individual mode: broadcast individual player scores
      const sortedPlayers = [...game.players]
        .map(p => ({ name: p.name, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score);
      
      io.to(gameId).emit("scores-updated", {
        teams: [{
          name: "Individual",
          index: 0,
          score: 0,
          playerCount: game.players.length,
          players: sortedPlayers
        }]
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
    } else {
      socket.emit("error", { message: "Player not found in game" });
    }
  });

  socket.on("leave-room", ({ gameId }) => {
    if (gameId) {
      socket.leave(gameId);
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
      return;
    }

    game.answeredPlayers.clear(); // Reset answered players
    game.currentQuestion++;
    
    if (game.currentQuestion >= game.questions.length) {
      game.phase = "finished";
      
      // Update team.players scores before sending
      game.teams.forEach(team => {
        team.players = team.players.map(playerInfo => {
          const actualPlayer = game.players.find(p => p.name === playerInfo.name);
          return { name: playerInfo.name, score: actualPlayer ? actualPlayer.score : playerInfo.score };
        });
      });
      
      io.to(gameId).emit("game-finished", game);
    } else {
      io.to(gameId).emit("question-changed", {
        currentQuestion: game.currentQuestion,
        question: game.questions[game.currentQuestion]
      });
    }
  });

  socket.on("submit-answer", ({ gameId, answerIndex, timeTaken }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if player already answered THIS question
    if (game.answeredPlayers.has(socket.id)) {
      return;
    }

    const question = game.questions[game.currentQuestion];
    if (!question) {
      return;
    }

  

    // SERVER validates the answer (source of truth)
    const isCorrect = answerIndex === question.correctAnswerIndex;
    
    
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


    // Get correct answer text
    const correctAnswerText = question.options?.[question.correctAnswerIndex];
   
    // Send result ONLY to the player who answered (not broadcast)
    socket.emit("answer-result", { 
      isCorrect, 
      points: finalPoints,
      correctAnswer: correctAnswerText
    });

    // Broadcast updated scores to ALL players based on game mode
    if (game.settings.gameMode === "team") {
      // Team mode
      io.to(gameId).emit("scores-updated", {
        teams: game.teams.map(t => ({
          name: t.name,
          index: t.index,
          score: t.score,
          playerCount: t.players.length,
          players: t.players.map(p => {
            const actualPlayer = game.players.find(gp => gp.id === p.id);
            return { name: p.name, score: actualPlayer?.score || 0 };
          })
        }))
      });
    } else {
      // Individual mode
      const sortedPlayers = [...game.players]
        .map(p => ({ name: p.name, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score);
      
      io.to(gameId).emit("scores-updated", {
        teams: [{
          name: "Individual",
          index: 0,
          score: 0,
          playerCount: game.players.length,
          players: sortedPlayers
        }]
      });
    }

    
    // NOTE: NO auto-advance here! Each player advances individually on their own client.
  });

  // Handle player finishing all questions (ensure final score is synced)
  socket.on("player-finished", ({ gameId, playerId, finalScore, teamIndex }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    console.log(`[player-finished] Player ${player.name} finished with finalScore: ${finalScore}, current server score: ${player.score || 0}`);

    // Always update player's score to final score (client is authoritative)
    const serverScore = player.score || 0;
    const clientScore = finalScore || 0;
    
    // Update to client's final score (they calculated it correctly)
    player.score = clientScore;
    
    // Also update team score if needed (team mode only)
    if (game.settings.gameMode === "team" && teamIndex >= 0 && teamIndex < game.teams.length) {
      const scoreDiff = clientScore - serverScore;
      game.teams[teamIndex].score += scoreDiff;
    }

    
    // Broadcast updated scores based on game mode
    if (game.settings.gameMode === "team") {
      // Team mode
      io.to(gameId).emit("scores-updated", {
        teams: game.teams.map((t, idx) => ({
          name: t.name,
          index: idx,
          score: t.score,
          playerCount: t.players.length,
          players: t.players.map(p => {
            const actualPlayer = game.players.find(gp => gp.id === p.id);
            return { name: p.name, score: actualPlayer?.score || 0 };
          })
        }))
      });
    } else {
      // Individual mode
      const sortedPlayers = [...game.players]
        .map(p => ({ name: p.name, score: p.score || 0 }))
        .sort((a, b) => b.score - a.score);
      
      console.log(`[player-finished] Broadcasting individual mode scores:`, sortedPlayers);
      
      io.to(gameId).emit("scores-updated", {
        teams: [{
          name: "Individual",
          index: 0,
          score: 0,
          playerCount: game.players.length,
          players: sortedPlayers
        }]
      });
    }
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
        players: t.players.map(p => {
          const actualPlayer = game.players.find(pl => pl.name === p.name);
          return { name: p.name, score: actualPlayer ? actualPlayer.score : p.score };
        })
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
