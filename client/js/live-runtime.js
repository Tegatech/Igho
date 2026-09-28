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
  const roles = Array.isArray(data.roles) ? data.roles : [];

  if (roles.includes("EMPLOYEE")) {
    document.body.classList.add("employee-mode");
  }

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

  await hydrateLivePeople(data);
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

  const message =
    error?.status === 403
      ? "Your account is signed in but does not have an Igho workspace membership yet."
      : error?.message || "Igho could not connect to your workspace.";
  const toast = document.getElementById("toast");
  if (toast) {
    const title = document.getElementById("toastTitle");
    const text = document.getElementById("toastText");
    if (title) title.textContent = "Connection issue";
    if (text) text.textContent = message;
    toast.classList.add("show");
  }
}


async function hydrateLivePeople(me) {
  await waitForClientHydration();

  const roles = Array.isArray(me.roles) ? me.roles : [];
  if (roles.includes("OWNER") || roles.includes("PAYROLL_ADMIN")) {
    const [peopleResponse, runsResponse, currentResponse] = await Promise.all([
      ighoApi.people(),
      ighoApi.payrollRuns(),
      ighoApi.currentPayroll(),
    ]);
    window.hydratePeopleFromApi?.(peopleResponse?.data?.items || []);

    const runs = runsResponse?.data?.items || [];
    const current = currentResponse?.data?.payroll || null;
    let detail = null;
    if (current?.id) {
      const detailResponse = await ighoApi.payrollRun(current.id);
      detail = detailResponse?.data?.payroll || null;
    }
    window.hydratePayrollFromApi?.(runs, detail);
    return;
  }

  if (roles.includes("EMPLOYEE")) {
    try {
      const [profileResponse, payResponse, payslipResponse] = await Promise.all([
        ighoApi.myProfile(),
        ighoApi.myPay(),
        ighoApi.myPayslips(),
      ]);
      window.IghoEmployeeLiveData = {
        pay: payResponse?.data || null,
        payslips: payslipResponse?.data || { items: [] },
      };
      window.hydrateEmployeeFromApi?.(profileResponse?.data);
      window.goPage("employee");
      window.renderEmployeePortal?.();
    } catch (error) {
      if (error?.code === "PEOPLE_004") {
        window.showEmployeeProfileUnavailable?.();
        window.goPage("employee");
        return;
      }
      throw error;
    }
  }
}

async function waitForClientHydration() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (
      typeof window.hydratePeopleFromApi === "function" &&
      typeof window.hydrateEmployeeFromApi === "function" &&
      typeof window.goPage === "function" &&
      typeof window.renderEmployeePortal === "function"
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
