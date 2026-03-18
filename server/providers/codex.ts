import { spawn } from "child_process";
import type { ProviderData } from "../types.js";

/**
 * Codex doesn't expose a simple HTTP API for rate limits.
 * We spawn `codex app-server` (a local JSON-RPC server over stdio),
 * send an initialize handshake, then request account/rateLimits/read.
 * The process is killed immediately after we get the response.
 */

interface RateLimitWindow {
  usedPercent?: number;
  resetsAt?: number; // unix timestamp in seconds
}

interface RateLimitsResult {
  rateLimits?: {
    primary?: RateLimitWindow;
    secondary?: RateLimitWindow;
  };
}

function sendJsonLine(proc: ReturnType<typeof spawn>, msg: object): void {
  proc.stdin!.write(JSON.stringify(msg) + "\n");
}

export async function fetchCodex(): Promise<ProviderData> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill();
        reject(new Error("Codex app-server timed out"));
      }
    }, 15000);

    const proc = spawn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let buffer = "";

    proc.stdout!.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();

      // Codex uses newline-delimited JSON (not LSP Content-Length framing)
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;
        let msg: { id: number; result?: RateLimitsResult; error?: { code: number; message: string } };
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }

        if (msg.id === 1) {
          sendJsonLine(proc, { jsonrpc: "2.0", id: 2, method: "account/rateLimits/read" });
        }

        if (msg.id === 2 && !settled) {
          settled = true;
          clearTimeout(timer);
          proc.kill();

          if (msg.error) {
            reject(new Error(`Codex RPC error: ${msg.error.message}`));
            return;
          }

          const rl = msg.result?.rateLimits;
          if (!rl) {
            reject(new Error("Codex returned no rate limit data"));
            return;
          }

          const primary = rl.primary;
          const secondary = rl.secondary;
          const primaryUsed = primary?.usedPercent;
          const secondaryUsed = secondary?.usedPercent;

          if (primaryUsed === undefined && secondaryUsed === undefined) {
            reject(new Error("Codex returned empty rate limit data"));
            return;
          }

          const worstUtil = Math.max(primaryUsed ?? 0, secondaryUsed ?? 0);

          resolve({
            id: "codex", name: "OPENAI_CODEX", color: "codex",
            status: worstUtil >= 80 ? "throttled" : "nominal",
            quotas: [
              ...(primaryUsed !== undefined ? [{
                label: "5-HOUR",
                usedPercent: Math.round(primaryUsed),
                resetsAt: primary?.resetsAt ? new Date(primary.resetsAt * 1000).toISOString() : null,
              }] : []),
              ...(secondaryUsed !== undefined ? [{
                label: "WEEKLY",
                usedPercent: Math.round(secondaryUsed),
                resetsAt: secondary?.resetsAt ? new Date(secondary.resetsAt * 1000).toISOString() : null,
              }] : []),
            ],
          });
        }
      }
    });

    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to spawn codex — is it installed? (${err.message})`));
      }
    });

    proc.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Codex process exited with code ${code}`));
      }
    });

    sendJsonLine(proc, {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { capabilities: {}, clientInfo: { name: "telemetry", version: "0.1.0" } },
    });
  });
}
