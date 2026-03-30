const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-2xl font-black tracking-tight text-foreground uppercase">
          Finverse
        </span>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Home
          </a>
          <a href="#solutions" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Solutions
          </a>
        </nav>
        <a
          href="#trynow"
          className="px-5 py-2 text-sm font-medium text-foreground border border-foreground/30 rounded-full hover:border-foreground/60 transition-colors"
        >
          Try Now
        </a>
      </div>
    </header>
  );
};

export default Header;
