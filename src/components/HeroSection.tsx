import { Smartphone } from "lucide-react";

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center hero-grid pt-20">
      <div className="max-w-7xl mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Phone Mockup */}
        <div className="flex justify-center md:justify-start">
          <div className="relative w-64 h-[500px] bg-secondary rounded-[2.5rem] border-2 border-border flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-background rounded-b-2xl" />
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Smartphone size={48} strokeWidth={1} />
              <span className="text-xs uppercase tracking-widest">Finverse App</span>
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="flex flex-col gap-6">
          <h1 className="text-5xl md:text-7xl font-black uppercase leading-[0.95] tracking-tight text-foreground">
            TURN RANDOM TIPS INTO VERIFIED TRADES
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered scores for every stock.
          </p>
          <div>
            <button className="neon-shadow bg-background text-foreground font-bold text-sm uppercase tracking-widest px-8 py-4 border border-border hover:bg-secondary transition-colors">
              TRY NOW
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
