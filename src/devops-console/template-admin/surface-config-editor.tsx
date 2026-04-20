"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SurfaceRenderer, type A2UIPartConfig, type SurfaceConfig, type SurfaceConfigValue } from "@a2ui/ui";
import styles from "@/devops-console/console-page.module.css";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";

type SurfaceConfigEditorProps = {
  definition: TemplateRegistryDefinition;
  payloadJson: string;
  onApplyToEditor: (surfaceConfig: SurfaceConfig) => void;
};

const DEPLOY_PART_TYPES = [
  "DeployTargetSummaryBlock",
  "DeployArtifactBlock",
  "DeployRequestConfigBlock",
  "DeployPreflightChecklistBlock",
  "DeployRolloutProgressBlock",
  "DeploymentHistoryBlock",
];

const DEPLOY_ROLLOUT_STEPS = ["이미지 Pull", "컨테이너 생성", "헬스체크 실행", "트래픽 전환", "최종 검증"];
const ADMIN_API_BASE = process.env.NEXT_PUBLIC_A2UI_ADMIN_URL ?? "http://localhost:3100";

type StoredTemplateDraft = Record<string, unknown> & {
  surfaceConfig?: SurfaceConfig;
};

function cloneDeployConfig(): SurfaceConfig {
  return structuredClone(deployLaunchpadSurfaceConfig) as unknown as SurfaceConfig;
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function bindingPath(value: unknown): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return typeof record.path === "string" ? record.path : "";
  }
  return "";
}

function isSurfaceConfig(value: unknown): value is SurfaceConfig {
  return !!value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).kind === "a2ui_card";
}

function catalogTemplateId(templateId: string): string {
  return templateId === "quick_deploy_launchpad" ? "deploy_launchpad" : templateId;
}

function binding(path: string, fallback?: unknown): SurfaceConfigValue {
  return fallback === undefined
    ? { type: "binding", path }
    : { type: "binding", path, fallback };
}

function defaultPropsForPart(type: string): Record<string, SurfaceConfigValue> {
  switch (type) {
    case "DeployTargetSummaryBlock":
      return {
        service: binding("payload.service"),
        environment: binding("payload.environment"),
        targetVersion: binding("payload.targetVersion"),
        recommendedVersion: binding("payload.recommendedVersion"),
        strategy: binding("payload.strategy"),
        impactSummary: binding("payload.impactSummary"),
      };
    case "DeployArtifactBlock":
      return { image: binding("payload.imageDetail") };
    case "DeployRequestConfigBlock":
      return { request: binding("payload.requestDetail") };
    case "DeployPreflightChecklistBlock":
      return { checks: binding("payload.preflightChecks", []) };
    case "DeployRolloutProgressBlock":
      return {
        state: binding("payload.state"),
        steps: { type: "static", value: DEPLOY_ROLLOUT_STEPS },
      };
    case "DeploymentHistoryBlock":
      return { rows: binding("payload.deploymentHistory", []) };
    default:
      return {};
  }
}

function partIdForType(type: string, index: number): string {
  const base = type
    .replace(/Block$/, "")
    .replace(/[A-Z]/g, (char, charIndex) => `${charIndex ? "-" : ""}${char.toLowerCase()}`);
  return `${base}-${index}`;
}

function staticStepsValue(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEPLOY_ROLLOUT_STEPS.join("\n");
  const record = value as Record<string, unknown>;
  return Array.isArray(record.value)
    ? record.value.map((item) => String(item)).join("\n")
    : DEPLOY_ROLLOUT_STEPS.join("\n");
}

export function SurfaceConfigEditor({ definition, payloadJson, onApplyToEditor }: SurfaceConfigEditorProps) {
  const [surfaceConfig, setSurfaceConfig] = useState<SurfaceConfig>(() => cloneDeployConfig());
  const [newPartType, setNewPartType] = useState(DEPLOY_PART_TYPES[0]);
  const [storedTemplate, setStoredTemplate] = useState<StoredTemplateDraft | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const payload = useMemo(() => parsePayload(payloadJson), [payloadJson]);

  const isDeployTemplate = definition.templateId === "quick_deploy_launchpad" || definition.templateId === "deploy_launchpad";
  const targetCatalogTemplateId = catalogTemplateId(definition.templateId);

  useEffect(() => {
    if (!isDeployTemplate) return;

    let cancelled = false;
    setSaveStatus("loading");
    setSaveMessage("");
    setStoredTemplate(null);
    setSurfaceConfig(cloneDeployConfig());

    async function loadStoredSurfaceConfig() {
      try {
        const response = await fetch(`${ADMIN_API_BASE}/admin/templates/${targetCatalogTemplateId}`);
        if (!response.ok) throw new Error(`Admin returned ${response.status}`);
        const data = await response.json() as StoredTemplateDraft;
        if (cancelled) return;
        setStoredTemplate(data);
        setSurfaceConfig(isSurfaceConfig(data.surfaceConfig) ? structuredClone(data.surfaceConfig) : cloneDeployConfig());
        setSaveStatus("idle");
      } catch (error) {
        if (cancelled) return;
        setSaveStatus("error");
        setSaveMessage(error instanceof Error ? error.message : "Failed to load stored template");
      }
    }

    void loadStoredSurfaceConfig();
    return () => {
      cancelled = true;
    };
  }, [isDeployTemplate, targetCatalogTemplateId]);

  function updateCardBinding(field: "subtitle" | "description" | "tone", path: string) {
    setSurfaceConfig((current) => ({
      ...current,
      card: {
        ...current.card,
        [field]: { type: "binding", path },
      },
    }));
  }

  function updateTitle(value: string) {
    setSurfaceConfig((current) => ({
      ...current,
      card: {
        ...current.card,
        title: { type: "static", value },
      },
    }));
  }

  function movePart(index: number, direction: -1 | 1) {
    setSurfaceConfig((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.parts.length) return current;
      const parts = [...current.parts];
      const [part] = parts.splice(index, 1);
      parts.splice(nextIndex, 0, part);
      return { ...current, parts };
    });
  }

  function removePart(index: number) {
    setSurfaceConfig((current) => ({
      ...current,
      parts: current.parts.filter((_, candidateIndex) => candidateIndex !== index),
    }));
  }

  function addPart() {
    setSurfaceConfig((current) => ({
      ...current,
      parts: [
        ...current.parts,
        {
          id: partIdForType(newPartType, current.parts.length + 1),
          type: newPartType,
          props: defaultPropsForPart(newPartType),
        },
      ],
    }));
  }

  function updatePartProp(index: number, propKey: string, value: SurfaceConfigValue) {
    setSurfaceConfig((current) => ({
      ...current,
      parts: current.parts.map((part, candidateIndex) => candidateIndex === index
        ? {
            ...part,
            props: {
              ...(part.props ?? {}),
              [propKey]: value,
            },
          }
        : part),
    }));
  }

  async function saveSurfaceConfig() {
    if (!storedTemplate) {
      setSaveStatus("error");
      setSaveMessage("Stored Admin template is not loaded.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("");
    try {
      const body = { ...storedTemplate, surfaceConfig };
      const response = await fetch(`${ADMIN_API_BASE}/admin/templates/${targetCatalogTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json() as { details?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(data.details?.join(", ") ?? data.error ?? "Save failed");
      }
      setStoredTemplate(body);
      onApplyToEditor(surfaceConfig);
      setSaveStatus("success");
      setSaveMessage("Surface config saved to Admin catalog.");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(error instanceof Error ? error.message : "Save failed");
    }
  }

  if (!isDeployTemplate) {
    return (
      <div className={styles.templateDetailEmpty}>
        Surface editor is currently enabled for deploy templates first.
      </div>
    );
  }

  return (
    <div className={styles.templatePreviewSplit}>
      <div>
        <div className={styles.sectionEyebrow}>Card Shell</div>
        {saveStatus === "loading" ? (
          <div style={{ color: "var(--console-text-secondary)", fontSize: 13, marginBottom: 12 }}>
            Loading stored Admin surface config...
          </div>
        ) : null}
        <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Title</span>
            <input
              className={styles.textInput}
              onChange={(event) => updateTitle(event.target.value)}
              value={String(surfaceConfig.card?.title?.type === "static" ? surfaceConfig.card.title.value : "")}
            />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Subtitle binding</span>
            <input
              className={styles.textInput}
              onChange={(event) => updateCardBinding("subtitle", event.target.value)}
              value={bindingPath(surfaceConfig.card?.subtitle)}
            />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Description binding</span>
            <input
              className={styles.textInput}
              onChange={(event) => updateCardBinding("description", event.target.value)}
              value={bindingPath(surfaceConfig.card?.description)}
            />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Tone binding</span>
            <input
              className={styles.textInput}
              onChange={(event) => updateCardBinding("tone", event.target.value)}
              value={bindingPath(surfaceConfig.card?.tone)}
            />
          </label>
        </div>

        <div className={styles.sectionEyebrow}>Parts</div>
        <div style={{ display: "grid", gap: 8 }}>
          {surfaceConfig.parts.map((part, index) => (
            <div key={part.id} style={{ background: "rgba(13,21,32,.72)", border: "1px solid rgba(37,50,68,.76)", borderRadius: 8, padding: 10 }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 8,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: "var(--console-text)", fontSize: 13, fontWeight: 800 }}>{part.type}</div>
                  <div style={{ color: "var(--console-text-secondary)", fontSize: 11 }}>{part.id}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={styles.iconButton} disabled={index === 0} onClick={() => movePart(index, -1)} type="button">↑</button>
                  <button className={styles.iconButton} disabled={index === surfaceConfig.parts.length - 1} onClick={() => movePart(index, 1)} type="button">↓</button>
                  <button className={styles.iconButton} onClick={() => removePart(index)} type="button">×</button>
                </div>
              </div>
              <PartPropsEditor
                index={index}
                onUpdate={updatePartProp}
                part={part}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <select className={styles.textInput} onChange={(event) => setNewPartType(event.target.value)} value={newPartType}>
            {DEPLOY_PART_TYPES.map((partType) => (
              <option key={partType} value={partType}>{partType}</option>
            ))}
          </select>
          <button className={styles.secondaryButton} onClick={addPart} type="button">+ Add part</button>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className={styles.primaryButton}
            disabled={saveStatus === "loading" || saveStatus === "saving"}
            onClick={saveSurfaceConfig}
            type="button"
          >
            {saveStatus === "saving" ? "Saving..." : "Save surface"}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => onApplyToEditor(surfaceConfig)}
            type="button"
          >
            Apply to editor JSON
          </button>
          {saveStatus === "success" ? (
            <span style={{ color: "var(--console-success)", fontSize: 13 }}>{saveMessage}</span>
          ) : null}
          {saveStatus === "error" && saveMessage ? (
            <span style={{ color: "var(--console-danger)", fontSize: 13 }}>{saveMessage}</span>
          ) : null}
        </div>

        <details style={{ marginTop: 18 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>Generated Surface JSON</summary>
          <pre className={styles.payloadEditor} style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(surfaceConfig, null, 2)}
          </pre>
        </details>
      </div>

      <div>
        <div className={styles.sectionEyebrow}>Dynamic Preview</div>
        <SurfaceRenderer
          envelope={{
            templateId: definition.templateId,
            version: definition.version,
            payload,
            actions: (payload.actions as never[]) ?? [],
            surfaceConfig,
            sourceIntent: "admin.surface.preview",
            updatedAt: new Date().toISOString(),
          }}
          onAction={() => {}}
        />
      </div>
    </div>
  );
}

function BindingInput({
  label,
  path,
  onChange,
}: {
  label: string;
  path: string;
  onChange: (path: string) => void;
}) {
  return (
    <label className={styles.fieldCard}>
      <span className={styles.metaLabel}>{label}</span>
      <input
        className={styles.textInput}
        onChange={(event) => onChange(event.target.value)}
        value={path}
      />
    </label>
  );
}

function PartPropsEditor({
  index,
  part,
  onUpdate,
}: {
  index: number;
  part: A2UIPartConfig;
  onUpdate: (index: number, propKey: string, value: SurfaceConfigValue) => void;
}) {
  const props = part.props ?? {};
  const bindingInput = (propKey: string, label: string, fallback?: unknown) => (
    <BindingInput
      key={propKey}
      label={label}
      onChange={(path) => onUpdate(index, propKey, binding(path, fallback))}
      path={bindingPath(props[propKey])}
    />
  );

  let fields: ReactNode = null;
  switch (part.type) {
    case "DeployTargetSummaryBlock":
      fields = [
        bindingInput("service", "Service binding"),
        bindingInput("environment", "Environment binding"),
        bindingInput("targetVersion", "Target version binding"),
        bindingInput("recommendedVersion", "Recommended version binding"),
        bindingInput("strategy", "Strategy binding"),
        bindingInput("impactSummary", "Impact summary binding"),
      ];
      break;
    case "DeployArtifactBlock":
      fields = bindingInput("image", "Image detail binding");
      break;
    case "DeployRequestConfigBlock":
      fields = bindingInput("request", "Request detail binding");
      break;
    case "DeployPreflightChecklistBlock":
      fields = bindingInput("checks", "Checks binding", []);
      break;
    case "DeploymentHistoryBlock":
      fields = bindingInput("rows", "History rows binding", []);
      break;
    case "DeployRolloutProgressBlock":
      fields = (
        <>
          {bindingInput("state", "State binding")}
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Static steps</span>
            <textarea
              className={styles.textInput}
              onChange={(event) => {
                onUpdate(index, "steps", {
                  type: "static",
                  value: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                });
              }}
              rows={4}
              value={staticStepsValue(props.steps)}
            />
          </label>
        </>
      );
      break;
  }

  if (!fields) return null;

  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 10 }}>
      {fields}
    </div>
  );
}
