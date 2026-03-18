export type ProviderColor = "claude" | "codex" | "copilot";
export type ProviderStatus = "nominal" | "throttled" | "offline";

export interface ProviderData {
  id: string;
  name: string;
  color: ProviderColor;
  status: ProviderStatus;
  quotas: Quota[];
  error?: string;
}

export interface Quota {
  label: string;
  usedPercent: number;
  resetsAt: string | null;
}

export interface TelemetryResponse {
  providers: ProviderData[];
  timestamp: string;
}
