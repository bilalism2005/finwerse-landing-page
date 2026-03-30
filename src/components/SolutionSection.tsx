import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

import stockAnalyticsImg from "@/assets/stock-analytics.png";
import portfolioHealthImg from "@/assets/portfolio-health.png";
import entryExitAlertsImg from "@/assets/entry-exit-alerts.png";
import askAiImg from "@/assets/ask-ai.png";
import impulseAnalyzerImg from "@/assets/impulse-analyzer.png";
import chartAnalyzerImg from "@/assets/chart-analyzer.png";
import focusFeedImg from "@/assets/focus-feed.png";

const solutionBlocks = [
  {
    image: stockAnalyticsImg,
    heading: "VERIFIED TRADES ONLY. EVERYTHING ELSE STAYS OUT.",
    label: "Stock Analytics",
    bullets: [
      "Search any stock for an instant full picture",
      "Scored across 8 parameters based on your holding period",
      "Decide with data, not tips",
    ],
    imageLeft: true,
  },
  {
    image: portfolioHealthImg,
    heading: "PORTFOLIO THAT HOLDS WHEN OTHERS FALL.",
    label: "Portfolio Health",
    bullets: [
      "Connect your account to see every stock scored instantly",
      "Spot diversification gaps and risk levels at a glance",
      "Identify which stocks are pulling you down before it worsens",
    ],
    imageLeft: false,
  },
  {
    image: entryExitAlertsImg,
    heading: "ALWAYS ON TIME. EVERY TRADE.",
    label: "Entry-Exit Alerts",
    bullets: [
      "Set alerts on any score, price, or pattern",
      "Fires the moment conditions are met",
      "Never miss an entry or exit again",
    ],
    imageLeft: true,
  },
  {
    image: askAiImg,
    heading: "INSTANT CLARITY. HOURS SAVED.",
    label: "AI Chatbot",
    bullets: [
      "Get answers directly from official filings",
      "One-tap summaries and portfolio conclusions",
      "Set alerts and analyze trades via chat",
    ],
    imageLeft: false,
  },
  {
    image: impulseAnalyzerImg,
    heading: "FEWER EMOTIONAL TRADES. PORTFOLIO RECOVERS.",
    label: "Impulse Analyzer",
    bullets: [
      "Automatically tracks every trade against AI scores",
      "Flags low-score emotional buys instantly",
      "Shows exact rupees lost on impulse trades to help you trade smarter",
    ],
    imageLeft: true,
  },
  {
    image: chartAnalyzerImg,
    heading: "BE YOUR OWN ANALYST.",
    label: "Chart Analyzer",
    bullets: [
      "Automatically detects 20+ chart patterns",
      "Every pattern is named and scored from 0 to 100",
      "Reliability scores let you decide without needing an expert",
    ],
    imageLeft: false,
  },
  {
    image: focusFeedImg,
    heading: "UNBOTHERED BY HEADLINES.",
    label: "Focus Feed",
    bullets: [
      "Separate tabs for portfolio news and market news",
      "Sentiment scores show the real impact of any article",
      "Scores decide the action, not the headlines",
    ],
    imageLeft: true,
  },
];

const SolutionBlock = ({
  image,
  heading,
  label,
  bullets,
  imageLeft,
}: (typeof solutionBlocks)[0]) => {
  const ref = useScrollFadeIn();

  const imageEl = (
    <div className="flex justify-center">
      <img
        src={image}
        alt={label}
        loading="lazy"
        width={512}
        height={512}
        className="w-full max-w-sm rounded-2xl sticker-icon"
      />
    </div>
  );

  const textEl = (
    <div className="flex flex-col">
      <span className="text-xs font-montserrat font-bold uppercase tracking-[0.2em] text-primary mb-5">
        {label}
      </span>
      <h2 className="text-3xl md:text-5xl font-bebas uppercase leading-tight tracking-wide text-foreground mb-8">
        {heading}
      </h2>
      <ul className="flex flex-col gap-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 font-nunito text-muted-foreground">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      ref={ref}
      className="fade-in-section min-h-[80vh] flex items-center justify-center py-[160px] px-6 md:px-10 lg:px-20"
    >
      <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
        {imageLeft ? (
          <>
            {imageEl}
            {textEl}
          </>
        ) : (
          <>
            {textEl}
            {imageEl}
          </>
        )}
      </div>
    </div>
  );
};

const SolutionSection = () => {
  return (
    <section id="solutions" className="bg-background">
      {solutionBlocks.map((block, i) => (
        <SolutionBlock key={i} {...block} />
      ))}
    </section>
  );
};

export default SolutionSection;
