import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { brokers } from "@/lib/dummyData";
import { Check } from "lucide-react";

const BrokerConnect = () => {
  const navigate = useNavigate();
  const [connected, setConnected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleConnect = (brokerName: string) => {
    setConnected(brokerName);
    setToast(`Connected to ${brokerName}. Loading your portfolio...`);
    setTimeout(() => navigate("/app/discover"), 1800);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F0F0F0] font-dm flex flex-col">
      <div className="p-6 md:p-10">
        <span className="text-xl font-bebas tracking-wide">Finwerse</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="max-w-md w-full">
          <h1 className="text-4xl md:text-5xl font-bebas uppercase leading-[0.95] tracking-wide mb-3">
            CONNECT YOUR BROKER.{" "}
            <br />
            SEE <span className="text-primary">EVERYTHING.</span>
          </h1>
          <p className="text-[#666] text-sm mb-10">
            Link your trading account. Your full portfolio shows up instantly — scored, analysed, and ready.
          </p>

          <div className="flex flex-col gap-3">
            {brokers.map((broker) => (
              <div
                key={broker.name}
                className="flex items-center justify-between p-4 rounded-xl bg-[#111111] border border-[#1a1a1a] hover:border-[#333] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bebas text-lg" style={{ backgroundColor: broker.color + "20", color: broker.color }}>
                    {broker.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{broker.name}</p>
                    <p className="text-[10px] text-[#666] font-mono">{broker.api}</p>
                  </div>
                </div>
                {connected === broker.name ? (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    <Check size={14} />
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={() => handleConnect(broker.name)}
                    disabled={!!connected}
                    className="px-4 py-2 rounded-full border border-primary text-primary text-xs font-semibold hover:bg-primary/10 transition-colors disabled:opacity-40"
                  >
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/app/discover")}
            className="mt-8 text-[#666] text-sm hover:text-[#999] transition-colors mx-auto block"
          >
            Skip for now →
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toast}
        </div>
      )}
    </div>
  );
};

export default BrokerConnect;
