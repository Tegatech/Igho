import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { requirePermission, type AccessContext, type RoleKey } from "@igho/core";
import {
  createNeonFundingStore,
  createNeonPayoutStore,
  createNeonWorkspaceStore,
  createPaystackBankProvider,
  createPaystackFundingProvider,
  createPaystackPayoutProvider,
  PaystackProviderError,
} from "@igho/providers";
import { createNeonJwtVerifier, type AuthenticatedIdentity } from "./auth/neon-jwt.js";
import { readEnvironment } from "./env.js";
import { fail, ok, requestId } from "./http.js";

const env = readEnvironment();
const workspaceStore = createNeonWorkspaceStore(env.databaseUrl);
const fundingStore = createNeonFundingStore(env.databaseUrl);
const payoutStore = createNeonPayoutStore(env.databaseUrl);
const bankProvider = env.paystackSecretKey
  ? createPaystackBankProvider(env.paystackSecretKey)
  : null;
const fundingProvider = env.paystackSecretKey
  ? createPaystackFundingProvider(env.paystackSecretKey)
  : null;
const payoutProvider = env.paystackSecretKey
  ? createPaystackPayoutProvider(env.paystackSecretKey)
  : null;
const verifyBearer = createNeonJwtVerifier(env.neonAuthBaseUrl);
const app = express();

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

app.disable("x-powered-by");
app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buffer) => {
      (req as RawBodyRequest).rawBody = Buffer.from(buffer);
    },
  }),
);

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

function routeParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
    return value[0].trim();
  }
  return null;
}

async function getPayrollDetailWithFunding(input: { workspaceId: string; payrollRunId: string }) {
  const [payroll, funding, payouts] = await Promise.all([
    workspaceStore.getPayrollRunDetail(input),
    fundingStore.getLatest(input),
    payoutStore.listPayouts(input),
  ]);
  return payroll ? { ...payroll, funding, payouts } : null;
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

app.post("/api/v1/webhooks/paystack", async (req: RawBodyRequest, res) => {
  const id = requestId(req);
  if (!fundingProvider || !req.rawBody) {
    fail(res, id, 503, "FUNDING_001", "Funding provider is not configured");
    return;
  }

  if (!fundingProvider.verifyWebhookSignature(req.rawBody, req.header("x-paystack-signature"))) {
    fail(res, id, 401, "FUNDING_002", "Invalid webhook signature");
    return;
  }

  const event = req.body as {
    event?: unknown;
    data?: {
      reference?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
      channel?: unknown;
      id?: unknown;
      paid_at?: unknown;
      gateway_response?: unknown;
    };
  };
  const eventName = typeof event.event === "string" ? event.event : "";
  const reference = typeof event.data?.reference === "string" ? event.data.reference : "";

  if (!reference) {
    ok(res, id, { received: true, ignored: true });
    return;
  }

  if (eventName === "charge.success") {
    const amountMinor = Number(event.data?.amount);
    const currency = typeof event.data?.currency === "string" ? event.data.currency : "";
    const result = await fundingStore.settle({
      providerReference: reference,
      amountMinor,
      currency,
      channel: typeof event.data?.channel === "string" ? event.data.channel : null,
      transactionId:
        typeof event.data?.id === "string" || typeof event.data?.id === "number"
          ? String(event.data.id)
          : null,
      paidAt: typeof event.data?.paid_at === "string" ? event.data.paid_at : null,
      providerPayload: event,
      requestId: id,
    });

    if (!result.found || !result.valid) {
      ok(res, id, { received: true, ignored: true });
      return;
    }

    ok(res, id, { received: true, settled: true });
    return;
  }

  if (eventName === "charge.failed") {
    await fundingStore.markFailed({
      providerReference: reference,
      reason:
        typeof event.data?.gateway_response === "string"
          ? event.data.gateway_response
          : "Paystack reported a failed charge",
      providerPayload: event,
    });
  }

  if (
    eventName === "transfer.success" ||
    eventName === "transfer.failed" ||
    eventName === "transfer.reversed"
  ) {
    const payoutStatus =
      eventName === "transfer.success"
        ? "success"
        : eventName === "transfer.reversed"
          ? "reversed"
          : "failed";
    const result = await payoutStore.applyProviderResult({
      providerReference: reference,
      status: payoutStatus,
      amountMinor: Number.isFinite(Number(event.data?.amount)) ? Number(event.data?.amount) : null,
      currency: typeof event.data?.currency === "string" ? event.data.currency : null,
      transferCode:
        typeof (event.data as { transfer_code?: unknown } | undefined)?.transfer_code === "string"
          ? (event.data as { transfer_code: string }).transfer_code
          : null,
      failureReason:
        payoutStatus === "failed" && typeof event.data?.gateway_response === "string"
          ? event.data.gateway_response
          : null,
      providerPayload: event,
    });
    ok(res, id, { received: true, payout_updated: result.found && result.valid });
    return;
  }

  ok(res, id, { received: true });
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

    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
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

    const runId = routeParam(req.params.runId);
    const itemId = routeParam(req.params.itemId);
    if (!runId || !itemId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id and item id are required");
      return;
    }

    const result = await workspaceStore.setPayrollItemIncluded({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      payrollItemId: itemId,
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

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
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

    const runId = routeParam(req.params.runId);
    const itemId = routeParam(req.params.itemId);
    if (!runId || !itemId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id and item id are required");
      return;
    }

    const result = await workspaceStore.addPayrollAdjustment({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      payrollItemId: itemId,
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

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    ok(res, id, { payroll }, 201);
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/funding",
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

    if (!fundingProvider || !env.publicOrigin) {
      fail(res, id, 503, "FUNDING_001", "Payroll funding is not configured");
      return;
    }

    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const body = req.body as { method?: unknown };
    const method =
      body.method === "card" || body.method === "bank_transfer" ? body.method : undefined;
    if (!method) {
      fail(res, id, 422, "FUNDING_003", "Funding method must be card or bank_transfer");
      return;
    }

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    if (!payroll) {
      fail(res, id, 404, "PAYROLL_003", "Payroll run not found");
      return;
    }

    if (
      payroll.status === "FUNDING_PENDING" &&
      payroll.funding?.status === "pending" &&
      payroll.funding.authorizationUrl
    ) {
      ok(res, id, {
        payroll,
        funding: payroll.funding,
        checkout_url: payroll.funding.authorizationUrl,
      });
      return;
    }

    if (payroll.status === "FUNDED") {
      fail(res, id, 409, "FUNDING_004", "This payroll is already funded");
      return;
    }

    if (payroll.status !== "READY" || payroll.totalNetPay <= 0) {
      fail(
        res,
        id,
        409,
        "FUNDING_005",
        "Payroll must be ready before funding",
        "Resolve payroll checks before starting funding.",
      );
      return;
    }

    const providerReference = `IGHO-FND-${randomUUID()}`;
    const intent = await fundingStore.createFundingIntent({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      providerReference,
      method,
      actorAuthUserId: access.authUserId,
      requestId: id,
    });

    if (!intent) {
      fail(res, id, 409, "FUNDING_005", "Payroll is not available for funding");
      return;
    }

    try {
      const callbackUrl = new URL("/app/index.html", env.publicOrigin);
      callbackUrl.searchParams.set("live", "1");
      callbackUrl.searchParams.set("funding", providerReference);

      const initialized = await fundingProvider.initializeFunding({
        email: access.email,
        amount: intent.amount,
        currency: intent.currency,
        reference: providerReference,
        callbackUrl: callbackUrl.toString(),
        method,
        payrollRunId: runId,
      });

      const funding = await fundingStore.markPending({
        workspaceId: access.workspaceId,
        providerReference,
        authorizationUrl: initialized.authorizationUrl,
        accessCode: initialized.accessCode,
      });

      const updatedPayroll = await getPayrollDetailWithFunding({
        workspaceId: access.workspaceId,
        payrollRunId: runId,
      });

      ok(
        res,
        id,
        {
          payroll: updatedPayroll,
          funding,
          checkout_url: initialized.authorizationUrl,
        },
        201,
      );
    } catch (error) {
      const message =
        error instanceof PaystackProviderError ? error.message : "Could not start payroll funding";
      await fundingStore.markFailed({
        providerReference,
        reason: message,
      });
      fail(res, id, 502, "FUNDING_006", message);
    }
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/funding/refresh",
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

    if (!fundingProvider) {
      fail(res, id, 503, "FUNDING_001", "Payroll funding is not configured");
      return;
    }

    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const funding = await fundingStore.getLatest({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    if (!funding) {
      fail(res, id, 404, "FUNDING_007", "No funding attempt exists for this payroll");
      return;
    }

    if (funding.status === "settled") {
      const payroll = await getPayrollDetailWithFunding({
        workspaceId: access.workspaceId,
        payrollRunId: runId,
      });
      ok(res, id, { payroll, funding });
      return;
    }

    try {
      const verification = await fundingProvider.verifyFunding(funding.providerReference);
      if (verification.status === "success") {
        const settled = await fundingStore.settle({
          providerReference: funding.providerReference,
          amountMinor: verification.amountMinor,
          currency: verification.currency,
          channel: verification.channel,
          transactionId: verification.transactionId,
          paidAt: verification.paidAt,
          providerPayload: verification.raw,
          requestId: id,
        });
        if (!settled.valid) {
          const mismatch = settled.mismatch;
          const detail = mismatch
            ? `Expected ${String(mismatch.expectedAmountMinor)} ${mismatch.expectedCurrency}; Paystack verified ${String(mismatch.providerAmountMinor)} ${mismatch.providerCurrency}.`
            : undefined;
          fail(
            res,
            id,
            409,
            "FUNDING_008",
            "Funding verification did not match this payroll",
            detail,
          );
          return;
        }
      } else if (verification.status === "failed" || verification.status === "abandoned") {
        await fundingStore.markFailed({
          providerReference: funding.providerReference,
          reason: verification.gatewayResponse ?? `Paystack status: ${verification.status}`,
          providerPayload: verification.raw,
        });
      }

      const payroll = await getPayrollDetailWithFunding({
        workspaceId: access.workspaceId,
        payrollRunId: runId,
      });
      ok(res, id, { payroll, funding: payroll?.funding ?? null });
    } catch (error) {
      const message =
        error instanceof PaystackProviderError ? error.message : "Could not verify payroll funding";
      fail(res, id, 502, "FUNDING_009", message);
    }
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/approve",
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
      requirePermission(access, "payroll.approve");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }
    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const result = await payoutStore.approvePayroll({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      actorAuthUserId: access.authUserId,
      requestId: id,
    });
    if (!result.found) {
      fail(res, id, 404, "PAYROLL_003", "Payroll run not found");
      return;
    }
    if (!result.approved) {
      if (result.blockerCount > 0) {
        fail(
          res,
          id,
          409,
          "PAYOUT_002",
          "Payroll has employees who are not ready for payment",
          "Every included employee must have a verified salary account before approval.",
        );
        return;
      }
      fail(res, id, 409, "PAYOUT_001", "Only a funded payroll can be approved");
      return;
    }
    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    ok(res, id, { payroll }, 201);
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/payouts",
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
      requirePermission(access, "payments.execute");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }
    if (!payoutProvider) {
      fail(res, id, 503, "PAYOUT_003", "Payment provider is not configured");
      return;
    }
    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const processing = await payoutStore.beginProcessing({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      actorAuthUserId: access.authUserId,
      requestId: id,
    });
    if (!processing.found) {
      fail(res, id, 404, "PAYROLL_003", "Payroll run not found");
      return;
    }
    if (!processing.processable) {
      fail(res, id, 409, "PAYOUT_004", "Payroll must be approved before payment");
      return;
    }

    for (const payout of processing.payouts) {
      if (payout.status !== "queued") continue;
      try {
        const transfer = await payoutProvider.initiateTransfer({
          amount: payout.amount,
          currency: payout.currency,
          recipientCode: payout.providerRecipientCode,
          reference: payout.providerReference,
          reason: `Salary payment · ${payout.employeeName}`,
        });
        await payoutStore.markInitiated({
          providerReference: payout.providerReference,
          transferCode: transfer.transferCode,
          providerStatus: transfer.status,
          providerPayload: transfer.raw,
          actorAuthUserId: access.authUserId,
        });
      } catch (error) {
        const message =
          error instanceof PaystackProviderError ? error.message : "Could not initiate transfer";
        await payoutStore.applyProviderResult({
          providerReference: payout.providerReference,
          status: "failed",
          failureReason: message,
        });
      }
    }

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    ok(res, id, { payroll }, 201);
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/payouts/:payoutId/otp/resend",
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
      requirePermission(access, "payments.execute");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }
    if (!payoutProvider) {
      fail(res, id, 503, "PAYOUT_003", "Payment provider is not configured");
      return;
    }

    const runId = routeParam(req.params.runId);
    const payoutId = routeParam(req.params.payoutId);
    if (!runId || !payoutId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id and payout id are required");
      return;
    }

    const payout = await payoutStore.getPayout({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      payoutId,
    });
    if (!payout) {
      fail(res, id, 404, "PAYOUT_005", "Payout not found");
      return;
    }
    if (payout.status !== "otp" || !payout.providerTransferCode) {
      fail(res, id, 409, "PAYOUT_007", "This payment is not waiting for an OTP");
      return;
    }

    try {
      await payoutProvider.resendTransferOtp(payout.providerTransferCode);
      ok(res, id, {
        resent: true,
        payout_id: payout.id,
        message: "A new Paystack transfer OTP has been sent.",
      });
    } catch (error) {
      const message =
        error instanceof PaystackProviderError ? error.message : "Could not resend transfer OTP";
      fail(res, id, 422, "PAYOUT_009", message);
    }
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/payouts/:payoutId/otp",
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
      requirePermission(access, "payments.execute");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }
    if (!payoutProvider) {
      fail(res, id, 503, "PAYOUT_003", "Payment provider is not configured");
      return;
    }

    const runId = routeParam(req.params.runId);
    const payoutId = routeParam(req.params.payoutId);
    const body = req.body as { otp?: unknown };
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    if (!runId || !payoutId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id and payout id are required");
      return;
    }
    if (!/^\d{4,8}$/.test(otp)) {
      fail(res, id, 422, "PAYOUT_006", "Enter the Paystack transfer OTP");
      return;
    }

    const payout = await payoutStore.getPayout({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
      payoutId,
    });
    if (!payout) {
      fail(res, id, 404, "PAYOUT_005", "Payout not found");
      return;
    }
    if (payout.status !== "otp" || !payout.providerTransferCode) {
      fail(res, id, 409, "PAYOUT_007", "This payment is not waiting for an OTP");
      return;
    }

    try {
      const transfer = await payoutProvider.finalizeTransfer({
        transferCode: payout.providerTransferCode,
        otp,
      });
      const providerStatus = transfer.status.toLowerCase();
      const status =
        providerStatus === "success"
          ? "success"
          : providerStatus === "otp"
            ? "otp"
            : providerStatus === "failed" ||
                providerStatus === "abandoned" ||
                providerStatus === "blocked" ||
                providerStatus === "rejected"
              ? "failed"
              : providerStatus === "reversed"
                ? "reversed"
                : "pending";

      await payoutStore.applyProviderResult({
        providerReference: payout.providerReference,
        status,
        amountMinor: transfer.amountMinor || null,
        currency: transfer.currency || null,
        transferCode: transfer.transferCode,
        providerPayload: transfer.raw,
      });

      const payroll = await getPayrollDetailWithFunding({
        workspaceId: access.workspaceId,
        payrollRunId: runId,
      });
      ok(res, id, { payroll });
    } catch (error) {
      const message =
        error instanceof PaystackProviderError ? error.message : "Could not authorise payment";
      fail(res, id, 422, "PAYOUT_008", message);
    }
  },
);

app.post(
  "/api/v1/payroll-runs/:runId/payouts/refresh",
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
      requirePermission(access, "payments.view");
    } catch {
      fail(res, id, 403, "AUTH_004", "Permission denied");
      return;
    }
    if (!payoutProvider) {
      fail(res, id, 503, "PAYOUT_003", "Payment provider is not configured");
      return;
    }
    const runId = routeParam(req.params.runId);
    if (!runId) {
      fail(res, id, 422, "PAYROLL_008", "Payroll run id is required");
      return;
    }

    const payouts = await payoutStore.listPayouts({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    if (!payouts.length) {
      fail(res, id, 404, "PAYOUT_005", "No payouts exist for this payroll");
      return;
    }

    for (const payout of payouts) {
      if (payout.status !== "pending" && payout.status !== "otp") continue;
      try {
        const transfer = await payoutProvider.verifyTransfer(payout.providerReference);
        const providerStatus = transfer.status.toLowerCase();
        const status =
          providerStatus === "success"
            ? "success"
            : providerStatus === "otp"
              ? "otp"
              : providerStatus === "failed" ||
                  providerStatus === "abandoned" ||
                  providerStatus === "blocked" ||
                  providerStatus === "rejected"
                ? "failed"
                : providerStatus === "reversed"
                  ? "reversed"
                  : "pending";
        await payoutStore.applyProviderResult({
          providerReference: payout.providerReference,
          status,
          amountMinor: transfer.amountMinor || null,
          currency: transfer.currency || null,
          transferCode: transfer.transferCode,
          providerPayload: transfer.raw,
        });
      } catch {
        // Leave the payout pending; a later webhook or refresh can reconcile it.
      }
    }

    const payroll = await getPayrollDetailWithFunding({
      workspaceId: access.workspaceId,
      payrollRunId: runId,
    });
    ok(res, id, { payroll });
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
    const period =
      typeof body.period === "string" && body.period.trim() ? body.period.trim() : undefined;

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
