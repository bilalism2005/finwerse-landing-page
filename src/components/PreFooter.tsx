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
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-16">
        {/* Social Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {socials.map((s) => (
            <a
              key={s.name}
              href="#"
              className="w-24 h-24 md:w-32 md:h-32 bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
            >
              <span className="text-3xl">{s.icon}</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {s.name}
              </span>
            </a>
          ))}
        </div>

        {/* CTA Card */}
        <div className="w-full max-w-2xl bg-primary rounded-3xl p-10 md:p-14 flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight tracking-tight text-primary-foreground">
            LET'S TRADE ON DATA. NOT ON TIPS.
          </h2>
          <button className="bg-primary-foreground text-primary font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:opacity-90 transition-opacity">
            TRY NOW
          </button>
        </div>
      </div>
    </section>
  );
};

export default PreFooter;
