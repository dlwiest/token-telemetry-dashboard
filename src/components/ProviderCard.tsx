import { useState, useEffect } from "react";
import type { ProviderData, ProviderColor } from "../types";
import QuotaBar from "./QuotaBar";

interface ProviderCardProps {
  provider: ProviderData;
}

const colorClassMap: Record<ProviderColor, string> = {
  claude: "text-claude",
  codex: "text-codex",
  copilot: "text-copilot",
};

export default function ProviderCard({ provider }: ProviderCardProps) {
  const hasAlert = provider.quotas.some((q) => q.usedPercent >= 90);
  const nameColor = colorClassMap[provider.color];

  // Only tick if there's a countdown to show
  const hasResets = provider.quotas.some((q) => q.resetsAt);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!hasResets) return;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasResets]);

  const worstQuota = provider.quotas.reduce(
    (worst, q) => (q.usedPercent > worst.usedPercent ? q : worst),
    { usedPercent: 0, label: "", resetsAt: null as string | null }
  );

  return (
    <div
      className={`panel p-6 flex flex-col min-h-0 overflow-hidden w-full ${
        hasAlert ? "blink-alert" : ""
      }`}
    >
      {/* Top: name */}
      <div className="flex justify-between items-start">
        <span className={`text-lg font-bold tracking-widest ${nameColor}`}>
          {provider.name}
        </span>
      </div>
      <div className="flex flex-col items-center mt-8">
        <div
          className={`text-6xl font-bold tabular-nums leading-none ${
            worstQuota.usedPercent >= 80 ? "text-alert" : "text-foreground"
          }`}
        >
          {provider.quotas.length > 0 ? `${worstQuota.usedPercent}%` : "—"}
        </div>
        {provider.quotas.length > 0 && (
          <span className="label-text mt-2">
            {worstQuota.label} USED
          </span>
        )}
        {provider.status === "offline" && provider.error && (
          <span className="text-sm text-alert tracking-widest mt-2 text-center">
            {provider.error.toUpperCase()}
          </span>
        )}
      </div>

      {/* Middle: quota bars, vertically centered */}
      <div className="flex-1 flex flex-col justify-center space-y-8">
        {provider.quotas.map((q) => (
          <QuotaBar
            key={q.label}
            label={q.label}
            usedPercent={q.usedPercent}
            color={provider.color}
            resetsAt={q.resetsAt}
          />
        ))}
      </div>

      {/* Bottom: status */}
      <div className="flex justify-end border-t-2 border-border pt-4">
        <div className="text-right">
          <label className="block label-text">STATUS</label>
          <span
            className={`text-xl font-bold ${
              provider.status === "nominal"
                ? "text-nominal"
                : provider.status === "throttled"
                ? "text-alert"
                : "text-label"
            }`}
          >
            {provider.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
