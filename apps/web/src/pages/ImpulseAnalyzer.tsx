import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { impulseData } from "@/lib/dummyData";

const months = ["january", "february", "march"] as const;
const monthLabels: Record<string, string> = { january: "January 2025", february: "February 2025", march: "March 2025" };
const chartData = [
  { month: "Jan", trades: 9 },
  { month: "Feb", trades: 7 },
  { month: "Mar", trades: 5 },
];

const ImpulseAnalyzer = () => {
  const navigate = useNavigate();
  const [monthIdx, setMonthIdx] = useState(2); // March
  const monthKey = months[monthIdx];
  const data = impulseData[monthKey];

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#1a1a1a] rounded-lg"><ArrowLeft size={20} /></button>
        <BarChart3 size={18} className="text-primary" />
        <span className="text-sm font-medium">Impulse Analyzer</span>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setMonthIdx((p) => Math.max(0, p - 1))} disabled={monthIdx === 0} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg disabled:opacity-30">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bebas tracking-wider w-36 text-center">{monthLabels[monthKey]}</span>
        <button onClick={() => setMonthIdx((p) => Math.min(2, p + 1))} disabled={monthIdx === 2} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary Card */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#FF5050]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#666] uppercase tracking-wider">Impulse Trades</p>
            <p className="text-2xl font-bebas text-[#FF5050] mt-1">{data.totalTrades}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#666] uppercase tracking-wider">Avoidable Loss</p>
            <p className="text-2xl font-bebas text-[#FF5050] mt-1">₹{data.totalLoss.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Individual Trades (only for March) */}
      {"trades" in data && (
        <div className="flex flex-col gap-2">
          {data.trades.map((trade, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-[#1a1a1a]">
              <div>
                <p className="text-sm font-medium">{trade.stock}</p>
                <p className="text-[10px] text-[#666]">Score was <span className="text-[#FF5050] font-mono">{trade.score}</span>, bought anyway</p>
              </div>
              <span className="text-sm font-mono font-bold text-[#FF5050]">-₹{trade.loss.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Improvement Chart */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-4 font-medium">Improvement Trend</h3>
        <div className="flex items-end justify-center gap-6 h-32">
          {chartData.map((d) => {
            const height = (d.trades / 10) * 100;
            const isActive = d.month === ["Jan", "Feb", "Mar"][monthIdx];
            return (
              <div key={d.month} className="flex flex-col items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#FF5050]">{d.trades}</span>
                <div className="w-10 rounded-t-lg transition-all" style={{ height: `${height}%`, backgroundColor: isActive ? "#FF5050" : "#333" }} />
                <span className="text-[10px] text-[#666]">{d.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImpulseAnalyzer;
