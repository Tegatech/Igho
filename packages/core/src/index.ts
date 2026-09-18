/**
 * Domain and application-layer exports belong here.
 * Infrastructure SDKs must not be imported into this package.
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ProviderHealth {
  readonly status: HealthStatus;
  readonly checkedAt: Date;
}
