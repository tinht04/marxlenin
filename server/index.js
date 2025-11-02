import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set in server environment. The proxy will not work without it."
  );
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

app.post("/api/genai", async (req, res) => {
  if (!ai) {
    return res.status(500).json({ error: "AI not configured on server." });
  }

  const { pdfContent, question } = req.body ?? {};
  if (typeof pdfContent !== "string" || typeof question !== "string") {
    return res.status(400).json({
      error: "Invalid request body, expected { pdfContent, question }",
    });
  }

  // Preserve user's prompt & model here (same as previous client prompt)
  const model = "gemini-2.5-flash";
  const prompt = `Bạn là một trợ lý chuyên gia. Nhiệm vụ của bạn là trả lời các câu hỏi chỉ dựa trên văn bản được cung cấp từ tài liệu PDF. Không sử dụng bất kỳ kiến thức bên ngoài nào. Nếu không tìm thấy câu trả lời trong văn bản, hãy nêu rõ điều đó. Trả lời bằng tiếng Việt.

Đây là nội dung của PDF:
---
${pdfContent}
---

Đây là câu hỏi của người dùng:
"${question}"

Câu trả lời:`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return res.json({ answer: response.text });
  } catch (err) {
    console.error("Error calling Gemini on server:", err);
    return res.status(500).json({ error: "Error from AI provider." });
  }
});

app.listen(port, () => {
  console.log(`Server proxy listening on port ${port}`);
});
