import type { SurfaceConfig } from "@a2ui/ui";

export const deployHistoryTableSurfaceConfig = {
  kind: "a2ui_card",
  version: 1,
  card: {
    title: { type: "binding", path: "payload.title" },
    subtitle: { type: "binding", path: "payload.summary" },
    description: { type: "static", value: "최근 배포 이력을 조회했습니다." },
    tone: { type: "static", value: "info" },
    footerNote: { type: "static", value: "Generated from deploy history lookup" },
  },
  parts: [
    {
      id: "deploy-history-summary",
      type: "KeyValueSummary",
      props: {
        title: { type: "static", value: "Summary" },
        items: { type: "binding", path: "payload.summaryItems", fallback: [] },
      },
    },
    {
      id: "deploy-history-table",
      type: "DataTableBlock",
      props: {
        title: { type: "static", value: "Recent deployments" },
        rows: { type: "binding", path: "payload.rows", fallback: [] },
        columns: { type: "binding", path: "payload.columns", fallback: [] },
        emptyMessage: { type: "binding", path: "payload.emptyMessage", fallback: "No deployment history available" },
      },
    },
  ],
} satisfies SurfaceConfig;
