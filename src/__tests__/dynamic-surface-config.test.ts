import { describe, expect, it } from "vitest";
import { getA2UIPart } from "@a2ui/ui";
import { resolveConfigValue } from "@a2ui/ui/dynamic/binding";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";

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

  it("fails safely for unknown part type lookup", () => {
    expect(getA2UIPart("MissingPart")).toBeUndefined();
  });
});

