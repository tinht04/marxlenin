export interface MatchItem {
  id: string;
  text: string;
  type: "concept" | "definition";
  matchId: string;
}

export interface TimelineEvent {
  id: string;
  year: string;
  event: string;
  correctOrder: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const matchItems: MatchItem[] = [
  { id: "1a", text: "WTO", type: "concept", matchId: "1" },
  { id: "1b", text: "Tổ chức Thương mại Thế giới", type: "definition", matchId: "1" },
  { id: "2a", text: "FTA", type: "concept", matchId: "2" },
  { id: "2b", text: "Hiệp định Thương mại Tự do", type: "definition", matchId: "2" },
  { id: "3a", text: "ASEAN", type: "concept", matchId: "3" },
  { id: "3b", text: "Hiệp hội các quốc gia Đông Nam Á", type: "definition", matchId: "3" },
  { id: "4a", text: "CPTPP", type: "concept", matchId: "4" },
  { id: "4b", text: "Hiệp định Đối tác Toàn diện và Tiến bộ xuyên Thái Bình Dương", type: "definition", matchId: "4" },
  { id: "5a", text: "EVFTA", type: "concept", matchId: "5" },
  { id: "5b", text: "Hiệp định Thương mại Tự do Việt Nam - EU", type: "definition", matchId: "5" },
  { id: "6a", text: "RCEP", type: "concept", matchId: "6" },
  { id: "6b", text: "Hiệp định Đối tác Kinh tế Toàn diện Khu vực", type: "definition", matchId: "6" },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "t1", year: "1995", event: "Việt Nam gia nhập ASEAN", correctOrder: 1 },
  { id: "t2", year: "1998", event: "Gia nhập APEC", correctOrder: 2 },
  { id: "t3", year: "2007", event: "Việt Nam chính thức gia nhập WTO", correctOrder: 3 },
  { id: "t4", year: "2019", event: "Hiệp định EVFTA được ký kết", correctOrder: 4 },
  { id: "t5", year: "2020", event: "Việt Nam phê chuẩn EVFTA và CPTPP có hiệu lực", correctOrder: 5 },
  { id: "t6", year: "2022", event: "RCEP có hiệu lực với Việt Nam", correctOrder: 6 }
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    question: "Việt Nam gia nhập WTO vào năm nào?",
    options: ["2005", "2007", "2010", "2015"],
    correctAnswer: 1,
    explanation: "Việt Nam chính thức trở thành thành viên thứ 150 của WTO vào ngày 11/01/2007."
  },
  {
    id: "q2",
    question: "Tác động tích cực của hội nhập kinh tế quốc tế đối với Việt Nam là gì?",
    options: [
      "Tăng cường cạnh tranh và nâng cao chất lượng sản phẩm",
      "Giảm xuất khẩu",
      "Tăng rào cản thương mại",
      "Giảm đầu tư nước ngoài"
    ],
    correctAnswer: 0,
    explanation: "Hội nhập kinh tế giúp tăng cường cạnh tranh, thúc đẩy đổi mới và nâng cao chất lượng sản phẩm Việt Nam."
  },
  {
    id: "q3",
    question: "EVFTA là hiệp định thương mại tự do giữa Việt Nam và khu vực nào?",
    options: ["Châu Á", "Liên minh Châu Âu", "Bắc Mỹ", "Châu Phi"],
    correctAnswer: 1,
    explanation: "EVFTA (EU-Vietnam Free Trade Agreement) là hiệp định thương mại tự do giữa Việt Nam và Liên minh Châu Âu."
  },
  {
    id: "q4",
    question: "Thách thức nào sau đây là do hội nhập kinh tế quốc tế mang lại?",
    options: [
      "Tăng dân số",
      "Cạnh tranh gay gắt với hàng hóa nước ngoài",
      "Giảm GDP",
      "Tăng thuế xuất khẩu"
    ],
    correctAnswer: 1,
    explanation: "Hội nhập kinh tế đặt ra thách thức về cạnh tranh với hàng hóa nước ngoài có chất lượng cao."
  },
  {
    id: "q5",
    question: "CPTPP có bao nhiêu thành viên?",
    options: ["8", "10", "11", "15"],
    correctAnswer: 2,
    explanation: "CPTPP có 11 quốc gia thành viên sau khi Mỹ rút khỏi TPP."
  },
  {
    id: "q6",
    question: "RCEP bao gồm các quốc gia thuộc khu vực nào?",
    options: ["Châu Á", "Châu Âu", "Châu Mỹ", "Châu Phi"],
    correctAnswer: 0,
    explanation: "RCEP (Regional Comprehensive Economic Partnership) bao gồm các quốc gia thuộc khu vực Châu Á - Thái Bình Dương."
  },
  {
    id: "q7",
    question: "Hội nhập kinh tế quốc tế giúp Việt Nam đạt được điều gì?",
    options: [
      "Tăng trưởng kinh tế bền vững",
      "Giảm xuất khẩu",
      "Tăng thuế nhập khẩu",
      "Giảm đầu tư nước ngoài"
    ],
    correctAnswer: 0,
    explanation: "Hội nhập kinh tế quốc tế giúp Việt Nam tăng trưởng kinh tế bền vững thông qua mở rộng thị trường và thu hút đầu tư."
  },
  {
    id: "q8",
    question: "Hiệp định FTA là gì?",
    options: [
      "Hiệp định về thương mại",
      "Hiệp định thương mại tự do",
      "Hiệp định hợp tác quốc tế",
      "Hiệp định về an ninh quốc phòng"
    ],
    correctAnswer: 1,
    explanation: "FTA (Free Trade Agreement) là hiệp định thương mại tự do nhằm giảm hoặc loại bỏ rào cản thương mại giữa các quốc gia thành viên."
  },
  {
    id: "q9",
    question: "Một trong những mục tiêu của hội nhập kinh tế quốc tế là gì?",
    options: [
      "Tăng trưởng kinh tế bền vững",
      "Giảm xuất khẩu",
      "Tăng thuế nhập khẩu",
      "Giảm đầu tư nước ngoài"
    ],
    correctAnswer: 0,
    explanation: "Một trong những mục tiêu của hội nhập kinh tế quốc tế là đạt được tăng trưởng kinh tế bền vững thông qua mở rộng thị trường và thu hút đầu tư."
  },
  {
    id: "q10",
    question: "Việt Nam gia nhập ASEAN vào năm nào?",
    options: ["1992", "1993", "1994", "1995"],
    correctAnswer: 3,
    explanation: "Việt Nam chính thức trở thành thành viên thứ 7 của ASEAN vào ngày 28/07/1995."
  }
];
