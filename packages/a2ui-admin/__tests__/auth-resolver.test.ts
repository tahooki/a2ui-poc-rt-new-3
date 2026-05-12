import { describe, it, expect } from "vitest";
import { executeAuthResolver } from "../src/mcp-server/resolvers/auth-resolver";

describe("Auth Resolver", () => {
  it("roles 없으면 허용 (PoC 호환)", async () => {
    const result = await executeAuthResolver("deploy_launchpad", {});
    expect(result.allowed).toBe(true);
  });

  it("빈 roles 배열도 허용", async () => {
    const result = await executeAuthResolver("deploy_launchpad", { roles: [] });
    expect(result.allowed).toBe(true);
  });

  it("deployer → deploy_launchpad 허용", async () => {
    const result = await executeAuthResolver("deploy_launchpad", { roles: ["deployer"] });
    expect(result.allowed).toBe(true);
  });

  it("deployer → rollback_summary 허용", async () => {
    const result = await executeAuthResolver("rollback_summary", { roles: ["deployer"] });
    expect(result.allowed).toBe(true);
  });

  it("deployer → approval_queue_inbox 거부", async () => {
    const result = await executeAuthResolver("approval_queue_inbox", { roles: ["deployer"] });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("approver → approval_queue_inbox 허용", async () => {
    const result = await executeAuthResolver("approval_queue_inbox", { roles: ["approver"] });
    expect(result.allowed).toBe(true);
  });

  it("admin → 모든 템플릿 허용", async () => {
    const r1 = await executeAuthResolver("deploy_launchpad", { roles: ["admin"] });
    const r2 = await executeAuthResolver("approval_queue_inbox", { roles: ["admin"] });
    const r3 = await executeAuthResolver("rollback_summary", { roles: ["admin"] });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("viewer → 모든 템플릿 허용", async () => {
    const result = await executeAuthResolver("deploy_launchpad", { roles: ["viewer"] });
    expect(result.allowed).toBe(true);
  });

  it("unknown role → 거부", async () => {
    const result = await executeAuthResolver("deploy_launchpad", { roles: ["unknown_role"] });
    expect(result.allowed).toBe(false);
  });
});
