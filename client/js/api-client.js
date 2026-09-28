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
      // Not `Authorization`: Catalyst's API Gateway rejects non-Zoho Bearer tokens.
      "X-Igho-Authorization": `Bearer ${token}`,
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
  people: () => apiRequest("/people"),
  payrollRuns: () => apiRequest("/payroll-runs"),
  currentPayroll: () => apiRequest("/payroll-runs/current"),
  payrollRun: (runId) => apiRequest(`/payroll-runs/${runId}`),
  preparePayroll: (period) =>
    apiRequest("/payroll-runs/prepare", {
      method: "POST",
      body: JSON.stringify(period ? { period } : {}),
    }),
  setPayrollItemIncluded: (runId, itemId, included) =>
    apiRequest(`/payroll-runs/${runId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ included }),
    }),
  addPayrollAdjustment: (runId, itemId, adjustment) =>
    apiRequest(`/payroll-runs/${runId}/items/${itemId}/adjustments`, {
      method: "POST",
      body: JSON.stringify(adjustment),
    }),
  startPayrollFunding: (runId, method) =>
    apiRequest(`/payroll-runs/${runId}/funding`, {
      method: "POST",
      body: JSON.stringify({ method }),
    }),
  refreshPayrollFunding: (runId) =>
    apiRequest(`/payroll-runs/${runId}/funding/refresh`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  approvePayroll: (runId) =>
    apiRequest(`/payroll-runs/${runId}/approve`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  executePayrollPayouts: (runId) =>
    apiRequest(`/payroll-runs/${runId}/payouts`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  refreshPayrollPayouts: (runId) =>
    apiRequest(`/payroll-runs/${runId}/payouts/refresh`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  myPay: () => apiRequest("/me/pay"),
  myProfile: () => apiRequest("/me/profile"),
  myBankAccount: () => apiRequest("/me/bank-account"),
  myPayslips: () => apiRequest("/me/payslips"),
  banks: () => apiRequest("/banks"),
  saveMyBankAccount: (bankCode, accountNumber) =>
    apiRequest("/me/bank-account", {
      method: "PUT",
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
    }),
  createInvitation: (email, role, employee) =>
    apiRequest("/workspace-invitations", {
      method: "POST",
      body: JSON.stringify({ email, role, employee }),
    }),
  acceptInvitation: (token) =>
    apiRequest("/workspace-invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};
