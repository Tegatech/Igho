import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export function requestId(req: Request): string {
  const supplied = req.header("x-request-id")?.trim();
  return supplied ?? `req_${randomUUID()}`;
}

export function ok(
  res: Response,
  id: string,
  data: unknown,
  status = 200,
): void {
  res.status(status).json({ request_id: id, data, meta: {} });
}

export function fail(
  res: Response,
  id: string,
  status: number,
  code: string,
  message: string,
  hint?: string,
): void {
  res.status(status).json({
    request_id: id,
    error: {
      code,
      message,
      hint: hint ?? null,
      details: [],
    },
  });
}
