import { describe, expect, it } from "vitest";
import { normalizeTemplate, validateStoredTemplate } from "../src/mcp-server/catalog/template-store";

describe("Template Store validation", () => {
  it("rejects invalid nested resolver/action config", () => {
    const errors = validateStoredTemplate({
      templateId: "deploy_launchpad",
      version: "1.0.0",
      title: "Deploy",
      status: "published",
      description: "bad",
      intents: [{ intentKey: "deploy.start", requiredFacts: [] }],
      bindingRecipeId: "does_not_exist",
      resolvers: [{ id: "service", kind: "bogus" }],
      actions: [{ actionId: "deploy.start", label: "Deploy", variant: "wat", kind: "submit" }],
    });

    expect(errors).toContain("bindingRecipeId must be one of: deploy_launchpad, approval_queue_inbox, rollback_summary, component_smoke_test");
    expect(errors).toContain("resolvers[0].kind must be http_get|transform_filter|static_defaults|llm_summary");
    expect(errors).toContain("actions[0].variant must be primary|secondary|danger|ghost");
  });

  it("normalizes legacy resolver config into resolver cards", () => {
    const template = normalizeTemplate({
      templateId: "deploy_launchpad",
      version: "1.0.0",
      title: "Deploy",
      status: "published",
      description: "legacy",
      intents: [{ intentKey: "deploy.start", requiredFacts: [] }],
      resolver: {
        kind: "deploy_service",
        endpointTemplate: "/api/services/{serviceName}",
        serviceNameFact: "serviceName",
        defaultEnvironment: "production",
        defaultRequestDetail: {},
        impactSummaryTemplate: "{serviceName} 배포",
      },
      bindingRecipeId: "deploy_launchpad",
      actions: [{ actionId: "deploy.start", label: "Deploy", variant: "primary", kind: "submit" }],
    });

    expect(template.schemaVersion).toBe(2);
    expect(template.resolvers?.map((resolver) => resolver.id)).toContain("service");
    expect(template.generatedValidation?.requiredFacts).toContain("serviceName");
  });

  it("rejects unknown surfaceConfig part types", () => {
    const errors = validateStoredTemplate({
      templateId: "deploy_launchpad",
      version: "1.0.0",
      title: "Deploy",
      status: "published",
      description: "bad surface",
      intents: [{ intentKey: "deploy.start", requiredFacts: [] }],
      bindingRecipeId: "deploy_launchpad",
      resolvers: [],
      actions: [{ actionId: "deploy.start", label: "Deploy", variant: "primary", kind: "submit" }],
      surfaceConfig: {
        kind: "a2ui_card",
        parts: [{ id: "bad", type: "RawButton", props: {} }],
      },
    });

    expect(errors).toContain("surfaceConfig.parts[0].type is unknown: RawButton");
  });
});
