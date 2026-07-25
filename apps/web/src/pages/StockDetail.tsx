import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import { stocks, holdingPeriods, getScoreColor, getScoreVerdict, getScoreColorClass } from "@/lib/dummyData";

const parameterScores = ["Technical", "Fundamental", "Sentiment", "External", "Volatility", "Liquidity", "Analyst", "Momentum"] as const;
const parameterKeys: Record<string, string> = {
  Technical: "technical", Fundamental: "fundamental", Sentiment: "sentiment", External: "external",
  Volatility: "volatility", Liquidity: "liquidity", Analyst: "analyst", Momentum: "momentum",
};

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [activePeriod, setActivePeriod] = useState("Swing");
  const stock = stocks.find((s) => s.symbol === symbol);

  if (!stock) return <div className="p-6 text-center text-[#666]">Stock not found</div>;

  const overall = stock.scores.overall;
  const verdict = getScoreVerdict(overall);
  const overallColor = getScoreColor(overall);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/app/discover")} className="p-2 hover:bg-[#1a1a1a] rounded-lg"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-medium">{stock.name}</h1>
          <p className="text-xs text-[#666]">{stock.exchange}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-mono font-bold">₹{stock.price.toLocaleString()}</p>
          <p className={`text-sm font-mono ${stock.change >= 0 ? "text-primary" : "text-[#FF5050]"}`}>
            {stock.change >= 0 ? "▲" : "▼"}{Math.abs(stock.change)}%
          </p>
        </div>
      </div>

      {/* Holding Periods */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {holdingPeriods.map((p) => (
          <button key={p} onClick={() => setActivePeriod(p)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activePeriod === p ? "bg-primary text-primary-foreground" : "bg-[#1a1a1a] text-[#999]"}`}
          >{p}</button>
        ))}
      </div>

      {/* Overall Score Ring */}
      <div className="flex flex-col items-center py-8">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1a1a1a" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={overallColor} strokeWidth="8"
              strokeDasharray={`${(overall / 100) * 327} 327`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bebas" style={{ color: overallColor }}>{overall}</span>
          </div>
        </div>
        <span className="mt-3 text-sm font-bebas tracking-wider" style={{ color: overallColor }}>{verdict}</span>
      </div>

      {/* 8 Parameter Scores */}
      <div>
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Parameter Scores</h3>
        <div className="grid grid-cols-2 gap-3">
          {parameterScores.map((param) => {
            const key = parameterKeys[param];
            const score = (stock.scores as any)[key] ?? 50;
            const color = getScoreColor(score);
            const change = Math.floor(Math.random() * 10) - 4;
            return (
              <div key={param} className="p-3 rounded-xl bg-[#111111] border border-[#1a1a1a]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#999]">{param}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono font-bold" style={{ color }}>{score}</span>
                    <span className={`text-[10px] font-mono ${change >= 0 ? "text-primary" : "text-[#FF5050]"}`}>
                      {change >= 0 ? "▲" : "▼"}{Math.abs(change)}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1a1a1a]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy Score */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Strategy Score</h3>
        {["Trend strength", "Entry timing", "Risk/reward", "Exit signal"].map((label) => {
          const val = 40 + Math.floor(Math.random() * 50);
          return (
            <div key={label} className="flex items-center justify-between mb-2 last:mb-0">
              <span className="text-xs text-[#999] w-28">{label}</span>
              <div className="flex-1 mx-3 h-1.5 rounded-full bg-[#1a1a1a]">
                <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: getScoreColor(val) }} />
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: getScoreColor(val) }}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* Chart Pattern */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-2 font-medium">Chart Pattern</h3>
        <p className="text-sm font-medium">Inverted Hammer</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#666]">Reliability:</span>
          <span className="text-xs font-mono text-primary font-bold">72</span>
        </div>
        <p className="text-xs text-[#666] mt-1">Potential bullish reversal.</p>

        {/* Mini candlestick chart */}
        <div className="mt-4 flex items-end gap-1.5 h-20 px-2">
          {[40, 55, 35, 60, 45, 70, 50, 65, 30, 75, 55, 80].map((h, i) => {
            const isHighlighted = i >= 8 && i <= 10;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className={`w-full rounded-sm ${isHighlighted ? "bg-primary" : i % 2 === 0 ? "bg-[#FF5050]" : "bg-primary/40"}`} style={{ height: `${h}%` }} />
              </div>
            );
          })}
        </div>
        {/* Pattern highlight box */}
        <div className="flex justify-end pr-2 -mt-1">
          <div className="border border-primary/50 rounded px-1 py-0.5">
            <span className="text-[8px] text-primary font-mono">Pattern</span>
          </div>
        </div>
      </div>

      {/* Ask AI strip */}
      <button
        onClick={() => navigate("/app/ask-ai")}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-[#222] hover:border-primary/30 transition-colors"
      >
        <span className="text-sm">Ask AI about <span className="font-medium text-primary">{stock.symbol}</span></span>
        <ArrowRight size={16} className="text-primary" />
      </button>

      {/* Set Alert */}
      <button
        onClick={() => navigate("/app/alerts")}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        Set Alert
      </button>
    </div>
  );
};

export default StockDetail;
