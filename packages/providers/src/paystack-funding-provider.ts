import { createHmac, timingSafeEqual } from "node:crypto";
import { PaystackProviderError } from "./paystack-bank-provider.js";

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export type PayrollFundingMethod = "card" | "bank_transfer";

export interface FundingInitialization {
  readonly authorizationUrl: string;
  readonly accessCode: string;
  readonly reference: string;
}

export interface FundingVerification {
  readonly reference: string;
  readonly status: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly channel: string | null;
  readonly transactionId: string | null;
  readonly paidAt: string | null;
  readonly gatewayResponse: string | null;
  readonly raw: unknown;
}

export function createPaystackFundingProvider(secretKey: string) {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${secretKey}`);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");

    const response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers,
    });

    const payload = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
    if (!response.ok || !payload?.status) {
      throw new PaystackProviderError(payload?.message ?? "Paystack request failed");
    }
    return payload.data;
  };

  return {
    async initializeFunding(input: {
      email: string;
      amount: number;
      currency: string;
      reference: string;
      callbackUrl: string;
      method: PayrollFundingMethod;
      payrollRunId: string;
    }): Promise<FundingInitialization> {
      const amountMinor = Math.round(input.amount * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new PaystackProviderError("Funding amount must be greater than zero");
      }

      const data = await request<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: String(amountMinor),
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          channels: [input.method],
          metadata: JSON.stringify({
            purpose: "payroll_funding",
            payroll_run_id: input.payrollRunId,
          }),
        }),
      });

      return {
        authorizationUrl: data.authorization_url,
        accessCode: data.access_code,
        reference: data.reference,
      };
    },

    async verifyFunding(reference: string): Promise<FundingVerification> {
      const data = await request<{
        id?: number | string;
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        channel?: string | null;
        paid_at?: string | null;
        gateway_response?: string | null;
      }>(`/transaction/verify/${encodeURIComponent(reference)}`);

      return {
        reference: data.reference ?? reference,
        status: data.status ?? "unknown",
        amountMinor: Number(data.amount ?? 0),
        currency: data.currency ?? "",
        channel: data.channel ?? null,
        transactionId: data.id == null ? null : String(data.id),
        paidAt: data.paid_at ?? null,
        gatewayResponse: data.gateway_response ?? null,
        raw: data,
      };
    },

    verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
      if (!signature) return false;
      const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
      const expectedBuffer = Buffer.from(expected, "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");
      return (
        expectedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(expectedBuffer, signatureBuffer)
      );
    },
  };
}
