import React, { useState, useCallback, useRef, useEffect } from "react";
import { answerFromPdf } from "./services/geminiService";
import { extractTextFromPdf } from "./utils/pdfReader";
import type { ChatMessage } from "./types";
import { Header } from "./components/Header";
import { Explainer } from "./components/Explainer";
import { ControlPanel } from "./components/ControlPanel";
import { ChatWindow } from "./components/ChatWindow";
import { IconFile, IconTrash } from "./components/Icons";
import { IntegrationMap } from "./components/IntegrationMap";
import { QuizView } from "./components/QuizView";
import { Footer } from "./components/Footer";
import FTATimeline from "./components/FTATimeline";
import BlogView from "./components/BlogView";
import BlogDetail from "./components/BlogDetail";
import { MultiplayerGame } from "./components/MultiplayerGame";
import { IntegrationGame } from "./components/IntegrationGame";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

const LOCAL_STORAGE_KEY = "pdfChatData";

interface StoredData {
  pdfFileName: string;
  pdfText: string;
  chatHistory: ChatMessage[];
}

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<
    "idle" | "processing" | "ready" | "querying"
  >("idle");
  const [error, setError] = useState<string>("");
  // Remove currentView, use router
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      const savedDataJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDataJSON) {
        const savedData: StoredData = JSON.parse(savedDataJSON);
        if (
          savedData.pdfFileName &&
          savedData.pdfText &&
          savedData.chatHistory
        ) {
          setPdfFile(
            new File([], savedData.pdfFileName, { type: "application/pdf" })
          );
          setPdfText(savedData.pdfText);
          setChatHistory(savedData.chatHistory);
          setStatus("ready");
          // We default to map view, but a user with a session might prefer chat.
          // Let's keep the default simple for now.
        }
      }
    } catch (err) {
      console.error("Failed to load or parse data from localStorage", err);
      localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    }
  }, []);

  // Always load the static PDF bundled in public/docs so the chatbot uses
  // the pre-provided file instead of requiring user upload.
  useEffect(() => {
    const loadStaticPdf = async () => {
      const staticPath = "/docs/giao-trinh-kinh-te-chinh-tri-mac-lenin.pdf";
      try {
        setStatus("processing");
        const resp = await fetch(staticPath);
        if (!resp.ok) {
          throw new Error(`Failed to fetch static PDF: ${resp.status}`);
        }
        const blob = await resp.blob();
        const file = new File(
          [blob],
          "giao-trinh-kinh-te-chinh-tri-mac-lenin.pdf",
          { type: "application/pdf" }
        );
        setPdfFile(file);
        const text = await extractTextFromPdf(file);
        setPdfText(text);
        setStatus("ready");
        setChatHistory([
          {
            role: "model",
            content:
              "Xin chào, tôi là trợ lý của MarxLeninEdu. Tôi giúp gì cho bạn?",
          },
        ]);
        // Navigation handled by router
      } catch (err) {
        console.error("Failed to load static PDF", err);
        // if static load fails, fall back to idle state
        setStatus("idle");
        setError("Không thể nạp tệp PDF tĩnh.");
      }
    };

    // Kick off static load on mount
    loadStaticPdf();
  }, []);

  // Save data to localStorage whenever chat history or the loaded PDF changes
  useEffect(() => {
    if (pdfText && pdfFile) {
      try {
        const dataToSave: StoredData = {
          pdfFileName: pdfFile.name,
          pdfText,
          chatHistory,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (err) {
        console.error("Failed to save data to localStorage", err);
      }
    }
  }, [chatHistory, pdfFile, pdfText]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
        setStatus("processing");
        setError("");
        setChatHistory([]); // Reset chat for new file
        try {
          const text = await extractTextFromPdf(file);
          setPdfText(text);
          setStatus("ready");
          setChatHistory([
            {
              role: "model",
              content:
                "Tài liệu PDF của bạn đã được xử lý. Bây giờ bạn có thể đặt câu hỏi về nội dung của nó.",
            },
          ]);
          // Navigation handled by router
        } catch (err) {
          console.error(err);
          setError("Không thể đọc tệp PDF. Vui lòng thử một tệp khác.");
          setStatus("idle");
        }
      } else {
        setError("Vui lòng chọn một tệp PDF hợp lệ.");
        setPdfFile(null);
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setPdfFile(null);
    setPdfText("");
    setChatHistory([]);
    setStatus("idle");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    // Navigation handled by router
  }, []);

  const handleSubmitQuestion = async (question: string) => {
    if (!question.trim() || status !== "ready") return;

    setStatus("querying");
    const newQuestion: ChatMessage = { role: "user", content: question };
    setChatHistory((prev) => [...prev, newQuestion]);

    try {
      const answer = await answerFromPdf(pdfText, question);
      const modelResponse: ChatMessage = { role: "model", content: answer };
      setChatHistory((prev) => [...prev, modelResponse]);
    } catch (err) {
      const errorResponse: ChatMessage = {
        role: "model",
        content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
      };
      setChatHistory((prev) => [...prev, errorResponse]);
    } finally {
      setStatus("ready");
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
        <Header hasPdf={!!pdfFile} />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/multiplayer-game" />} />
            <Route path="/multiplayer-game" element={<MultiplayerGame />} />
            <Route path="/mini-games" element={<IntegrationGame />} />
            <Route path="/map" element={<IntegrationMap />} />
            <Route path="/quiz" element={<QuizView />} />
            <Route path="/fta" element={<FTATimeline />} />
            <Route path="/blog" element={<BlogView />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route
              path="/chat"
              element={
                pdfFile ? (
                  <div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <IconFile />
                        <span className="font-medium text-sm truncate">
                          {pdfFile.name}
                        </span>
                      </div>
                    </div>
                    <ChatWindow
                      status={status}
                      chatHistory={chatHistory}
                      onSubmitQuestion={handleSubmitQuestion}
                    />
                  </div>
                ) : (
                  <Explainer />
                )
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
