import React, { useState, useEffect } from "react";
import { 
  type MatchItem, 
  type TimelineEvent, 
  type QuizQuestion,
  matchItems,
  timelineEvents,
  quizQuestions
} from "../data/integrationGameData";

type GameMode = "menu" | "match" | "timeline" | "quiz" | "results";

export const IntegrationGame: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>("menu");
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [completedGames, setCompletedGames] = useState<Set<string>>(new Set());

  // Match Game State
  const [selectedMatch, setSelectedMatch] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [matchError, setMatchError] = useState<string>("");
  const [shuffledMatchItems, setShuffledMatchItems] = useState<{
    terms: MatchItem[];
    definitions: MatchItem[];
  }>({ terms: [], definitions: [] });

  // Timeline Game State
  const [timelineItems, setTimelineItems] = useState<TimelineEvent[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [eventCards, setEventCards] = useState<TimelineEvent[]>([]);
  const [droppedEvents, setDroppedEvents] = useState<Map<string, TimelineEvent>>(new Map());

  // Quiz Game State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  useEffect(() => {
    if (gameMode === "timeline") {
      // Shuffle event cards for random positions each time
      const shuffled = [...timelineEvents].sort(() => Math.random() - 0.5);
      setEventCards(shuffled);
      setDroppedEvents(new Map());
      setTimelineItems(timelineEvents); // Keep original for year markers
    } else if (gameMode === "match") {
      // Shuffle match items when entering match game
      const concepts = matchItems.filter(item => item.type === "concept");
      const definitions = matchItems.filter(item => item.type === "definition");
      
      setShuffledMatchItems({
        terms: [...concepts].sort(() => Math.random() - 0.5),
        definitions: [...definitions].sort(() => Math.random() - 0.5)
      });
      
      setSelectedMatch([]);
      setMatchedPairs(new Set());
      setMatchError("");
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
    // Check if all events are correctly placed on their years
    if (droppedEvents.size !== timelineEvents.length) {
      setMatchError("Vui lòng xếp tất cả sự kiện vào các năm!");
      setTimeout(() => setMatchError(""), 2000);
      return;
    }

    let allCorrect = true;
    droppedEvents.forEach((event, year) => {
      if (event.year !== year) {
        allCorrect = false;
      }
    });
    
    if (allCorrect) {
      const points = 50;
      setScore(score + points);
      setCompletedGames(new Set([...completedGames, "timeline"]));
      setTotalScore(totalScore + score + points);
      setTimeout(() => setGameMode("menu"), 1500);
    } else {
      setMatchError("Một số sự kiện chưa đúng năm! Hãy thử lại.");
      setTimeout(() => setMatchError(""), 2000);
    }
  };

  const handleDragStart = (e: React.DragEvent, event: TimelineEvent) => {
    setDraggedItem(event.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnYear = (year: string) => {
    if (!draggedItem) return;
    
    const draggedEvent = eventCards.find(e => e.id === draggedItem);
    if (!draggedEvent) return;

    // Remove event from previous year if it was already placed
    const newDroppedEvents = new Map(droppedEvents);
    newDroppedEvents.forEach((evt: TimelineEvent, yr) => {
      if (evt && evt.id === draggedEvent.id) {
        newDroppedEvents.delete(yr);
      }
    });

    // Place event on this year
    newDroppedEvents.set(year, draggedEvent);
    setDroppedEvents(newDroppedEvents);
    setDraggedItem(null);
  };

  const handleRemoveEvent = (year: string) => {
    const newDroppedEvents = new Map(droppedEvents);
    newDroppedEvents.delete(year);
    setDroppedEvents(newDroppedEvents);
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
    setEventCards([]);
    setDroppedEvents(new Map());
  };

  const renderMenu = () => (
    <div className="integration-game-menu">
      <div className="game-header">
        <h1>Hội Nhập Kinh Tế Quốc Tế</h1>
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
            {shuffledMatchItems.terms.map(item => (
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
            {shuffledMatchItems.definitions.map(item => (
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

  const renderTimelineGame = () => {
    // Get available events that haven't been placed yet
    const availableEvents = eventCards.filter(
      event => !Array.from(droppedEvents.values()).some((e: TimelineEvent) => e.id === event.id)
    );

    return (
      <div className="timeline-game-modern">
        <div className="game-top-bar">
          <button onClick={() => setGameMode("menu")} className="back-btn">← Quay lại</button>
          <h2>📅 Dòng Thời Gian Hội Nhập</h2>
          <div className="game-score">Điểm: {score}</div>
        </div>

        <p className="game-instruction">
          Kéo các sự kiện từ khung bên trái và thả vào đúng năm trên dòng thời gian
        </p>
        
        {matchError && <div className="error-message">{matchError}</div>}

        <div className="timeline-game-layout">
          {/* Event Cards Pool */}
          <div className="event-cards-pool">
            <h3>📋 Sự kiện</h3>
            <div className="event-cards-list">
              {availableEvents.map(event => (
                <div
                  key={event.id}
                  className="event-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, event)}
                >
                  <div className="event-card-icon">📌</div>
                  <div className="event-card-content">{event.event}</div>
                  <div className="drag-handle-card">⋮⋮</div>
                </div>
              ))}
              {availableEvents.length === 0 && (
                <div className="empty-pool">
                  ✓ Tất cả sự kiện đã được xếp
                </div>
              )}
            </div>
          </div>

          {/* Visual Timeline */}
          <div className="visual-timeline">
            <div className="timeline-line"></div>
            {timelineItems.map((item, index) => {
              const placedEvent = droppedEvents.get(item.year);
              const isCorrect = placedEvent && placedEvent.year === item.year;
              
              return (
                <div 
                  key={item.year} 
                  className="timeline-year-marker"
                  style={{
                    top: `${50 + index * 100}px`
                  }}
                >
                  <div className="year-dot"></div>
                  <div className="year-label">{item.year}</div>
                  
                  <div 
                    className={`year-drop-zone ${placedEvent ? 'has-event' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnYear(item.year)}
                  >
                    {placedEvent ? (
                      <div className="placed-event">
                        <button 
                          className="remove-event-btn"
                          onClick={() => handleRemoveEvent(item.year)}
                          title="Xóa sự kiện"
                        >
                          ✕
                        </button>
                        <div className="placed-event-text">{placedEvent.event}</div>
                      </div>
                    ) : (
                      <div className="drop-zone-placeholder">
                        Thả sự kiện vào đây
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="timeline-actions">
          <div className="timeline-progress">
            Đã xếp: {droppedEvents.size}/{timelineEvents.length} sự kiện
          </div>
          <button onClick={checkTimeline} className="check-btn">
            ✓ Kiểm Tra Đáp Án
          </button>
        </div>
      </div>
    );
  };

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
          background: linear-gradient(135deg, #f5e6d3 0%, #faf8f3 50%, #f5e6d3 100%);
          padding: 2rem;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          position: relative;
        }

        .integration-game-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url('/img/dongson-drum.png');
          background-size: 1200px 1200px;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.18;
          pointer-events: none;
          z-index: 0;
        }

        .integration-game-menu {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .game-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .game-header h1 {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #b8860b 0%, #d4a574 50%, #cd7f32 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 800;
        }

        .subtitle {
          font-size: 1.2rem;
          color: #8b5a00;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .total-score {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border: 2px solid #d4a574;
          padding: 1rem 2rem;
          border-radius: 50px;
          display: inline-block;
          margin-top: 1rem;
          box-shadow: 0 4px 12px rgba(184, 134, 11, 0.2);
        }

        .score-label {
          font-size: 1rem;
          margin-right: 0.5rem;
          color: #8b5a00;
          font-weight: 600;
        }

        .score-value {
          font-size: 2rem;
          font-weight: bold;
          background: linear-gradient(135deg, #b8860b, #cd7f32);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .game-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .game-card {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(184, 134, 11, 0.2);
          position: relative;
          overflow: hidden;
        }

        .game-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 15px 40px rgba(184, 134, 11, 0.35);
          border-color: #b8860b;
        }

        .game-card.completed {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          border-color: #4caf50;
        }

        .card-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .game-card h3 {
          color: #8b5a00;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .game-card p {
          color: #8b5a00;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .completed-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #4caf50, #45a049);
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        .game-info {
          text-align: center;
        }

        .info-card {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border: 2px solid #d4a574;
          padding: 1.5rem;
          border-radius: 15px;
          color: #8b5a00;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(184, 134, 11, 0.2);
        }

        .info-card .emoji {
          font-size: 2rem;
          margin-right: 0.5rem;
        }

        .game-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1rem 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.15);
          position: relative;
          z-index: 1;
        }

        .game-top-bar h2 {
          color: #8b5a00;
          margin: 0;
          font-weight: 700;
        }

        .back-btn, .check-btn, .menu-btn {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(184, 134, 11, 0.3);
        }

        .back-btn:hover, .check-btn:hover, .menu-btn:hover {
          background: linear-gradient(135deg, #b8860b 0%, #d4a574 100%);
          transform: scale(1.05);
          box-shadow: 0 6px 18px rgba(184, 134, 11, 0.4);
        }

        .game-score {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border: 2px solid #d4a574;
          color: #8b5a00;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
        }

        .game-instruction {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 2rem;
          color: #8b5a00;
          font-weight: 600;
        }

        .error-message {
          background: linear-gradient(135deg, #ff5252, #d32f2f);
          color: white;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 1rem;
          animation: shake 0.5s;
          box-shadow: 0 4px 12px rgba(255, 82, 82, 0.3);
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
          position: relative;
          z-index: 1;
        }

        .match-column h3 {
          color: #8b5a00;
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border: 2px solid #d4a574;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 1rem;
          font-weight: 700;
        }

        .match-item {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1.2rem;
          border-radius: 10px;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 3px 10px rgba(184, 134, 11, 0.15);
          color: #333;
        }

        .match-item:hover {
          transform: translateX(10px);
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.25);
          border-color: #b8860b;
        }

        .match-item.selected {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border-color: #b8860b;
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(184, 134, 11, 0.3);
        }

        .match-item.matched {
          background: linear-gradient(135deg, #4caf50, #45a049);
          border-color: #2e7d32;
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
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1rem;
          border-radius: 10px;
          text-align: center;
          font-weight: bold;
          color: #8b5a00;
        }

        /* Timeline Game Styles */
        .timeline-game-modern {
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .timeline-game-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        /* Event Cards Pool */
        .event-cards-pool {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(184, 134, 11, 0.15);
          max-height: 600px;
          overflow-y: auto;
        }

        .event-cards-pool h3 {
          color: #8b5a00;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          font-weight: 700;
        }

        .event-cards-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .event-card {
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          color: white;
          padding: 1rem;
          border-radius: 10px;
          cursor: grab;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          transition: all 0.3s ease;
          box-shadow: 0 3px 10px rgba(184, 134, 11, 0.3);
        }

        .event-card:active {
          cursor: grabbing;
          opacity: 0.7;
        }

        .event-card:hover {
          transform: translateX(5px);
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.4);
        }

        .event-card-icon {
          font-size: 1.3rem;
          opacity: 0.9;
        }

        .event-card-content {
          flex: 1;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .drag-handle-card {
          font-size: 1.2rem;
          opacity: 0.5;
        }

        .empty-pool {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          border: 2px solid #4caf50;
          color: #2e7d32;
          padding: 2rem;
          border-radius: 10px;
          text-align: center;
          font-weight: bold;
        }

        /* Visual Timeline */
        .visual-timeline {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 2rem 3rem 3rem 3rem;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(184, 134, 11, 0.15);
          position: relative;
          min-height: 750px;
        }

        .timeline-line {
          position: absolute;
          left: 100px;
          top: 50px;
          bottom: 80px;
          width: 4px;
          background: linear-gradient(180deg, #b8860b 0%, #d4a574 50%, #cd7f32 100%);
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(184, 134, 11, 0.3);
        }

        .timeline-year-marker {
          position: absolute;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .year-dot {
          position: absolute;
          left: 83px;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #b8860b, #d4a574);
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(184, 134, 11, 0.4);
          z-index: 2;
        }

        .year-label {
          min-width: 80px;
          max-width: 80px;
          font-size: 1.3rem;
          font-weight: bold;
          background: linear-gradient(135deg, #b8860b, #cd7f32);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: right;
          padding-right: 0.8rem;
        }

        .year-drop-zone {
          flex: 1;
          margin-left: 70px;
          margin-right: 70px;
          min-height: 70px;
          border: 3px dashed #d4a574;
          border-radius: 12px;
          padding: 1rem;
          transition: all 0.3s ease;
          background: #fdfcfa;
        }

        .year-drop-zone:hover {
          border-color: #b8860b;
          background: #fff9f0;
          box-shadow: 0 0 12px rgba(184, 134, 11, 0.15);
        }

        .year-drop-zone.has-event {
          border-style: solid;
          border-color: #4caf50;
          background: #e8f5e9;
        }

        .drop-zone-placeholder {
          color: #8b5a00;
          text-align: center;
          font-size: 0.9rem;
          padding: 0.5rem;
          opacity: 0.6;
        }

        .placed-event {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          padding: 0.8rem 1rem;
          border-radius: 8px;
          position: relative;
          box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
        }

        .placed-event-text {
          padding-right: 30px;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .remove-event-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: rgba(255,255,255,0.3);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .remove-event-btn:hover {
          background: rgba(255,255,255,0.5);
          transform: scale(1.1);
        }

        .timeline-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.15);
        }

        .timeline-progress {
          font-size: 1.1rem;
          font-weight: bold;
          color: #8b5a00;
        }

        .check-btn {
          width: auto;
          margin: 0;
        }

        /* Old timeline styles (keep for backwards compat but hidden) */
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
          position: relative;
          z-index: 1;
        }

        .quiz-question {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          text-align: center;
          box-shadow: 0 5px 20px rgba(184, 134, 11, 0.15);
        }

        .quiz-question h3 {
          color: #8b5a00;
          font-size: 1.5rem;
          margin: 0;
          font-weight: 700;
        }

        .quiz-options {
          display: grid;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .quiz-option {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          box-shadow: 0 3px 10px rgba(184, 134, 11, 0.1);
        }

        .quiz-option:hover {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border-color: #b8860b;
          transform: translateX(10px);
          box-shadow: 0 5px 15px rgba(184, 134, 11, 0.2);
        }

        .quiz-option.selected {
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border-color: #b8860b;
          box-shadow: 0 6px 20px rgba(184, 134, 11, 0.25);
        }

        .quiz-option.correct {
          background: linear-gradient(135deg, #4caf50, #45a049);
          border-color: #2e7d32;
          color: white;
        }

        .quiz-option.incorrect {
          background: linear-gradient(135deg, #ff5252, #d32f2f);
          border-color: #c62828;
          color: white;
        }

        .option-letter {
          background: linear-gradient(135deg, #d4a574, #b8860b);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(184, 134, 11, 0.3);
        }

        .quiz-option.correct .option-letter,
        .quiz-option.incorrect .option-letter {
          background: rgba(255,255,255,0.3);
          box-shadow: none;
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
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 1.5rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          border-left: 4px solid #b8860b;
          box-shadow: 0 4px 12px rgba(184, 134, 11, 0.1);
        }

        .quiz-explanation.correct {
          border-left-color: #4caf50;
          background: linear-gradient(135deg, #f1f8e9, #ffffff);
        }

        .quiz-explanation.incorrect {
          border-left-color: #ff5252;
          background: linear-gradient(135deg, #ffebee, #ffffff);
        }

        .quiz-progress {
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          height: 10px;
          border-radius: 5px;
          overflow: hidden;
        }

        .quiz-progress-bar {
          height: 100%;
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          transition: width 0.3s ease;
        }

        /* Results Styles */
        .quiz-results {
          max-width: 800px;
          margin: 0 auto;
          background: linear-gradient(135deg, #fff9f0, #ffffff);
          border: 2px solid #d4a574;
          padding: 3rem;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(184, 134, 11, 0.2);
          position: relative;
          z-index: 1;
        }

        .quiz-results h2 {
          text-align: center;
          background: linear-gradient(135deg, #b8860b, #cd7f32);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 2rem;
          font-weight: 800;
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
          background: linear-gradient(135deg, #d4a574 0%, #b8860b 100%);
          border-radius: 15px;
          color: white;
          box-shadow: 0 6px 20px rgba(184, 134, 11, 0.3);
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
          border-bottom: 2px solid #f5e6d3;
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .result-icon.correct {
          background: linear-gradient(135deg, #4caf50, #45a049);
          color: white;
        }

        .result-icon.incorrect {
          background: linear-gradient(135deg, #ff5252, #d32f2f);
          color: white;
        }

        .result-content {
          flex: 1;
        }

        .result-question {
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: #8b5a00;
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

          /* Mobile Timeline Styles */
          .timeline-game-layout {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .event-cards-pool {
            max-height: 250px;
            padding: 1rem;
          }

          .visual-timeline {
            padding: 1.5rem 1rem;
          }

          .timeline-line {
            left: 80px;
          }

          .year-dot {
            left: 63px;
          }

          .year-label {
            min-width: 60px;
            font-size: 1rem;
            padding-right: 0.5rem;
          }

          .year-drop-zone {
            margin-left: 100px;
            min-height: 60px;
            padding: 0.8rem;
          }

          .timeline-actions {
            flex-direction: column;
            gap: 1rem;
          }

          .check-btn {
            width: 100%;
          }

          .game-top-bar {
            padding: 1rem;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .game-top-bar h2 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
};
