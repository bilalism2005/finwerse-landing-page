import {
  PhoneOff,
  TrendingDown,
  Clock,
  Search,
  Flame,
  BarChart3,
  Newspaper,
} from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const painBlocks = [
  {
    icon: PhoneOff,
    iconBg: "bg-red-500",
    pain: "TRUSTED RANDOM TRADING CALL, BOOKED REAL LOSS.",
    reassurance: "You don't need to stop taking calls. Just start verifying them.",
    reverse: false,
  },
  {
    icon: TrendingDown,
    iconBg: "bg-orange-500",
    pain: "MARKET DIPPED. EVERYTHING FELL. NOT UNLUCKY. YOU WERE UNDIVERSIFIED.",
    reassurance: "Building a resilient portfolio isn't hard. It just needs the right information.",
    reverse: true,
  },
  {
    icon: Clock,
    iconBg: "bg-yellow-500",
    pain: "LATE ENTRY. MISSED THE MOVE. / WAITED FOR MORE. LEFT WITH LESS.",
    reassurance: "Mistimed entries and exits are universal. Alerts make them avoidable.",
    reverse: false,
  },
  {
    icon: Search,
    iconBg: "bg-blue-500",
    pain: "RESEARCH TOOK 2 HOURS. CONFIDENCE WAS STILL ZERO.",
    reassurance: "One prompt. No more hours. Just verified answers.",
    reverse: true,
  },
  {
    icon: Flame,
    iconBg: "bg-rose-500",
    pain: "TRIED TO RECOVER. WENT DEEPER IN RED.",
    reassurance: "The urge to recover is human. Now there's a way to control it.",
    reverse: false,
  },
  {
    icon: BarChart3,
    iconBg: "bg-purple-500",
    pain: "CHART PATTERNS FELT LIKE EXPERT STUFF.",
    reassurance: "Not anymore.",
    reverse: true,
  },
  {
    icon: Newspaper,
    iconBg: "bg-teal-500",
    pain: "NEWS FELT BIG. STOCK DIDN'T MOVE.",
    reassurance: "Headlines are designed to feel urgent. The score tells you which ones to act on.",
    reverse: false,
  },
];

const PainBlock = ({
  icon: Icon,
  iconBg,
  pain,
  reassurance,
  reverse,
}: (typeof painBlocks)[0]) => {
  const ref = useScrollFadeIn();

  return (
    <div
      ref={ref}
      className={`fade-in-section max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center ${
        reverse ? "md:direction-rtl" : ""
      }`}
      style={{ direction: reverse ? "rtl" : "ltr" }}
    >
      {/* Text */}
      <div style={{ direction: "ltr" }} className="flex flex-col gap-4">
        <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight text-foreground">
          {pain}
        </h2>
        <p className="text-lg text-muted-foreground">{reassurance}</p>
      </div>

      {/* Sticker Icon */}
      <div className="flex justify-center" style={{ direction: "ltr" }}>
        <div
          className={`sticker-icon w-36 h-36 md:w-48 md:h-48 ${iconBg} rounded-3xl flex items-center justify-center border-4 border-foreground`}
        >
          <Icon size={72} strokeWidth={2.5} className="text-foreground" />
        </div>
      </div>
    </div>
  );
};

const PainSection = () => {
  return (
    <section className="bg-background">
      {painBlocks.map((block, i) => (
        <PainBlock key={i} {...block} />
      ))}
    </section>
  );
};

export default PainSection;
