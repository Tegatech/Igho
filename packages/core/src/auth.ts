export const ROLES = ["OWNER", "PAYROLL_ADMIN", "APPROVER", "EMPLOYEE"] as const;
export type RoleKey = (typeof ROLES)[number];

export const PERMISSIONS = [
  "people.view",
  "people.create",
  "people.edit",
  "people.deactivate",
  "compensation.view",
  "compensation.edit",
  "bank_accounts.view_masked",
  "bank_accounts.view_full",
  "bank_accounts.edit",
  "bank_accounts.verify",
  "payroll.view",
  "payroll.create",
  "payroll.edit",
  "payroll.approve",
  "payroll.reopen",
  "funding.view",
  "funding.initiate",
  "payments.view",
  "payments.execute",
  "payments.retry",
  "payslips.view_all",
  "payslips.generate",
  "audit.view",
  "settings.view",
  "settings.manage",
  "users.view",
  "users.manage",
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number];

const allPermissions = new Set<PermissionKey>(PERMISSIONS);
export const ROLE_PERMISSIONS: Readonly<Record<RoleKey, ReadonlySet<PermissionKey>>> = {
  OWNER: allPermissions,
  PAYROLL_ADMIN: new Set<PermissionKey>([
    "people.view",
    "people.create",
    "people.edit",
    "people.deactivate",
    "compensation.view",
    "compensation.edit",
    "bank_accounts.view_masked",
    "bank_accounts.edit",
    "bank_accounts.verify",
    "payroll.view",
    "payroll.create",
    "payroll.edit",
    "funding.view",
    "payments.view",
    "payslips.view_all",
    "payslips.generate",
    "settings.view",
    "users.view",
  ]),
  APPROVER: new Set<PermissionKey>([
    "payroll.view",
    "payroll.approve",
    "funding.view",
    "payments.view",
    "settings.view",
  ]),
  EMPLOYEE: new Set<PermissionKey>(["bank_accounts.view_masked", "bank_accounts.edit"]),
};

export interface AccessContext {
  readonly authUserId: string;
  readonly email: string;
  readonly workspaceId: string;
  readonly membershipId: string;
  readonly roles: readonly RoleKey[];
  readonly permissions: ReadonlySet<PermissionKey>;
}

export function permissionsForRoles(roles: readonly RoleKey[]): Set<PermissionKey> {
  const permissions = new Set<PermissionKey>();
  for (const role of roles)
    for (const permission of ROLE_PERMISSIONS[role]) permissions.add(permission);
  return permissions;
}

export function hasPermission(
  context: Pick<AccessContext, "permissions">,
  permission: PermissionKey,
): boolean {
  return context.permissions.has(permission);
}

export class AuthorizationError extends Error {
  readonly permission: PermissionKey;
  constructor(permission: PermissionKey) {
    super(`Missing permission: ${permission}`);
    this.name = "AuthorizationError";
    this.permission = permission;
  }
}

export function requirePermission(
  context: Pick<AccessContext, "permissions">,
  permission: PermissionKey,
): void {
  if (!hasPermission(context, permission)) throw new AuthorizationError(permission);
}
