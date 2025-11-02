import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Debug: print Vite env var used for sheet submission so we can confirm it's available at runtime
// Cast import.meta to any because TS may not have env typings in this project
// This will appear in the browser console when the app loads
// eslint-disable-next-line no-console
console.log(
  "VITE_SHEET_APPEND_URL =",
  (import.meta as any)?.env?.VITE_SHEET_APPEND_URL
);

// Do not log sensitive keys to the browser console.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
