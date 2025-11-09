import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiUrl = env.VITE_API_URL || "http://localhost:3001";
  // Determine dev port: prefer VITE_DEV_PORT, then PORT, then default 3000
  const devPort = Number(env.VITE_DEV_PORT || env.PORT) || 3000;
  
  return {
    server: {
      port: devPort,
      host: "0.0.0.0",
      proxy: {
        // Proxy API requests during local dev to Express backend
        "/api/genai": apiUrl,
      },
    },
    plugins: [react()],
    define: {
      // DO NOT inject server-side secrets (GEMINI_API_KEY) into the client.
      // Only expose non-sensitive values here.
      "process.env.VITE_SHEET_APPEND_URL": JSON.stringify(
        env.VITE_SHEET_APPEND_URL
      ),
      "import.meta.env.VITE_SHEET_APPEND_URL": JSON.stringify(
        env.VITE_SHEET_APPEND_URL
      ),
      "import.meta.env.VITE_SOCKET_URL": JSON.stringify(
        env.VITE_SOCKET_URL || "http://localhost:3002"
      ),
      "import.meta.env.VITE_API_URL": JSON.stringify(
        env.VITE_API_URL || "http://localhost:3001"
      ),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
