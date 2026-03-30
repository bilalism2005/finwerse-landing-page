import {
  BarChart3,
  ShieldCheck,
  Bell,
  MessageSquare,
  Brain,
  LineChart,
  Rss,
} from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const solutionBlocks = [
  {
    icon: BarChart3,
    iconBg: "bg-primary",
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
    icon: ShieldCheck,
    iconBg: "bg-emerald-500",
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
    icon: Bell,
    iconBg: "bg-amber-500",
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
    icon: MessageSquare,
    iconBg: "bg-sky-500",
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
    icon: Brain,
    iconBg: "bg-rose-500",
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
    icon: LineChart,
    iconBg: "bg-violet-500",
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
    icon: Rss,
    iconBg: "bg-teal-500",
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
  icon: Icon,
  iconBg,
  heading,
  label,
  bullets,
  imageLeft,
}: (typeof solutionBlocks)[0]) => {
  const ref = useScrollFadeIn();

  const imageEl = (
    <div className="flex justify-center">
      <div
        className={`w-full max-w-sm aspect-[4/3] ${iconBg}/10 rounded-2xl border border-border flex items-center justify-center`}
      >
        <Icon size={64} strokeWidth={1.5} className={`${iconBg.replace("bg-", "text-")}`} />
      </div>
    </div>
  );

  const textEl = (
    <div className="flex flex-col gap-5">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {label}
      </span>
      <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight text-foreground">
        {heading}
      </h2>
      <ul className="flex flex-col gap-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-muted-foreground">
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
      className="fade-in-section max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center"
    >
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
