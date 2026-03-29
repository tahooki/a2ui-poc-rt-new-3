import { describe, it, expect } from "vitest";
import {
  getAllRegistryDefinitions,
  getRegistryDefinition,
  getActiveDefinitions,
} from "@/devops-chat/template-registry/template-registry";
import { buildTemplateListViewModel } from "@/devops-chat/template-registry/build-template-list-view-model";
import { buildContractViewModel } from "@/devops-chat/template-registry/build-contract-view-model";
import { runTemplateSimulator } from "@/devops-chat/template-registry/run-template-simulator";
import { runTemplatePreview } from "@/devops-chat/template-registry/run-template-preview";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
import { getTemplateDefinition } from "@/devops-chat/templates/template-definitions";

describe("template-registry", () => {
  it("has 6 definitions", () => {
    expect(getAllRegistryDefinitions()).toHaveLength(6);
  });

  it("looks up by templateId", () => {
    const def = getRegistryDefinition("quick_deploy_launchpad");
    expect(def).toBeDefined();
    expect(def!.title).toBe("Quick Deploy Launchpad");
  });

  it("all definitions are active", () => {
    expect(getActiveDefinitions()).toHaveLength(6);
  });

  it("each definition has contract fields", () => {
    for (const def of getAllRegistryDefinitions()) {
      expect(def.inputContract.fields.length).toBeGreaterThan(0);
    }
  });

  it("each definition has at least one preview case", () => {
    for (const def of getAllRegistryDefinitions()) {
      expect(def.previewCases.length).toBeGreaterThan(0);
    }
  });

  it("registry templateIds match runtime definitions", () => {
    for (const regDef of getAllRegistryDefinitions()) {
      const runtimeDef = getTemplateDefinition(regDef.templateId);
      expect(runtimeDef).toBeDefined();
      expect(runtimeDef!.templateId).toBe(regDef.templateId);
    }
  });
});

describe("build-template-list-view-model", () => {
  it("returns list items for all templates", () => {
    const items = buildTemplateListViewModel();
    expect(items).toHaveLength(6);
    expect(items[0].title).toBeDefined();
    expect(items[0].fieldCount).toBeGreaterThan(0);
  });
});

describe("build-contract-view-model", () => {
  it("builds contract for deploy launchpad", () => {
    const def = getRegistryDefinition("quick_deploy_launchpad")!;
    const vm = buildContractViewModel(def);
    expect(vm.templateId).toBe("quick_deploy_launchpad");
    expect(vm.fields.length).toBeGreaterThan(5);
    expect(vm.fields.find((f) => f.path === "service")?.required).toBe(true);
  });
});

describe("preview cases pass validation", () => {
  for (const def of getAllRegistryDefinitions()) {
    for (const pc of def.previewCases) {
      it(`${def.templateId} / ${pc.id} passes validation`, () => {
        const result = validateSurfaceEnvelope({
          templateId: def.templateId,
          payload: pc.payload,
          sourceIntent: "preview",
          updatedAt: new Date().toISOString(),
        });
        expect(result.valid).toBe(true);
      });
    }
  }
});

describe("run-template-simulator", () => {
  it("returns render_surface for deploy.start with full facts", () => {
    const result = runTemplateSimulator({
      intentKey: "deploy.start",
      facts: {
        slots: {
          "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
          "deploy.selectedServiceContext": { value: { recommendedVersion: "v1.0" }, source: "tool", confidence: 1, updatedAt: "" },
        },
      },
    });
    expect(result.decisionMode).toBe("render_surface");
    expect(result.selectedTemplateId).toBe("quick_deploy_launchpad");
  });

  it("returns ask_followup when facts are missing", () => {
    const result = runTemplateSimulator({
      intentKey: "deploy.start",
      facts: {},
    });
    expect(result.decisionMode).toBe("ask_followup");
    expect(result.selectedTemplateId).toBeNull();
  });

  it("returns text for general.qna", () => {
    const result = runTemplateSimulator({
      intentKey: "general.qna",
      facts: {},
    });
    expect(result.decisionMode).toBe("text");
  });
});

describe("run-template-preview", () => {
  it("succeeds with valid payload", () => {
    const def = getRegistryDefinition("quick_deploy_launchpad")!;
    const result = runTemplatePreview({
      templateId: def.templateId,
      payloadJson: JSON.stringify(def.previewCases[0].payload),
    });
    expect(result.ok).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const result = runTemplatePreview({
      templateId: "quick_deploy_launchpad",
      payloadJson: "{invalid}",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("parse_error");
  });

  it("fails on missing required fields", () => {
    const result = runTemplatePreview({
      templateId: "quick_deploy_launchpad",
      payloadJson: JSON.stringify({ state: "ready" }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("validation_error");
  });
});
