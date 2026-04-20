import type { SurfaceConfig } from "@a2ui/ui";

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
    {
      id: "deploy-target",
      type: "DeployTargetSummaryBlock",
      props: {
        service: { type: "binding", path: "payload.service" },
        environment: { type: "binding", path: "payload.environment" },
        targetVersion: { type: "binding", path: "payload.targetVersion" },
        recommendedVersion: { type: "binding", path: "payload.recommendedVersion" },
        strategy: { type: "binding", path: "payload.strategy" },
        impactSummary: { type: "binding", path: "payload.impactSummary" },
      },
    },
    {
      id: "deploy-artifact",
      type: "DeployArtifactBlock",
      props: {
        image: { type: "binding", path: "payload.imageDetail" },
      },
    },
    {
      id: "deploy-request",
      type: "DeployRequestConfigBlock",
      props: {
        request: { type: "binding", path: "payload.requestDetail" },
      },
    },
    {
      id: "deploy-preflight",
      type: "DeployPreflightChecklistBlock",
      props: {
        checks: { type: "binding", path: "payload.preflightChecks", fallback: [] },
      },
    },
    {
      id: "deploy-rollout",
      type: "DeployRolloutProgressBlock",
      props: {
        state: { type: "binding", path: "payload.state" },
        steps: {
          type: "static",
          value: ["이미지 Pull", "컨테이너 생성", "헬스체크 실행", "트래픽 전환", "최종 검증"],
        },
      },
    },
    {
      id: "deploy-history",
      type: "DeploymentHistoryBlock",
      props: {
        rows: { type: "binding", path: "payload.deploymentHistory", fallback: [] },
      },
    },
  ],
} satisfies SurfaceConfig;

