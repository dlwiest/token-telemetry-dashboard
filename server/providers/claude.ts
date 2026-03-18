import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type { ProviderData } from "../types.js";

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";

interface Credentials {
  accessToken: string;
  refreshToken: string;
}

// Track where we read creds from so we write back to the same place on refresh.
// This avoids conflicts with Claude Code sessions that may use a different keychain entry.
type CredSource = { type: "env" } | { type: "file"; path: string } | { type: "keychain"; account: string };

function readKeychain(account: string): string {
  return execSync(
    `security find-generic-password -s 'Claude Code-credentials' -a '${account}' -w`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  ).trim();
}

/**
 * Credential resolution order:
 * 1. CLAUDE_CODE_OAUTH_TOKEN env var (explicit override)
 * 2. ~/.claude/.credentials.json (works on Linux; macOS SSH fallback)
 * 3. macOS Keychain (tries current $USER account, then "root")
 */
function getCredentials(): { creds: Credentials; source: CredSource } {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    const parsed = JSON.parse(process.env.CLAUDE_CODE_OAUTH_TOKEN);
    const inner = parsed.claudeAiOauth ?? parsed;
    return { creds: { accessToken: inner.accessToken, refreshToken: inner.refreshToken }, source: { type: "env" } };
  }

  const credFile = path.join(homedir(), ".claude", ".credentials.json");
  try {
    const parsed = JSON.parse(readFileSync(credFile, "utf-8"));
    const inner = parsed.claudeAiOauth ?? parsed;
    return { creds: { accessToken: inner.accessToken, refreshToken: inner.refreshToken }, source: { type: "file", path: credFile } };
  } catch {
    // fall through
  }

  if (process.platform !== "darwin") {
    throw new Error("No credentials found — set CLAUDE_CODE_OAUTH_TOKEN or create ~/.claude/.credentials.json");
  }

  for (const account of [process.env.USER || "root", "root"]) {
    try {
      const raw = readKeychain(account);
      const parsed = JSON.parse(raw);
      const inner = parsed.claudeAiOauth ?? parsed;
      return { creds: { accessToken: inner.accessToken, refreshToken: inner.refreshToken }, source: { type: "keychain", account } };
    } catch {
      // try next
    }
  }
  throw new Error("No credentials found — log in with `claude auth login`");
}

function writeCredentials(creds: Credentials, source: CredSource): void {
  const payload = JSON.stringify({
    claudeAiOauth: { accessToken: creds.accessToken, refreshToken: creds.refreshToken },
  });

  if (source.type === "file") {
    writeFileSync(source.path, payload, "utf-8");
  } else if (source.type === "keychain") {
    try {
      execSync(
        `security add-generic-password -U -a '${source.account}' -s 'Claude Code-credentials' -w '${payload.replace(/'/g, "'\\''")}'`,
        { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
      );
    } catch {
      // best effort — Claude Code will refresh on next session start
    }
  }
}

async function refreshAccessToken(rt: string): Promise<Credentials> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: rt,
      client_id: CLIENT_ID,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string; refresh_token: string };
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function fetchUsage(accessToken: string): Promise<Response> {
  return fetch(USAGE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  });
}

let lastGoodResult: ProviderData | null = null;
let rateLimitedUntil = 0;

function status(utilization: number): "nominal" | "throttled" {
  return utilization >= 80 ? "throttled" : "nominal";
}

export async function fetchClaude(): Promise<ProviderData> {
  if (Date.now() < rateLimitedUntil) {
    if (lastGoodResult) return { ...lastGoodResult, error: "Using cached data — rate limited" };
    return {
      id: "claude", name: "CLAUDE_CODE", color: "claude",
      status: "offline", quotas: [], error: "Rate limited — backing off",
    };
  }

  const { creds, source } = getCredentials();
  let res = await fetchUsage(creds.accessToken);

  // Access tokens expire after ~8h — refresh and retry
  if (res.status === 401) {
    try {
      const newCreds = await refreshAccessToken(creds.refreshToken);
      writeCredentials(newCreds, source);
      res = await fetchUsage(newCreds.accessToken);
    } catch {
      return {
        id: "claude", name: "CLAUDE_CODE", color: "claude",
        status: "offline", quotas: [], error: "Token refresh failed — run `claude auth login`",
      };
    }
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "300", 10);
    rateLimitedUntil = Date.now() + Math.max(retryAfter, 300) * 1000;
    if (lastGoodResult) return { ...lastGoodResult, error: "Using cached data — rate limited" };
    return {
      id: "claude", name: "CLAUDE_CODE", color: "claude",
      status: "offline", quotas: [],
      error: `Rate limited — retrying in ${Math.ceil(Math.max(retryAfter, 60) / 60)}m`,
    };
  }

  if (!res.ok) throw new Error(`Claude usage API returned ${res.status}`);

  const data = await res.json() as {
    five_hour: { utilization: number; resets_at: string };
    seven_day: { utilization: number; resets_at: string };
  };

  const fiveHour = data.five_hour.utilization;
  const sevenDay = data.seven_day.utilization;

  const result: ProviderData = {
    id: "claude", name: "CLAUDE_CODE", color: "claude",
    status: status(Math.max(fiveHour, sevenDay)),
    quotas: [
      { label: "5-HOUR", usedPercent: fiveHour, resetsAt: data.five_hour.resets_at },
      { label: "7-DAY", usedPercent: sevenDay, resetsAt: data.seven_day.resets_at },
    ],
  };

  lastGoodResult = result;
  rateLimitedUntil = 0;
  return result;
}
