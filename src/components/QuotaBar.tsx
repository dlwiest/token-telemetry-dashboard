import type { ProviderColor } from "../types";

interface QuotaBarProps {
  label: string;
  usedPercent: number;
  color: ProviderColor;
  resetsAt: string | null;
}

const colorMap: Record<ProviderColor, string> = {
  claude: "bg-claude",
  codex: "bg-codex",
  copilot: "bg-copilot",
};

function formatCountdown(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const resetTime = new Date(resetsAt).getTime();
  if (isNaN(resetTime)) return null;
  const diff = resetTime - Date.now();
  if (diff <= 0) return "NOW";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function QuotaBar({ label, usedPercent, color, resetsAt }: QuotaBarProps) {
  const blocks = 20;
  const filledBlocks = Math.round((usedPercent / 100) * blocks);
  const isAlert = usedPercent >= 80;
  const bgClass = colorMap[color];
  const countdown = formatCountdown(resetsAt);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="label-text">{label}</label>
        {countdown && (
          <span className="text-xs text-label tabular-nums tracking-widest">
            RESETS {countdown}
          </span>
        )}
      </div>
      <div className="flex gap-[3px] h-8">
        {Array.from({ length: blocks }, (_, i) => (
          <div
            key={i}
            className={`flex-1 ${i < filledBlocks ? bgClass : "bg-border"}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 label-text tabular-nums">
        <span>0%</span>
        <span className={`text-base font-bold ${isAlert ? "text-alert" : "text-foreground"}`}>
          {usedPercent}% USED
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
