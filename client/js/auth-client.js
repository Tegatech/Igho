import { createAuthClient } from "https://esm.sh/@neondatabase/neon-js@0.7.0-beta/auth";
import { IGHO_RUNTIME } from "./runtime-config.js";

export const authClient = createAuthClient(IGHO_RUNTIME.neonAuthBaseUrl);

function authError(result, fallback) {
  const error = result?.error;
  if (!error) return null;
  return new Error(error.message || fallback);
}

export async function signIn(email, password) {
  const result = await authClient.signIn.email({ email, password });
  const error = authError(result, "Could not sign in");
  if (error) throw error;
  return result.data;
}

export async function signUp(name, email, password) {
  const result = await authClient.signUp.email({ name, email, password });
  const error = authError(result, "Could not create account");
  if (error) throw error;
  return result.data;
}

export async function signOut() {
  const result = await authClient.signOut();
  const error = authError(result, "Could not sign out");
  if (error) throw error;
}

export async function getSession() {
  const result = await authClient.getSession();
  const error = authError(result, "Could not read session");
  if (error) throw error;
  return result.data || null;
}

function isJwt(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

export async function getAccessToken() {
  const sessionResult = await authClient.getSession({
    fetchOptions: {
      headers: {
        "X-Force-Fetch": "1",
      },
    },
  });
  const error = authError(sessionResult, "Could not refresh session");
  if (error) throw error;

  const sessionToken = sessionResult?.data?.session?.token;
  if (isJwt(sessionToken)) return sessionToken;

  const response = await fetch(
    `${IGHO_RUNTIME.neonAuthBaseUrl}/get-session`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Force-Fetch": "1",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Could not mint Neon Auth JWT");
  }

  const jwt = response.headers.get("set-auth-jwt");
  if (isJwt(jwt)) return jwt;

  const body = await response.json().catch(() => null);
  const bodyToken = body?.session?.token;
  if (isJwt(bodyToken)) return bodyToken;

  throw new Error("Neon Auth session is active but no JWT was returned");
}
