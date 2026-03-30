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
    painLines: ["LATE ENTRY. MISSED THE MOVE.", "WAITED FOR MORE. LEFT WITH LESS."],
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
  painLines,
  reassurance,
  reverse,
}: (typeof painBlocks)[0] & { painLines?: string[] }) => {
  const ref = useScrollFadeIn();

  return (
    <div
      ref={ref}
      className="fade-in-section min-h-[80vh] flex items-center justify-center py-[160px] px-6 md:px-10 lg:px-20"
    >
      <div
        className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-16 lg:gap-24 items-center"
        style={{ direction: reverse ? "rtl" : "ltr" }}
      >
        {/* Text */}
        <div style={{ direction: "ltr" }} className="flex flex-col">
          {painLines ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {painLines.map((line, i) => (
                <h2 key={i} className="text-3xl md:text-4xl font-bebas uppercase leading-tight tracking-wide text-foreground">
                  {line}
                </h2>
              ))}
            </div>
          ) : (
            <h2 className="text-3xl md:text-5xl font-bebas uppercase leading-tight tracking-wide text-foreground mb-6">
              {pain}
            </h2>
          )}
          <p className="text-lg font-nunito text-muted-foreground">{reassurance}</p>
        </div>

        {/* Sticker Icon */}
        <div className="flex justify-center" style={{ direction: "ltr" }}>
          <div
            className={`sticker-icon w-40 h-40 md:w-56 md:h-56 ${iconBg} rounded-3xl flex items-center justify-center border-4 border-foreground`}
          >
            <Icon size={80} strokeWidth={2.5} className="text-foreground" />
          </div>
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
