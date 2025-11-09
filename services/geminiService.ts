/**
 * Client-side proxy: sends PDF content and question to server-side Gemini endpoint.
 * The server (Express) holds the API key and calls Gemini securely.
 */
export const answerFromPdf = async (
  pdfContent: string,
  question: string
): Promise<string> => {
  const TIMEOUT_MS = 20000;
  const makeRequest = (url: string, signal?: AbortSignal) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfContent, question }),
      signal,
    });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let resp: Response;
    try {
      resp = await makeRequest("/api/genai", controller.signal);
    } catch (err) {
      // Fallback to dev server port if needed
      const fallback = `${window.location.protocol}//${window.location.hostname}:3001/api/genai`;
      try {
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(
          () => fallbackController.abort(),
          TIMEOUT_MS
        );
        resp = await makeRequest(fallback, fallbackController.signal);
        clearTimeout(fallbackTimeout);
      } catch (err2) {
        return "AI service unavailable. Please contact the administrator.";
      }
    }
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return "AI service unavailable. Please contact the administrator.";
    }
    const raw = await resp.text();
    try {
      const data = JSON.parse(raw);
      // If the answer contains markdown, return as-is for rendering
      return (data.answer ?? data.text ?? String(raw ?? "")).trim();
    } catch (err) {
      return raw;
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      return "AI request timed out. Please try again later.";
    }
    return "AI is not configured. Please contact the administrator.";
  } finally {
    clearTimeout(timeout);
  }
};
