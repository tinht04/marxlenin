declare const Papa: any;
import type { CountryData, QuizQuestion } from "../types";

// The shareable Google Sheet URL is:
// https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/edit?usp=sharing
// We convert it to a CSV export URL.
const GOOGLE_SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/14Zid-qM_4-UpjowzlauzrEo6B5buIbU_VC9Pj_7yLuA/gviz/tq?tqx=out:csv&sheet=";
const COUNTRIES_SHEET_URL = `${GOOGLE_SHEET_BASE_URL}Countries`;
const QUIZ_SHEET_URL = `${GOOGLE_SHEET_BASE_URL}Quiz_Sheet`;

/**
 * A generic helper to fetch and parse CSV data from a URL.
 * @param url The CSV data URL.
 * @param transformer A function to transform each row.
 * @returns A promise that resolves to an array of transformed data.
 */
const fetchAndParseSheet = async <T>(
  url: string,
  transformer: (row: any, rowIndex: number) => T
): Promise<T[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${response.statusText}`);
    }
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          // pass row index to transformer so it can synthesize IDs if needed
          const transformedData = results.data.map((row: any, i: number) =>
            transformer(row, i)
          );
          resolve(transformedData);
        },
        error: (error: any) => {
          console.error("Error parsing CSV data:", error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error in fetchAndParseSheet:", error);
    throw error;
  }
};

export const fetchCountryData = async (): Promise<CountryData[]> => {
  const transformer = (row: any): CountryData => {
    const newRow: { [key: string]: string } = {};
    for (const key in row) {
      const cleanedKey = key.trim().replace(/_/g, " ");
      const value = (row as any)[key];
      newRow[cleanedKey] = typeof value === "string" ? value.trim() : value;
    }
    return newRow as unknown as CountryData;
  };
  return fetchAndParseSheet<CountryData>(COUNTRIES_SHEET_URL, transformer);
};

export const fetchQuizData = async (): Promise<QuizQuestion[]> => {
  const transformer = (row: any, rowIndex: number): QuizQuestion => {
    // Normalize keys: trim, replace spaces/hyphens with underscores
    const normalized: { [key: string]: any } = {};
    for (const rawKey in row) {
      const value = row[rawKey];
      if (rawKey == null) continue;
      const key = rawKey.toString().trim();
      // create a normalized key style matching our `QuizQuestion` fields
      const norm = key.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      normalized[norm] = typeof value === "string" ? value.trim() : value;
    }

    // support alternative header names (e.g., QuizType, Quiz Type -> Quiz_Type)
    const quizType =
      normalized["Quiz_Type"] ??
      normalized["QuizType"] ??
      normalized["QuizType"];

    // Parse various timer column names into seconds. Accept values like
    // "30", "30s", "00:30" or "0:30". If absent or unparsable, leave
    // undefined so the UI can use a default.
    const timeRaw =
      normalized["Timer"] ??
      normalized["Time"] ??
      normalized["Time_Limit"] ??
      normalized["TimeLimit"] ??
      normalized["Time_per_question"] ??
      normalized["Time_Per_Question"] ??
      undefined;

    const parseTimeToSeconds = (val: any): number | undefined => {
      if (val == null) return undefined;
      const s = String(val).trim();
      if (!s) return undefined;
      // formats: "30" "30s" "00:30" "0:30"
      // If contains ':' parse mm:ss or hh:mm:ss
      if (s.includes(":")) {
        const parts = s.split(":").map((p) => Number(p));
        if (parts.some((n) => Number.isNaN(n))) return undefined;
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3)
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return undefined;
      }
      // strip non-digits
      const digits = s.replace(/[^0-9]/g, "");
      if (!digits) return undefined;
      const n = Number(digits);
      if (Number.isNaN(n)) return undefined;
      return n;
    };

    const timeLimitSeconds = parseTimeToSeconds(timeRaw);

    // Options may already be OptionA etc. Ensure we pick them correctly
    const idVal = (normalized["ID"] ?? normalized["Id"] ?? normalized["id"]) as
      | string
      | undefined;

    return {
      ID: idVal ? String(idVal).trim() : String(rowIndex + 1),
      Question: (normalized["Question"] ?? "") as string,
      OptionA: (normalized["OptionA"] ??
        normalized["Option_A"] ??
        "") as string,
      OptionB: (normalized["OptionB"] ??
        normalized["Option_B"] ??
        "") as string,
      OptionC: (normalized["OptionC"] ??
        normalized["Option_C"] ??
        "") as string,
      OptionD: (normalized["OptionD"] ??
        normalized["Option_D"] ??
        "") as string,
      CorrectAnswer: (normalized["CorrectAnswer"] ??
        normalized["Correct_Answer"] ??
        "") as string,
      Explanation: (normalized["Explanation"] ?? "") as string,
      Quiz_Type: (quizType ?? "") as string,
      TimeLimitSeconds: timeLimitSeconds,
    };
  };

  return fetchAndParseSheet<QuizQuestion>(QUIZ_SHEET_URL, transformer);
};

/**
 * Submit a quiz result row to a server-side endpoint which appends it into the
 * Google Sheet. This repository does not include server-side code for appending
 * rows; you should deploy a Google Apps Script or another HTTP endpoint that
 * accepts POST JSON and appends to the `User_Quiz_Logs` sheet. Set the URL in
 * Vite env as `VITE_SHEET_APPEND_URL`.
 */
export const submitQuizLog = async (row: {
  Username: string;
  Quiz_Date: string; // ISO string
  Score: number | string;
  Total: number | string;
  Time: number | string; // seconds or formatted
  Quiz_Type: string;
  Raw_Answers: string; // JSON string
}): Promise<{ ok: boolean; message?: string }> => {
  // Resolve append URL from env if available, otherwise fall back to the
  // hard-coded Apps Script web app URL (useful for local testing).
  // NOTE: hard-coding a writable endpoint in client code is insecure for
  // production; remove or secure this before deploying publicly.
  const appendUrl =
    (import.meta as any)?.env?.VITE_SHEET_APPEND_URL ||
    "https://script.google.com/macros/s/AKfycbyedwHaBbNESMKGrWmLWQwpy00h9UUUQkdI83rQZsZhfV-PhDwbNS6TAT1t28PyhcFMtg/exec";
  // eslint-disable-next-line no-console
  console.log("submitQuizLog (GET): using appendUrl:", appendUrl);

  // Build a query string with only the fields suitable for GET (avoid large JSON)
  const params: Record<string, string> = {
    Username: String(row.Username ?? "").slice(0, 100),
    Quiz_Date: String(row.Quiz_Date ?? ""),
    Score: String(row.Score ?? ""),
    Total: String(row.Total ?? ""),
    Time: String(row.Time ?? ""),
    Quiz_Type: String(row.Quiz_Type ?? ""),
  };

  const qs = Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const url = `${appendUrl}?${qs}`;

  try {
    // Use mode: 'no-cors' so the browser will send the GET without a preflight.
    // Note: responses will be opaque and cannot be inspected by JS. This is a
    // pragmatic trade-off for quick class testing without a proxy.
    await fetch(url, { method: "GET", mode: "no-cors" });
    return { ok: true, message: "Submitted (fire-and-forget, no-cors)" };
  } catch (err: any) {
    console.error("Failed to submit quiz log (GET):", err);
    return { ok: false, message: err?.message ?? String(err) };
  }
};
