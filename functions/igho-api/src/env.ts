export interface IghoEnvironment {
  readonly databaseUrl: string;
  readonly neonAuthBaseUrl: string;
  readonly bootstrapOwnerEmail: string;
  readonly publicOrigin?: string;
  readonly paystackSecretKey?: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function readEnvironment(): IghoEnvironment {
  const publicOrigin = process.env.IGHO_PUBLIC_ORIGIN?.trim();
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  return {
    databaseUrl: required("DATABASE_URL"),
    neonAuthBaseUrl: required("NEON_AUTH_BASE_URL").replace(/\/$/, ""),
    bootstrapOwnerEmail: required("BOOTSTRAP_OWNER_EMAIL").toLowerCase(),
    ...(publicOrigin ? { publicOrigin } : {}),
    ...(paystackSecretKey ? { paystackSecretKey } : {}),
  };
}
