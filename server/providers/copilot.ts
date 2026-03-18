import { execSync } from "child_process";
import type { ProviderData } from "../types.js";

interface CopilotQuotaSnapshot {
  percent_remaining?: number;
  quota_reset_date_utc?: string;
}

export async function fetchCopilot(): Promise<ProviderData> {
  let raw: string;
  try {
    raw = execSync("gh api /copilot_internal/user", {
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch {
    throw new Error("gh api call failed — install GitHub CLI and run `gh auth login`");
  }

  const data = JSON.parse(raw);
  const snap: CopilotQuotaSnapshot | undefined = data.quota_snapshots?.premium_interactions;

  if (!snap) {
    throw new Error("No premium_interactions quota data — verify Copilot subscription");
  }

  const usedPercent = Math.round(100 - (snap.percent_remaining ?? 100));

  return {
    id: "copilot", name: "GITHUB_COPILOT", color: "copilot",
    status: usedPercent >= 80 ? "throttled" : "nominal",
    quotas: [
      {
        label: "MONTHLY",
        usedPercent,
        resetsAt: snap.quota_reset_date_utc || null,
      },
    ],
  };
}
