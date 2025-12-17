import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type GamePhase = "home" | "create" | "join" | "lobby" | "playing" | "host-view" | "waiting-results" | "results";

interface Team {
  name: string;
  index: number;
  players: Player[];
  score: number;
  answers: any[];
}

interface Player {
  id: string;
  name: string;
  teamIndex: number;
  score?: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string | number; // Can be "A"/"B" or 0/1/2/3
  correctAnswerIndex?: number; // The actual numeric index (0-3)
  explanation: string;
}

interface GameSettings {
  teamCount: number;
  questionCount: number;
  timePerQuestion: number;
  gameMode: "team" | "individual";
}

interface GameState {
  id: string;
  host: string;
  hostName: string;
  teams: Team[];
  players: Player[];
  currentQuestion: number;
  gameState: "waiting" | "playing" | "finished";
  settings: GameSettings;
}

export const MultiplayerGame: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>("home");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameId, setGameId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [gameMode, setGameMode] = useState<"team" | "individual">("team");
  const [teamCount, setTeamCount] = useState(4);
  const [questionCount, setQuestionCount] = useState(15);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]); // Each player has shuffled questions
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [scores, setScores] = useState<Array<{ 
    name: string; 
    index: number; 
    score: number; 
    playerCount: number;
    players?: Array<{ name: string; score: number }>;
  }>>([]);
  const [myTeamIndex, setMyTeamIndex] = useState(-1);
  const [myScore, setMyScore] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [questionTransition, setQuestionTransition] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [showingCorrectAnswer, setShowingCorrectAnswer] = useState(false);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const timerRef = useRef<number | null>(null);
  const answerTimeRef = useRef<number>(0);
  const autoNextTimerRef = useRef<number | null>(null);
  
  // Refs to track latest values in socket handlers (avoid stale closure)
  const myScoreRef = useRef<number>(0);
  const myTeamIndexRef = useRef<number>(-1);
  const gameIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    myScoreRef.current = myScore;
  }, [myScore]);

  useEffect(() => {
    myTeamIndexRef.current = myTeamIndex;
  }, [myTeamIndex]);

  useEffect(() => {
    gameIdRef.current = gameId;
  }, [gameId]);

  // Save game session to localStorage
  const saveGameSession = (data: {
    gameId: string;
    playerName?: string;
    hostName?: string;
    isHost: boolean;
    phase: GamePhase;
    currentQuestion?: number;
    myScore?: number;
  }) => {
    try {
      localStorage.setItem("gameSession", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save game session:", error);
    }
  };

  // Load game session from localStorage
  const loadGameSession = () => {
    try {
      const saved = localStorage.getItem("gameSession");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load game session:", error);
    }
    return null;
  };

  // Clear game session
  const clearGameSession = () => {
    try {
      localStorage.removeItem("gameSession");
    } catch (error) {
      console.error("Failed to clear game session:", error);
    }
  };

  // Shuffle questions array for each player based on their socketId
  const shuffleQuestionsForPlayer = (questions: Question[], socketId: string) => {
    const seed = socketId;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }

    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      hash = ((hash * 9301) + 49297) % 233280;
      const j = Math.abs(hash % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  };

  // Shuffle question options (each player gets different order)
  const getShuffledQuestion = (question: Question) => {
    // Use socketId + questionId for unique shuffle per player per question
    const seed = (socket?.id || '') + question.id;
    const indices = [0, 1, 2, 3];
    
    // Simple deterministic shuffle based on seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    
    const shuffled = [...indices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.abs(hash % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      hash = ((hash * 9301) + 49297) % 233280;
    }
    
    // Find correct answer index
    let originalCorrectIndex = question.correctAnswerIndex;
    
    // Fallback: If correctAnswerIndex is missing or invalid, try to find it from correctAnswer
    if (originalCorrectIndex === undefined || originalCorrectIndex === null || originalCorrectIndex < 0) {
      
      if (question.correctAnswer) {
        const correctAnswerStr = String(question.correctAnswer).trim();
        
        // Try to find by matching option text
        originalCorrectIndex = question.options.findIndex(opt => 
          opt.trim().toLowerCase() === correctAnswerStr.toLowerCase()
        );
        
        // If still not found, try letter format (A, B, C, D)
        if (originalCorrectIndex < 0) {
          const letterMap: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          originalCorrectIndex = letterMap[correctAnswerStr.toUpperCase()] ?? 0;
        }
        
      } else {
        // Ultimate fallback - assume first option is correct
        originalCorrectIndex = 0;
      }
    }
    
    const newCorrectIndex = shuffled.indexOf(originalCorrectIndex);
    const shuffledOptions = shuffled.map(i => question.options[i]);
    
    return {
      ...question,
      options: shuffledOptions,
      correctAnswerIndex: newCorrectIndex
    };
  };

  // Questions are loaded from Google Sheet via server (in game-started event)
  // No need for hardcoded questions here

  useEffect(() => {
    // Connect to Socket.IO server using env variable.
    // Support either an absolute URL (https://host) or a relative value starting with '/' to mean same origin.
    const rawSocketUrl = import.meta.env.VITE_SOCKET_URL ?? "";
    let socketUrl = rawSocketUrl || "http://localhost:3002";
    try {
      if (socketUrl.startsWith("/")) {
        // relative -> use current origin
        socketUrl = window.location.origin;
      }
    } catch (e) {
      // window may be undefined in SSR environments; fallback remains
    }
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Try to reconnect to previous session
    const savedSession = loadGameSession();
    if (savedSession && !isReconnecting) {
      setIsReconnecting(true);
      setGameId(savedSession.gameId);
      
      if (savedSession.isHost) {
        setHostName(savedSession.hostName || "");
        // Request to rejoin as host
        newSocket.emit("rejoin-as-host", { 
          gameId: savedSession.gameId, 
          hostName: savedSession.hostName 
        });
      } else {
        setPlayerName(savedSession.playerName || "");
        // Request to rejoin as player
        newSocket.emit("rejoin-as-player", {
          gameId: savedSession.gameId,
          playerName: savedSession.playerName
        });
      }
    }

    newSocket.on("game-created", ({ gameId, game }) => {
      setGameId(gameId);
      setGameState(game);
      setPhase("lobby");
      
      // Save session as host
      saveGameSession({
        gameId,
        hostName: game.hostName,
        isHost: true,
        phase: "lobby"
      });
    });

    newSocket.on("game-updated", (game) => {
      setGameState(game);
      
      // If game is in lobby and we're in the player list, switch to lobby phase
      if (game.phase === "lobby") {
        setPhase((currentPhase) => {
          // Only auto-switch to lobby if we're not already in host-view or playing
          if (currentPhase === "join" || currentPhase === "home") {
            // Check by socket ID instead of name (more reliable)
            const isInGame = game.players.some((p: Player) => p.id === newSocket.id);
            if (isInGame) {
              // Find my player to get the name
              const myPlayer = game.players.find((p: Player) => p.id === newSocket.id);
              if (myPlayer) {
                saveGameSession({
                  gameId: game.id,
                  playerName: myPlayer.name,
                  isHost: false,
                  phase: "lobby"
                });
              }
              return "lobby";
            }
          }
          return currentPhase;
        });
      }
    });

    newSocket.on("rejoined", ({ game, isHost }) => {
      setGameState(game);
      setIsReconnecting(false);
      
      // Get saved session to retrieve playerName (state may not be updated yet)
      const savedSession = loadGameSession();
      const myPlayerName = savedSession?.playerName || playerName;
      
      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
      
      // Check if I'm the host
      const amHost = game.host === newSocket.id || isHost;
      
      if (game.phase === "lobby") {
        setPhase("lobby");
      } else if (game.phase === "playing") {
        // Restore myQuestions when rejoining during game
        if (game.questions && game.questions.length > 0) {
          const shuffledQuestions = shuffleQuestionsForPlayer(game.questions, newSocket.id);
          setMyQuestions(shuffledQuestions);
        }
        
        // Restore currentQuestion from localStorage (each player has their own progress)
        const restoredQuestion = savedSession?.currentQuestion ?? 0;
        setCurrentQuestion(restoredQuestion);
        
        if (amHost) {
          setPhase("host-view");
        } else {
          // Find my team for player using saved playerName
          let foundTeam = false;
          for (const team of game.teams) {
            const myPlayer = team.players.find((p: Player) => p.name === myPlayerName);
            if (myPlayer) {
              setMyTeamIndex(team.index);
              setMyScore(myPlayer.score || 0);
              foundTeam = true;
              break;
            }
          }
          if (foundTeam) {
            // Reset ALL state completely before resuming
            setHasAnswered(false);
            setSelectedAnswer(null);
            setShowingCorrectAnswer(false);
            setCorrectAnswerIndex(null);
            
            // Clear any auto-next timer
            if (autoNextTimerRef.current) {
              clearTimeout(autoNextTimerRef.current);
              autoNextTimerRef.current = null;
            }
            
            // Set phase to playing
            setPhase("playing");
            
            // Start fresh timer (startTimer will set timeLeft internally)
            setTimeout(() => {
              startTimer();
            }, 100); // Small delay to ensure phase is set
          } else {
            // Player not found in any team - go back to home
            clearGameSession();
            setPhase("home");
          }
        }
      } else if (game.phase === "finished") {
        // Set final scores with player details
        if (game.teams) {
          setScores(game.teams.map(t => ({
            name: t.name,
            index: t.index,
            score: t.score,
            playerCount: t.players.length,
            players: t.players || []
          })));
        }
        setPhase("results");
      }
      
    });

    newSocket.on("rejoin-failed", () => {
      clearGameSession();
      setIsReconnecting(false);
      setPhase("home");
      
      // Show error message for 3 seconds
      setErrorMessage("Game không tồn tại hoặc đã kết thúc. Vui lòng tạo game mới.");
      setTimeout(() => setErrorMessage(null), 3000);
    });

    newSocket.on("game-started", (game) => {
      setGameState(game);
      
      // Find my team index
      const myPlayer = game.players.find((p: Player) => p.id === newSocket.id);
      if (myPlayer) {
        setMyTeamIndex(myPlayer.teamIndex);
      }
      
      // Shuffle questions uniquely for this player
      if (game.questions && game.questions.length > 0) {
        const shuffledQuestions = shuffleQuestionsForPlayer(game.questions, newSocket.id);
        setMyQuestions(shuffledQuestions);
      }
      
      // Start countdown animation: 3, 2, 1, GO!
      setCountdown(3);
      setTimeout(() => {
        setCountdown(2);
        setTimeout(() => {
          setCountdown(1);
          setTimeout(() => {
            setCountdown("GO!");
            setTimeout(() => {
              setCountdown(null);
              
              // Reset all answer-related states before starting
              setSelectedAnswer(null);
              setHasAnswered(false);
              setShowingCorrectAnswer(false);
              setCorrectAnswerIndex(null);
              
              // Determine phase based on if I'm host or player
              if (game.host === newSocket.id) {
                setPhase("host-view");
              } else {
                setPhase("playing");
                // Start timer ONLY for players AFTER countdown finishes
                startTimer();
              }
            }, 800); // "GO!" shows for 800ms
          }, 1000);
        }, 1000);
      }, 1000);
      
      setCurrentQuestion(0);
      setHasAnswered(false);
      
      // Update session
      const savedSession = loadGameSession();
      if (savedSession) {
        saveGameSession({
          ...savedSession,
          phase: game.host === newSocket.id ? "host-view" : "playing"
        });
      }
    });

    newSocket.on("question-changed", ({ currentQuestion }) => {
      setQuestionTransition(true);
      setTimeout(() => {
        setCurrentQuestion(currentQuestion);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setShowingCorrectAnswer(false);
        setCorrectAnswerIndex(null);
        setTimeLeft(30);
        startTimer();
        setQuestionTransition(false);
      }, 300);
    });

    // No longer need answer-result handler - validation is done on client

    newSocket.on("game-finished", (game) => {
      
      // IMPORTANT: Send final score BEFORE clearing session
      // This handles case where host ends game early (mid-game)
      if (gameIdRef.current && myTeamIndexRef.current !== undefined) {
        const currentScore = myScoreRef.current || 0;
        newSocket.emit("player-finished", {
          gameId: gameIdRef.current,
          playerId: newSocket.id,
          finalScore: currentScore,
          teamIndex: myTeamIndexRef.current
        });
      }
      
      setGameState(game);
      
      // Set final scores from game teams with players list
      if (game && game.teams) {
        setScores(game.teams.map(t => ({
          name: t.name,
          index: t.index,
          score: t.score,
          playerCount: t.players.length,
          players: t.players || []
        })));
      }
      
      setPhase("results");
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
      
      // Clear localStorage session when game finishes
      clearGameSession();
    });

    newSocket.on("scores-updated", ({ teams }) => {
      console.log("[scores-updated] Received scores:", teams);
      setScores(teams);
      
      // Update gameState.teams to reflect realtime scores
      setGameState(prevState => {
        if (!prevState) return prevState;
        return {
          ...prevState,
          teams: prevState.teams.map((team, idx) => {
            const updatedTeam = teams.find((t: any) => t.index === idx);
            return updatedTeam ? { ...team, score: updatedTeam.score } : team;
          })
        };
      });
    });

    newSocket.on("game-ended", ({ finalScores }) => {
      // Send final score before game ends
      if (gameIdRef.current && myTeamIndexRef.current !== undefined) {
        const currentScore = myScoreRef.current || 0;
        newSocket.emit("player-finished", {
          gameId: gameIdRef.current,
          playerId: newSocket.id,
          finalScore: currentScore,
          teamIndex: myTeamIndexRef.current
        });
      }
      
      setScores(finalScores);
      setPhase("results");
      clearGameSession(); 
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });

    newSocket.on("host-disconnected", () => {
      setErrorMessage("Host đã thoát. Game kết thúc.");
      setTimeout(() => {
        clearGameSession();
        resetGame();
      }, 2000);
    });

    newSocket.on("game-deleted", ({ message }) => {
      setErrorMessage(message);
      setTimeout(() => {
        clearGameSession();
        resetGame();
      }, 2000);
    });

    newSocket.on("error", ({ message }) => {
      setErrorMessage(message);
      
      // Auto-hide error after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
      
      // Only reset if already in lobby and game becomes invalid
      // Don't reset when user is just trying to join (phase = "join")
      if (phase === "lobby" && (
        message.includes("Host đã thoát") ||
        message.includes("Game đã bị xóa")
      )) {
        setTimeout(() => {
          clearGameSession();
          resetGame();
        }, 2000); // Wait 2s before reset so user can read error
      }
      // For join errors (wrong code, duplicate name, etc.), just show toast
      // User stays on join page to try again
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Auto next question when time runs out
  useEffect(() => {
    const amHost = gameState && socket && gameState.host === socket.id;
    if (timeLeft === 0 && !hasAnswered && phase === "playing") {
      // Timeout - mark as answered with no selection
      setHasAnswered(true);
      
      // Show correct answer immediately
      if (!gameState || !gameState.questions) return;
      const currentQ = getShuffledQuestion(gameState.questions[currentQuestion]);
      setCorrectAnswerIndex(currentQ.correctAnswerIndex);
      setShowingCorrectAnswer(true);
      
      // Send timeout to server (0 points)
      if (socket && gameId) {
        socket.emit("player-answered", {
          gameId,
          isCorrect: false,
          points: 0,
          timeTaken: gameState.settings.timePerQuestion || 30
        });
      }
      
      // Auto-advance after 3 seconds
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
      
      autoNextTimerRef.current = window.setTimeout(() => {
        goToNextQuestion();
      }, 3000);
    }
  }, [timeLeft, hasAnswered, phase, currentQuestion, socket, gameId, gameState]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const timeLimit = gameState?.settings.timePerQuestion || 30;
    setTimeLeft(timeLimit);
    answerTimeRef.current = Date.now();
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const createGame = () => {
    if (!hostName.trim() || !socket) return;

    socket.emit("create-game", {
      hostName: hostName.trim(),
      gameSettings: {
        teamCount: gameMode === "individual" ? 1 : teamCount,
        questionCount,
        timePerQuestion,
        gameMode
      }
    });
  };

  const joinGame = () => {
    if (!gameId.trim() || !playerName.trim() || !socket) {
      setErrorMessage("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    socket.emit("join-game", {
      gameId: gameId.trim().toUpperCase(),
      playerName: playerName.trim()
    });

    // Don't change phase yet - wait for server confirmation
    // Phase will change to "lobby" when we receive "game-updated" event
  };

  const startGame = () => {
    if (!socket || !gameId) return;
    socket.emit("start-game", { gameId });
  };

  const submitAnswer = (answerIndex: number) => {
    
    if (hasAnswered || !socket || !gameId || myTeamIndex === -1) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const timeTaken = Date.now() - answerTimeRef.current;
    const timeInSeconds = timeTaken / 1000;
    
    // Use myQuestions (shuffled uniquely for this player) instead of gameState.questions
    if (!myQuestions || myQuestions.length === 0) {
      return;
    }
    
    const originalQuestion = myQuestions[currentQuestion];
    const shuffledQ = getShuffledQuestion(originalQuestion);  
    
    // Validate IMMEDIATELY on client side
    const isCorrect = answerIndex === shuffledQ.correctAnswerIndex;
    
    // Calculate points (same formula as server)
    let points = 0;
    if (isCorrect) {
      const timeLimit = gameState?.settings?.timePerQuestion || 30;
      const speedRatio = Math.max(0, (timeLimit - timeInSeconds) / timeLimit);
      const speedBonus = Math.floor(speedRatio * 50);
      points = 100 + speedBonus;
    }
    
    
    // Update score immediately
    const newScore = myScore + points;
    setMyScore(newScore);
    
    // Show correct answer
    setCorrectAnswerIndex(shuffledQ.correctAnswerIndex);
    setShowingCorrectAnswer(true);
    
    // Send to server to update team score in realtime
    socket.emit("update-score", {
      gameId,
      teamIndex: myTeamIndex,
      points
    });
    
    // Auto-advance after 3 seconds
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }
    
    autoNextTimerRef.current = window.setTimeout(() => {
      goToNextQuestion();
    }, 3000);
  };

  const nextQuestion = () => {
    if (!socket || !gameId || !gameState || !gameState.questions) return;

    if (currentQuestion < gameState.questions.length - 1) {
      socket.emit("next-question", { gameId });
    } else {
      endGame();
    }
  };

  const goToNextQuestion = () => {
    if (!myQuestions || myQuestions.length === 0) return;
    
    const totalQuestions = myQuestions.length;
    if (currentQuestion < totalQuestions - 1) {
      // Clear auto-advance timer
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      
      // Advance to next question
      const nextQuestionIndex = currentQuestion + 1;
      setCurrentQuestion(nextQuestionIndex);
      setHasAnswered(false);
      setSelectedAnswer(null);
      setShowingCorrectAnswer(false);
      setCorrectAnswerIndex(null);
      setTimeLeft(gameState?.settings?.timePerQuestion || 30);
      startTimer();
      
      // Save progress to localStorage
      const savedSession = loadGameSession();
      if (savedSession) {
        saveGameSession({
          ...savedSession,
          currentQuestion: nextQuestionIndex,
          myScore: myScore
        });
      }
    } else {
      // Last question completed - show waiting results (leaderboard)
      setPhase("waiting-results");
      
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
      
      // Clear session - game is ending
      clearGameSession();
      
      // Notify server that player finished with final score
      if (socket && gameId) {
        socket.emit("player-finished", { 
          gameId, 
          playerId: socket.id,
          finalScore: myScore,
          teamIndex: myTeamIndex
        });
      }
    }
  };

  const endGame = () => {
    if (!socket || !gameId) return;
    socket.emit("end-game", { gameId });
  };

  const deleteGame = () => {
    if (!socket || !gameId) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGame = () => {
    if (!socket || !gameId) return;
    socket.emit("delete-game", { gameId });
    clearGameSession();
    resetGame();
    setShowDeleteConfirm(false);
  };

  const resetGame = () => {
    // Clear localStorage session
    clearGameSession();
    
    // Leave current room
    if (socket && gameId) {
      socket.emit("leave-room", { gameId });
    }
    
    // Reset all states
    setPhase("home");
    setGameId("");
    setPlayerName("");
    setHostName("");
    setTeamCount(4);
    setQuestionCount(15);
    setGameState(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setScores([]);
    setMyTeamIndex(-1);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }
  };

  const isHost = gameState && socket && gameState.host === socket.id;

  const renderHome = () => (
    <div className="multiplayer-home">
      <div className="hero-section">
        <h1 className="game-title">Trò chơi trực tuyến</h1>
        <p className="game-subtitle">Cạch tranh theo thời gian thực</p>
      </div>

      <div className="action-cards">
        <div className="action-card" onClick={() => setPhase("create")}>
          <div className="card-icon">🎮</div>
          <h3>Tạo Game Mới</h3>
          <p>Làm host và mời bạn bè tham gia</p>
        </div>

        <div className="action-card" onClick={() => setPhase("join")}>
          <div className="card-icon">🚀</div>
          <h3>Tham Gia Game</h3>
          <p>Nhập mã game để chơi cùng bạn bè</p>
        </div>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="create-game">
      <button onClick={() => setPhase("home")} className="back-button">← Quay lại</button>
      
      <div className="form-container">
        <h2>⚙️ Cấu Hình Game</h2>
        
        <div className="form-group">
          <label>Tên của bạn (Host)</label>
          <input
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Nhập tên của bạn"
            className="game-input"
          />
        </div>

        <div className="form-group">
          <label>Chế độ chơi</label>
          <div className="game-mode-selector">
            <button
              className={`mode-button ${gameMode === "team" ? "active" : ""}`}
              onClick={() => setGameMode("team")}
            >
              <span className="mode-icon">👥</span>
              <span className="mode-name">Theo Nhóm</span><br />
              <span className="mode-desc">Chia đội và tính điểm theo nhóm</span>
            </button>
            <button
              className={`mode-button ${gameMode === "individual" ? "active" : ""}`}
              onClick={() => setGameMode("individual")}
            >
              <span className="mode-icon">🏃</span>
              <span className="mode-name">Cá Nhân</span><br />
              <span className="mode-desc">Mỗi người chơi tự tính điểm</span>
            </button>
          </div>
        </div>

        {gameMode === "team" && (
          <div className="form-group">
            <label>Số lượng nhóm: {teamCount}</label>
            <input
              type="range"
              min="2"
              max="8"
              value={teamCount}
              onChange={(e) => setTeamCount(parseInt(e.target.value))}
              className="slider"
            />
            {/* <div className="slider-labels">
              <span>2 nhóm</span>
              <span>8 nhóm</span>
            </div> */}
          </div>
        )}

        <div className="form-group">
          <label>Số câu hỏi: {questionCount}</label>
          <input
            type="range"
            min="10"
            max="30"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="slider"
          />
          {/* <div className="slider-labels">
            <span>10 câu</span>
            <span>30 câu</span>
          </div> */}
        </div>

        <div className="form-group">
          <label>Thời gian mỗi câu: {timePerQuestion} giây</label>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={timePerQuestion}
            onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
            className="slider"
          />
          {/* <div className="slider-labels">
            <span>10s</span>
            <span>60s</span>
          </div> */}
        </div>

        <div className="settings-preview">
          <h3>📝 Tóm tắt:</h3>
          <ul>
            {gameMode === "team" ? (
              <>
                <li>👥 {teamCount} nhóm thi đấu</li>
                <li>🎯 Tự động phân nhóm ngẫu nhiên</li>
              </>
            ) : (
              <li>🏃 Chơi cá nhân - tính điểm riêng</li>
            )}
            <li>❓ {questionCount} câu hỏi</li>
            <li>⏱️ {timePerQuestion} giây/câu</li>
          </ul>
        </div>

        <button onClick={createGame} className="primary-button">
          Tạo Phòng Chơi
        </button>
      </div>
    </div>
  );

  const renderJoin = () => (
    <div className="join-game">
      <button onClick={() => setPhase("home")} className="back-button">← Quay lại</button>
      
      <div className="form-container">
        <h2>Tham Gia Game</h2>
        <div className="form-group">
          <label>Mã Game</label>
          <input
            type="text"
            value={gameId}
            onChange={(e) => setGameId(e.target.value.toUpperCase())}
            placeholder="Nhập mã 6 ký tự"
            maxLength={6}
            className="game-input game-code"
          />
        </div>

        <div className="form-group">
          <label>Tên của bạn</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Nhập tên của bạn"
            className="game-input"
          />
        </div>

        <div className="join-info">
          <p>Bạn sẽ được tự động phân vào nhóm khi game bắt đầu</p>
        </div>

        <button onClick={joinGame} className="primary-button">
          Tham Gia
        </button>
      </div>
    </div>
  );

  const renderLobby = () => {
    if (!gameState) return null;

    return (
      <div className="lobby">
        <div className="lobby-header">
          <h2>🎮 Phòng Chờ</h2>
          <div className="game-code-display">
            <span className="code-label">Mã Game:</span>
            <span className="code-value">{gameState.id}</span>
          </div>
        </div>

        <div className="lobby-stats">
          <div className="stat-card">
            <div><span className="stat-icon">👥 </span><span className="stat-value">{gameState.players.length}</span> <span className="stat-label"> Người chơi</span></div>
          </div>
          {gameState.settings.gameMode === "team" && (
            <div className="stat-card">
              <div><span className="stat-icon">🏆 </span><span className="stat-value">{gameState.settings.teamCount}</span><span className="stat-label"> Nhóm</span></div>
            </div>
          )}
          <div className="stat-card">
            <div><span className="stat-icon">❓ </span><span className="stat-value">{gameState.settings.questionCount}</span> <span className="stat-label"> Câu hỏi</span></div>
          </div>
        </div>

        <div className="players-waiting">
          <h3>Người chơi đang chờ ({gameState.players.length})</h3>
          <div className="players-grid">
            {gameState.players.map((player, idx) => (
              <div key={idx} className="player-card">
                <span className="player-avatar">👤</span>
                <span className="player-name">{player.name}</span>
              </div>
            ))}
          </div>
          {gameState.players.length === 0 && (
            <div className="empty-state">
              <p>Chưa có người chơi nào. Chia sẻ mã game để mời bạn bè!</p>
            </div>
          )}
        </div>

        <div className="lobby-info">
          {gameState.settings.gameMode === "team" ? (
            <p>Khi bắt đầu, tất cả người chơi sẽ được phân ngẫu nhiên vào {gameState.settings.teamCount} nhóm</p>
          ) : (
            <p>🏃 Chế độ cá nhân - Mỗi người chơi thi đấu riêng và tự tính điểm</p>
          )}
        </div>

        <div className="lobby-actions">
          {isHost ? (
            <>
              <button
                onClick={startGame}
                disabled={gameState.players.length === 0}
                className="primary-button large"
              >
                🚀 Bắt Đầu Game
              </button>
              <button
                onClick={deleteGame}
                className="delete-button"
                style={{ marginTop: '1rem' }}
              >
                🗑️ Xóa Phòng
              </button>
            </>
          ) : (
            <p className="waiting-text">Đang chờ host bắt đầu game...</p>
          )}
        </div>
      </div>
    );
  };

  const renderHostView = () => {
    if (!gameState) return null;

    const isIndividualMode = gameState.settings.gameMode === "individual";
    
    // For individual mode, sort players; for team mode, sort teams
    const realtimeScores = isIndividualMode 
      ? (() => {
          // Try to get players from scores first, fallback to gameState.players
          const playersData = scores[0]?.players && scores[0].players.length > 0
            ? scores[0].players
            : gameState.players.map(p => ({ name: p.name, score: p.score || 0 }));
          
          return [{ 
            ...scores[0], 
            players: [...playersData].sort((a, b) => b.score - a.score) 
          }];
        })()
      : [...scores].sort((a, b) => b.score - a.score);
    
    const totalPlayers = gameState.players.length;
    const progress = ((currentQuestion + 1) / gameState.settings.questionCount) * 100;

    return (
      <div className="host-view">
        <div className="host-header">
          <div className="host-title-section">
            <h2>🎯 Màn Hình Host</h2>
            <div className="live-indicator">
              <span className="live-dot"></span>
              <span>LIVE</span>
            </div>
          </div>
          {/* <div className="host-stats">
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <span className="stat-value">{totalPlayers}</span>
              <span className="stat-label">Người chơi</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">❓</span>
              <span className="stat-value">{currentQuestion + 1}/{gameState.settings.questionCount}</span>
              <span className="stat-label">Câu hỏi</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <span className="stat-value">{Math.round(progress)}%</span>
              <span className="stat-label">Tiến độ</span>
            </div>
          </div> */}
        </div>

        {/* <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div> */}

        <div className="host-leaderboard-container">
          <div className="leaderboard-header">
            <h3>🏆 Bảng Xếp Hạng</h3>
            <div className="live-badge">Cập nhật trực tiếp</div>
          </div>

          {/* Top 3 Podium */}
          <div className="podium">
            {isIndividualMode ? (
              (realtimeScores[0]?.players && realtimeScores[0].players.length > 0) ? realtimeScores[0].players.slice(0, 3).map((player, idx) => (
                <div key={idx} className={`podium-place place-${idx + 1}`}>
                  <div className="medal">
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                  </div>
                  <div className="team-info">
                    <h3>👤 {player.name}</h3>
                    <p className="score">{player.score} điểm</p>
                  </div>
                </div>
              )) : null
            ) : (
              realtimeScores.slice(0, 3).map((team, idx) => (
                <div key={team.index} className={`podium-place place-${idx + 1}`}>
                  <div className="medal">
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                  </div>
                  <div className="team-info">
                    <h3>{team.name}</h3>
                    <p className="score">{team.score} điểm</p>
                    <p className="members">👥 {team.playerCount} thành viên</p>
                    {team.players && team.players.length > 0 && (
                      <div className="podium-players">
                        {team.players.map((p, pIdx) => (
                          <span key={pIdx} className="podium-player">
                            {p.name}: <strong>{p.score}đ</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Remaining Rankings */}
          {((isIndividualMode && realtimeScores[0]?.players?.length > 3) || 
            (!isIndividualMode && realtimeScores.length > 3)) && (
            <div className="full-rankings">
              <h3>Xếp Hạng Còn Lại</h3>
              {isIndividualMode ? (
                (realtimeScores[0]?.players && realtimeScores[0].players.length > 3) ? realtimeScores[0].players.slice(3).map((player, idx) => (
                  <div key={idx} className="ranking-item">
                    <div className="ranking-header">
                      <span className="rank">#{idx + 4}</span>
                      <span className="team-name">👤 {player.name}</span>
                      <span className="team-score">{player.score} điểm</span>
                    </div>
                  </div>
                )) : null
              ) : (
                realtimeScores.slice(3).map((team, idx) => (
                  <div key={team.index} className="ranking-item">
                    <div className="ranking-header">
                      <span className="rank">#{idx + 4}</span>
                      <span className="team-name">{team.name}</span>
                      <span className="team-score">{team.score} điểm</span>
                    </div>
                    {team.players && team.players.length > 0 && (
                      <div className="ranking-players">
                        {team.players.map((p, pIdx) => (
                          <span key={pIdx} className="ranking-player">
                            {p.name}: {p.score}đ
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="host-controls">
          <button 
            onClick={endGame}
            className="primary-button large"
          >
            🏁 Kết Thúc Game
          </button>
        </div>
      </div>
    );
  };

  const renderWaitingResults = () => {
    if (!gameState) return null;

    const isIndividualMode = gameState.settings.gameMode === "individual";
    
    // For individual mode, sort players; for team mode, sort teams
    const sortedScores = isIndividualMode 
      ? (() => {
          // Try to get players from scores first, fallback to gameState.players
          const playersData = scores[0]?.players && scores[0].players.length > 0
            ? scores[0].players
            : gameState.players.map(p => ({ name: p.name, score: p.score || 0 }));
          
          return [{ 
            ...scores[0], 
            players: [...playersData].sort((a, b) => b.score - a.score) 
          }];
        })()
      : [...scores].sort((a, b) => b.score - a.score);

    return (
      <div className="waiting-results">
        <div className="waiting-header">
          <h2>✅ Bạn đã hoàn thành!</h2>
          <p className="waiting-subtitle">Đang chờ host kết thúc game...</p>
        </div>

        <div className="my-final-score">
          <div className="score-card">
            <span className="score-label">Điểm của bạn</span>
            <span className="score-value">{myScore}</span>
          </div>
        </div>

        <div className="player-leaderboard-container">
          <div className="leaderboard-header">
            <h3>🏆 Bảng Xếp Hạng</h3>
            <div className="live-badge">Cập nhật trực tiếp</div>
          </div>

          {/* Top 3 Podium */}
          {isIndividualMode ? (
            sortedScores[0]?.players && sortedScores[0].players.length > 0 && (
              <>
                <div className="podium">
                  {sortedScores[0].players.slice(0, 3).map((player, idx) => (
                    <div key={idx} className={`podium-place place-${idx + 1} ${player.name === playerName ? 'my-highlight' : ''}`}>
                      <div className="medal">
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                      </div>
                      <div className="team-info">
                        <h3>👤 {player.name}</h3>
                        <p className="score">{player.score} điểm</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Remaining Rankings */}
                {sortedScores[0].players.length > 3 && (
                  <div className="full-rankings">
                    <h3>Xếp Hạng Còn Lại</h3>
                    {sortedScores[0].players.slice(3).map((player, idx) => (
                      <div key={idx} className={`ranking-item ${player.name === playerName ? 'my-highlight' : ''}`}>
                        <div className="ranking-header">
                          <span className="rank">#{idx + 4}</span>
                          <span className="team-name">👤 {player.name}</span>
                          <span className="team-score">{player.score} điểm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          ) : (
            <>
              <div className="podium">
                {sortedScores.slice(0, 3).map((team, idx) => (
                  <div key={team.index} className={`podium-place place-${idx + 1} ${team.index === myTeamIndex ? 'my-highlight' : ''}`}>
                    <div className="medal">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <div className="team-info">
                      <h3>{team.name}</h3>
                      <p className="score">{team.score} điểm</p>
                      <p className="members">👥 {team.playerCount} thành viên</p>
                      {team.players && team.players.length > 0 && (
                        <div className="podium-players">
                          {team.players.map((p, pIdx) => (
                            <span key={pIdx} className="podium-player">
                              {p.name}: <strong>{p.score}đ</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Remaining Rankings */}
              {sortedScores.length > 3 && (
                <div className="full-rankings">
                  <h3>Xếp Hạng Còn Lại</h3>
                  {sortedScores.slice(3).map((team, idx) => (
                    <div key={team.index} className={`ranking-item ${team.index === myTeamIndex ? 'my-highlight' : ''}`}>
                      <div className="ranking-header">
                        <span className="rank">#{idx + 4}</span>
                        <span className="team-name">{team.name}</span>
                        <span className="team-score">{team.score} điểm</span>
                      </div>
                      {team.players && team.players.length > 0 && (
                        <div className="ranking-players">
                          {team.players.map((p, pIdx) => (
                            <span key={pIdx} className="ranking-player">
                              {p.name}: {p.score}đ
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderPlaying = () => {
    if (!gameState || myTeamIndex === -1) return null;
    if (!myQuestions || myQuestions.length === 0) return null;
    
    const question = myQuestions[currentQuestion];
    if (!question) return null;

    const shuffledQ = getShuffledQuestion(question);
    
    // Safety check: ensure options array exists and has content
    if (!shuffledQ.options || shuffledQ.options.length === 0) {
      console.error("Invalid question - no options:", shuffledQ);
      return <div className="error-message">Câu hỏi không hợp lệ. Vui lòng liên hệ host.</div>;
    }
    
    const isIndividualMode = gameState?.settings?.gameMode === "individual";
    const myTeam = !isIndividualMode ? gameState.teams[myTeamIndex] : null;

    return (
      <div className="playing">
        <div className="game-header">
          {!isIndividualMode && myTeam ? (
            <div className="team-badge">
              <span className="team-label">Nhóm:</span>
              <span className="team-name-badge">{myTeam.name}</span>
              <span className="my-score-badge">💎 {myTeam.score} điểm</span>
            </div>
          ) : (
            <div className="team-badge">
              <span className="team-label">👤 {playerName}</span>
              <span className="my-score-badge">💎 {myScore} điểm</span>
            </div>
          )}
          <div className={`timer ${timeLeft <= 5 ? 'urgent' : ''}`}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        <div className="question-info-bar">
          <span className="question-number">
            Câu {currentQuestion + 1}/{myQuestions.length}
          </span>
        </div>

        {isIndividualMode ? (
          <div className="mini-leaderboard">
            {/* <h4>🏆 Bảng Xếp Hạng</h4>
            <div className="mini-rankings">
              {(scores[0]?.players && scores[0].players.length > 0) && 
                [...scores[0].players].sort((a, b) => b.score - a.score).slice(0, 5).map((player, idx) => (
                  <div key={idx} className={`mini-rank-item ${player.name === playerName ? 'highlight' : ''}`}>
                    <span className="mini-rank">#{idx + 1}</span>
                    <span className="mini-name">{player.name}</span>
                    <span className="mini-score">{player.score}đ</span>
                  </div>
                ))
              }
            </div> */}
          </div>
        ) : (
          myTeam && (
            <div className="team-players-list">
              <h4>👥 Thành viên:</h4>
              <div className="teammates">
                {myTeam.players.map((player, idx) => (
                  <span key={idx} className={`teammate ${player.name === playerName ? 'me' : ''}`}>
                    {player.name === playerName && '⭐ '}
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          )
        )}

        <div className={`question-container ${questionTransition ? 'fade-out' : 'fade-in'}`}>
          <h2 className="question-text">{shuffledQ.question}</h2>

          <div className="answers-grid">
            {shuffledQ.options.map((option, idx) => {
              const isCorrectAnswer = showingCorrectAnswer && idx === correctAnswerIndex;
              const isMyAnswer = hasAnswered && idx === selectedAnswer;
              const isMyCorrectAnswer = isMyAnswer && isCorrectAnswer; // Chọn đúng - xanh lá
              const isMyWrongAnswer = isMyAnswer && showingCorrectAnswer && !isCorrectAnswer; // Chọn sai - đỏ
              const isTimeoutCorrect = isCorrectAnswer && !isMyAnswer && showingCorrectAnswer; // Không chọn, đúng - xanh dương
              const isSelected = isMyAnswer && !showingCorrectAnswer; // Vừa chọn, chưa show đáp án - vàng
              
              // Determine final class - only ONE state at a time
              let stateClass = '';
              if (isMyCorrectAnswer) {
                stateClass = 'correct';
              } else if (isMyWrongAnswer) {
                stateClass = 'incorrect';
              } else if (isTimeoutCorrect) {
                stateClass = 'timeout-correct';
              } else if (isSelected) {
                stateClass = 'selected';
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  disabled={hasAnswered}
                  className={`answer-option ${stateClass}`}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span className="option-text">{option}</span>
                  {isMyCorrectAnswer && <span className="check-mark">✓</span>}
                  {isMyWrongAnswer && <span className="x-mark">✗</span>}
                  {isTimeoutCorrect && <span className="check-mark">✓</span>}
                </button>
              );
            })}
          </div>

          {hasAnswered && showingCorrectAnswer && (
            <div className="next-question-section">
              <button 
                onClick={goToNextQuestion}
                className="next-question-button"
              >
                ➡️ Câu tiếp theo
              </button>
              <p className="auto-next-text">Hoặc đợi tự động chuyển sau 3 giây...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const isIndividualMode = gameState?.settings?.gameMode === "individual";
    
    if (isIndividualMode) {
      const allPlayers = scores[0]?.players || [];
      const playerList = allPlayers.length > 0 
        ? allPlayers 
        : (gameState?.players || []).map(p => ({ name: p.name, score: p.score || 0 })).sort((a, b) => b.score - a.score);
      
      return (
        <div className="results">
          <h1 className="results-title">🏆 Kết Quả - Chế độ Cá Nhân</h1>

          {playerList.length > 0 ? (
            <>
              <div className="podium">
                {playerList.slice(0, 3).map((player, idx) => (
                  <div key={idx} className={`podium-place place-${idx + 1}`}>
                    <div className="medal">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <div className="team-info">
                      <h3>👤 {player.name}</h3>
                      <p className="score">{player.score} điểm</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="full-rankings">
                <h3>Bảng Xếp Hạng Đầy Đủ</h3>
                {playerList.slice(3).map((player, idx) => (
                  <div key={idx} className="ranking-item">
                    <div className="ranking-header">
                      <span className="rank">#{idx + 4}</span>
                      <span className="team-name">👤 {player.name}</span>
                      <span className="team-score">{player.score} điểm</span>
                    </div>
                  </div>
                ))}
                {playerList.length <= 3 && (
                  <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                    Không có người chơi khác
                  </p>
                )}
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#fff', padding: '2rem' }}>
              Chưa có dữ liệu xếp hạng
            </p>
          )}

          <button onClick={resetGame} className="primary-button">
            Về Trang Chủ
          </button>
        </div>
      );
    }

    const sortedScores = [...scores].sort((a, b) => b.score - a.score);

    return (
      <div className="results">
        <h1 className="results-title">🏆 Kết Quả - Chế độ Nhóm</h1>

        <div className="podium">
          {sortedScores.slice(0, 3).map((team, idx) => (
            <div key={idx} className={`podium-place place-${idx + 1}`}>
              <div className="medal">
                {idx === 0 && '🥇'}
                {idx === 1 && '🥈'}
                {idx === 2 && '🥉'}
              </div>
              <div className="team-info">
                <h3>{team.name}</h3>
                <p className="score">{team.score} điểm</p>
                <p className="players">{team.playerCount} thành viên</p>
                {team.players && team.players.length > 0 && (
                  <div className="player-list">
                    {team.players.map((player, pIdx) => (
                      <div key={pIdx} className="player-item">
                        👤 {player.name}: <strong>{player.score} điểm</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="full-rankings">
          <h3>Bảng Xếp Hạng Đầy Đủ</h3>
          {sortedScores.slice(3).map((team, idx) => (
            <div key={idx} className="ranking-item">
              <div className="ranking-header">
                <span className="rank">#{idx + 4}</span>
                <span className="team-name">{team.name}</span>
                <span className="team-score">{team.score} điểm</span>
              </div>
              {team.players && team.players.length > 0 && (
                <div className="ranking-players">
                  {team.players.map((player, pIdx) => (
                    <span key={pIdx} className="ranking-player">
                      👤 {player.name} ({player.score} điểm)
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sortedScores.length <= 3 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
              Không có nhóm khác
            </p>
          )}
        </div>

        <button onClick={resetGame} className="primary-button">
          Về Trang Chủ
        </button>
      </div>
    );
  };

  return (
    <div className="multiplayer-game">
      {phase === "home" && renderHome()}
      {phase === "create" && renderCreate()}
      {phase === "join" && renderJoin()}
      {phase === "lobby" && renderLobby()}
      {phase === "host-view" && renderHostView()}
      {phase === "playing" && renderPlaying()}
      {phase === "waiting-results" && renderWaitingResults()}
      {phase === "results" && renderResults()}

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="error-toast">
          <div className="error-toast-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{errorMessage}</span>
            <button className="error-close" onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">⚠️</span>
              <h3>Xác nhận xóa phòng</h3>
            </div>
            <p className="modal-message">
              Bạn có chắc muốn xóa phòng game này?<br />
              Tất cả người chơi sẽ bị đưa ra khỏi phòng.
            </p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                Hủy
              </button>
              <button className="modal-btn modal-btn-confirm" onClick={confirmDeleteGame}>
                Xóa phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className={`countdown-number ${countdown === "GO!" ? "countdown-go" : ""}`}>
            {countdown}
          </div>
        </div>
      )}

      <style>{`
        .multiplayer-game {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5e6d3 0%, #faf8f3 50%, #f5e6d3 100%);
          position: relative;
          padding: 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .multiplayer-game::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/img/dongson-drum.png');
          background-size: contain;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.04;
          pointer-events: none;
          z-index: 0;
        }

        .multiplayer-game > * {
          position: relative;
          z-index: 1;
        }

        .multiplayer-home {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-section {
          text-align: center;
          color: #8b5a00;
          margin-bottom: 4rem;
        }

        .game-title {
          font-size: 4rem;
          font-weight: bold;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #b8860b, #cd7f32, #b8860b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
          animation: fadeInDown 0.8s ease;
        }

        .game-subtitle {
          font-size: 1.5rem;
          color: #a0662f;
          opacity: 0.9;
          animation: fadeInUp 0.8s ease;
        }

        .action-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .action-card {
          background: linear-gradient(135deg, #fff9f0 0%, #ffffff 100%);
          border: 3px solid #d4a574;
          border-radius: 20px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(184, 134, 11, 0.2);
        }

        .action-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 15px 40px rgba(184, 134, 11, 0.3);
          border-color: #b8860b;
          background: linear-gradient(135deg, #fffef9 0%, #fff9f0 100%);
        }

        .action-card:active {
          transform: translateY(-5px) scale(0.98);
        }

        .card-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
          transition: transform 0.3s ease;
        }

        .action-card:hover .card-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .action-card h3 {
          color: #b8860b;
          margin-bottom: 0.5rem;
          font-size: 1.8rem;
        }

        .action-card p {
          color: #666;
        }

        .form-container {
          max-width: 500px;
          margin: 2rem auto;
          background: white;
          border-radius: 20px;
          padding: 3rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .form-container h2 {
          color: #667eea;
          margin-bottom: 2rem;
          text-align: center;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #333;
          font-weight: 600;
        }

        .game-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .game-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .game-code {
          text-align: center;
          font-size: 2rem;
          font-weight: bold;
          letter-spacing: 0.3rem;
          text-transform: uppercase;
        }

        .back-button {
          background: rgba(255,255,255,0.2);
          color: #8b5a00;
          border: 2px solid white;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          margin-bottom: 2rem;
          transition: all 0.3s ease;
        }

        .back-button:hover {
          background: white;
          color: #667eea;
        }

        .primary-button {
          width: 100%;
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: bold;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.4);
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(184, 134, 11, 0.6);
          background: linear-gradient(135deg, #e0b380 0%, #cd7f32 100%);
        }

        .primary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-button.large {
          padding: 1.5rem 3rem;
          font-size: 1.3rem;
        }

        .delete-button {
          width: 100%;
          background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: bold;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
        }

        .delete-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(244, 67, 54, 0.6);
        }

        .delete-button:active {
          transform: translateY(0);
          box-shadow: 0 3px 10px rgba(244, 67, 54, 0.4);
        }

        /* Button press animation */
        .primary-button:active {
          transform: translateY(1px);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .lobby {
          max-width: 1200px;
          margin: 0 auto;
        }

        .lobby-header {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .lobby-header h2 {
          color: #667eea;
          margin: 0;
        }

        .game-code-display {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .code-label {
          color: #666;
          font-weight: 600;
        }

        .code-value {
          background: #b8860b;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          font-size: 1.5rem;
          font-weight: bold;
          letter-spacing: 0.2rem;
        }

        .teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .team-card {
          background: white;
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .team-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .team-header h3 {
          color: #667eea;
          margin: 0;
        }

        .player-count {
          background: #e0e7ff;
          color: #667eea;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .player-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .player-item {
          padding: 0.8rem;
          background: #f8f9fa;
          margin-bottom: 0.5rem;
          border-radius: 8px;
          color: #333;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
          background: rgba(255,255,255,0.2);
          border-radius: 15px;
          color: white;
        }

        .lobby-actions {
          text-align: center;
        }

        .waiting-text {
          color: white;
          font-size: 1.2rem;
          text-align: center;
          padding: 1rem;
          background: #b8860b;
          border-radius: 10px;
          display: inline-block;
        }

        .playing {
          max-width: 1000px;
          margin: 0 auto;
        }

        .game-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 1.5rem;
          border-radius: 15px;
          margin-bottom: 1rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .question-number {
          font-size: 1.2rem;
          font-weight: bold;
          color: #b8860b;
        }

        .timer {
          font-size: 1.5rem;
          font-weight: bold;
          color: #4caf50;
          padding: 0.5rem 1rem;
          background: #e8f5e9;
          border-radius: 10px;
        }

        .timer.urgent {
          color: #f44336;
          background: #ffebee;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .live-scores {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .score-item {
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          display: flex;
          gap: 1rem;
          align-items: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        .team-name {
          font-weight: bold;
          color: #333;
        }

        .team-score {
          background: #b8860b;
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-weight: bold;
        }

        .question-container {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .question-text {
          color: #333;
          font-size: 1.8rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .answers-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .answer-option {
          background: #f8f9fa;
          border: 3px solid transparent;
          padding: 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          font-size: 1rem;
        }

        .answer-option:hover:not(:disabled) {
          background: #e0e7ff;
          border-color: #667eea;
          transform: translateX(5px);
        }

        .answer-option:disabled {
          cursor: default;
        }

        .answer-option.selected {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-color: #2196f3;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
        }

        .answer-option.correct {
          background: #4caf50;
          border-color: #388e3c;
          color: white;
        }

        .answer-option.incorrect {
          background: #f44336;
          border-color: #d32f2f;
          color: white;
        }

        .answer-option.timeout-correct {
          background: #2196f3;
          border-color: #1976d2;
          color: white;
        }

        .option-letter {
          background: #b8860b;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }

        .answer-option.correct .option-letter,
        .answer-option.incorrect .option-letter,
        .answer-option.timeout-correct .option-letter {
          background: rgba(255,255,255,0.3);
        }

        .option-text {
          flex: 1;
          text-align: left;
        }

        .check-mark, .x-mark {
          position: absolute;
          right: 15px;
          font-size: 1.5rem;
        }

        .explanation {
          padding: 1.5rem;
          border-radius: 10px;
          border-left: 4px solid #667eea;
          background: #f8f9fa;
          margin-top: 1rem;
        }

        .explanation.correct {
          border-left-color: #4caf50;
          background: #e8f5e9;
        }

        .explanation.incorrect {
          border-left-color: #f44336;
          background: #ffebee;
        }

        .next-question-section {
          margin-top: 2rem;
          text-align: center;
          animation: fadeInUp 0.5s ease;
        }

        .next-question-button {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          border-radius: 50px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .next-question-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }

        .next-question-button:active {
          transform: translateY(-1px);
        }

        .auto-next-text {
          color: white;
          opacity: 0.8;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }

        .results {
          max-width: 1000px;
          margin: 0 auto;
        }

        .results-title {
          text-align: center;
          color: white;
          font-size: 3rem;
          margin-bottom: 3rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .podium {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .podium-place {
          background: white;
          border-radius: 15px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          transition: transform 0.3s ease;
        }

        .podium-place:hover {
          transform: translateY(-10px);
        }

        .place-1 {
          order: 2;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          animation: slideInUp 0.6s ease forwards;
          animation-delay: 0.2s;
          opacity: 0;
        }

        .place-2 {
          order: 1;
          background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
          animation: slideInUp 0.6s ease forwards;
          animation-delay: 0s;
          opacity: 0;
        }

        .place-3 {
          order: 3;
          background: linear-gradient(135deg, #cd7f32 0%, #e8b27f 100%);
          animation: slideInUp 0.6s ease forwards;
          animation-delay: 0.4s;
          opacity: 0;
        }

        .medal {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .team-info h3 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .score {
          font-size: 2rem;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 0.5rem;
        }

        .players {
          color: #666;
        }

        .player-list {
          margin-top: 1rem;
          padding: 0.75rem;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 8px;
          border-left: 3px solid #667eea;
        }

        .player-item {
          padding: 0.4rem 0;
          color: #555;
          font-size: 0.95rem;
        }

        .player-item strong {
          color: #667eea;
        }

        .full-rankings {
          background: white;
          border-radius: 15px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .full-rankings h3 {
          color: #667eea;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .ranking-item {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          gap: 0.5rem;
        }

        .ranking-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ranking-item:last-child {
          border-bottom: none;
        }

        .rank {
          font-weight: bold;
          color: #667eea;
          font-size: 1.2rem;
          width: 50px;
        }

        .ranking-item .team-name {
          flex: 1;
          font-weight: 600;
          color: #333;
        }

        .ranking-item .team-score {
          background: #b8860b;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
        }

        .ranking-players {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-left: 66px;
          margin-top: 0.5rem;
        }

        .ranking-player {
          font-size: 0.9rem;
          color: #666;
          padding: 0.3rem 0.8rem;
          background: rgba(102, 126, 234, 0.08);
          border-radius: 12px;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(1.05);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .fade-out {
          animation: fadeOut 0.3s ease forwards;
        }

        .fade-in {
          animation: fadeIn 0.4s ease forwards;
        }

        /* Countdown overlay */
        .countdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .countdown-number {
          font-size: 10rem;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 0 30px rgba(255, 255, 255, 0.5),
                       0 0 60px rgba(102, 126, 234, 0.8);
          animation: countdownPulse 1s ease;
        }

        .countdown-go {
          color: #4ade80;
          font-size: 12rem;
          text-shadow: 0 0 40px rgba(74, 222, 128, 0.8),
                       0 0 80px rgba(74, 222, 128, 0.6);
          animation: countdownGo 0.8s ease;
        }

        @keyframes countdownPulse {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes countdownGo {
          0% {
            transform: scale(0.3) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Error Toast Notification */
        .error-toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          animation: slideDown 0.3s ease-out;
        }

        .error-toast-content {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
          display: flex;
          align-items: center;
          gap: 1rem;
          min-width: 300px;
          max-width: 500px;
        }

        .error-icon {
          font-size: 1.5rem;
          animation: shake 0.5s ease-in-out;
        }

        .error-text {
          flex: 1;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .error-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          transition: background 0.2s;
        }

        .error-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @keyframes slideDown {
          from {
            transform: translate(-50%, -100px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        /* Confirmation Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: scaleIn 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .modal-icon {
          font-size: 2rem;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #2d3748;
        }

        .modal-message {
          color: #4a5568;
          font-size: 1rem;
          line-height: 1.6;
          margin: 1.5rem 0;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .modal-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-btn-cancel {
          background: #e2e8f0;
          color: #4a5568;
        }

        .modal-btn-cancel:hover {
          background: #cbd5e0;
        }

        .modal-btn-confirm {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
        }

        .modal-btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .game-title {
            font-size: 2.5rem;
          }

          .podium {
            grid-template-columns: 1fr;
          }

          .place-1, .place-2, .place-3 {
            order: initial;
          }

          .answers-grid {
            grid-template-columns: 1fr;
          }
        }

        /* New styles for updated features */
        .game-mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .mode-button {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .mode-button:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 193, 7, 0.5);
        }

        .mode-button.active {
          background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
          border-color: #ffc107;
        }

        .mode-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .mode-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #8b5a00;
          margin-bottom: 0.25rem;
        }

        .mode-desc {
          font-size: 0.85rem;
          color: #8b5a00;

        /* Compact UI styles */
        .game-header {
          padding: 1.2rem 1.8rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          margin-bottom: 1.5rem;
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.25);
        }

        .question-container {
          padding: 1rem;
        }

        .question-text {
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }

        .team-players-list li {
          padding: 0.4rem 0.6rem;
        }

        .answers-grid {
          gap: 0.7rem;
        }

        .answer-option {
          padding: 0.8rem 1rem;
        }

        .slider {
          width: 100%;
          height: 8px;
          border-radius: 5px;
          background: #e0e0e0;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #b8860b;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #b8860b;
          cursor: pointer;
          border: none;
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          color: #666;
          font-size: 0.9rem;
        }

        .settings-preview {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 10px;
          margin-top: 1.5rem;
        }

        .settings-preview h3 {
          color: #667eea;
          margin-bottom: 1rem;
        }

        .settings-preview ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .settings-preview li {
          padding: 0.5rem 0;
          color: #333;
        }

        .join-info {
          background: #fff3e0;
          padding: 1.2rem;
          border-radius: 10px;
          border-left: 4px solid #b8860b;
          margin: 1rem 0;
        }

        .join-info p {
          margin: 0;
          color: #8b5a00;
          font-weight: 600;
          font-size: 1.05rem;
        }

        .lobby-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 15px;
          text-align: center;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .stat-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          transition: transform 0.3s ease;
        }

        .stat-card:hover .stat-icon {
          transform: scale(1.2);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 0.3rem;
        }

        .stat-label {
          color: #666;
          font-size: 0.9rem;
        }

        .players-waiting {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 1rem;
        }

        .players-waiting h3 {
          color: #667eea;
          margin-bottom: 1.5rem;
        }

        .players-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .player-card {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          min-width: 150px;
          flex: 0 0 auto;
        }

        .player-avatar {
          font-size: 1.5rem;
        }

        .player-name {
          font-weight: 600;
          color: #333;
        }

        .lobby-info {
          background: #fff3e0;
          padding: 1.2rem;
          border-radius: 10px;
          border-left: 4px solid #b8860b;
          text-align: center;
          margin-bottom: 1rem;
        }

        .lobby-info p {
          margin: 0;
          color: #8b5a00;
          font-weight: 600;
          font-size: 1.05rem;
        }

        /* Host View Styles */
        .host-view {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        .host-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 2.5rem;
          border-radius: 25px;
          margin-bottom: 1.5rem;
          box-shadow: 0 15px 40px rgba(102, 126, 234, 0.35);
          position: relative;
          overflow: hidden;
        }

        .host-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="white" opacity="0.05"/></svg>');
          background-size: 150px 150px;
          opacity: 0.3;
          pointer-events: none;
        }

        .host-title-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .host-header h2 {
          color: white;
          margin: 0;
          font-size: 2.2rem;
          font-weight: 800;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .live-dot {
          width: 10px;
          height: 10px;
          background: #ff4444;
          border-radius: 50%;
          animation: livePulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 10px #ff4444;
        }

        @keyframes livePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        .host-stats {
          display: flex;
          gap: 2rem;
          position: relative;
          z-index: 1;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 1rem 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.25);
          transition: all 0.3s ease;
        }

        .stat-item:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.25);
        }

        .stat-icon {
          font-size: 1.8rem;
        }

        .stat-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 800;
          text-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .progress-bar-container {
          background: rgba(255, 255, 255, 0.1);
          height: 8px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
          border-radius: 10px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
          position: relative;
        }

        .progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .current-question-display {
          background: white;
          padding: 3rem 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          text-align: center;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .question-title {
          font-size: 2.5rem;
          color: #333;
          margin-bottom: 2rem;
          line-height: 1.4;
        }

        .timer-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .timer-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: bold;
          box-shadow: 0 5px 20px rgba(76, 175, 80, 0.4);
        }

        .timer-circle.urgent {
          background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
          animation: pulse 1s infinite;
        }

        .leaderboard {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 2.5rem;
          border-radius: 20px;
          margin-bottom: 2rem;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);
          border: 2px solid rgba(102, 126, 234, 0.1);
        }

        .leaderboard h3 {
          color: #667eea;
          margin-bottom: 2rem;
          text-align: center;
          font-size: 2rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .teams-ranking {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .rank-item {
          display: flex;
          align-items: center;
          padding: 1.5rem 1.8rem;
          border-radius: 15px;
          background: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }

        .rank-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: #667eea;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .rank-item:hover {
          transform: translateX(8px) scale(1.02);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.3);
        }

        .rank-item:hover::before {
          opacity: 1;
        }

        .rank-1 {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          border: 2px solid #f4c430;
          box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
          transform: scale(1.05);
        }

        .rank-1::after {
          content: '👑';
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2.5rem;
          opacity: 0.3;
        }

        .rank-2 {
          background: linear-gradient(135deg, #e8e8e8 0%, #f5f5f5 100%);
          border: 2px solid #d0d0d0;
          box-shadow: 0 8px 25px rgba(192, 192, 192, 0.4);
          transform: scale(1.03);
        }

        .rank-2::after {
          content: '🥈';
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          opacity: 0.3;
        }

        .rank-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
          border: 2px solid #b8722e;
          box-shadow: 0 8px 25px rgba(205, 127, 50, 0.4);
          transform: scale(1.01);
        }

        .rank-3::after {
          content: '🥉';
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          opacity: 0.3;
        }

        /* Waiting Results Styles */
        .waiting-results {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .waiting-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .waiting-header h2 {
          color: #4caf50;
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .waiting-subtitle {
          color: #666;
          font-size: 1.2rem;
        }

        .my-final-score {
          display: flex;
          justify-content: center;
          margin-bottom: 3rem;
        }

        .my-final-score .score-card {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
          padding: 2rem 4rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(184, 134, 11, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .my-final-score .score-label {
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .my-final-score .score-value {
          font-size: 4rem;
          font-weight: bold;
        }

        .my-team-highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: 2px solid #5568d3 !important;
          box-shadow: 0 10px 35px rgba(102, 126, 234, 0.5) !important;
          animation: highlightPulse 2s ease-in-out infinite;
        }

        @keyframes highlightPulse {
          0%, 100% {
            box-shadow: 0 10px 35px rgba(102, 126, 234, 0.5);
          }
          50% {
            box-shadow: 0 15px 45px rgba(102, 126, 234, 0.7);
          }
        }

        .my-team-highlight::before {
          opacity: 0 !important;
        }

        .my-team-highlight .rank-number {
          color: white !important;
          background: rgba(255, 255, 255, 0.3) !important;
        }

        .my-team-highlight .team-name-rank {
          color: white !important;
        }

        .my-team-highlight .team-members {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .my-team-highlight .team-score-rank {
          color: white !important;
          background: rgba(255, 255, 255, 0.25) !important;
        }

        /* Player Leaderboard in Waiting Results - Same style as Host View */
        .player-leaderboard-container {
          background: white;
          padding: 2.5rem;
          border-radius: 25px;
          box-shadow: 0 15px 50px rgba(102, 126, 234, 0.15);
          border: 3px solid rgba(102, 126, 234, 0.1);
        }

        .player-leaderboard-container .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid rgba(102, 126, 234, 0.1);
        }

        .player-leaderboard-container .leaderboard-header h3 {
          color: #667eea;
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .player-leaderboard-container .podium {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 1.5rem;
          margin-bottom: 3rem;
          padding: 2rem 0;
        }

        .player-leaderboard-container .podium-place {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1.5rem;
          border-radius: 20px;
          background: white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .player-leaderboard-container .podium-place::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
        }

        .player-leaderboard-container .place-1 {
          order: 2;
          transform: translateY(-20px) scale(1.1);
          z-index: 3;
        }

        .player-leaderboard-container .place-1::before {
          background: linear-gradient(90deg, #ffd700, #ffed4e);
        }

        .player-leaderboard-container .place-2 {
          order: 1;
          transform: translateY(-10px);
          z-index: 2;
        }

        .player-leaderboard-container .place-2::before {
          background: linear-gradient(90deg, #c0c0c0, #e8e8e8);
        }

        .player-leaderboard-container .place-3 {
          order: 3;
          z-index: 1;
        }

        .player-leaderboard-container .place-3::before {
          background: linear-gradient(90deg, #cd7f32, #e8a87c);
        }

        .player-leaderboard-container .medal {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 2s infinite;
        }

        .player-leaderboard-container .team-info {
          text-align: center;
        }

        .player-leaderboard-container .team-info h3 {
          color: #2c3e50;
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
        }

        .player-leaderboard-container .team-info .score {
          color: #667eea;
          font-size: 2rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }

        .player-leaderboard-container .team-info .members {
          color: #7f8c8d;
          font-size: 0.9rem;
          margin: 0.3rem 0 0 0;
        }

        .player-leaderboard-container .full-rankings {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid rgba(102, 126, 234, 0.1);
        }

        .player-leaderboard-container .full-rankings h3 {
          color: #667eea;
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .player-leaderboard-container .ranking-item {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 1.2rem 1.5rem;
          border-radius: 15px;
          margin-bottom: 1rem;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.08);
          border: 2px solid rgba(102, 126, 234, 0.1);
          transition: all 0.3s ease;
        }

        .player-leaderboard-container .ranking-item:hover {
          transform: translateX(5px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
        }

        .player-leaderboard-container .ranking-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .player-leaderboard-container .rank {
          font-size: 1.3rem;
          font-weight: 800;
          color: #667eea;
          min-width: 60px;
        }

        .player-leaderboard-container .team-name {
          flex: 1;
          font-weight: 700;
          color: #2c3e50;
          font-size: 1.1rem;
        }

        .player-leaderboard-container .team-score {
          font-size: 1.3rem;
          font-weight: 800;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 10px;
        }

        .player-leaderboard-container .ranking-players {
          margin-top: 0.8rem;
          padding-top: 0.8rem;
          border-top: 2px solid rgba(102, 126, 234, 0.1);
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .player-leaderboard-container .ranking-player {
          font-size: 0.85rem;
          color: #64748b;
          padding: 0.4rem 0.8rem;
          background: rgba(102, 126, 234, 0.08);
          border-radius: 8px;
        }

        .player-leaderboard-container .my-highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          border: 3px solid #5568d3 !important;
          box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5) !important;
          transform: scale(1.05);
        }

        .player-leaderboard-container .my-highlight .team-info h3,
        .player-leaderboard-container .my-highlight .team-info .score,
        .player-leaderboard-container .my-highlight .team-info .members,
        .player-leaderboard-container .my-highlight .rank,
        .player-leaderboard-container .my-highlight .team-name {
          color: white !important;
        }

        .player-leaderboard-container .my-highlight .team-score {
          color: white !important;
          background: rgba(255, 255, 255, 0.25) !important;
        }

        .player-leaderboard-container .my-highlight .podium-player,
        .player-leaderboard-container .my-highlight .ranking-player {
          background: rgba(255, 255, 255, 0.2) !important;
          color: white !important;
        }

        .player-leaderboard-container .my-highlight .podium-player strong {
          color: white !important;
        }

        .rank-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #e8b27f 100%);
        }

        .rank-number {
          font-size: 2.5rem;
          font-weight: 800;
          color: #667eea;
          width: 70px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 70px;
          border-radius: 50%;
          background: rgba(102, 126, 234, 0.1);
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .rank-1 .rank-number {
          color: #b8860b;
          background: rgba(255, 215, 0, 0.3);
          font-size: 3rem;
        }

        .rank-2 .rank-number {
          color: #696969;
          background: rgba(192, 192, 192, 0.4);
          font-size: 2.8rem;
        }

        .rank-3 .rank-number {
          color: #8b4513;
          background: rgba(205, 127, 50, 0.3);
          font-size: 2.6rem;
        }

        .team-info-rank {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 0;
        }

        .team-name-rank {
          font-size: 1.4rem;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank-1 .team-name-rank,
        .rank-2 .team-name-rank,
        .rank-3 .team-name-rank {
          color: #1a1a1a;
        }

        .team-members {
          color: #7f8c8d;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .rank-1 .team-members,
        .rank-2 .team-members,
        .rank-3 .team-members {
          color: rgba(0, 0, 0, 0.6);
        }

        .team-score-rank {
          font-size: 2.2rem;
          font-weight: 800;
          color: #667eea;
          background: rgba(102, 126, 234, 0.15);
          padding: 0.8rem 1.8rem;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .rank-1 .team-score-rank {
          color: #b8860b;
          background: rgba(255, 255, 255, 0.6);
          font-size: 2.5rem;
        }

        .rank-2 .team-score-rank {
          color: #696969;
          background: rgba(255, 255, 255, 0.5);
          font-size: 2.4rem;
        }

        .rank-3 .team-score-rank {
          color: #8b4513;
          background: rgba(255, 255, 255, 0.5);
          font-size: 2.3rem;
        }

        .host-controls {
          text-align: center;
          margin-top: 2rem;
        }

        .host-controls .primary-button {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          border: none;
          padding: 1.2rem 3rem;
          border-radius: 15px;
          font-size: 1.3rem;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .host-controls .primary-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 35px rgba(255, 107, 107, 0.5);
        }

        .host-controls .primary-button:active {
          transform: translateY(-1px);
        }

        /* Host View Leaderboard - Same as Results */
        .host-leaderboard-container {
          background: white;
          padding: 2.5rem;
          border-radius: 25px;
          margin-bottom: 2rem;
          box-shadow: 0 15px 50px rgba(102, 126, 234, 0.15);
          border: 3px solid rgba(102, 126, 234, 0.1);
        }

        .host-view .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid rgba(102, 126, 234, 0.1);
        }

        .host-view .leaderboard-header h3 {
          color: #667eea;
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .live-badge {
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: white;
          padding: 0.5rem 1.2rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        .live-badge::before {
          content: '●';
          color: white;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
          }
          50% {
            box-shadow: 0 4px 25px rgba(74, 222, 128, 0.5);
          }
        }

        /* Host View uses same podium and rankings as results */
        .host-view .podium {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 1.5rem;
          margin-bottom: 3rem;
          padding: 2rem 0;
        }

        .host-view .podium-place {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1.5rem;
          border-radius: 20px;
          background: white;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .host-view .podium-place::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
        }

        .host-view .place-1 {
          order: 2;
          transform: translateY(-20px) scale(1.1);
          z-index: 3;
        }

        .host-view .place-1::before {
          background: linear-gradient(90deg, #ffd700, #ffed4e);
        }

        .host-view .place-2 {
          order: 1;
          transform: translateY(-10px);
          z-index: 2;
        }

        .host-view .place-2::before {
          background: linear-gradient(90deg, #c0c0c0, #e8e8e8);
        }

        .host-view .place-3 {
          order: 3;
          z-index: 1;
        }

        .host-view .place-3::before {
          background: linear-gradient(90deg, #cd7f32, #e8a87c);
        }

        .host-view .medal {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 2s infinite;
        }

        .host-view .team-info {
          text-align: center;
        }

        .host-view .team-info h3 {
          color: #2c3e50;
          margin: 0 0 0.5rem 0;
          font-size: 1.3rem;
        }

        .host-view .team-info .score {
          color: #667eea;
          font-size: 2rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }

        .host-view .team-info .members {
          color: #7f8c8d;
          font-size: 0.9rem;
          margin: 0.3rem 0 0 0;
        }

        .podium-players {
          margin-top: 1rem;
          padding-top: 0.8rem;
          border-top: 2px solid rgba(102, 126, 234, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 200px;
        }

        .podium-player {
          font-size: 0.85rem;
          color: #64748b;
          padding: 0.4rem 0.6rem;
          background: rgba(102, 126, 234, 0.08);
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .podium-player strong {
          color: #667eea;
          font-weight: 700;
        }

        .host-view .full-rankings {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid rgba(102, 126, 234, 0.1);
        }

        .host-view .full-rankings h3 {
          color: #667eea;
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        /* Player View Updates */
        .team-badge {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 1rem 1.8rem;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
          border: 2px solid rgba(102, 126, 234, 0.1);
        }

        .team-label {
          color: #7f8c8d;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .team-name-badge {
          color: #667eea;
          font-weight: 800;
          font-size: 1.2rem;
          text-shadow: 0 1px 2px rgba(102, 126, 234, 0.1);
        }

        .my-score-badge {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #1a1a1a;
          padding: 0.5rem 1.2rem;
          border-radius: 20px;
          font-weight: 800;
          font-size: 1.1rem;
          margin-left: 0.8rem;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
          border: 2px solid rgba(255, 215, 0, 0.4);
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .my-score-badge::before {
          content: '⭐';
          font-size: 1rem;
        }

        .question-info-bar {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .team-players-list {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 1.3rem 1.5rem;
          border-radius: 15px;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.12);
          border: 2px solid rgba(102, 126, 234, 0.1);
        }

        .team-players-list h4 {
          margin: 0 0 0.8rem 0;
          color: #667eea;
          font-size: 1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .team-players-list h4::before {
          content: '👥';
          font-size: 1.1rem;
        }

        .teammates {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
        }

        .teammates li {
          background: white;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          color: #2c3e50;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(102, 126, 234, 0.15);
          transition: all 0.2s ease;
        }

        .teammates li:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .teammate {
          background: #f0f0f0;
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
          font-size: 0.85rem;
          color: #333;
        }

        .teammate.me {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          font-weight: bold;
        }

        /* Mini Leaderboard for Individual Mode */
        .mini-leaderboard {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
          padding: 1rem 1.5rem;
          border-radius: 15px;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.12);
          border: 2px solid rgba(102, 126, 234, 0.1);
        }

        .mini-leaderboard h4 {
          margin: 0 0 1rem 0;
          color: #667eea;
          font-size: 1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mini-rankings {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .mini-rank-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.6rem 1rem;
          background: white;
          border-radius: 10px;
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .mini-rank-item:hover {
          border-color: #667eea;
          transform: translateX(3px);
        }

        .mini-rank-item.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .mini-rank {
          font-size: 1rem;
          font-weight: 800;
          color: #667eea;
          min-width: 35px;
        }

        .mini-rank-item.highlight .mini-rank {
          color: white;
        }

        .mini-name {
          flex: 1;
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
        }

        .mini-rank-item.highlight .mini-name {
          color: white;
        }

        .mini-score {
          font-weight: 800;
          color: #667eea;
          font-size: 1.1rem;
          background: rgba(102, 126, 234, 0.1);
          padding: 0.3rem 0.8rem;
          border-radius: 8px;
        }

        .mini-rank-item.highlight .mini-score {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        .mini-scoreboard {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .mini-score-item {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .mini-score-item.my-team {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
        }

        .mini-rank {
          font-weight: bold;
          opacity: 0.7;
        }

        .mini-team {
          font-weight: 600;
        }

        .mini-score {
          background: rgba(0,0,0,0.1);
          padding: 0.2rem 0.6rem;
          border-radius: 5px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};
