import { IGHO_RUNTIME } from "./runtime-config.js";
import { getAccessToken } from "./auth-client.js";

export class IghoApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || `Igho API request failed (${status})`);
    this.name = "IghoApiError";
    this.status = status;
    this.code = payload?.error?.code || "UNKNOWN";
    this.payload = payload;
  }
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new IghoApiError(401, {
      error: { code: "AUTH_001", message: "Authentication required" },
    });
  }

  const response = await fetch(`${IGHO_RUNTIME.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new IghoApiError(response.status, payload);
  return payload;
}

export const ighoApi = {
  me: () => apiRequest("/me"),
  bootstrap: () => apiRequest("/bootstrap", { method: "POST" }),
  createInvitation: (email, role) =>
    apiRequest("/workspace-invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
  acceptInvitation: (token) =>
    apiRequest("/workspace-invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};
