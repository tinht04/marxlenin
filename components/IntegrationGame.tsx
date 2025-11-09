import React, { useState, useEffect } from "react";

type GameMode = "menu" | "match" | "timeline" | "quiz" | "results";

interface MatchItem {
  id: string;
  text: string;
  type: "concept" | "definition";
  matchId: string;
}

interface TimelineEvent {
  id: string;
  year: string;
  event: string;
  correctOrder: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const IntegrationGame: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [completedGames, setCompletedGames] = useState<Set<string>>(new Set());

  // Match Game State
  const [selectedMatch, setSelectedMatch] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [matchError, setMatchError] = useState<string>("");

  // Timeline Game State
  const [timelineItems, setTimelineItems] = useState<TimelineEvent[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Quiz Game State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const matchItems: MatchItem[] = [
    { id: "1a", text: "WTO", type: "concept", matchId: "1" },
    { id: "1b", text: "Tổ chức Thương mại Thế giới", type: "definition", matchId: "1" },
    { id: "2a", text: "FTA", type: "concept", matchId: "2" },
    { id: "2b", text: "Hiệp định Thương mại Tự do", type: "definition", matchId: "2" },
    { id: "3a", text: "ASEAN", type: "concept", matchId: "3" },
    { id: "3b", text: "Hiệp hội các quốc gia Đông Nam Á", type: "definition", matchId: "3" },
    { id: "4a", text: "CPTPP", type: "concept", matchId: "4" },
    { id: "4b", text: "Hiệp định Đối tác Toàn diện và Tiến bộ xuyên Thái Bình Dương", type: "definition", matchId: "4" },
    { id: "5a", text: "EVFTA", type: "concept", matchId: "5" },
    { id: "5b", text: "Hiệp định Thương mại Tự do Việt Nam - EU", type: "definition", matchId: "5" },
    { id: "6a", text: "RCEP", type: "concept", matchId: "6" },
    { id: "6b", text: "Hiệp định Đối tác Kinh tế Toàn diện Khu vực", type: "definition", matchId: "6" },
  ];

  const timelineEvents: TimelineEvent[] = [
    { id: "t1", year: "1995", event: "Việt Nam gia nhập ASEAN", correctOrder: 1 },
    { id: "t2", year: "1998", event: "Gia nhập APEC", correctOrder: 2 },
    { id: "t3", year: "2007", event: "Việt Nam chính thức gia nhập WTO", correctOrder: 3 },
    { id: "t4", year: "2019", event: "Hiệp định EVFTA được ký kết", correctOrder: 4 },
    { id: "t5", year: "2020", event: "Việt Nam phê chuẩn EVFTA và CPTPP có hiệu lực", correctOrder: 5 },
    { id: "t6", year: "2022", event: "RCEP có hiệu lực với Việt Nam", correctOrder: 6 },
  ];

  const quizQuestions: QuizQuestion[] = [
    {
      id: "q1",
      question: "Việt Nam gia nhập WTO vào năm nào?",
      options: ["2005", "2007", "2010", "2015"],
      correctAnswer: 1,
      explanation: "Việt Nam chính thức trở thành thành viên thứ 150 của WTO vào ngày 11/01/2007."
    },
    {
      id: "q2",
      question: "Tác động tích cực của hội nhập kinh tế quốc tế đối với Việt Nam là gì?",
      options: [
        "Tăng cường cạnh tranh và nâng cao chất lượng sản phẩm",
        "Giảm xuất khẩu",
        "Tăng rào cản thương mại",
        "Giảm đầu tư nước ngoài"
      ],
      correctAnswer: 0,
      explanation: "Hội nhập kinh tế giúp tăng cường cạnh tranh, thúc đẩy đổi mới và nâng cao chất lượng sản phẩm Việt Nam."
    },
    {
      id: "q3",
      question: "EVFTA là hiệp định thương mại tự do giữa Việt Nam và khu vực nào?",
      options: ["Châu Á", "Liên minh Châu Âu", "Bắc Mỹ", "Châu Phi"],
      correctAnswer: 1,
      explanation: "EVFTA (EU-Vietnam Free Trade Agreement) là hiệp định thương mại tự do giữa Việt Nam và Liên minh Châu Âu."
    },
    {
      id: "q4",
      question: "Thách thức nào sau đây là do hội nhập kinh tế quốc tế mang lại?",
      options: [
        "Tăng dân số",
        "Cạnh tranh gay gắt với hàng hóa nước ngoài",
        "Giảm GDP",
        "Tăng thuế xuất khẩu"
      ],
      correctAnswer: 1,
      explanation: "Hội nhập kinh tế đặt ra thách thức về cạnh tranh với hàng hóa nước ngoài có chất lượng cao."
    },
    {
      id: "q5",
      question: "CPTPP có bao nhiêu thành viên?",
      options: ["8", "10", "11", "15"],
      correctAnswer: 2,
      explanation: "CPTPP có 11 quốc gia thành viên sau khi Mỹ rút khỏi TPP."
    }
  ];

  useEffect(() => {
    if (gameMode === "timeline") {
      const shuffled = [...timelineEvents].sort(() => Math.random() - 0.5);
      setTimelineItems(shuffled);
    }
  }, [gameMode]);

  const handleMatchClick = (item: MatchItem) => {
    if (matchedPairs.has(item.matchId)) return;
    
    if (selectedMatch.length === 0) {
      setSelectedMatch([item.id]);
      setMatchError("");
    } else if (selectedMatch.length === 1) {
      const firstItem = matchItems.find(i => i.id === selectedMatch[0]);
      if (!firstItem) return;

      if (firstItem.matchId === item.matchId && firstItem.type !== item.type) {
        setMatchedPairs(new Set([...matchedPairs, item.matchId]));
        setScore(score + 10);
        setSelectedMatch([]);
        setMatchError("");
        
        if (matchedPairs.size + 1 === matchItems.length / 2) {
          setTimeout(() => {
            setCompletedGames(new Set([...completedGames, "match"]));
            setTotalScore(totalScore + score + 10);
            setGameMode("menu");
          }, 1000);
        }
      } else {
        setMatchError("Không đúng! Thử lại.");
        setSelectedMatch([]);
      }
    }
  };

  const checkTimeline = () => {
    const isCorrect = timelineItems.every((item, index) => 
      item.correctOrder === index + 1
    );
    
    if (isCorrect) {
      const points = 50;
      setScore(score + points);
      setCompletedGames(new Set([...completedGames, "timeline"]));
      setTotalScore(totalScore + score + points);
      setTimeout(() => setGameMode("menu"), 1500);
    } else {
      setMatchError("Chưa đúng thứ tự! Hãy thử lại.");
      setTimeout(() => setMatchError(""), 2000);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedItem) return;
    
    const newItems = [...timelineItems];
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem);
    const targetIndex = newItems.findIndex(item => item.id === targetId);
    
    [newItems[draggedIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[draggedIndex]];
    
    setTimelineItems(newItems);
    setDraggedItem(null);
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuizIndex] = answerIndex;
    setQuizAnswers(newAnswers);
    
    if (currentQuizIndex < quizQuestions.length - 1) {
      setTimeout(() => setCurrentQuizIndex(currentQuizIndex + 1), 500);
    } else {
      const correctCount = newAnswers.filter((ans, idx) => 
        ans === quizQuestions[idx].correctAnswer
      ).length;
      const points = correctCount * 20;
      setScore(points);
      setCompletedGames(new Set([...completedGames, "quiz"]));
      setTotalScore(totalScore + points);
      setTimeout(() => setGameMode("results"), 1000);
    }
  };

  const resetGame = () => {
    setGameMode("menu");
    setScore(0);
    setTotalScore(0);
    setCompletedGames(new Set());
    setSelectedMatch([]);
    setMatchedPairs(new Set());
    setMatchError("");
    setCurrentQuizIndex(0);
    setQuizAnswers([]);
  };

  const renderMenu = () => (
    <div className="integration-game-menu">
      <div className="game-header">
        <h1>🌏 Hội Nhập Kinh Tế Quốc Tế</h1>
        <p className="subtitle">Khám phá hành trình hội nhập của Việt Nam</p>
        <div className="total-score">
          <span className="score-label">Tổng điểm:</span>
          <span className="score-value">{totalScore}</span>
        </div>
      </div>
      
      <div className="game-cards">
        <div 
          className={`game-card ${completedGames.has("match") ? "completed" : ""}`}
          onClick={() => {
            setScore(0);
            setSelectedMatch([]);
            setMatchedPairs(new Set());
            setGameMode("match");
          }}
        >
          <div className="card-icon">🔗</div>
          <h3>Ghép Đôi</h3>
          <p>Nối các thuật ngữ với định nghĩa</p>
          {completedGames.has("match") && <div className="completed-badge">✓ Hoàn thành</div>}
        </div>

        <div 
          className={`game-card ${completedGames.has("timeline") ? "completed" : ""}`}
          onClick={() => {
            setScore(0);
            setMatchError("");
            setGameMode("timeline");
          }}
        >
          <div className="card-icon">📅</div>
          <h3>Dòng Thời Gian</h3>
          <p>Sắp xếp các mốc lịch sử</p>
          {completedGames.has("timeline") && <div className="completed-badge">✓ Hoàn thành</div>}
        </div>

        <div 
          className={`game-card ${completedGames.has("quiz") ? "completed" : ""}`}
          onClick={() => {
            setScore(0);
            setCurrentQuizIndex(0);
            setQuizAnswers([]);
            setGameMode("quiz");
          }}
        >
          <div className="card-icon">❓</div>
          <h3>Trắc Nghiệm</h3>
          <p>Kiểm tra kiến thức</p>
          {completedGames.has("quiz") && <div className="completed-badge">✓ Hoàn thành</div>}
        </div>
      </div>

      <div className="game-info">
        <div className="info-card">
          <span className="emoji">🏆</span>
          <p>Hoàn thành tất cả mini-games để đạt điểm cao nhất!</p>
        </div>
      </div>
    </div>
  );

  const renderMatchGame = () => {
    const concepts = matchItems.filter(item => item.type === "concept");
    const definitions = matchItems.filter(item => item.type === "definition");

    return (
      <div className="match-game">
        <div className="game-top-bar">
          <button onClick={() => setGameMode("menu")} className="back-btn">← Quay lại</button>
          <h2>🔗 Ghép Đôi Thuật Ngữ</h2>
          <div className="game-score">Điểm: {score}</div>
        </div>

        <p className="game-instruction">Nhấn vào thuật ngữ và định nghĩa tương ứng để ghép đôi</p>
        
        {matchError && <div className="error-message">{matchError}</div>}
        
        <div className="match-container">
          <div className="match-column">
            <h3>Thuật ngữ</h3>
            {concepts.map(item => (
              <div
                key={item.id}
                className={`match-item concept ${
                  selectedMatch.includes(item.id) ? "selected" : ""
                } ${matchedPairs.has(item.matchId) ? "matched" : ""}`}
                onClick={() => handleMatchClick(item)}
              >
                {matchedPairs.has(item.matchId) && <span className="check-icon">✓</span>}
                {item.text}
              </div>
            ))}
          </div>

          <div className="match-column">
            <h3>Định nghĩa</h3>
            {definitions.map(item => (
              <div
                key={item.id}
                className={`match-item definition ${
                  selectedMatch.includes(item.id) ? "selected" : ""
                } ${matchedPairs.has(item.matchId) ? "matched" : ""}`}
                onClick={() => handleMatchClick(item)}
              >
                {matchedPairs.has(item.matchId) && <span className="check-icon">✓</span>}
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="match-progress">
          Đã ghép: {matchedPairs.size}/{matchItems.length / 2}
        </div>
      </div>
    );
  };

  const renderTimelineGame = () => (
    <div className="timeline-game">
      <div className="game-top-bar">
        <button onClick={() => setGameMode("menu")} className="back-btn">← Quay lại</button>
        <h2>📅 Dòng Thời Gian Hội Nhập</h2>
        <div className="game-score">Điểm: {score}</div>
      </div>

      <p className="game-instruction">Kéo thả các sự kiện để sắp xếp theo đúng thứ tự thời gian</p>
      
      {matchError && <div className="error-message">{matchError}</div>}

      <div className="timeline-container">
        {timelineItems.map((item, index) => (
          <div
            key={item.id}
            className="timeline-item"
            draggable
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(item.id)}
          >
            <div className="timeline-number">{index + 1}</div>
            <div className="timeline-content">
              <div className="timeline-year">{item.year}</div>
              <div className="timeline-event">{item.event}</div>
            </div>
            <div className="drag-handle">⋮⋮</div>
          </div>
        ))}
      </div>

      <button onClick={checkTimeline} className="check-btn">
        Kiểm Tra Đáp Án
      </button>
    </div>
  );

  const renderQuizGame = () => {
    const currentQuestion = quizQuestions[currentQuizIndex];
    const isAnswered = quizAnswers[currentQuizIndex] !== undefined;

    return (
      <div className="quiz-game">
        <div className="game-top-bar">
          <button onClick={() => setGameMode("menu")} className="back-btn">← Quay lại</button>
          <h2>❓ Trắc Nghiệm Kiến Thức</h2>
          <div className="game-score">Câu {currentQuizIndex + 1}/{quizQuestions.length}</div>
        </div>

        <div className="quiz-container">
          <div className="quiz-question">
            <h3>{currentQuestion.question}</h3>
          </div>

          <div className="quiz-options">
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className={`quiz-option ${
                  isAnswered && index === currentQuestion.correctAnswer ? "correct" : ""
                } ${
                  isAnswered && index === quizAnswers[currentQuizIndex] && index !== currentQuestion.correctAnswer ? "incorrect" : ""
                } ${
                  isAnswered && index === quizAnswers[currentQuizIndex] ? "selected" : ""
                }`}
                onClick={() => !isAnswered && handleQuizAnswer(index)}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
                {isAnswered && index === currentQuestion.correctAnswer && <span className="check-icon">✓</span>}
                {isAnswered && index === quizAnswers[currentQuizIndex] && index !== currentQuestion.correctAnswer && <span className="x-icon">✗</span>}
              </div>
            ))}
          </div>

          {isAnswered && (
            <div className={`quiz-explanation ${quizAnswers[currentQuizIndex] === currentQuestion.correctAnswer ? "correct" : "incorrect"}`}>
              <strong>Giải thích:</strong> {currentQuestion.explanation}
            </div>
          )}

          <div className="quiz-progress">
            <div 
              className="quiz-progress-bar" 
              style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const correctCount = quizAnswers.filter((ans, idx) => 
      ans === quizQuestions[idx].correctAnswer
    ).length;

    return (
      <div className="quiz-results">
        <h2>🎉 Kết Quả Trắc Nghiệm</h2>
        
        <div className="results-summary">
          <div className="result-stat">
            <div className="stat-value">{correctCount}/{quizQuestions.length}</div>
            <div className="stat-label">Câu đúng</div>
          </div>
          <div className="result-stat">
            <div className="stat-value">{score}</div>
            <div className="stat-label">Điểm</div>
          </div>
        </div>

        <div className="results-details">
          {quizQuestions.map((question, index) => (
            <div key={question.id} className="result-item">
              <div className={`result-icon ${quizAnswers[index] === question.correctAnswer ? "correct" : "incorrect"}`}>
                {quizAnswers[index] === question.correctAnswer ? "✓" : "✗"}
              </div>
              <div className="result-content">
                <p className="result-question">{question.question}</p>
                <p className="result-answer">
                  Đáp án đúng: <strong>{question.options[question.correctAnswer]}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setGameMode("menu")} className="menu-btn">
          Về Menu
        </button>
      </div>
    );
  };

  return (
    <div className="integration-game-container">
      {gameMode === "menu" && renderMenu()}
      {gameMode === "match" && renderMatchGame()}
      {gameMode === "timeline" && renderTimelineGame()}
      {gameMode === "quiz" && renderQuizGame()}
      {gameMode === "results" && renderResults()}

      <style>{`
        .integration-game-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .integration-game-menu {
          max-width: 1200px;
          margin: 0 auto;
        }

        .game-header {
          text-align: center;
          color: white;
          margin-bottom: 3rem;
        }

        .game-header h1 {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 1rem;
        }

        .total-score {
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          border-radius: 50px;
          display: inline-block;
          margin-top: 1rem;
        }

        .score-label {
          font-size: 1rem;
          margin-right: 0.5rem;
        }

        .score-value {
          font-size: 2rem;
          font-weight: bold;
          color: #ffd700;
        }

        .game-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .game-card {
          background: white;
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        }

        .game-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .game-card.completed {
          background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
        }

        .card-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .game-card h3 {
          color: #333;
          margin-bottom: 0.5rem;
        }

        .game-card p {
          color: #666;
          font-size: 0.9rem;
        }

        .completed-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #4caf50;
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .game-info {
          text-align: center;
        }

        .info-card {
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 15px;
          color: white;
          display: inline-block;
        }

        .info-card .emoji {
          font-size: 2rem;
          margin-right: 0.5rem;
        }

        .game-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 1rem 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .game-top-bar h2 {
          color: #667eea;
          margin: 0;
        }

        .back-btn, .check-btn, .menu-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .back-btn:hover, .check-btn:hover, .menu-btn:hover {
          background: #5568d3;
          transform: scale(1.05);
        }

        .game-score {
          background: #ffd700;
          color: #333;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
        }

        .game-instruction {
          background: white;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 2rem;
          color: #666;
        }

        .error-message {
          background: #ff5252;
          color: white;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 1rem;
          animation: shake 0.5s;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        /* Match Game Styles */
        .match-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .match-column h3 {
          color: white;
          text-align: center;
          margin-bottom: 1rem;
        }

        .match-item {
          background: white;
          padding: 1.2rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        .match-item:hover {
          transform: translateX(10px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .match-item.selected {
          background: #ffeb3b;
          transform: scale(1.05);
        }

        .match-item.matched {
          background: #4caf50;
          color: white;
          cursor: default;
        }

        .match-item.matched:hover {
          transform: none;
        }

        .check-icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.5rem;
          color: white;
        }

        .match-progress {
          background: white;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          font-weight: bold;
          color: #667eea;
        }

        /* Timeline Game Styles */
        .timeline-container {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
        }

        .timeline-item {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          cursor: move;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .timeline-item:hover {
          transform: scale(1.02);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .timeline-number {
          background: rgba(255,255,255,0.3);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
        }

        .timeline-content {
          flex: 1;
        }

        .timeline-year {
          font-weight: bold;
          font-size: 1.2rem;
          margin-bottom: 0.3rem;
        }

        .timeline-event {
          opacity: 0.9;
        }

        .drag-handle {
          font-size: 1.5rem;
          opacity: 0.5;
        }

        .check-btn {
          width: 100%;
          max-width: 400px;
          display: block;
          margin: 0 auto;
          padding: 1rem 2rem;
        }

        /* Puzzle Game Styles */
        .puzzle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 2rem;
          border-radius: 15px;
        }

        .puzzle-piece {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
        }

        .puzzle-piece:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .puzzle-piece.empty {
          background: #f0f0f0;
          cursor: default;
        }

        .puzzle-piece.empty:hover {
          transform: none;
          box-shadow: none;
        }

        .puzzle-emoji {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .puzzle-label {
          font-size: 0.9rem;
          font-weight: bold;
        }

        /* Quiz Game Styles */
        .quiz-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .quiz-question {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          text-align: center;
        }

        .quiz-question h3 {
          color: #333;
          font-size: 1.5rem;
          margin: 0;
        }

        .quiz-options {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .quiz-option {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .quiz-option:hover {
          background: #f0f0f0;
          transform: translateX(10px);
        }

        .quiz-option.selected {
          background: #ffeb3b;
        }

        .quiz-option.correct {
          background: #4caf50;
          color: white;
        }

        .quiz-option.incorrect {
          background: #ff5252;
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
        }

        .quiz-option.correct .option-letter,
        .quiz-option.incorrect .option-letter {
          background: rgba(255,255,255,0.3);
        }

        .option-text {
          flex: 1;
        }

        .x-icon {
          position: absolute;
          right: 20px;
          font-size: 1.5rem;
        }

        .quiz-explanation {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border-left: 4px solid #667eea;
        }

        .quiz-explanation.correct {
          border-left-color: #4caf50;
        }

        .quiz-explanation.incorrect {
          border-left-color: #ff5252;
        }

        .quiz-progress {
          background: white;
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
        }

        .quiz-progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        /* Results Styles */
        .quiz-results {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 3rem;
          border-radius: 20px;
        }

        .quiz-results h2 {
          text-align: center;
          color: #667eea;
          margin-bottom: 2rem;
        }

        .results-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .result-stat {
          text-align: center;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          color: white;
        }

        .stat-value {
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1.2rem;
          opacity: 0.9;
        }

        .results-details {
          margin-bottom: 2rem;
        }

        .result-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .result-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .result-icon.correct {
          background: #4caf50;
          color: white;
        }

        .result-icon.incorrect {
          background: #ff5252;
          color: white;
        }

        .result-content {
          flex: 1;
        }

        .result-question {
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #333;
        }

        .result-answer {
          color: #666;
          font-size: 0.9rem;
        }

        .menu-btn {
          width: 100%;
          max-width: 300px;
          display: block;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .integration-game-container {
            padding: 1rem;
          }

          .game-header h1 {
            font-size: 2rem;
          }

          .match-container {
            grid-template-columns: 1fr;
          }

          .puzzle-grid {
            padding: 1rem;
          }

          .results-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
