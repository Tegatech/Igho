import express, { type NextFunction, type Request, type Response } from "express";
import { requirePermission, type AccessContext, type RoleKey } from "@igho/core";
import { createNeonWorkspaceStore } from "@igho/providers";
import { createNeonJwtVerifier, type AuthenticatedIdentity } from "./auth/neon-jwt.js";
import { readEnvironment } from "./env.js";
import { fail, ok, requestId } from "./http.js";

const env = readEnvironment();
const workspaceStore = createNeonWorkspaceStore(env.databaseUrl);
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
  (req: AuthenticatedRequest, res) => {
    ok(res, requestId(req), {
      scope: "self",
      status: "not_available_until_payroll_milestone",
    });
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
      employee,
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
