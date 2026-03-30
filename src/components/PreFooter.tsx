import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const socials = [
  { name: "Discord", icon: "💬" },
  { name: "X", icon: "𝕏" },
  { name: "Instagram", icon: "📷" },
  { name: "YouTube", icon: "▶" },
];

const PreFooter = () => {
  const ref = useScrollFadeIn();

  return (
    <section ref={ref} className="fade-in-section bg-background py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Single container: social grid left, CTA right */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* Social Grid - Left */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            {socials.map((s) => (
              <a
                key={s.name}
                href="#"
                className="w-28 h-28 md:w-36 md:h-36 bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <span className="text-3xl md:text-4xl">{s.icon}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {s.name}
                </span>
              </a>
            ))}
          </div>

          {/* CTA Card - Right */}
          <div className="flex-1 bg-primary rounded-3xl p-10 md:p-14 flex flex-col items-center justify-center gap-6 text-center min-h-[280px]">
            <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight text-primary-foreground">
              LET'S TRADE ON DATA. NOT ON TIPS.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-primary-foreground text-primary font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:opacity-90 transition-opacity">
                DOWNLOAD APP
              </button>
              <button className="border-2 border-primary-foreground text-primary-foreground font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-primary-foreground hover:text-primary transition-colors">
                PLAY ON BROWSER
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreFooter;
