import { useState } from "react";
import { stocks, holdingPeriods, getScoreColor, getScoreVerdict, getScoreBgClass } from "@/lib/dummyData";

const Portfolio = () => {
  const [activePeriod, setActivePeriod] = useState("Swing");
  const portfolioScore = 67;
  const portfolioColor = getScoreColor(portfolioScore);
  const verdict = getScoreVerdict(portfolioScore);

  const radarDimensions = [
    { label: "Diversification", value: 72 },
    { label: "Risk", value: 58 },
    { label: "Technical", value: 71 },
    { label: "Fundamental", value: 78 },
    { label: "Sentiment", value: 49 },
  ];

  // Simple radar polygon points
  const center = 80;
  const radius = 60;
  const points = radarDimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / radarDimensions.length - Math.PI / 2;
    const r = (d.value / 100) * radius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(" ");

  const bgPoints = radarDimensions.map((_, i) => {
    const angle = (Math.PI * 2 * i) / radarDimensions.length - Math.PI / 2;
    return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
  }).join(" ");

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Overall Score */}
      <div className="flex flex-col items-center py-6">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1a1a1a" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={portfolioColor} strokeWidth="8"
              strokeDasharray={`${(portfolioScore / 100) * 327} 327`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bebas" style={{ color: portfolioColor }}>{portfolioScore}</span>
          </div>
        </div>
        <span className="mt-2 text-sm font-bebas tracking-wider" style={{ color: portfolioColor }}>{verdict}</span>
        <p className="text-xs text-[#666] mt-1 text-center">Your portfolio is moderately healthy. Review weak holdings.</p>
      </div>

      {/* Holding Periods */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {holdingPeriods.map((p) => (
          <button key={p} onClick={() => setActivePeriod(p)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${activePeriod === p ? "bg-primary text-primary-foreground" : "bg-[#1a1a1a] text-[#999]"}`}
          >{p}</button>
        ))}
      </div>

      {/* Radar Chart */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Portfolio Radar</h3>
        <div className="flex justify-center">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <polygon points={bgPoints} fill="none" stroke="#222" strokeWidth="1" />
            {/* Grid lines */}
            {[0.33, 0.66].map((scale) => {
              const gp = radarDimensions.map((_, i) => {
                const angle = (Math.PI * 2 * i) / radarDimensions.length - Math.PI / 2;
                return `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)}`;
              }).join(" ");
              return <polygon key={scale} points={gp} fill="none" stroke="#1a1a1a" strokeWidth="0.5" />;
            })}
            <polygon points={points} fill="hsl(74,100%,55%)" fillOpacity="0.15" stroke="hsl(74,100%,55%)" strokeWidth="1.5" />
            {radarDimensions.map((d, i) => {
              const angle = (Math.PI * 2 * i) / radarDimensions.length - Math.PI / 2;
              const lx = center + (radius + 18) * Math.cos(angle);
              const ly = center + (radius + 18) * Math.sin(angle);
              return (
                <text key={d.label} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#666" fontSize="7" fontFamily="DM Sans">
                  {d.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Individual Stocks */}
      <div>
        <h3 className="text-xs text-[#666] uppercase tracking-wider mb-3 font-medium">Holdings</h3>
        <div className="flex flex-col gap-2">
          {stocks.map((stock) => {
            const color = getScoreColor(stock.scores.overall);
            return (
              <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center font-bebas text-sm text-[#999]">
                    {stock.symbol.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{stock.symbol}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 rounded-full bg-[#1a1a1a]">
                    <div className="h-full rounded-full" style={{ width: `${stock.scores.overall}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-sm font-mono font-bold w-8 text-right" style={{ color }}>{stock.scores.overall}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[#111111] border border-[#1a1a1a] text-center">
          <p className="text-[10px] text-[#666] uppercase tracking-wider">Invested</p>
          <p className="text-sm font-mono font-bold mt-1">₹4,82,000</p>
        </div>
        <div className="p-3 rounded-xl bg-[#111111] border border-[#1a1a1a] text-center">
          <p className="text-[10px] text-[#666] uppercase tracking-wider">Current</p>
          <p className="text-sm font-mono font-bold mt-1">₹5,14,360</p>
        </div>
        <div className="p-3 rounded-xl bg-[#111111] border border-[#1a1a1a] text-center">
          <p className="text-[10px] text-[#666] uppercase tracking-wider">Gain</p>
          <p className="text-sm font-mono font-bold mt-1 text-primary">₹32,360</p>
          <p className="text-[10px] font-mono text-primary">▲6.7%</p>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
