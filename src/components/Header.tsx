import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-10 py-4 flex items-center justify-between">
        <span className="text-3xl font-bebas tracking-wide text-foreground uppercase">
          Finverse
        </span>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-sm font-montserrat font-medium text-foreground/80 hover:text-foreground transition-colors">
            Home
          </a>
          <a href="#solutions" className="text-sm font-montserrat font-medium text-foreground/80 hover:text-foreground transition-colors">
            Solutions
          </a>
        </nav>
        <button
          onClick={() => navigate("/auth")}
          className="px-5 py-2 text-sm font-montserrat font-medium text-foreground border border-foreground/30 rounded-full hover:border-foreground/60 transition-colors"
        >
          Try Now
        </button>
      </div>
    </header>
  );
};

export default Header;
