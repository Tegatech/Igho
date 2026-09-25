import { getSession, signOut } from "./auth-client.js";
import { ighoApi } from "./api-client.js";
import { IGHO_RUNTIME } from "./runtime-config.js";

const params = new URLSearchParams(window.location.search);
const liveMode = params.get(IGHO_RUNTIME.liveQueryFlag) === "1";

if (liveMode) {
  initialiseLiveMode().catch((error) => {
    console.error("Igho live runtime failed", error);
    showRuntimeError(error);
  });
}

async function initialiseLiveMode() {
  const session = await getSession();
  if (!session?.user) {
    const returnTo = encodeURIComponent(
      `${window.location.pathname}?live=1`,
    );
    window.location.replace(`auth.html?return=${returnTo}`);
    return;
  }

  const me = await ighoApi.me();
  const data = me.data;

  const env = document.querySelector(".env");
  if (env) env.textContent = "LIVE DEV";

  const card = document.querySelector(".sidebar-foot .user-card");
  if (card) {
    const roles = Array.isArray(data.roles) ? data.roles.join(" · ") : "";
    card.innerHTML = `
      <div class="avatar">${initials(data.email)}</div>
      <div>
        <strong>${escapeHtml(data.email)}</strong>
        <small>${escapeHtml(roles)}</small>
      </div>
    `;
  }

  window.IghoLive = Object.freeze({
    me: data,
    api: ighoApi,
    signOut: async () => {
      await signOut();
      window.location.replace("auth.html");
    },
  });
}

function initials(email) {
  return String(email || "IG")
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "IG";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showRuntimeError(error) {
  const env = document.querySelector(".env");
  if (env) env.textContent = "LIVE ERROR";
  const message =
    error?.status === 403
      ? "Your account is signed in but does not have an Igho workspace membership yet."
      : error?.message || "The live Igho API could not be reached.";
  const toast = document.getElementById("toast");
  if (toast) {
    const title = document.getElementById("toastTitle");
    const text = document.getElementById("toastText");
    if (title) title.textContent = "Live connection";
    if (text) text.textContent = message;
    toast.classList.add("show");
  }
}
