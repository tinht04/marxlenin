// Vercel Serverless Function: /api/genai
import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: "GEMINI_API_KEY not set in environment" });
    return;
  }

  const { pdfContent, question } = req.body ?? {};
  if (typeof pdfContent !== "string" || typeof question !== "string") {
    res
      .status(400)
      .json({
        error: "Invalid request body, expected { pdfContent, question }",
      });
    return;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-2.5-flash";
  const prompt = `Bạn là một trợ lý chuyên gia. Nhiệm vụ của bạn là trả lời các câu hỏi chỉ dựa trên văn bản được cung cấp từ tài liệu PDF. Không sử dụng bất kỳ kiến thức bên ngoài nào. Nếu không tìm thấy câu trả lời trong văn bản, hãy nêu rõ điều đó. Trả lời bằng tiếng Việt.\n\nĐây là nội dung của PDF:\n---\n${pdfContent}\n---\n\nĐây là câu hỏi của người dùng:\n\"${question}\"\n\nCâu trả lời:`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    res.status(200).json({ answer: response.text });
  } catch (err) {
    console.error("Error calling Gemini:", err);
    res.status(500).json({ error: "Error from AI provider." });
  }
}
