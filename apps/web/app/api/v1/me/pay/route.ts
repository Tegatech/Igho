import { requireAccess, success } from "@/lib/api";

export async function GET(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  return success(access.id, { scope: "self", status: "not_available_until_payroll_milestone" });
}
