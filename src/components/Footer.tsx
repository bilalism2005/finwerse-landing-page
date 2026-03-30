import { ArrowUpRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-accent rounded-t-[2.5rem] py-20 px-5 sm:px-6 md:px-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
        <span className="text-6xl md:text-8xl font-bebas uppercase tracking-wide text-accent-foreground">
          FINVERSE
        </span>
        <div className="flex flex-col gap-3">
          <a
            href="#home"
            className="flex items-center gap-1 text-sm font-montserrat font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-70 transition-opacity"
          >
            BACK TO TOP <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="flex items-center gap-1 text-sm font-montserrat font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-70 transition-opacity"
          >
            TERMS AND CONDITION <ArrowUpRight size={14} />
          </a>
          <a
            href="#"
            className="flex items-center gap-1 text-sm font-montserrat font-semibold uppercase tracking-wider text-accent-foreground hover:opacity-70 transition-opacity"
          >
            PRIVACY POLICY <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
