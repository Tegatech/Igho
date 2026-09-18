import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { AccessContext } from "@igho/core";
import { auth } from "@/lib/auth/server";
import { resolveAccessContext } from "@/lib/access";

export function requestId(request: Request): string {
  return request.headers.get("x-request-id") ?? `req_${randomUUID()}`;
}

export function success<T>(id: string, data: T, status = 200) {
  return NextResponse.json({ request_id: id, data, meta: {} }, { status });
}

export function failure(id: string, status: number, code: string, message: string, hint?: string) {
  return NextResponse.json({ request_id: id, error: { code, message, hint: hint ?? null, details: [] } }, { status });
}

export async function requireAccess(request: Request): Promise<{ id: string; context: AccessContext } | NextResponse> {
  const id = requestId(request);
  const { data: session } = await auth.getSession();
  if (!session?.user?.id || !session.user.email) return failure(id, 401, "AUTH_001", "Authentication required");

  const context = await resolveAccessContext({ authUserId: session.user.id, email: session.user.email });
  if (!context) {
    return failure(id, 403, "AUTH_002", "No active Igho workspace membership", "Accept an invitation or complete workspace bootstrap.");
  }

  return { id, context };
}
