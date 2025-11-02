export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface CountryData {
  Country: string;
  Region: string;
  "Partnership Level": string;
  "FTA Status": string;
  "Trade Value": string;
  "Top Exports": string;
  "Top Imports": string;
  "Strategy Summary": string;
  Timeline: string;
  Source: string;
  Latitude: string;
  Longitude: string;
  [key: string]: string; // For dynamic access
}

export interface QuizQuestion {
  ID: string;
  Question: string;
  OptionA: string;
  OptionB: string;
  OptionC: string;
  OptionD: string;
  CorrectAnswer: string;
  Explanation: string;
  Quiz_Type: string;
  // Optional per-question time limit in seconds. If not provided, the UI
  // will fall back to a default (e.g. 30s).
  TimeLimitSeconds?: number;
}
