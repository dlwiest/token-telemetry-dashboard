import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { fetchClaude } from "./providers/claude.js";
import { fetchCodex } from "./providers/codex.js";
import { fetchCopilot } from "./providers/copilot.js";
import type { ProviderData, ProviderColor, TelemetryResponse } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Math.max(1, parseInt(process.env.PORT || "4800", 10)) || 4800;
const POLL_INTERVAL = Math.max(5, parseInt(process.env.POLL_INTERVAL || "30", 10)) || 30;

function isEnabled(envKey: string): boolean | undefined {
  const val = process.env[envKey];
  if (val === undefined) return undefined;
  return val.toLowerCase() === "true";
}

const providers: {
  key: ProviderColor;
  envKey: string;
  fetcher: () => Promise<ProviderData>;
}[] = [
  { key: "claude", envKey: "ENABLE_CLAUDE", fetcher: fetchClaude },
  { key: "codex", envKey: "ENABLE_CODEX", fetcher: fetchCodex },
  { key: "copilot", envKey: "ENABLE_COPILOT", fetcher: fetchCopilot },
];

app.get("/api/config", (_req, res) => {
  const enabledProviders = providers
    .filter((p) => isEnabled(p.envKey) !== false)
    .map((p) => p.key);

  res.json({ enabledProviders, pollInterval: POLL_INTERVAL });
});

app.get("/api/telemetry", async (_req, res) => {
  const enabled = providers.filter((p) => isEnabled(p.envKey) !== false);
  const results = await Promise.allSettled(enabled.map((p) => p.fetcher()));

  const providerData: ProviderData[] = results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;

    const key = enabled[i].key;
    console.error(`[${key}] ${result.reason?.message || "Unknown error"}`);

    return {
      id: key,
      name: key.toUpperCase(),
      color: key,
      status: "offline" as const,
      quotas: [],
      error: "Provider unavailable",
    };
  });

  const response: TelemetryResponse = {
    providers: providerData,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

// Serve built frontend in production (npm start)
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.use((_req, res, next) => {
  if (_req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
