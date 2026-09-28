import express, { type NextFunction, type Request, type Response } from "express";
import { requirePermission, type AccessContext, type RoleKey } from "@igho/core";
import {
  createNeonWorkspaceStore,
  createPaystackBankProvider,
  PaystackProviderError,
} from "@igho/providers";
import { createNeonJwtVerifier, type AuthenticatedIdentity } from "./auth/neon-jwt.js";
import { readEnvironment } from "./env.js";
import { fail, ok, requestId } from "./http.js";

const env = readEnvironment();
const workspaceStore = createNeonWorkspaceStore(env.databaseUrl);
const bankProvider = env.paystackSecretKey
  ? createPaystackBankProvider(env.paystackSecretKey)
  : null;
const verifyBearer = createNeonJwtVerifier(env.neonAuthBaseUrl);
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.header("origin");

  if (env.publicOrigin && origin === env.publicOrigin) {
    res.setHeader("Access-Control-Allow-Origin", env.publicOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, X-Igho-Authorization, Content-Type, X-Request-Id",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

interface AuthenticatedRequest extends Request {
  ighoIdentity?: AuthenticatedIdentity;
  ighoAccess?: AccessContext;
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const id = requestId(req);
  // Catalyst's API Gateway treats `Authorization: Bearer` as a Zoho OAuth token and
  // rejects Neon JWTs before they reach the function, so the client uses its own header.
  const authorization = req.header("x-igho-authorization") ?? req.header("authorization");

  console.info(
    JSON.stringify({
      level: "info",
      event: "auth_request_received",
      request_id: id,
      method: req.method,
      path: req.path,
      authorization_header_present: Boolean(authorization),
    }),
  );

  const identity = await verifyBearer(authorization);

  if (!identity) {
    fail(res, id, 401, "AUTH_001", "Authentication required");
    return;
  }

  req.ighoIdentity = identity;
  next();
}

async function requireWorkspaceAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const id = requestId(req);
  const identity = req.ighoIdentity;

  if (!identity) {
    fail(res, id, 401, "AUTH_001", "Authentication required");
    return;
  }

  const access = await workspaceStore.resolveAccess({
    authUserId: identity.authUserId,
    email: identity.email,
  });

  if (!access) {
    fail(
      res,
      id,
      403,
      "AUTH_002",
      "No active Igho workspace membership",
      "Accept an invitation or complete workspace bootstrap.",
    );
    return;
  }

  req.ighoAccess = access;
  next();
}

app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "igho-api",
    runtime: "catalyst-advancedio",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/v1/bootstrap", authenticate, async (req: AuthenticatedRequest, res) => {
  const id = requestId(req);
  const identity = req.ighoIdentity;

  if (!identity) {
    fail(res, id, 401, "AUTH_001", "Authentication required");
    return;
  }

  if (identity.email !== env.bootstrapOwnerEmail) {
    fail(res, id, 403, "AUTH_003", "Workspace bootstrap is not available for this account");
    return;
  }

  if ((await workspaceStore.activeMembershipCount()) > 0) {
    fail(res, id, 409, "WORKSPACE_001", "Workspace bootstrap has already been completed");
    return;
  }

  const membershipId = await workspaceStore.bootstrapOwner({
    authUserId: identity.authUserId,
    email: identity.email,
    displayName: identity.email,
    requestId: id,
  });

  if (!membershipId) {
    fail(res, id, 500, "WORKSPACE_002", "Could not create owner membership");
    return;
  }

  ok(
    res,
    id,
    {
      workspace_slug: "the24thgroup",
      membership_id: membershipId,
      role: "OWNER",
    },
    201,
  );
});

app.get("/api/v1/me", authenticate, requireWorkspaceAccess, (req: AuthenticatedRequest, res) => {
  const id = requestId(req);
  const access = req.ighoAccess;

  if (!access) {
    fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
    return;
  }

  ok(res, id, {
    auth_user_id: access.authUserId,
    email: access.email,
    workspace_id: access.workspaceId,
    membership_id: access.membershipId,
    roles: access.roles,
  });
});

app.get(
  "/api/v1/me/pay",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    const pay = await workspaceStore.getEmployeeUpcomingPay({
      workspaceId: access.workspaceId,
      membershipId: access.membershipId,
    });

    if (!pay) {
      ok(res, id, {
        scope: "self",
        status: "no_upcoming_payroll",
        payroll: null,
      });
      return;
    }

    ok(res, id, {
      scope: "self",
      status: "available",
      payroll: pay,
    });
  },
);

app.get(
  "/api/v1/payroll-runs/current",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.view");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const payroll = await workspaceStore.getCurrentPayrollRun(access.workspaceId);
    ok(res, id, { payroll });
  },
);

app.get(
  "/api/v1/payroll-runs",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.view");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const items = await workspaceStore.listPayrollRuns(access.workspaceId);
    ok(res, id, { items });
  },
);

app.get(
  "/api/v1/payroll-runs/:runId",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.view");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const payroll = await workspaceStore.getPayrollRunDetail({
      workspaceId: access.workspaceId,
      payrollRunId: req.params.runId,
    });

    if (!payroll) {
      fail(res, id, 404, "PAYROLL_003", "Payroll run not found");
      return;
    }

    ok(res, id, { payroll });
  },
);

app.patch(
  "/api/v1/payroll-runs/:runId/items/:itemId",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.edit");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const body = req.body as { included?: unknown };
    if (typeof body.included !== "boolean") {
      fail(res, id, 422, "PAYROLL_004", "included must be true or false");
      return;
    }

    const result = await workspaceStore.setPayrollItemIncluded({
      workspaceId: access.workspaceId,
      payrollRunId: req.params.runId,
      payrollItemId: req.params.itemId,
      included: body.included,
      actorAuthUserId: access.authUserId,
      requestId: id,
    });

    if (!result.found) {
      fail(res, id, 404, "PAYROLL_005", "Payroll item not found");
      return;
    }

    if (!result.editable) {
      fail(
        res,
        id,
        409,
        "PAYROLL_006",
        "This payroll can no longer be changed",
        "Payroll items are editable only before cutoff and before approval/payment processing.",
      );
      return;
    }

    const payroll = await workspaceStore.getPayrollRunDetail({
      workspaceId: access.workspaceId,
      payrollRunId: req.params.runId,
    });
    ok(res, id, { payroll });
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/items/:itemId/adjustments",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.edit");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const body = req.body as {
      type?: unknown;
      amount?: unknown;
      reason?: unknown;
      reference?: unknown;
    };
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const amount = Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const reference =
      typeof body.reference === "string" && body.reference.trim()
        ? body.reference.trim()
        : undefined;
    const allowedTypes = new Set([
      "bonus",
      "reimbursement",
      "allowance",
      "deduction",
      "salary_correction",
      "other",
    ]);

    if (!allowedTypes.has(type) || !Number.isFinite(amount) || amount === 0 || !reason) {
      fail(
        res,
        id,
        422,
        "PAYROLL_007",
        "A valid adjustment type, non-zero amount and reason are required",
      );
      return;
    }

    const result = await workspaceStore.addPayrollAdjustment({
      workspaceId: access.workspaceId,
      payrollRunId: req.params.runId,
      payrollItemId: req.params.itemId,
      type,
      amount,
      reason,
      ...(reference ? { reference } : {}),
      actorAuthUserId: access.authUserId,
      requestId: id,
    });

    if (!result.found) {
      fail(res, id, 404, "PAYROLL_005", "Payroll item not found");
      return;
    }

    if (!result.editable) {
      fail(
        res,
        id,
        409,
        "PAYROLL_006",
        "This payroll can no longer be changed",
        "Adjustments are allowed only before cutoff, before approval/payment processing, and may not reduce net pay below zero.",
      );
      return;
    }

    const payroll = await workspaceStore.getPayrollRunDetail({
      workspaceId: access.workspaceId,
      payrollRunId: req.params.runId,
    });
    ok(res, id, { payroll }, 201);
  },
);

app.post(
  "/api/v1/payroll-runs/prepare",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "payroll.create");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const body = req.body as { period?: unknown };
    const period = typeof body.period === "string" && body.period.trim()
      ? body.period.trim()
      : undefined;

    try {
      const payroll = await workspaceStore.preparePayrollRun({
        workspaceId: access.workspaceId,
        actorAuthUserId: access.authUserId,
        requestId: id,
        ...(period ? { period } : {}),
      });

      if (!payroll) {
        fail(res, id, 500, "PAYROLL_001", "Could not prepare payroll");
        return;
      }

      ok(res, id, { payroll }, 201);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_PAYROLL_PERIOD") {
        fail(res, id, 422, "PAYROLL_002", "Payroll period must use YYYY-MM");
        return;
      }
      throw error;
    }
  },
);

app.get(
  "/api/v1/me/profile",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    const employee = await workspaceStore.getEmployeeForMembership({
      workspaceId: access.workspaceId,
      membershipId: access.membershipId,
    });

    if (!employee) {
      fail(res, id, 404, "PEOPLE_004", "No employee record is linked to this account");
      return;
    }

    ok(res, id, employee);
  },
);

app.get(
  "/api/v1/me/bank-account",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    const employee = await workspaceStore.getEmployeeForMembership({
      workspaceId: access.workspaceId,
      membershipId: access.membershipId,
    });

    if (!employee) {
      fail(res, id, 404, "PEOPLE_004", "No employee record is linked to this account");
      return;
    }

    ok(res, id, {
      employee_id: employee.id,
      bank_account: employee.bankAccount,
    });
  },
);

app.get(
  "/api/v1/people",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "people.view");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const employees = await workspaceStore.listEmployees(access.workspaceId);
    ok(res, id, { items: employees });
  },
);

app.get(
  "/api/v1/banks",
  authenticate,
  requireWorkspaceAccess,
  async (_req: AuthenticatedRequest, res) => {
    if (!bankProvider) {
      fail(res, "provider", 503, "PROVIDER_001", "Bank verification provider is not configured");
      return;
    }

    try {
      const banks = await bankProvider.listBanks();
      ok(res, "banks", { items: banks });
    } catch (error) {
      const message =
        error instanceof PaystackProviderError ? error.message : "Could not load banks";
      fail(res, "provider", 502, "PROVIDER_002", message);
    }
  },
);

app.put(
  "/api/v1/me/bank-account",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;
    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "bank_accounts.edit");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    if (!bankProvider) {
      fail(res, id, 503, "PROVIDER_001", "Bank verification provider is not configured");
      return;
    }

    const body = req.body as { bank_code?: unknown; account_number?: unknown };
    const bankCode = typeof body.bank_code === "string" ? body.bank_code.trim() : "";
    const accountNumber = typeof body.account_number === "string" ? body.account_number.trim() : "";

    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      fail(res, id, 422, "BANK_001", "A valid bank and 10-digit account number are required");
      return;
    }

    const employee = await workspaceStore.getEmployeeForMembership({
      workspaceId: access.workspaceId,
      membershipId: access.membershipId,
    });

    if (!employee) {
      fail(res, id, 404, "PEOPLE_004", "No employee record is linked to this account");
      return;
    }

    try {
      const banks = await bankProvider.listBanks();
      const bank = banks.find((item) => item.code === bankCode);
      if (!bank) {
        fail(res, id, 422, "BANK_002", "The selected bank is not available");
        return;
      }

      const resolved = await bankProvider.resolveBankAccount({
        accountNumber,
        bankCode,
      });

      const recipient = await bankProvider.createRecipient({
        name: resolved.accountName,
        accountNumber,
        bankCode,
        currency: employee.currency,
      });

      const bankAccountId = await workspaceStore.saveVerifiedBankAccount({
        workspaceId: access.workspaceId,
        employeeId: employee.id,
        bankCode,
        bankName: bank.name,
        accountNumberLast4: accountNumber.slice(-4),
        accountName: resolved.accountName,
        provider: "paystack",
        providerRecipientCode: recipient.recipientCode,
      });

      if (!bankAccountId) {
        fail(res, id, 500, "BANK_003", "Could not save the verified bank account");
        return;
      }

      ok(res, id, {
        employee_id: employee.id,
        bank_account: {
          bank_name: bank.name,
          account_number_last4: accountNumber.slice(-4),
          account_name: resolved.accountName,
          verification_status: "verified",
        },
      });
    } catch (error) {
      const message =
        error instanceof PaystackProviderError
          ? error.message
          : "Could not verify this bank account";
      fail(res, id, 422, "BANK_004", message);
    }
  },
);

app.get(
  "/api/v1/me/payslips",
  authenticate,
  requireWorkspaceAccess,
  (req: AuthenticatedRequest, res) => {
    ok(res, requestId(req), {
      scope: "self",
      items: [],
      status: "not_available_until_payslip_milestone",
    });
  },
);

const inviteRoles = new Set<RoleKey>(["PAYROLL_ADMIN", "APPROVER", "EMPLOYEE"]);

app.post(
  "/api/v1/workspace-invitations",
  authenticate,
  requireWorkspaceAccess,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const access = req.ighoAccess;

    if (!access) {
      fail(res, id, 403, "AUTH_002", "No active Igho workspace membership");
      return;
    }

    try {
      requirePermission(access, "users.manage");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }

    const body = req.body as {
      email?: unknown;
      role?: unknown;
      employee?: {
        full_name?: unknown;
        job_title?: unknown;
        monthly_pay_amount?: unknown;
        currency?: unknown;
        employment_start_date?: unknown;
      };
    };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? (body.role as RoleKey) : undefined;

    if (!email || !role || !inviteRoles.has(role)) {
      fail(res, id, 422, "INVITE_001", "A valid email and invite role are required");
      return;
    }

    let employee:
      | {
          fullName: string;
          jobTitle: string;
          monthlyPayAmount: number;
          currency: string;
          employmentStartDate: string | null;
        }
      | undefined;

    if (role === "EMPLOYEE") {
      const fullName =
        typeof body.employee?.full_name === "string" ? body.employee.full_name.trim() : "";
      const jobTitle =
        typeof body.employee?.job_title === "string" ? body.employee.job_title.trim() : "";
      const monthlyPayAmount = Number(body.employee?.monthly_pay_amount);
      const currency =
        typeof body.employee?.currency === "string"
          ? body.employee.currency.trim().toUpperCase()
          : "NGN";
      const employmentStartDate =
        typeof body.employee?.employment_start_date === "string" &&
        body.employee.employment_start_date.trim()
          ? body.employee.employment_start_date.trim()
          : null;

      if (
        !fullName ||
        !jobTitle ||
        !Number.isFinite(monthlyPayAmount) ||
        monthlyPayAmount < 0 ||
        !/^[A-Z]{3}$/.test(currency)
      ) {
        fail(
          res,
          id,
          422,
          "PEOPLE_001",
          "Employee name, job title, valid monthly pay and currency are required",
        );
        return;
      }

      employee = {
        fullName,
        jobTitle,
        monthlyPayAmount,
        currency,
        employmentStartDate,
      };
    }

    const invitation = await workspaceStore.createInvitation({
      workspaceId: access.workspaceId,
      actorAuthUserId: access.authUserId,
      email,
      role: role as Exclude<RoleKey, "OWNER">,
      requestId: id,
      ...(employee ? { employee } : {}),
    });

    if (!invitation) {
      fail(res, id, 500, "INVITE_002", "Could not create invitation");
      return;
    }

    ok(
      res,
      id,
      {
        invitation_id: invitation.invitationId,
        activation_token: invitation.token,
        expires_at: invitation.expiresAt,
      },
      201,
    );
  },
);

app.post(
  "/api/v1/workspace-invitations/accept",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    const id = requestId(req);
    const identity = req.ighoIdentity;

    if (!identity) {
      fail(res, id, 401, "AUTH_001", "Authentication required");
      return;
    }

    const body = req.body as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      fail(res, id, 422, "INVITE_003", "Invitation token is required");
      return;
    }

    const accepted = await workspaceStore.acceptInvitation({
      authUserId: identity.authUserId,
      email: identity.email,
      displayName: identity.email,
      token,
      requestId: id,
    });

    if (!accepted) {
      fail(
        res,
        id,
        403,
        "INVITE_004",
        "Invitation is invalid, expired, or belongs to another email address",
      );
      return;
    }

    ok(res, id, accepted, 201);
  },
);

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(
    JSON.stringify({
      level: "error",
      request_id: requestId(req),
      event: "unhandled_error",
      error: error instanceof Error ? error.message : "unknown_error",
    }),
  );

  fail(res, requestId(req), 500, "INTERNAL_001", "Internal server error");
});

module.exports = app;
