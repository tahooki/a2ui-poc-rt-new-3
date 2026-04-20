import { createDefaultPart, type SurfaceConfig } from "@a2ui/ui";

export const deployLaunchpadSurfaceConfig = {
  kind: "a2ui_card",
  version: 1,
  card: {
    title: { type: "static", value: "Deploy Launchpad" },
    subtitle: { type: "binding", path: "payload.service" },
    description: { type: "binding", path: "payload.impactSummary" },
    tone: { type: "binding", path: "payload.state" },
    footerNote: { type: "static", value: "Generated from Admin surface config" },
    actions: { source: "templateActions" },
  },
  parts: [
    createDefaultPart("DeployTargetSummaryBlock", 1, "deploy-target"),
    createDefaultPart("DeployArtifactBlock", 1, "deploy-artifact"),
    createDefaultPart("DeployRequestConfigBlock", 1, "deploy-request"),
    createDefaultPart("DeployPreflightChecklistBlock", 1, "deploy-preflight"),
    createDefaultPart("DeployRolloutProgressBlock", 1, "deploy-rollout"),
    createDefaultPart("DeploymentHistoryBlock", 1, "deploy-history"),
  ],
} satisfies SurfaceConfig;
