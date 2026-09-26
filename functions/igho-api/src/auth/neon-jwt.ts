import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface AuthenticatedIdentity {
  readonly authUserId: string;
  readonly email: string;
  readonly payload: JWTPayload;
}

export function createNeonJwtVerifier(neonAuthBaseUrl: string) {
  const jwksUrl = new URL(`${neonAuthBaseUrl}/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);

  return async function verifyBearer(
    authorization?: string,
  ): Promise<AuthenticatedIdentity | null> {
    const headerPresent = typeof authorization === "string" && authorization.length > 0;
    const bearerFormatValid = Boolean(authorization?.startsWith("Bearer "));

    console.info(
      JSON.stringify({
        level: "info",
        event: "auth_header_inspection",
        authorization_header_present: headerPresent,
        bearer_format_valid: bearerFormatValid,
      }),
    );

    if (!bearerFormatValid) return null;

    const token = authorization!.slice("Bearer ".length).trim();
    if (!token) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "auth_token_missing",
        }),
      );
      return null;
    }

    const jwtSegmentCount = token.split(".").length;

    console.info(
      JSON.stringify({
        level: "info",
        event: "auth_token_shape",
        jwt_segment_count: jwtSegmentCount,
      }),
    );

    try {
      const { payload } = await jwtVerify(token, jwks);
      const authUserId = payload.sub;
      const email = typeof payload.email === "string" ? payload.email : undefined;

      if (!authUserId || !email) {
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "auth_claims_missing",
            subject_present: Boolean(authUserId),
            email_present: Boolean(email),
          }),
        );
        return null;
      }

      console.info(
        JSON.stringify({
          level: "info",
          event: "auth_jwt_verified",
        }),
      );

      return {
        authUserId,
        email: email.toLowerCase(),
        payload,
      };
    } catch (error) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "auth_jwt_verification_failed",
          error_name: error instanceof Error ? error.name : "unknown_error",
          error_message: error instanceof Error ? error.message : "unknown_error",
        }),
      );
      return null;
    }
  };
}
