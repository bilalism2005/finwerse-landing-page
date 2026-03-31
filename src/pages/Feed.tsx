import { useState } from "react";
import { portfolioNews, marketNews } from "@/lib/dummyData";

const Feed = () => {
  const [tab, setTab] = useState<"portfolio" | "market">("portfolio");
  const articles = tab === "portfolio" ? portfolioNews : marketNews;

  const getSentimentBadge = (sentiment: number) => {
    if (sentiment > 0.2) return { bg: "bg-primary/15", text: "text-primary", label: `+${sentiment.toFixed(2)}` };
    if (sentiment < -0.2) return { bg: "bg-[#FF5050]/15", text: "text-[#FF5050]", label: sentiment.toFixed(2) };
    return { bg: "bg-[#666]/15", text: "text-[#666]", label: sentiment.toFixed(2) };
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#111111] border border-[#1a1a1a]">
        <button
          onClick={() => setTab("portfolio")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === "portfolio" ? "bg-[#1a1a1a] text-[#F0F0F0]" : "text-[#666]"}`}
        >
          Portfolio News
        </button>
        <button
          onClick={() => setTab("market")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === "market" ? "bg-[#1a1a1a] text-[#F0F0F0]" : "text-[#666]"}`}
        >
          Market News
        </button>
      </div>

      {/* Articles */}
      <div className="flex flex-col gap-3">
        {articles.map((article, i) => {
          const badge = getSentimentBadge(article.sentiment);
          return (
            <div key={i} className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium leading-snug mb-2">{article.headline}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[#666]">
                    <span>{article.source}</span>
                    <span>·</span>
                    <span>{article.time}</span>
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-mono font-bold ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Feed;
