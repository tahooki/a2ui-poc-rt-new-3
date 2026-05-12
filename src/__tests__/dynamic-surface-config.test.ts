import { describe, expect, it } from "vitest";
import {
  createDefaultPart,
  createPartPreviewSurfaceConfig,
  getA2UIPart,
  getA2UIPartDefinition,
  listA2UIPartDefinitionTypes,
  listA2UIPartDefinitions,
  listRequiredPayloadFieldsForSurfaceConfig,
} from "@a2ui/ui";
import { resolveConfigValue } from "@a2ui/ui/dynamic/binding";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";
import { deployHistoryTableSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-history-table";

describe("dynamic A2UI surface config", () => {
  it("resolves binding values from payload", () => {
    const value = resolveConfigValue(
      { type: "binding", path: "payload.service" },
      { payload: { service: "payments-api" } },
    );

    expect(value).toBe("payments-api");
  });

  it("uses fallback for missing binding values", () => {
    const value = resolveConfigValue(
      { type: "binding", path: "payload.rows", fallback: [] },
      { payload: {} },
    );

    expect(value).toEqual([]);
  });

  it("registers deploy-specific parts used by the deploy launchpad config", () => {
    for (const part of deployLaunchpadSurfaceConfig.parts) {
      expect(getA2UIPart(part.type), part.type).toBeDefined();
    }
  });

  it("registers shared parts used by the deploy history table config", () => {
    for (const part of deployHistoryTableSurfaceConfig.parts) {
      expect(getA2UIPart(part.type), part.type).toBeDefined();
    }
  });

  it("defines every registered dynamic part in the shared part catalog", () => {
    const definitionTypes = new Set(listA2UIPartDefinitionTypes());
    for (const definition of listA2UIPartDefinitions()) {
      expect(getA2UIPart(definition.type), definition.type).toBeDefined();
    }
    for (const part of deployLaunchpadSurfaceConfig.parts) {
      expect(definitionTypes.has(part.type), part.type).toBe(true);
    }
    for (const part of deployHistoryTableSurfaceConfig.parts) {
      expect(definitionTypes.has(part.type), part.type).toBe(true);
    }
  });

  it("creates default deploy part props from the catalog manifest", () => {
    const part = createDefaultPart("DeployArtifactBlock", 3);

    expect(part.id).toBe("deploy-artifact-3");
    expect(part.props?.image).toEqual({ type: "binding", path: "payload.imageDetail" });
    expect(getA2UIPartDefinition("DeployArtifactBlock")?.previewPayload?.imageDetail).toBeDefined();
  });

  it("builds a single-part preview surface without importing the component directly", () => {
    const part = createDefaultPart("DeployRolloutProgressBlock", 1, "preview-rollout");
    const surfaceConfig = createPartPreviewSurfaceConfig(part, { title: "Rollout preview" });

    expect(surfaceConfig.kind).toBe("a2ui_card");
    expect(surfaceConfig.parts).toHaveLength(1);
    expect(surfaceConfig.parts[0].type).toBe("DeployRolloutProgressBlock");
  });

  it("derives render-required payload fields from part definitions", () => {
    expect(listRequiredPayloadFieldsForSurfaceConfig(deployLaunchpadSurfaceConfig)).toEqual(
      expect.arrayContaining(["service", "environment", "targetVersion", "strategy", "imageDetail", "requestDetail", "state"]),
    );
  });

  it("fails safely for unknown part type lookup", () => {
    expect(getA2UIPart("MissingPart")).toBeUndefined();
  });
});
