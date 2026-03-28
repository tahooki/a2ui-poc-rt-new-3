import { describe, it, expect } from "vitest";
import { getPreviousDeployments } from "@/devops-chat/server/tools/builtin/get-previous-deployments";
import { getDeployableServices } from "@/devops-chat/server/tools/builtin/get-deployable-services";
import { getApprovalQueueSummary } from "@/devops-chat/server/tools/builtin/get-approval-queue-summary";
import { getRollbackCandidates } from "@/devops-chat/server/tools/builtin/get-rollback-candidates";

describe("builtin tools", () => {
  describe("getPreviousDeployments", () => {
    it("returns ok with images from seed data", async () => {
      const result = await getPreviousDeployments.execute({ facts: {}, contextSnapshot: {} });
      expect(result.ok).toBe(true);
      expect(result.toolName).toBe("getPreviousDeployments");
      const data = result.data as { items: unknown[]; images: unknown[] };
      expect(data.images.length).toBeGreaterThan(0);
      expect(result.summary).toBeTruthy();
    });
  });

  describe("getDeployableServices", () => {
    it("returns list of services from seed images", async () => {
      const result = await getDeployableServices.execute({ facts: {}, contextSnapshot: {} });
      expect(result.ok).toBe(true);
      const data = result.data as { services: string[]; images: unknown[] };
      expect(data.services.length).toBeGreaterThan(0);
    });
  });

  describe("getApprovalQueueSummary", () => {
    it("returns approval items from seed data", async () => {
      const result = await getApprovalQueueSummary.execute({ facts: {}, contextSnapshot: {} });
      expect(result.ok).toBe(true);
      const data = result.data as { items: unknown[]; byStatus: Record<string, number> };
      expect(data.items.length).toBeGreaterThan(0);
      expect(Object.keys(data.byStatus).length).toBeGreaterThan(0);
    });
  });

  describe("getRollbackCandidates", () => {
    it("returns rollback candidates from seed data", async () => {
      const result = await getRollbackCandidates.execute({ facts: {}, contextSnapshot: {} });
      expect(result.ok).toBe(true);
      const data = result.data as { candidates: Array<{ eligibleVersions: unknown[] }> };
      expect(data.candidates.length).toBeGreaterThan(0);
    });
  });
});
