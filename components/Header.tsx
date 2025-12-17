import React from "react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
  hasPdf: boolean;
}

export const Header: React.FC<HeaderProps> = ({ hasPdf }) => {
  const location = useLocation();
  const navItemClasses =
    "py-4 px-1 border-b-2 font-medium text-sm transition-colors";
  const activeClasses = "border-amber-600 text-amber-700 bg-amber-50/50";
  const inactiveClasses =
    "border-transparent text-gray-600 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50/30";
  const disabledClasses = "text-gray-300 cursor-not-allowed";
  // Upload tab has been removed: PDF is preloaded into the app and users
  // should not upload files via the UI.

  return (
    <header className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-md border-b-4 border-amber-600 relative overflow-hidden">
      {/* Decorative border pattern - top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></div>
      
      {/* Decorative circles - Dong Son style */}
      <div className="absolute top-2 left-4 w-8 h-8 border-2 border-amber-400 rounded-full opacity-30"></div>
      <div className="absolute top-2 left-6 w-4 h-4 border border-amber-500 rounded-full opacity-40"></div>
      <div className="absolute top-2 right-4 w-8 h-8 border-2 border-amber-400 rounded-full opacity-30"></div>
      <div className="absolute top-2 right-6 w-4 h-4 border border-amber-500 rounded-full opacity-40"></div>
      
      {/* Geometric patterns */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 opacity-50"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <img 
              src="/img/logo.png" 
              alt="Lịch sử Đảng Việt Nam Logo" 
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 bg-clip-text text-transparent tracking-tight">
              Lịch sử Đảng Việt Nam
            </h1>
          </div>
        </div>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <Link
            to="/multiplayer-game"
            className={`${navItemClasses} ${
              location.pathname === "/multiplayer-game" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/multiplayer-game" ? "page" : undefined}
          >
            Game Multiplayer
          </Link>
          {/* <Link
            to="/mini-games"
            className={`${navItemClasses} ${
              location.pathname === "/mini-games" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/mini-games" ? "page" : undefined}
          >
            Mini Games
          </Link>
          <Link
            to="/map"
            className={`${navItemClasses} ${
              location.pathname === "/map" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/map" ? "page" : undefined}
          >
            Bản đồ Hội nhập
          </Link> */}
          <Link
            to="/quiz"
            className={`${navItemClasses} ${
              location.pathname === "/quiz" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/quiz" ? "page" : undefined}
          >
            Quizzz
          </Link>
          <Link
            to="/timeline"
            className={`${navItemClasses} ${
              location.pathname === "/timeline" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/timeline" ? "page" : undefined}
          >
            Timeline
          </Link>
          <Link
            to="/video"
            className={`${navItemClasses} ${
              location.pathname === "/video" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/video" ? "page" : undefined}
          >
            Video
          </Link>
          <Link
            to={hasPdf ? "/chat" : "#"}
            className={`${navItemClasses} ${
              location.pathname === "/chat"
                ? activeClasses
                : hasPdf
                ? inactiveClasses
                : disabledClasses
            }`}
            aria-current={location.pathname === "/chat" ? "page" : undefined}
            tabIndex={hasPdf ? 0 : -1}
            style={hasPdf ? {} : { pointerEvents: "none" }}
          >
            Chatbot
          </Link>
          {/* <Link
            to="/blog"
            className={`${navItemClasses} ${
              location.pathname === "/blog" ? activeClasses : inactiveClasses
            }`}
            aria-current={location.pathname === "/blog" ? "page" : undefined}
          >
            Blog
          </Link> */}
        </nav>
      </div>
    </header>
  );
};
