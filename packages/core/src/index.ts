export * from "./auth.js";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";
export interface ProviderHealth {
  readonly status: HealthStatus;
  readonly checkedAt: Date;
}
