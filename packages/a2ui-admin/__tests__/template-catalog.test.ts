import { describe, expect, it } from "vitest";
import {
  getTemplateContract,
  getTemplateIntentRegistration,
  getTemplateRegistration,
  listTemplateSummaries,
} from "../src/mcp-server/catalog/template-catalog";

describe("Template Catalog", () => {
  it("등록된 템플릿 목록을 반환한다", () => {
    const templates = listTemplateSummaries();
    expect(templates.map((template) => template.templateId)).toEqual(expect.arrayContaining([
      "deploy_launchpad",
      "approval_queue_inbox",
      "rollback_summary",
    ]));
  });

  it("intent에서 템플릿 등록 정보를 찾는다", () => {
    const registration = getTemplateIntentRegistration("deploy.start");
    expect(registration?.template.templateId).toBe("deploy_launchpad");
    expect(registration?.intent.requiredFacts).toEqual(["serviceName"]);
  });

  it("resolver와 binding recipe를 템플릿 등록 정보에서 제공한다", () => {
    const template = getTemplateRegistration("deploy_launchpad");
    expect(template?.resolvers[0]?.kind).toBe("http_get");
    expect(template?.resolvers[0]?.requiredFacts).toContain("serviceName");
    expect(template?.bindingRecipe.templateId).toBe("deploy_launchpad");
    expect(template?.actions[0]?.actionId).toBe("deploy.start");
    expect(template?.surfaceConfig?.kind).toBe("a2ui_card");
  });

  it("contract도 템플릿 등록 정보에서 제공한다", () => {
    const contract = getTemplateContract("deploy_launchpad");
    expect(contract).toMatchObject({
      templateId: "deploy_launchpad",
    });
    expect(contract.requiredFields).toEqual(expect.arrayContaining([
      "templateId",
      "state",
      "service",
      "environment",
      "targetVersion",
      "strategy",
      "imageDetail",
      "requestDetail",
    ]));
  });
});
