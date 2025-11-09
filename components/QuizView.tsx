import React, { useState, useEffect, useMemo, useRef } from "react";
import type { QuizQuestion } from "../types";
import { fetchQuizData, submitQuizLog } from "../services/googleSheetService";
import { Loader } from "./Loader";
import { IconCheck, IconX } from "./Icons";

type QuizState = "loading" | "idle" | "active" | "results";

const QUIZ_LENGTH = 10;

export const QuizView: React.FC = () => {
  const [quizState, setQuizState] = useState<QuizState>("loading");
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [availableModes, setAvailableModes] = useState<string[]>([]);
  const [mode, setMode] = useState<string>("");
  const [quizLength, setQuizLength] = useState<number>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameInput, setUsernameInput] = useState<string>(() => {
    try {
      return localStorage.getItem("username") || "";
    } catch (e) {
      return "";
    }
  });

  useEffect(() => {
    const loadInitialData = async () => {
      setError("");
      try {
        const fetchedQuestions = await fetchQuizData();
        if (fetchedQuestions.length === 0) {
          throw new Error("Không thể tải danh sách câu hỏi từ Google Sheet.");
        }
        setAllQuestions(fetchedQuestions);

        const modes = [
          ...new Set(fetchedQuestions.map((q) => q.Quiz_Type).filter(Boolean)),
        ];
        setAvailableModes(modes);

        if (modes.length > 0) {
          setMode(modes[0]);
        } else {
          throw new Error("Không tìm thấy chế độ quiz nào trong dữ liệu.");
        }
        setQuizState("idle");
      } catch (err: any) {
        setError(
          err.message || "Không thể tải dữ liệu quiz. Vui lòng thử lại."
        );
        setQuizState("idle"); // Go to idle to show the error
      }
    };
    loadInitialData();
  }, []);

  const handleStartQuiz = () => {
    if (!mode) {
      setError("Vui lòng chọn một chế độ quiz.");
      return;
    }
    setError("");
    setAnswers({});
    setScore(0);

    const filtered = allQuestions.filter(
      (q) => q.Quiz_Type === mode && q.ID && q.Question
    );
    const randomized = filtered.sort(() => 0.5 - Math.random());
    const take =
      quizLength > 0
        ? Math.min(quizLength, randomized.length)
        : randomized.length;
    const sliced = randomized.slice(0, take);

    if (randomized.length === 0) {
      setError(`Không tìm thấy câu hỏi nào cho chế độ "${mode}".`);
      setQuizState("idle");
      return;
    }

    setQuestions(sliced);
    setStartTime(Date.now());
    setCurrentIndex(0);
    // set remaining seconds based on first question or a default of 30s
    const firstLimit = sliced[0]?.TimeLimitSeconds ?? 30;
    setRemainingSeconds(firstLimit);
    setQuizState("active");
  };

  // Ref to hold interval id so we can clear it reliably
  const intervalRef = useRef<number | null>(null);

  // Advance to next question (called on Next button or when time expires)
  const advanceToNext = () => {
    setCurrentIndex((cur) => {
      const next = cur + 1;
      if (next >= questions.length) {
        // finished all questions -> compute score and go to results
        const correctCount = questions.reduce((count, q) => {
          return answers[q.ID] === q.CorrectAnswer ? count + 1 : count;
        }, 0);
        setScore(correctCount);
        setQuizState("results");
        return cur; // no meaningful current index after finishing
      }
      // set remainingSeconds for next question
      const nextLimit = questions[next]?.TimeLimitSeconds ?? 30;
      setRemainingSeconds(nextLimit);
      return next;
    });
  };

  // Manage countdown timer while quiz is active
  useEffect(() => {
    // clear any previous interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (quizState !== "active") return;
    if (remainingSeconds == null) return;

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((r) => {
        if (r == null) return r;
        if (r <= 1) {
          // time expired for current question
          // clear interval and advance
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // auto-advance (recording no answer for this question)
          // use setTimeout to allow state updates to flush first
          setTimeout(() => advanceToNext(), 50);
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // we intentionally depend on quizState and currentIndex/remainingSeconds
  }, [quizState, currentIndex, remainingSeconds, questions, answers]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };
  // Submit results to the configured sheet endpoint. Called from the Results
  // view so we separate navigation (finish quiz) from submission.
  const submitResults = async () => {
    // Use username from the inline input (fallback to Anonymous)
    let username =
      usernameInput && usernameInput.trim()
        ? usernameInput.trim()
        : "Anonymous";
    try {
      localStorage.setItem("username", username);
    } catch (e) {
      /* ignore */
    }

    if (!(import.meta as any)?.env?.VITE_SHEET_APPEND_URL) {
      // eslint-disable-next-line no-console
      console.warn(
        "VITE_SHEET_APPEND_URL is not set in import.meta.env; using fallback if available"
      );
    }

    setIsSubmitting(true);
    try {
      const timeSec = startTime
        ? Math.round((Date.now() - startTime) / 1000)
        : 0;
      const payload = {
        Username: username,
        Quiz_Date: new Date().toISOString(),
        Score: score,
        Total: questions.length,
        Time: timeSec,
        Quiz_Type: mode,
        Raw_Answers: JSON.stringify(answers),
      };

      const result = await submitQuizLog(payload);
      if (!result.ok) {
        setError(`Không thể gửi kết quả: ${result.message || "lỗi server"}`);
      } else {
        setError("");
        // eslint-disable-next-line no-alert
        window.alert("Kết quả đã được gửi và lưu vào sheet.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi gửi kết quả.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (quizState === "loading") {
    return <Loader message="Đang tải dữ liệu quiz..." />;
  }

  if (quizState === "idle") {
    return (
      <div className="max-w-2xl mx-auto text-center bg-white p-8 rounded-xl shadow-md border">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">
          Trắc nghiệm Hội nhập 4.0
        </h2>
        <p className="text-gray-600 mb-6">
          Chọn một chế độ để kiểm tra kiến thức của bạn!
        </p>
        <div className="mb-6">
          <label
            htmlFor="quiz-mode"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Chế độ Quiz
          </label>
          <select
            id="quiz-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={availableModes.length === 0}
          >
            {availableModes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label
            htmlFor="quiz-length"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Số câu muốn làm
          </label>
          <select
            id="quiz-length"
            value={String(quizLength)}
            onChange={(e) => setQuizLength(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="5">5 câu</option>
            <option value="10">10 câu</option>
            <option value="15">15 câu</option>
            <option value="20">20 câu</option>
            <option value="0">Tất cả</option>
          </select>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          onClick={handleStartQuiz}
          disabled={availableModes.length === 0 || !!error}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          Bắt đầu
        </button>
      </div>
    );
  }

  if (quizState === "active") {
    const q = questions[currentIndex];
    if (!q) return <Loader message="Không có câu hỏi để hiển thị" />;
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              Câu hỏi {currentIndex + 1} / {questions.length}
            </div>
            <div className="text-sm font-mono text-red-600">
              Thời gian: {remainingSeconds ?? q.TimeLimitSeconds ?? 0}s
            </div>
          </div>

          <p className="font-semibold text-gray-800 mb-4">{q.Question}</p>
          <div className="space-y-3">
            {["A", "B", "C", "D"].map((optionKey) => {
              const optionValue = q[
                `Option${optionKey}` as keyof QuizQuestion
              ] as string;
              if (!optionValue) return null;
              const isSelected = answers[q.ID] === optionValue;
              return (
                <button
                  key={optionKey}
                  onClick={() => handleSelectAnswer(q.ID, optionValue)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <span className="font-medium text-gray-700">
                    {optionKey}.
                  </span>{" "}
                  {optionValue}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tên người dùng (hiển thị trên sheet)
          </label>
          <input
            id="username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Nhập tên (ví dụ: Nguyen Van A)"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              // allow user to skip / go to next early
              advanceToNext();
            }}
            className="flex-1 bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Bỏ qua / Tiếp theo
          </button>
          <button
            onClick={() => {
              // If not last question, go to next. If last, finish and compute results.
              if (currentIndex < questions.length - 1) {
                advanceToNext();
              } else {
                // finish
                const correctCount = questions.reduce((count, q) => {
                  return answers[q.ID] === q.CorrectAnswer ? count + 1 : count;
                }, 0);
                setScore(correctCount);
                setQuizState("results");
              }
            }}
            className="flex-1 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {currentIndex < questions.length - 1 ? "Tiếp theo" : "Hoàn thành"}
          </button>
        </div>
      </div>
    );
  }

  if (quizState === "results") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border mb-6">
          <h2 className="text-3xl font-bold text-blue-800 mb-2">Kết quả</h2>
          <p className="text-xl text-gray-700">
            Bạn đã trả lời đúng{" "}
            <span className="font-bold text-green-600">{score}</span> /{" "}
            <span className="font-bold">{questions.length}</span> câu!
          </p>
        </div>

        {questions.map((q, index) => {
          const userAnswer = answers[q.ID];
          const isCorrect = userAnswer === q.CorrectAnswer;
          return (
            <div
              key={q.ID}
              className="bg-white p-6 rounded-xl shadow-sm border mb-4"
            >
              <p className="font-semibold text-gray-800 mb-4">
                {index + 1}. {q.Question}
              </p>
              <div className="space-y-3 mb-4">
                {["A", "B", "C", "D"].map((optionKey) => {
                  const optionValue = q[
                    `Option${optionKey}` as keyof QuizQuestion
                  ] as string;
                  if (!optionValue) return null;

                  const isUserChoice = userAnswer === optionValue;
                  const isTheCorrectAnswer = q.CorrectAnswer === optionValue;

                  let optionStyle = "border-gray-200";
                  if (isUserChoice && !isCorrect)
                    optionStyle = "bg-red-100 border-red-400";
                  if (isTheCorrectAnswer)
                    optionStyle = "bg-green-100 border-green-500";

                  return (
                    <div
                      key={optionKey}
                      className={`flex items-center p-3 rounded-lg border-2 ${optionStyle}`}
                    >
                      <div className="flex-grow">
                        <span className="font-medium text-gray-700">
                          {optionKey}.
                        </span>{" "}
                        {optionValue}
                      </div>
                      {isUserChoice && !isCorrect && (
                        <IconX className="text-red-600 flex-shrink-0" />
                      )}
                      {isTheCorrectAnswer && (
                        <IconCheck className="text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p>
                  <strong className="font-semibold">Giải thích:</strong>{" "}
                  {q.Explanation}
                </p>
              </div>
            </div>
          );
        })}

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <button
          onClick={submitResults}
          disabled={isSubmitting}
          className="w-full mt-2 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Đang gửi kết quả..." : "Gửi kết quả vào sheet"}
        </button>
        <button
          onClick={() => setQuizState("idle")}
          disabled={isSubmitting}
          className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Làm bài quiz khác
        </button>
      </div>
    );
  }

  return null;
};
