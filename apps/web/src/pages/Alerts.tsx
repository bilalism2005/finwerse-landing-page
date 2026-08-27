import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Bell } from "lucide-react";
import { alerts as initialAlerts } from "@/lib/dummyData";

const Alerts = () => {
  const navigate = useNavigate();
  const [alertsList, setAlertsList] = useState(initialAlerts.map((a, i) => ({ ...a, id: i })));
  const [showCreate, setShowCreate] = useState(false);

  const [newStock, setNewStock] = useState("");
  const [newParameter, setNewParameter] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPeriod, setNewPeriod] = useState("");

  const toggleAlert = (id: number) => {
    setAlertsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const resetCreateForm = () => {
    setNewStock("");
    setNewParameter("");
    setNewCondition("");
    setNewValue("");
    setNewPeriod("");
    setShowCreate(false);
  };

  const isCreateFormComplete = newStock && newParameter && newCondition && newValue && newPeriod;

  const handleCreateAlert = () => {
    if (!isCreateFormComplete) return;
    setAlertsList((prev) => [
      {
        id: Date.now(),
        stock: newStock,
        condition: `${newParameter} ${newCondition.toLowerCase()} ${newValue} on ${newPeriod}`,
        active: true,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
      ...prev,
    ]);
    resetCreateForm();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#1a1a1a] rounded-lg"><ArrowLeft size={20} /></button>
        <Bell size={18} className="text-primary" />
        <span className="text-sm font-medium">Alerts</span>
      </div>

      <div className="flex flex-col gap-3">
        {alertsList.map((alert) => (
          <div key={alert.id} className="p-4 rounded-xl bg-[#111111] border border-[#1a1a1a]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{alert.stock}</p>
                <p className="text-xs text-[#666] mt-1">{alert.condition}</p>
                <p className="text-[10px] text-[#444] mt-1">{alert.date}</p>
              </div>
              <button
                onClick={() => toggleAlert(alert.id)}
                className={`w-10 h-5 rounded-full relative transition-colors ${alert.active ? "bg-primary" : "bg-[#333]"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${alert.active ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Alert */}
      {showCreate ? (
        <div className="p-4 rounded-xl bg-[#111111] border border-primary/30 space-y-3">
          <h3 className="text-xs text-[#666] uppercase tracking-wider font-medium">New Alert</h3>
          <select value={newStock} onChange={(e) => setNewStock(e.target.value)} className="w-full p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a] text-sm outline-none">
            <option value="">Select stock</option>
            <option>RELIANCE</option><option>TATAMOTORS</option><option>ZOMATO</option><option>HDFCBANK</option><option>ADANIPORTS</option>
          </select>
          <select value={newParameter} onChange={(e) => setNewParameter(e.target.value)} className="w-full p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a] text-sm outline-none">
            <option value="">Select parameter</option>
            <option>Price</option><option>Overall Score</option><option>Technical</option><option>Fundamental</option>
            <option>Sentiment</option><option>External</option><option>Volatility</option><option>Liquidity</option>
            <option>Analyst</option><option>Momentum</option><option>Pattern</option>
          </select>
          <select value={newCondition} onChange={(e) => setNewCondition(e.target.value)} className="w-full p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a] text-sm outline-none">
            <option value="">Select condition</option>
            <option>Drops below</option><option>Crosses above</option><option>Equals</option>
          </select>
          <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Set value" className="w-full p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a] text-sm outline-none placeholder:text-[#444]" />
          <select value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} className="w-full p-2.5 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a] text-sm outline-none">
            <option value="">Select holding period</option>
            <option>Intraday</option><option>Short-term</option><option>Swing</option><option>Weekly</option><option>Monthly</option><option>Long-term</option>
          </select>
          <div className="flex gap-2">
            <button onClick={resetCreateForm} className="flex-1 py-2.5 rounded-lg border border-[#333] text-sm text-[#999]">Cancel</button>
            <button
              onClick={handleCreateAlert}
              disabled={!isCreateFormComplete}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Alert
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Add New Alert
        </button>
      )}
    </div>
  );
};

export default Alerts;
