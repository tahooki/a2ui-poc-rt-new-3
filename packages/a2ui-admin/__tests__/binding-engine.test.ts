import { describe, it, expect } from "vitest";
import {
  applyBinding,
  DEPLOY_LAUNCHPAD_RECIPE,
  APPROVAL_QUEUE_INBOX_RECIPE,
  ROLLBACK_SUMMARY_RECIPE,
} from "../src/mcp-server/binding/binding-engine";

describe("Binding Engine", () => {
  describe("DEPLOY_LAUNCHPAD_RECIPE", () => {
    it("resolver 데이터를 deploy payload로 변환", () => {
      const data = {
        serviceName: "payments-api",
        environment: "production",
        recommendedVersion: "v2.3.18",
        strategy: "rolling",
        riskSummary: "안전합니다.",
      };
      const payload = applyBinding(DEPLOY_LAUNCHPAD_RECIPE, data);
      expect(payload.templateId).toBe("deploy_launchpad");
      expect(payload.service).toBe("payments-api");
      expect(payload.environment).toBe("production");
      expect(payload.targetVersion).toBe("v2.3.18");
      expect(payload.strategy).toBe("rolling");
      expect(payload.state).toBe("ready");
      expect(payload.riskSummary).toBe("안전합니다.");
    });

    it("누락된 필드는 defaultValue 사용", () => {
      const payload = applyBinding(DEPLOY_LAUNCHPAD_RECIPE, {});
      expect(payload.environment).toBe("production");
      expect(payload.targetVersion).toBe("latest");
      expect(payload.strategy).toBe("rolling");
    });
  });

  describe("APPROVAL_QUEUE_INBOX_RECIPE", () => {
    it("items/byStatus/byType/queueSummary 매핑", () => {
      const data = {
        items: [{ id: "a1", status: "pending" }],
        byStatus: { pending: 1 },
        byType: { access: 1 },
        queueSummary: "1건 대기",
      };
      const payload = applyBinding(APPROVAL_QUEUE_INBOX_RECIPE, data);
      expect(payload.templateId).toBe("approval_queue_inbox");
      expect(payload.items).toEqual([{ id: "a1", status: "pending" }]);
      expect(payload.byStatus).toEqual({ pending: 1 });
      expect(payload.queueSummary).toBe("1건 대기");
    });

    it("items 없으면 빈 배열 default", () => {
      const payload = applyBinding(APPROVAL_QUEUE_INBOX_RECIPE, {});
      expect(payload.items).toEqual([]);
    });
  });

  describe("ROLLBACK_SUMMARY_RECIPE", () => {
    it("candidates/serviceHealth/causeSummary 매핑", () => {
      const data = {
        candidates: [{ id: "svc-1" }],
        serviceHealth: [{ service: "api" }],
        causeSummary: "timeout 변경",
        recommendation: "v2.3.16 권장",
      };
      const payload = applyBinding(ROLLBACK_SUMMARY_RECIPE, data);
      expect(payload.templateId).toBe("rollback_summary");
      expect(payload.candidates).toHaveLength(1);
      expect(payload.causeSummary).toBe("timeout 변경");
      expect(payload.recommendation).toBe("v2.3.16 권장");
    });
  });
});
