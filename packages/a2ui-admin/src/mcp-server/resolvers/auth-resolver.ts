/**
 * Auth Resolver — 역할 기반 권한 체크
 */

export type AuthResult = {
  allowed: boolean;
  reason?: string;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  deployer: ["deploy_launchpad", "rollback_summary"],
  approver: ["approval_queue_inbox"],
  admin: ["*"],
  viewer: ["*"],
};

export async function executeAuthResolver(
  templateId: string,
  context: Record<string, unknown>,
): Promise<AuthResult> {
  const roles = context.roles as string[] | undefined;

  // PoC 호환: roles가 없으면 전부 허용
  if (!roles || roles.length === 0) {
    return { allowed: true };
  }

  for (const role of roles) {
    const allowed = ROLE_PERMISSIONS[role];
    if (!allowed) continue;
    if (allowed.includes("*") || allowed.includes(templateId)) {
      return { allowed: true };
    }
  }

  return {
    allowed: false,
    reason: `역할 ${roles.join(", ")}은(는) ${templateId} 접근 권한이 없습니다.`,
  };
}
