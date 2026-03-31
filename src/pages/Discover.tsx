import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { stocks, trendingStocks, holdingPeriods } from "@/lib/dummyData";
import ScorePill from "@/components/ScorePill";
import { getScoreColor } from "@/lib/dummyData";

const Discover = () => {
  const [activePeriod, setActivePeriod] = useState("Swing");
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <Search size={18} className="text-[#666]" />
        <input
          type="text"
          placeholder="Search any stock — RELIANCE, ZOMATO..."
          className="bg-transparent text-sm w-full outline-none placeholder:text-[#444]"
        />
      </div>

      {/* Holding Periods */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {holdingPeriods.map((p) => (
          <button
            key={p}
            onClick={() => setActivePeriod(p)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activePeriod === p ? "bg-primary text-primary-foreground" : "bg-[#1a1a1a] text-[#999] hover:text-[#F0F0F0]"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Trending */}
      <div>
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Trending Today</h3>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {trendingStocks.map((t) => (
            <span
              key={t.symbol}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#111111] border border-[#1a1a1a] text-xs font-mono"
            >
              {t.symbol}{" "}
              <span className={t.change >= 0 ? "text-primary" : "text-[#FF5050]"}>
                {t.change >= 0 ? "▲" : "▼"}{Math.abs(t.change)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Portfolio Stocks */}
      <div>
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Portfolio Stocks</h3>
        <div className="flex flex-col gap-3">
          {stocks.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => navigate(`/app/stock/${stock.symbol}`)}
              className="w-full text-left p-4 rounded-xl bg-[#111111] border border-[#1a1a1a] hover:border-[#333] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center font-bebas text-lg text-[#999]">
                    {stock.symbol.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{stock.symbol}</p>
                    <p className="text-[10px] text-[#666]">{stock.exchange}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold">₹{stock.price.toLocaleString()}</p>
                  <p className={`text-xs font-mono ${stock.change >= 0 ? "text-primary" : "text-[#FF5050]"}`}>
                    {stock.change >= 0 ? "▲" : "▼"}{Math.abs(stock.change)}%
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ScorePill label="Tech" score={stock.scores.technical} />
                <ScorePill label="Fund" score={stock.scores.fundamental} />
                <ScorePill label="Sent" score={stock.scores.sentiment} />
                <ScorePill label="Mom" score={stock.scores.momentum} />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border-2" style={{ borderColor: getScoreColor(stock.scores.overall), backgroundColor: getScoreColor(stock.scores.overall) + "15" }}>
                  <span className="text-[10px] text-[#999] uppercase tracking-wider font-dm">Overall</span>
                  <span className="font-mono font-bold text-xs" style={{ color: getScoreColor(stock.scores.overall) }}>{stock.scores.overall}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Discover;
