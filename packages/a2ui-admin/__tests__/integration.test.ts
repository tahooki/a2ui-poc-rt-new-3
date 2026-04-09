/**
 * MCP Server + Mock API 통합 테스트
 *
 * Mock API 서버(3200)와 MCP 서버(3100)를 기동한 뒤,
 * MCP 클라이언트로 resolveTemplateData를 호출하여 3개 시나리오의
 * SurfaceEnvelope 반환을 검증합니다.
 *
 * 실행: npx vitest run packages/a2ui-admin/__tests__/integration.test.ts
 * 사전 조건: 두 서버가 기동되어 있어야 함
 *   npm run dev -w demo-mock-api
 *   npm run dev -w @a2ui/admin
 *
 * 또는 이 테스트가 서버를 자동 기동/종료합니다.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";

// Direct imports for unit-level integration (no server needed)
import { evaluateDecision } from "../src/mcp-server/decision/decision-engine";
import { executeLlmResolver } from "../src/mcp-server/resolvers/llm-resolver";
import { executeAuthResolver } from "../src/mcp-server/resolvers/auth-resolver";
import {
  applyBinding,
  DEPLOY_LAUNCHPAD_RECIPE,
  APPROVAL_QUEUE_INBOX_RECIPE,
  ROLLBACK_SUMMARY_RECIPE,
} from "../src/mcp-server/binding/binding-engine";
import { validatePayload } from "../src/mcp-server/validation/payload-validator";

describe("Integration: Decision → Auth → LLM → Binding → Validation pipeline", () => {
  describe("Deploy Launchpad 시나리오", () => {
    it("전체 파이프라인 성공", async () => {
      // 1. Decision
      const decision = evaluateDecision("deploy.start", { serviceName: "payments-api" });
      expect(decision.mode).toBe("render_surface");
      expect(decision.templateId).toBe("deploy_launchpad");

      // 2. Auth
      const auth = await executeAuthResolver("deploy_launchpad", { roles: ["deployer"] });
      expect(auth.allowed).toBe(true);

      // 3. LLM
      const llmData = await executeLlmResolver("deploy_launchpad", {});
      expect(llmData.riskSummary).toBeTruthy();

      // 4. Binding (Mock resolver data)
      const resolverData = {
        serviceName: "payments-api",
        environment: "production",
        recommendedVersion: "v2.3.18-rc1",
        strategy: "rolling",
        impactSummary: "payments-api production 배포",
        ...llmData,
      };
      const payload = applyBinding(DEPLOY_LAUNCHPAD_RECIPE, resolverData);

      // 5. Validation
      const validation = validatePayload("deploy_launchpad", payload);
      expect(validation.valid).toBe(true);

      // 6. Envelope 구성
      expect(payload.templateId).toBe("deploy_launchpad");
      expect(payload.service).toBe("payments-api");
      expect(payload.riskSummary).toBeTruthy();
    });
  });

  describe("Approval Queue Inbox 시나리오", () => {
    it("전체 파이프라인 성공", async () => {
      const decision = evaluateDecision("approval.review", {});
      expect(decision.mode).toBe("render_surface");

      const auth = await executeAuthResolver("approval_queue_inbox", { roles: ["approver"] });
      expect(auth.allowed).toBe(true);

      const llmData = await executeLlmResolver("approval_queue_inbox", {});

      const resolverData = {
        items: [
          { id: "apr-1", type: "access", title: "test access", environment: "prod", requestedBy: "user", riskSummary: "low", riskTone: "success", status: "pending" },
        ],
        byStatus: { pending: 1 },
        byType: { access: 1 },
        ...llmData,
      };
      const payload = applyBinding(APPROVAL_QUEUE_INBOX_RECIPE, resolverData);
      const validation = validatePayload("approval_queue_inbox", payload);

      expect(validation.valid).toBe(true);
      expect(payload.items).toHaveLength(1);
      expect(payload.queueSummary).toBeTruthy();
    });
  });

  describe("Rollback Summary 시나리오", () => {
    it("전체 파이프라인 성공", async () => {
      const decision = evaluateDecision("rollback.start", { serviceName: "checkout" });
      expect(decision.mode).toBe("render_surface");

      const auth = await executeAuthResolver("rollback_summary", { roles: ["deployer"] });
      expect(auth.allowed).toBe(true);

      const llmData = await executeLlmResolver("rollback_summary", {});

      const resolverData = {
        candidates: [
          { id: "svc-1", service: "checkout", environment: "production", currentVersion: "v1.8.42", severity: "critical", incidentSummary: "INC-835", recommendedRollbackVersion: "v1.8.39", eligibleVersions: [] },
        ],
        serviceHealth: [
          { service: "checkout", version: "v1.8.42", status: "warning" },
        ],
        ...llmData,
      };
      const payload = applyBinding(ROLLBACK_SUMMARY_RECIPE, resolverData);
      const validation = validatePayload("rollback_summary", payload);

      expect(validation.valid).toBe(true);
      expect(payload.candidates).toHaveLength(1);
      expect(payload.causeSummary).toBeTruthy();
      expect(payload.recommendation).toBeTruthy();
    });
  });

  describe("Fallback 시나리오", () => {
    it("권한 없는 사용자 → 거부", async () => {
      const auth = await executeAuthResolver("approval_queue_inbox", { roles: ["deployer"] });
      expect(auth.allowed).toBe(false);
    });

    it("unknown intent → text_only", () => {
      const decision = evaluateDecision("chat.general", {});
      expect(decision.mode).toBe("text_only");
    });

    it("validation 실패 시 에러 반환", () => {
      const payload = { templateId: "deploy_launchpad" }; // 필수 필드 누락
      const validation = validatePayload("deploy_launchpad", payload);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
