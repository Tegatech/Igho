export interface BankOption {
  readonly code: string;
  readonly name: string;
}

export interface ResolvedBankAccount {
  readonly accountNumber: string;
  readonly accountName: string;
}

export interface TransferRecipient {
  readonly recipientCode: string;
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

export class PaystackProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaystackProviderError";
  }
}

export function createPaystackBankProvider(secretKey: string) {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`https://api.paystack.co${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
    if (!response.ok || !payload?.status) {
      throw new PaystackProviderError(payload?.message || "Paystack request failed");
    }
    return payload.data;
  };

  return {
    async listBanks(): Promise<BankOption[]> {
      const banks = await request<
        Array<{ code: string; name: string; active?: boolean; currency?: string }>
      >("/bank?country=nigeria&currency=NGN");
      return banks
        .filter((bank) => bank.active !== false)
        .map((bank) => ({ code: bank.code, name: bank.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async resolveBankAccount(input: {
      accountNumber: string;
      bankCode: string;
    }): Promise<ResolvedBankAccount> {
      const query = new URLSearchParams({
        account_number: input.accountNumber,
        bank_code: input.bankCode,
      });
      const data = await request<{ account_number: string; account_name: string }>(
        `/bank/resolve?${query.toString()}`,
      );
      return {
        accountNumber: data.account_number,
        accountName: data.account_name,
      };
    },

    async createRecipient(input: {
      name: string;
      accountNumber: string;
      bankCode: string;
      currency?: string;
    }): Promise<TransferRecipient> {
      const data = await request<{ recipient_code: string }>("/transferrecipient", {
        method: "POST",
        body: JSON.stringify({
          type: "nuban",
          name: input.name,
          account_number: input.accountNumber,
          bank_code: input.bankCode,
          currency: input.currency || "NGN",
        }),
      });
      return { recipientCode: data.recipient_code };
    },
  };
}
