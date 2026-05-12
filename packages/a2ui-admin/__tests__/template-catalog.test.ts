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
      "deploy_history_table",
      "approval_queue_inbox",
      "rollback_summary",
    ]));
  });

  it("intent에서 템플릿 등록 정보를 찾는다", () => {
    const registration = getTemplateIntentRegistration("deploy.start");
    expect(registration?.template.templateId).toBe("deploy_launchpad");
    expect(registration?.intent.requiredFacts).toEqual(["serviceName"]);
  });

  it("deploy history intent에서 table 템플릿 등록 정보를 찾는다", () => {
    const registration = getTemplateIntentRegistration("deploy.history.lookup");
    expect(registration?.template.templateId).toBe("deploy_history_table");
    expect(registration?.intent.requiredFacts).toEqual([]);
  });

  it("resolver와 binding recipe를 템플릿 등록 정보에서 제공한다", () => {
    const template = getTemplateRegistration("deploy_launchpad");
    expect(template?.resolvers[0]?.kind).toBe("http_get");
    expect(template?.resolvers[0]?.requiredFacts).toContain("serviceName");
    expect(template?.bindingRecipe.templateId).toBe("deploy_launchpad");
    expect(template?.actions[0]?.actionId).toBe("deploy.start");
    expect(template?.surfaceConfig?.kind).toBe("a2ui_card");
  });

  it("deploy history table resolver와 binding recipe를 제공한다", () => {
    const template = getTemplateRegistration("deploy_history_table");
    expect(template?.resolvers[0]?.endpoint).toBe("/api/deployments");
    expect(template?.bindingRecipe.templateId).toBe("deploy_history_table");
    expect(template?.surfaceConfig?.parts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "DataTableBlock" }),
    ]));
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
