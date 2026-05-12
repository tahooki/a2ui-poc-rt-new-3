import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  A2UISurfaceHost,
  A2UIMessageSurface,
  canRenderA2UISurface,
  createA2UIChatSurfacePart,
  normalizeA2UISurface,
  reduceA2UISurfaceStatus,
  shouldAutoClearA2UISurfaceStatus,
} from "@a2ui/chat";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";
import { deployHistoryTableSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-history-table";

const surface = {
  templateId: "quick_deploy_launchpad",
  payload: {
    templateId: "quick_deploy_launchpad",
    state: "ready",
    service: "payments-api",
    environment: "production",
    recommendedVersion: "v2.3.18-rc1",
    targetVersion: "v2.3.18-rc1",
    strategy: "rolling",
    impactSummary: "payments-api production 환경에 v2.3.18-rc1 배포",
    imageDetail: {
      repository: "payments-api",
      imageTag: "v2.3.18-rc1",
    },
    requestDetail: {
      deploymentStrategy: "rolling",
    },
    preflightChecks: [],
    deploymentHistory: [],
  },
  actions: [{ actionId: "deploy.start", label: "배포 시작", variant: "primary" }],
  surfaceConfig: deployLaunchpadSurfaceConfig,
  sourceIntent: "deploy.start",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

describe("A2UI chatbot surface host", () => {
  it("normalizes app surfaces into the public SurfaceEnvelope shape", () => {
    const normalized = normalizeA2UISurface(surface);

    expect(normalized?.version).toBe("1.0.0");
    expect(normalized?.surfaceConfig?.kind).toBe("a2ui_card");
    expect(canRenderA2UISurface(surface)).toBe(true);
    expect(canRenderA2UISurface({ payload: {} })).toBe(false);
  });

  it("renders a dynamic surface through the shared SurfaceRenderer", () => {
    const html = renderToStaticMarkup(
      <A2UISurfaceHost
        readOnly
        renderStatus={() => null}
        surface={surface}
      />,
    );

    expect(html).toContain("Deploy Launchpad");
    expect(html).toContain("payments-api");
    expect(html).toContain("Image registration inputs");
  });

  it("renders a deploy history table surface through the shared SurfaceRenderer", () => {
    const html = renderToStaticMarkup(
      <A2UISurfaceHost
        readOnly
        renderStatus={() => null}
        surface={{
          templateId: "deploy_history_table",
          payload: {
            templateId: "deploy_history_table",
            state: "ready",
            title: "Deployment history",
            summary: "3 deployments",
            summaryItems: [{ label: "Deployments", value: "3" }],
            rows: [
              {
                service: "payments-api",
                environment: "production",
                version: "v2.3.18",
                status: "success",
                deployedBy: "김배포",
                deployedAt: "2026-03-30 00:15 KST",
              },
            ],
            columns: [
              { key: "service", label: "Service" },
              { key: "version", label: "Version" },
              { key: "status", label: "Status", format: "status" },
              { key: "deployedAt", label: "Deployed at" },
            ],
            emptyMessage: "배포 이력이 없습니다.",
          },
          actions: [],
          surfaceConfig: deployHistoryTableSurfaceConfig,
          sourceIntent: "deploy.history.lookup",
          updatedAt: "2026-05-12T00:00:00.000Z",
        }}
      />,
    );

    expect(html).toContain("Deployment history");
    expect(html).toContain("Recent deployments");
    expect(html).toContain("payments-api");
    expect(html).toContain("v2.3.18");
    expect(html).toContain("success");
  });

  it("disables rendered action buttons in read-only mode", () => {
    const html = renderToStaticMarkup(
      <A2UISurfaceHost
        readOnly
        renderStatus={() => null}
        surface={{
          ...surface,
          actions: [
            {
              actionId: "deploy.start",
              confirm: { message: "Run deploy?" },
              label: "배포 시작",
              variant: "primary",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("배포 시작");
    expect(html).toContain("disabled=");
  });

  it("renders an inline chatbot surface part", () => {
    const html = renderToStaticMarkup(
      <A2UIMessageSurface
        part={createA2UIChatSurfacePart(surface, "surface-1")}
        readOnly
        renderStatus={() => null}
      />,
    );

    expect(html).toContain("Deploy Launchpad");
  });

  it("models action pending, done, error, and done auto-clear state", () => {
    const running = reduceA2UISurfaceStatus({ phase: "idle" }, {
      type: "start",
      actionId: "deploy.start",
    });
    const done = reduceA2UISurfaceStatus(running, {
      type: "done",
      actionId: "deploy.start",
      message: "배포가 시작되었습니다.",
    });
    const cleared = reduceA2UISurfaceStatus(done, {
      type: "clear",
      actionId: "deploy.start",
    });
    const error = reduceA2UISurfaceStatus({ phase: "idle" }, {
      type: "error",
      actionId: "deploy.start",
      error: "failed",
    });

    expect(running.phase).toBe("running");
    expect(done.phase).toBe("done");
    expect(shouldAutoClearA2UISurfaceStatus(done)).toBe(true);
    expect(cleared.phase).toBe("idle");
    expect(error.phase).toBe("error");
  });
});
