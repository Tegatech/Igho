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

export async function getAccessToken() {
  const session = await getSession();
  return session?.session?.token || null;
}
