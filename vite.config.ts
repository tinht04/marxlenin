import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
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
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
