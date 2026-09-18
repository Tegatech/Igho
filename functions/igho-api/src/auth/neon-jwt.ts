import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface AuthenticatedIdentity {
  readonly authUserId: string;
  readonly email: string;
  readonly payload: JWTPayload;
}

export function createNeonJwtVerifier(neonAuthBaseUrl: string) {
  const jwksUrl = new URL(`${neonAuthBaseUrl}/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);

  return async function verifyBearer(authorization?: string): Promise<AuthenticatedIdentity | null> {
    if (!authorization?.startsWith("Bearer ")) return null;

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, jwks);
      const authUserId = payload.sub;
      const email = typeof payload.email === "string" ? payload.email : undefined;

      if (!authUserId || !email) return null;

      return {
        authUserId,
        email: email.toLowerCase(),
        payload,
      };
    } catch {
      return null;
    }
  };
}
