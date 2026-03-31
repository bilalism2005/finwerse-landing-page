import { useNavigate } from "react-router-dom";

const WhatsApp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-4xl font-bebas tracking-wide">
          <span className="text-[#F0F0F0]">FIN</span>
          <span className="text-[#B5FF3C]">WERSE</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl md:text-5xl font-bebas tracking-wide text-center mb-4 text-[#F0F0F0]">
        JOIN THE <span className="text-[#B5FF3C]">COMMUNITY</span>.
      </h1>

      {/* Sub line */}
      <p className="text-[#666] text-sm font-dm text-center max-w-md mb-10">
        Get early access updates, trading insights and connect with other Finwerse traders.
      </p>

      {/* WhatsApp button */}
      <a
        href="https://chat.whatsapp.com/EMvWWplb3ma5eofToe3yW7"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-sm h-12 rounded-lg bg-[#B5FF3C] text-[#0D0D0D] font-bebas tracking-wider text-sm flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        JOIN WHATSAPP COMMUNITY ↗
      </a>

      {/* Continue link */}
      <button
        onClick={() => navigate("/broker-connect")}
        className="mt-6 text-[#666] text-sm font-dm hover:text-[#F0F0F0] transition-colors"
      >
        Continue to app →
      </button>
    </div>
  );
};

export default WhatsApp;
