import { getSession, signIn, signOut, signUp } from "./auth-client.js";
import { IghoApiError, ighoApi } from "./api-client.js";

const authForms = document.getElementById("authForms");
const signedIn = document.getElementById("signedIn");
const authMessage = document.getElementById("authMessage");
const sessionMessage = document.getElementById("sessionMessage");
const params = new URLSearchParams(window.location.search);
const returnTo = params.get("return") || "index.html?live=1";
const inviteToken = params.get("invite");
let inviteAccepted = false;

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

document.getElementById("signinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await perform(async () => {
    await signIn(
      document.getElementById("signinEmail").value.trim(),
      document.getElementById("signinPassword").value,
    );
    await renderSession();
  });
});

document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await perform(async () => {
    await signUp(
      document.getElementById("signupName").value.trim(),
      document.getElementById("signupEmail").value.trim(),
      document.getElementById("signupPassword").value,
    );
    await renderSession();
  });
});

document.getElementById("bootstrapBtn").addEventListener("click", async () => {
  await performSession(async () => {
    const result = await ighoApi.bootstrap();
    sessionMessage.textContent = `Workspace ready. Role: ${result.data.role}.`;
  });
});

document.getElementById("continueBtn").addEventListener("click", async () => {
  await performSession(async () => {
    await ighoApi.me();
    window.location.assign(returnTo);
  });
});

document.getElementById("signoutBtn").addEventListener("click", async () => {
  await performSession(async () => {
    await signOut();
    await renderSession();
  });
});

renderSession().catch((error) => setMessage(authMessage, error.message, true));

function switchMode(mode) {
  const signUpMode = mode === "signup";
  document.getElementById("signinForm").hidden = signUpMode;
  document.getElementById("signupForm").hidden = !signUpMode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  setMessage(authMessage, "");
}

async function renderSession() {
  const session = await getSession();
  const user = session?.user;
  authForms.style.display = user ? "none" : "block";
  signedIn.classList.toggle("visible", Boolean(user));

  if (!user) {
    setMessage(authMessage, "");
    return;
  }

  document.getElementById("identityName").textContent = user.name || "Igho user";
  document.getElementById("identityEmail").textContent = user.email || "";
  sessionMessage.textContent = "";

  const bootstrapBtn = document.getElementById("bootstrapBtn");
  const continueBtn = document.getElementById("continueBtn");

  if (inviteToken) {
    bootstrapBtn.hidden = true;
    continueBtn.textContent = "Continue to Igho";
    await acceptInvitationIfNeeded();
    return;
  }

  try {
    const me = await ighoApi.me();
    bootstrapBtn.hidden = true;
    const roles = Array.isArray(me?.data?.roles) ? me.data.roles : [];
    if (roles.length) {
      sessionMessage.textContent = `Workspace ready. Role: ${roles.join(", ")}.`;
    }
  } catch (error) {
    bootstrapBtn.hidden = false;
    if (error instanceof IghoApiError && error.code === "AUTH_002") {
      sessionMessage.textContent = "This account has not joined a workspace yet.";
    }
  }
}

async function acceptInvitationIfNeeded() {
  if (!inviteToken || inviteAccepted) return;

  sessionMessage.classList.remove("error");
  sessionMessage.textContent = "Joining The24thGroup…";

  try {
    await ighoApi.acceptInvitation(inviteToken);
    inviteAccepted = true;
  } catch (error) {
    if (!(error instanceof IghoApiError && error.code === "INVITE_004")) {
      sessionMessage.classList.add("error");
      sessionMessage.textContent = error?.message || "Could not accept this invitation.";
      return;
    }

    // An already-used link can still be valid for a user who successfully joined.
    try {
      await ighoApi.me();
      inviteAccepted = true;
    } catch {
      sessionMessage.classList.add("error");
      sessionMessage.textContent =
        "This invitation is invalid, expired, or belongs to another email address.";
      return;
    }
  }

  const me = await ighoApi.me();
  const roles = Array.isArray(me?.data?.roles) ? me.data.roles : [];
  sessionMessage.textContent = roles.length
    ? `Joined The24thGroup. Role: ${roles.join(", ")}.`
    : "Joined The24thGroup.";
}

async function perform(action) {
  setMessage(authMessage, "Working…");
  try {
    await action();
  } catch (error) {
    setMessage(authMessage, error.message || "Authentication failed.", true);
  }
}

async function performSession(action) {
  sessionMessage.classList.remove("error");
  sessionMessage.textContent = "Working…";
  try {
    await action();
  } catch (error) {
    sessionMessage.classList.add("error");
    if (error instanceof IghoApiError && error.status === 403) {
      sessionMessage.textContent =
        error.code === "AUTH_002"
          ? "Signed in, but this account has not joined the Igho workspace yet."
          : error.message;
      return;
    }
    sessionMessage.textContent = error.message || "Request failed.";
  }
}

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}
