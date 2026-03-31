import { getScoreColor } from "@/lib/dummyData";

interface ScorePillProps {
  label: string;
  score: number;
  large?: boolean;
}

const ScorePill = ({ label, score, large }: ScorePillProps) => {
  const color = getScoreColor(score);
  return (
    <div className={`flex items-center gap-1.5 ${large ? "px-3 py-1.5" : "px-2 py-1"} rounded-full bg-[#1a1a1a] border border-[#222]`}>
      <span className="text-[#999] font-dm text-[10px] uppercase tracking-wider">{label}</span>
      <span className="font-mono font-bold" style={{ color, fontSize: large ? 14 : 11 }}>{score}</span>
    </div>
  );
};

export default ScorePill;
