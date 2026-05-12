import type { A2UIPartDefinition } from "./part-definition-types";

const SHARED_PREVIEW_PAYLOAD = {
  summaryItems: [
    { label: "Service", value: "payments-api" },
    { label: "Environment", value: "production" },
  ],
  rows: [
    { name: "API", value: "healthy", status: "success" },
    { name: "Worker", value: "healthy", status: "success" },
  ],
  metrics: [
    { label: "Latency", value: "82ms" },
    { label: "Error rate", value: "0.03%" },
  ],
  checks: [
    { label: "Health check", status: "pass" },
    { label: "Capacity", status: "pass" },
  ],
  timelineEvents: [
    { title: "Image pushed", time: "2026-03-25 12:10 KST" },
    { title: "Preflight passed", time: "2026-03-25 12:13 KST" },
  ],
  actionItems: [
    { label: "Review request" },
    { label: "Start deploy" },
  ],
  message: "Preview message generated from the shared part catalog.",
};

export const SHARED_PART_DEFINITIONS: A2UIPartDefinition[] = [
  {
    type: "KeyValueSummary",
    label: "Key/value summary",
    category: "shared",
    description: "A compact two-column summary list.",
    defaultIdPrefix: "key-value-summary",
    defaultProps: {
      title: { type: "static", value: "Summary" },
      items: { type: "binding", path: "payload.summaryItems", fallback: [] },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Summary" },
      { kind: "bindingPath", prop: "items", label: "Items binding", defaultPath: "payload.summaryItems", fallback: [] },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "DataTableBlock",
    label: "Data table",
    category: "shared",
    description: "A configurable data table block.",
    defaultIdPrefix: "data-table",
    defaultProps: {
      title: { type: "static", value: "Rows" },
      rows: { type: "binding", path: "payload.rows", fallback: [] },
      emptyMessage: { type: "binding", path: "payload.emptyMessage", fallback: "No rows configured" },
      columns: {
        type: "static",
        value: [
          { key: "name", label: "Name" },
          { key: "value", label: "Value" },
          { key: "status", label: "Status", format: "status" },
        ],
      },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Rows" },
      { kind: "bindingPath", prop: "rows", label: "Rows binding", defaultPath: "payload.rows", fallback: [] },
      { kind: "bindingPath", prop: "emptyMessage", label: "Empty message binding", defaultPath: "payload.emptyMessage", fallback: "No rows configured" },
      {
        kind: "staticJson",
        prop: "columns",
        label: "Columns JSON",
        rows: 5,
        defaultValue: [
          { key: "name", label: "Name" },
          { key: "value", label: "Value" },
          { key: "status", label: "Status", format: "status" },
        ],
      },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "MetricGridBlock",
    label: "Metric grid",
    category: "shared",
    description: "A small metric grid for numeric/status highlights.",
    defaultIdPrefix: "metric-grid",
    defaultProps: {
      title: { type: "static", value: "Metrics" },
      metrics: { type: "binding", path: "payload.metrics", fallback: [] },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Metrics" },
      { kind: "bindingPath", prop: "metrics", label: "Metrics binding", defaultPath: "payload.metrics", fallback: [] },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "StepProgressBlock",
    label: "Step progress",
    category: "shared",
    description: "Generic ordered progress steps.",
    defaultIdPrefix: "step-progress",
    defaultProps: {
      title: { type: "static", value: "Progress" },
      steps: { type: "static", value: ["Resolve context", "Preview surface", "Save config"] },
      currentStep: { type: "static", value: 1 },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Progress" },
      { kind: "staticStringList", prop: "steps", label: "Steps", defaultValue: ["Resolve context", "Preview surface", "Save config"] },
      { kind: "staticJson", prop: "currentStep", label: "Current step JSON", defaultValue: 1 },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "ChecklistBlock",
    label: "Checklist",
    category: "shared",
    description: "Generic checklist with status badges.",
    defaultIdPrefix: "checklist",
    defaultProps: {
      title: { type: "static", value: "Checklist" },
      checks: { type: "binding", path: "payload.checks", fallback: [] },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Checklist" },
      { kind: "bindingPath", prop: "checks", label: "Checks binding", defaultPath: "payload.checks", fallback: [] },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "AlertBlock",
    label: "Alert",
    category: "shared",
    description: "Short notice with a tone badge.",
    defaultIdPrefix: "alert",
    defaultProps: {
      title: { type: "static", value: "Notice" },
      message: { type: "binding", path: "payload.message" },
      tone: { type: "static", value: "info" },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Notice" },
      { kind: "bindingPath", prop: "message", label: "Message binding", defaultPath: "payload.message" },
      {
        kind: "select",
        prop: "tone",
        label: "Tone",
        defaultValue: "info",
        options: [
          { label: "Info", value: "info" },
          { label: "Success", value: "success" },
          { label: "Warning", value: "warning" },
          { label: "Danger", value: "danger" },
        ],
      },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "TimelineBlock",
    label: "Timeline",
    category: "shared",
    description: "Vertical timeline of events.",
    defaultIdPrefix: "timeline",
    defaultProps: {
      title: { type: "static", value: "Timeline" },
      events: { type: "binding", path: "payload.timelineEvents", fallback: [] },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Timeline" },
      { kind: "bindingPath", prop: "events", label: "Events binding", defaultPath: "payload.timelineEvents", fallback: [] },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
  {
    type: "ActionListBlock",
    label: "Action list",
    category: "shared",
    description: "A simple list of next actions.",
    defaultIdPrefix: "action-list",
    defaultProps: {
      title: { type: "static", value: "Actions" },
      actions: { type: "binding", path: "payload.actionItems", fallback: [] },
    },
    editorFields: [
      { kind: "staticText", prop: "title", label: "Title", defaultValue: "Actions" },
      { kind: "bindingPath", prop: "actions", label: "Actions binding", defaultPath: "payload.actionItems", fallback: [] },
    ],
    previewPayload: SHARED_PREVIEW_PAYLOAD,
  },
];
