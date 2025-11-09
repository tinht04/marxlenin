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
    
    console.log(`🎲 Shuffled ${shuffled.length} questions for player ${socketId.substring(0, 8)}...`);
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
      console.warn('⚠️ Missing correctAnswerIndex, trying to find from correctAnswer:', question.correctAnswer);
      
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
        
        console.log('✅ Found correctAnswerIndex:', originalCorrectIndex);
      } else {
        // Ultimate fallback - assume first option is correct
        console.error('❌ No correctAnswer found! Defaulting to 0');
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
          console.log(`✅ Restored ${shuffledQuestions.length} shuffled questions on rejoin`);
        }
        
        // Restore currentQuestion from localStorage (each player has their own progress)
        const restoredQuestion = savedSession?.currentQuestion ?? 0;
        setCurrentQuestion(restoredQuestion);
        console.log(`📍 Restored question progress: ${restoredQuestion + 1}/${game.questions?.length || 0}`);
        
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
            console.error(`Player "${myPlayerName}" not found in game teams`);
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
      
      console.log(`Rejoined game ${game.id} as ${amHost ? 'host' : 'player'}, phase: ${game.phase}`);
    });

    newSocket.on("rejoin-failed", () => {
      clearGameSession();
      setIsReconnecting(false);
      setPhase("home");
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
        console.log(`✅ Player received ${shuffledQuestions.length} unique shuffled questions`);
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
      console.log("Game finished!", game);
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
    });

    newSocket.on("scores-updated", ({ teams }) => {
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
        teamCount,
        questionCount,
        timePerQuestion
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
    console.log('=== submitAnswer called ===', { answerIndex, hasAnswered, socket: !!socket, gameId, myTeamIndex });
    
    if (hasAnswered || !socket || !gameId || myTeamIndex === -1) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const timeTaken = Date.now() - answerTimeRef.current;
    const timeInSeconds = timeTaken / 1000;
    
    // Use myQuestions (shuffled uniquely for this player) instead of gameState.questions
    if (!myQuestions || myQuestions.length === 0) {
      console.error('❌ No questions available for this player!');
      return;
    }
    
    const originalQuestion = myQuestions[currentQuestion];
    const shuffledQ = getShuffledQuestion(originalQuestion);
    
    // DEBUG: Log question data
    console.log('🔍 QUESTION DEBUG:', {
      questionId: originalQuestion.id,
      questionText: originalQuestion.question,
      originalCorrectIndex: originalQuestion.correctAnswerIndex,
      shuffledCorrectIndex: shuffledQ.correctAnswerIndex,
      selectedIndex: answerIndex,
      originalOptions: originalQuestion.options,
      shuffledOptions: shuffledQ.options
    });
    
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
    
    console.log(`Answer: ${isCorrect ? 'CORRECT' : 'WRONG'}, Points: ${points}, Selected: ${answerIndex}, Correct should be: ${shuffledQ.correctAnswerIndex}`);
    
    // Update score immediately
    setMyScore(prevScore => prevScore + points);
    
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
      console.log("All questions completed! Showing leaderboard...");
      setPhase("waiting-results");
      
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
      
      // Notify server that player finished
      if (socket && gameId) {
        socket.emit("player-finished", { gameId });
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
        <h1 className="game-title">🌍 Hội Nhập Kinh Tế Quiz</h1>
        <p className="game-subtitle">Thi đua theo nhóm - Realtime</p>
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
          <p>Nhập mã game để chơi cùng nhóm</p>
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
          <label>Số lượng nhóm: {teamCount}</label>
          <input
            type="range"
            min="2"
            max="8"
            value={teamCount}
            onChange={(e) => setTeamCount(parseInt(e.target.value))}
            className="slider"
          />
          <div className="slider-labels">
            <span>2 nhóm</span>
            <span>8 nhóm</span>
          </div>
        </div>

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
          <div className="slider-labels">
            <span>10 câu</span>
            <span>30 câu</span>
          </div>
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
          <div className="slider-labels">
            <span>10s</span>
            <span>60s</span>
          </div>
        </div>

        <div className="settings-preview">
          <h3>📝 Tóm tắt:</h3>
          <ul>
            <li>👥 {teamCount} nhóm thi đấu</li>
            <li>❓ {questionCount} câu hỏi</li>
            <li>⏱️ {timePerQuestion} giây/câu</li>
            <li>🎯 Tự động phân nhóm ngẫu nhiên</li>
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
          <p>💡 Bạn sẽ được tự động phân vào nhóm khi game bắt đầu</p>
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
            <div className="stat-icon">👥</div>
            <div className="stat-value">{gameState.players.length}</div>
            <div className="stat-label">Người chơi</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">{gameState.settings.teamCount}</div>
            <div className="stat-label">Nhóm</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❓</div>
            <div className="stat-value">{gameState.settings.questionCount}</div>
            <div className="stat-label">Câu hỏi</div>
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
          <p>💡 Khi bắt đầu, tất cả người chơi sẽ được phân ngẫu nhiên vào {gameState.settings.teamCount} nhóm</p>
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

    // Calculate team scores for leaderboard
    const scores = gameState.teams.map((team, idx) => ({
      index: idx,
      name: team.name,
      score: team.score,
      playerCount: team.players.length
    }));

    return (
      <div className="host-view">
        <div className="host-header">
          <h2>🎯 Màn Hình Host</h2>
          <div className="question-counter">
            Câu {currentQuestion + 1}/{gameState.settings.questionCount}
          </div>
        </div>

        <div className="leaderboard">
          <h3>🏆 Bảng Xếp Hạng Trực Tiếp</h3>
          <div className="teams-ranking">
            {scores.sort((a, b) => b.score - a.score).map((team, idx) => (
              <div key={team.index} className={`rank-item rank-${idx + 1}`}>
                <div className="rank-number">#{idx + 1}</div>
                <div className="team-info-rank">
                  <div className="team-name-rank">{team.name}</div>
                  <div className="team-members">{team.playerCount} thành viên</div>
                </div>
                <div className="team-score-rank">{team.score}</div>
              </div>
            ))}
          </div>
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

    const sortedScores = [...scores].sort((a, b) => b.score - a.score);

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

        <div className="leaderboard">
          <h3>🏆 Bảng Xếp Hạng Trực Tiếp</h3>
          <div className="teams-ranking">
            {sortedScores.map((team, idx) => (
              <div 
                key={team.index} 
                className={`rank-item rank-${idx + 1} ${team.index === myTeamIndex ? 'my-team-highlight' : ''}`}
              >
                <div className="rank-number">#{idx + 1}</div>
                <div className="team-info-rank">
                  <div className="team-name-rank">
                    {team.name}
                    {team.index === myTeamIndex && ' ⭐'}
                  </div>
                  <div className="team-members">{team.playerCount} thành viên</div>
                </div>
                <div className="team-score-rank">{team.score}</div>
              </div>
            ))}
          </div>
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
    const myTeam = gameState.teams[myTeamIndex];

    return (
      <div className="playing">
        <div className="game-header">
          <div className="team-badge">
            <span className="team-label">Nhóm:</span>
            <span className="team-name-badge">{myTeam.name}</span>
            <span className="my-score-badge">💎 {myScore} điểm</span>
          </div>
          <div className={`timer ${timeLeft <= 5 ? 'urgent' : ''}`}>
            ⏱️ {timeLeft}s
          </div>
        </div>

        <div className="question-info-bar">
          <span className="question-number">
            Câu {currentQuestion + 1}/{myQuestions.length}
          </span>
        </div>

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

        <div className="mini-scoreboard">
          {scores.slice(0, 3).map((team, idx) => (
            <div key={team.index} className={`mini-score-item ${team.index === myTeamIndex ? 'my-team' : ''}`}>
              <span className="mini-rank">#{idx + 1}</span>
              <span className="mini-team">{team.name}</span>
              <span className="mini-score">{team.score}</span>
            </div>
          ))}
        </div>

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
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);

    return (
      <div className="results">
        <h1 className="results-title">🏆 Kết Quả</h1>

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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .multiplayer-home {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-section {
          text-align: center;
          color: white;
          margin-bottom: 4rem;
        }

        .game-title {
          font-size: 4rem;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          animation: fadeInDown 0.8s ease;
        }

        .game-subtitle {
          font-size: 1.5rem;
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
          background: white;
          border-radius: 20px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .action-card:hover {
          transform: translateY(-10px) scale(1.02);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
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
          color: #667eea;
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
          color: white;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: bold;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6);
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
          background: #667eea;
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
          background: rgba(255,255,255,0.2);
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
          color: #fbfcffff;
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
          background: #667eea;
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
          background: #667eea;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
          background: #667eea;
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
          background: #667eea;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #667eea;
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
          background: #e8f5e9;
          padding: 1rem;
          border-radius: 10px;
          border-left: 4px solid #4caf50;
          margin: 1rem 0;
        }

        .join-info p {
          margin: 0;
          color: #2e7d32;
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
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .player-card {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .player-avatar {
          font-size: 1.5rem;
        }

        .player-name {
          font-weight: 600;
          color: #333;
        }

        .lobby-info {
          background: rgba(255,255,255,0.2);
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          color: white;
          margin-bottom: 1rem;
        }

        /* Host View Styles */
        .host-view {
          max-width: 1200px;
          margin: 0 auto;
        }

        .host-header {
          background: white;
          padding: 1.5rem;
          border-radius: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .host-header h2 {
          color: #667eea;
          margin: 0;
        }

        .question-counter {
          background: #667eea;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          font-weight: bold;
          font-size: 1.1rem;
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
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .leaderboard h3 {
          color: #667eea;
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 1.8rem;
        }

        .teams-ranking {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rank-item {
          display: flex;
          align-items: center;
          padding: 1.5rem;
          border-radius: 10px;
          background: #f8f9fa;
          transition: all 0.3s ease;
        }

        .rank-item:hover {
          transform: translateX(10px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .rank-1 {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
        }

        .rank-2 {
          background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
        }

        .rank-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #e8a87c 100%);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem 4rem;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
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
          color: white !important;
        }

        .my-team-highlight .rank-number,
        .my-team-highlight .team-name-rank,
        .my-team-highlight .team-members,
        .my-team-highlight .team-score-rank {
          color: white !important;
        }

        .rank-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #e8b27f 100%);
        }

        .rank-number {
          font-size: 2rem;
          font-weight: bold;
          color: #667eea;
          width: 60px;
        }

        .rank-1 .rank-number,
        .rank-2 .rank-number,
        .rank-3 .rank-number {
          color: #333;
        }

        .team-info-rank {
          flex: 1;
        }

        .team-name-rank {
          font-size: 1.3rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.3rem;
        }

        .team-members {
          color: #666;
          font-size: 0.9rem;
        }

        .team-score-rank {
          font-size: 2rem;
          font-weight: bold;
          color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          padding: 0.5rem 1.5rem;
          border-radius: 10px;
        }

        .rank-1 .team-score-rank,
        .rank-2 .team-score-rank,
        .rank-3 .team-score-rank {
          color: #333;
          background: rgba(255,255,255,0.5);
        }

        .host-controls {
          text-align: center;
        }

        /* Player View Updates */
        .team-badge {
          background: white;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .team-label {
          color: #666;
          font-size: 0.9rem;
        }

        .team-name-badge {
          color: #667eea;
          font-weight: bold;
          font-size: 1.1rem;
        }

        .my-score-badge {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #333;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
          margin-left: 0.5rem;
        }

        .question-info-bar {
          text-align: center;
          margin-bottom: 1rem;
        }

        .team-players-list {
          background: white;
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .team-players-list h4 {
          margin: 0 0 0.5rem 0;
          color: #667eea;
          font-size: 0.9rem;
        }

        .teammates {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
