export interface StockScore {
  technical: number;
  fundamental: number;
  sentiment: number;
  momentum: number;
  overall: number;
  external?: number;
  volatility?: number;
  liquidity?: number;
  analyst?: number;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  scores: StockScore;
}

export const stocks: Stock[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    exchange: "NSE",
    price: 2847,
    change: 1.8,
    scores: { technical: 78, fundamental: 85, sentiment: 54, momentum: 71, overall: 74, external: 68, volatility: 62, liquidity: 88, analyst: 79 },
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    exchange: "NSE",
    price: 824,
    change: 2.4,
    scores: { technical: 74, fundamental: 81, sentiment: 38, momentum: 61, overall: 63, external: 55, volatility: 48, liquidity: 72, analyst: 66 },
  },
  {
    symbol: "ZOMATO",
    name: "Zomato Ltd",
    exchange: "NSE",
    price: 198,
    change: -0.9,
    scores: { technical: 42, fundamental: 55, sentiment: 31, momentum: 38, overall: 41, external: 35, volatility: 29, liquidity: 61, analyst: 44 },
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    exchange: "NSE",
    price: 1642,
    change: 0.6,
    scores: { technical: 82, fundamental: 91, sentiment: 67, momentum: 76, overall: 82, external: 74, volatility: 71, liquidity: 94, analyst: 86 },
  },
  {
    symbol: "ADANIPORTS",
    name: "Adani Ports",
    exchange: "NSE",
    price: 1184,
    change: -1.2,
    scores: { technical: 58, fundamental: 72, sentiment: 44, momentum: 52, overall: 57, external: 49, volatility: 41, liquidity: 78, analyst: 61 },
  },
];

export const trendingStocks = [
  { symbol: "RELIANCE", change: 1.8 },
  { symbol: "TATAMOTORS", change: 2.4 },
  { symbol: "ZOMATO", change: -0.9 },
  { symbol: "HDFCBANK", change: 0.6 },
  { symbol: "ADANIPORTS", change: -1.2 },
  { symbol: "INFY", change: 0.4 },
];

export const holdingPeriods = ["Intraday", "Short-term", "Swing", "Weekly", "Monthly", "Long-term"];

export const brokers = [
  { name: "Zerodha", color: "#387ED1", api: "Kite API" },
  { name: "Groww", color: "#00D09C", api: "Groww API" },
  { name: "Angel One", color: "#E63946", api: "SmartAPI" },
  { name: "Upstox", color: "#6B4EFF", api: "Upstox API v2" },
  { name: "5Paisa", color: "#FF6B35", api: "5Paisa API" },
];

export const portfolioNews = [
  { headline: "Reliance Industries Q3 profit beats estimates — analyst upgrades incoming", source: "Economic Times", sentiment: 0.82, time: "2h ago" },
  { headline: "HDFC Bank reports strong NII growth, asset quality stable", source: "Mint", sentiment: 0.74, time: "3h ago" },
  { headline: "Tata Motors faces headwinds from EV competition in domestic market", source: "Business Standard", sentiment: -0.61, time: "4h ago" },
  { headline: "Zomato faces margin pressure as delivery costs rise", source: "Livemint", sentiment: -0.71, time: "5h ago" },
  { headline: "Adani Ports wins new contract — positive for long term outlook", source: "NDTV Profit", sentiment: 0.55, time: "6h ago" },
];

export const marketNews = [
  { headline: "Nifty 50 hits all-time high driven by banking and IT sectors", source: "MoneyControl", sentiment: 0.88, time: "1h ago" },
  { headline: "RBI keeps repo rate unchanged at 6.5% in latest monetary policy", source: "Economic Times", sentiment: 0.04, time: "2h ago" },
  { headline: "FII outflows continue for third consecutive month", source: "Livemint", sentiment: -0.58, time: "3h ago" },
  { headline: "India's GDP growth forecast revised upward to 7.2%", source: "Business Standard", sentiment: 0.71, time: "5h ago" },
  { headline: "Global crude oil prices surge amid Middle East tensions", source: "NDTV Profit", sentiment: -0.44, time: "7h ago" },
];

export const alerts = [
  { stock: "HDFCBANK", condition: "Technical score drops below 60 on Swing", active: true, date: "Mar 15, 2025" },
  { stock: "RELIANCE", condition: "Overall score crosses 80 on Weekly", active: true, date: "Mar 18, 2025" },
  { stock: "TATAMOTORS", condition: "Inverted Hammer pattern on Short-term", active: true, date: "Mar 22, 2025" },
];

export const impulseData = {
  march: {
    month: "March 2025",
    totalTrades: 5,
    totalLoss: 5800,
    trades: [
      { stock: "ZOMATO", score: 31, loss: 1200 },
      { stock: "ADANIPORTS", score: 24, loss: 2100 },
      { stock: "TATAMOTORS", score: 38, loss: 800 },
      { stock: "ZOMATO", score: 28, loss: 900 },
      { stock: "RELIANCE", score: 35, loss: 800 },
    ],
  },
  february: { month: "February 2025", totalTrades: 7, totalLoss: 8200 },
  january: { month: "January 2025", totalTrades: 9, totalLoss: 11400 },
};

export const chatMessages = [
  { role: "user" as const, text: "Summarise my portfolio" },
  {
    role: "ai" as const,
    text: "Your portfolio score is 67 — moderate. HDFCBANK is your strongest holding at 82. ZOMATO is your weakest at 41 and flagging low sentiment. TATAMOTORS has strong fundamentals but sentiment is dragging the score. Consider reviewing ZOMATO before adding more capital.",
  },
];

export function getScoreColor(score: number): string {
  if (score <= 40) return "#FF5050";
  if (score <= 65) return "#FFB830";
  return "#B5FF3C";
}

export function getScoreVerdict(score: number): string {
  if (score <= 40) return "WEAK";
  if (score <= 65) return "MODERATE";
  return "STRONG";
}

export function getScoreColorClass(score: number): string {
  if (score <= 40) return "text-[#FF5050]";
  if (score <= 65) return "text-[#FFB830]";
  return "text-primary";
}

export function getScoreBgClass(score: number): string {
  if (score <= 40) return "bg-[#FF5050]";
  if (score <= 65) return "bg-[#FFB830]";
  return "bg-primary";
}
