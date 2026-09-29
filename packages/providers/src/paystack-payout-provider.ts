import { PaystackProviderError } from "./paystack-bank-provider.js";

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackTransfer {
  readonly reference: string;
  readonly transferCode: string | null;
  readonly status: string;
  readonly recipientCode: string | null;
  readonly amountMinor: number;
  readonly currency: string;
  readonly raw: unknown;
}

export function createPaystackPayoutProvider(secretKey: string) {
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
    async initiateTransfer(input: {
      amount: number;
      currency: string;
      recipientCode: string;
      reference: string;
      reason: string;
    }): Promise<PaystackTransfer> {
      const amountMinor = Math.round(input.amount * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
        throw new PaystackProviderError("Transfer amount must be greater than zero");
      }

      const data = await request<{
        reference?: string;
        transfer_code?: string;
        status?: string;
        recipient?: string | { recipient_code?: string };
        amount?: number;
        currency?: string;
      }>("/transfer", {
        method: "POST",
        body: JSON.stringify({
          source: "balance",
          amount: amountMinor,
          currency: input.currency,
          recipient: input.recipientCode,
          reference: input.reference,
          reason: input.reason,
        }),
      });

      const recipientCode =
        typeof data.recipient === "string"
          ? data.recipient
          : (data.recipient?.recipient_code ?? null);

      return {
        reference: data.reference ?? input.reference,
        transferCode: data.transfer_code ?? null,
        status: data.status ?? "pending",
        recipientCode,
        amountMinor: data.amount ?? amountMinor,
        currency: data.currency ?? input.currency,
        raw: data,
      };
    },

    async resendTransferOtp(transferCode: string): Promise<void> {
      await request<unknown>("/transfer/resend_otp", {
        method: "POST",
        body: JSON.stringify({
          transfer_code: transferCode,
          reason: "transfer",
        }),
      });
    },

    async finalizeTransfer(input: {
      transferCode: string;
      otp: string;
    }): Promise<PaystackTransfer> {
      const data = await request<{
        reference?: string;
        transfer_code?: string;
        status?: string;
        recipient?: string | { recipient_code?: string };
        amount?: number;
        currency?: string;
      }>("/transfer/finalize_transfer", {
        method: "POST",
        body: JSON.stringify({
          transfer_code: input.transferCode,
          otp: input.otp,
        }),
      });

      const recipientCode =
        typeof data.recipient === "string"
          ? data.recipient
          : (data.recipient?.recipient_code ?? null);

      return {
        reference: data.reference ?? "",
        transferCode: data.transfer_code ?? input.transferCode,
        status: data.status ?? "pending",
        recipientCode,
        amountMinor: data.amount ?? 0,
        currency: data.currency ?? "",
        raw: data,
      };
    },

    async verifyTransfer(reference: string): Promise<PaystackTransfer> {
      const data = await request<{
        reference?: string;
        transfer_code?: string;
        status?: string;
        recipient?: string | { recipient_code?: string };
        amount?: number;
        currency?: string;
      }>(`/transfer/verify/${encodeURIComponent(reference)}`);

      const recipientCode =
        typeof data.recipient === "string"
          ? data.recipient
          : (data.recipient?.recipient_code ?? null);

      return {
        reference: data.reference ?? reference,
        transferCode: data.transfer_code ?? null,
        status: data.status ?? "pending",
        recipientCode,
        amountMinor: data.amount ?? 0,
        currency: data.currency ?? "",
        raw: data,
      };
    },
  };
}
