import { describe, expect, it } from "vitest";
import { AuthorizationError, permissionsForRoles, requirePermission } from "./auth.js";

describe("Igho RBAC", () => {
  it("gives OWNER all money permissions", () => {
    const permissions = permissionsForRoles(["OWNER"]);
    expect(permissions.has("funding.initiate")).toBe(true);
    expect(permissions.has("payroll.approve")).toBe(true);
    expect(permissions.has("payments.execute")).toBe(true);
  });

  it("keeps Payroll Admin away from approval and payout execution", () => {
    const permissions = permissionsForRoles(["PAYROLL_ADMIN"]);
    expect(permissions.has("payroll.approve")).toBe(false);
    expect(permissions.has("payments.execute")).toBe(false);
  });

  it("keeps Approver away from compensation and payout execution", () => {
    const permissions = permissionsForRoles(["APPROVER"]);
    expect(permissions.has("payroll.approve")).toBe(true);
    expect(permissions.has("compensation.edit")).toBe(false);
    expect(permissions.has("payments.execute")).toBe(false);
  });

  it("throws when a permission is missing", () => {
    const permissions = permissionsForRoles(["EMPLOYEE"]);
    expect(() => requirePermission({ permissions }, "payroll.view")).toThrow(AuthorizationError);
  });
});
