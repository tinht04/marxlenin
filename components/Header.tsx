import React from "react";

type ViewType = "upload" | "chat" | "map" | "quiz";

interface HeaderProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  hasPdf: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  hasPdf,
}) => {
  const navItemClasses =
    "py-4 px-1 border-b-2 font-medium text-sm transition-colors";
  const activeClasses = "border-blue-600 text-blue-600";
  const inactiveClasses =
    "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
  const disabledClasses = "text-gray-300 cursor-not-allowed";
  // Upload tab has been removed: PDF is preloaded into the app and users
  // should not upload files via the UI.

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            MarxLeninEdu
          </h1>
        </div>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setCurrentView("map")}
            className={`${navItemClasses} ${
              currentView === "map" ? activeClasses : inactiveClasses
            }`}
            aria-current={currentView === "map" ? "page" : undefined}
          >
            Bản đồ Hội nhập
          </button>
          <button
            onClick={() => setCurrentView("quiz")}
            className={`${navItemClasses} ${
              currentView === "quiz" ? activeClasses : inactiveClasses
            }`}
            aria-current={currentView === "quiz" ? "page" : undefined}
          >
            Quizzz
          </button>
          {/* Upload tab removed */}
          <button
            onClick={() => {
              if (hasPdf) {
                setCurrentView("chat");
              }
            }}
            disabled={!hasPdf}
            className={`${navItemClasses} ${
              currentView === "chat"
                ? activeClasses
                : hasPdf
                ? inactiveClasses
                : disabledClasses
            }`}
            aria-current={currentView === "chat" ? "page" : undefined}
          >
            Chatbot
          </button>
        </nav>
      </div>
    </header>
  );
};
