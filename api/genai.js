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
  const prompt = `Bạn là một trợ lý chuyên gia thân thiện và chuyên nghiệp. Nhiệm vụ của bạn là trả lời các câu hỏi chỉ dựa trên văn bản được cung cấp từ tài liệu PDF. Không sử dụng bất kỳ kiến thức bên ngoài nào. Nếu không tìm thấy câu trả lời trong văn bản, hãy nêu rõ điều đó.

QUAN TRỌNG - Định dạng câu trả lời:
- Sử dụng **in đậm** cho các điểm quan trọng hoặc từ khóa
- Sử dụng danh sách có dấu đầu dòng (-) cho nhiều mục
- Sử dụng danh sách có số (1., 2., 3.) cho các bước hoặc thứ tự
- Sử dụng # cho tiêu đề chính, ## cho tiêu đề phụ, ### cho tiêu đề nhỏ
- Sử dụng \`code\` cho thuật ngữ kỹ thuật hoặc tên riêng
- Xuống dòng giữa các đoạn để dễ đọc
- Trả lời ngắn gọn, rõ ràng và có cấu trúc

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
    res.status(200).json({ answer: response.text });
  } catch (err) {
    console.error("Error calling Gemini:", err);
    res.status(500).json({ error: "Error from AI provider." });
  }
}
