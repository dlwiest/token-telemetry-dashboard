import { useQuery } from "@tanstack/react-query";
import type { TelemetryResponse, ConfigResponse } from "../types";

export function useConfig() {
  return useQuery<ConfigResponse>({
    queryKey: ["config"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useTelemetry(pollInterval: number = 30) {
  return useQuery<TelemetryResponse>({
    queryKey: ["telemetry"],
    queryFn: async () => {
      const res = await fetch("/api/telemetry");
      if (!res.ok) throw new Error("Failed to fetch telemetry");
      return res.json();
    },
    refetchInterval: pollInterval * 1000,
  });
}
