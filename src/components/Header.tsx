import { useState, useCallback, useEffect } from "react";
import type { ProviderData, ProviderColor } from "../types";

interface HeaderProps {
  providers: ProviderData[];
}

const dotColorMap: Record<ProviderColor, string> = {
  claude: "bg-claude",
  codex: "bg-codex",
  copilot: "bg-copilot",
};

export default function Header({ providers }: HeaderProps) {
  const hasProviders = providers.length > 0;
  const anyOffline = providers.some((p) => p.status === "offline");
  const anyThrottled = providers.some((p) => p.status === "throttled");
  const statusText = !hasProviders
    ? "LOADING"
    : anyOffline
    ? "DEGRADED"
    : anyThrottled
    ? "THROTTLED"
    : "OPERATIONAL";

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <div className="panel p-5 mb-3">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            TOKEN_TELEMETRY
          </h1>
          <p className="label-text flex items-center gap-3 mt-1">
            <span>SYSTEM_STATUS: {statusText}</span>
            <span className="flex gap-1.5">
              {providers.map((p) => (
                <span
                  key={p.id}
                  className={`inline-block w-3 h-3 ${
                    p.status === "offline" ? "bg-alert" : dotColorMap[p.color]
                  }`}
                />
              ))}
            </span>
          </p>
        </div>
        <button
          onClick={toggleFullscreen}
          className="text-label hover:text-foreground transition-colors text-sm font-bold tracking-widest"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          [{isFullscreen ? "x" : " "}]
        </button>
      </div>
    </div>
  );
}
