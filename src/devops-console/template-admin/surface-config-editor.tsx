"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDefaultPart,
  createPartPreviewSurfaceConfig,
  getA2UIPartDefinition,
  listA2UIPartDefinitions,
  type A2UIPartConfig,
  type A2UIPartDefinition,
  type A2UIPartEditorField,
  type DynamicA2UIEnvelope,
  type SurfaceAction,
  type SurfaceConfig,
  type SurfaceConfigValue,
  type SurfaceEnvelope,
} from "@a2ui/ui";
import { A2UISurfaceHost } from "@a2ui/chat";
import styles from "@/devops-console/console-page.module.css";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";

type SurfaceConfigEditorProps = {
  definition: TemplateRegistryDefinition;
  payloadJson: string;
  onApplyToEditor: (surfaceConfig: SurfaceConfig) => void;
};

type StoredTemplateDraft = Record<string, unknown> & {
  surfaceConfig?: SurfaceConfig;
};

type PreviewPayloadMode = "sample" | "resolved";
type PreviewConfigMode = "draft" | "saved";
type PreviewStatus = "idle" | "loading" | "success" | "error";

type SimulateResponse = {
  envelope?: DynamicA2UIEnvelope;
  validation?: {
    valid?: boolean;
    errors?: string[];
  };
  error?: string;
};

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_A2UI_ADMIN_URL ?? "http://localhost:3100";
const AVAILABLE_PART_DEFINITIONS = listA2UIPartDefinitions({ categories: ["deploy", "shared"] });
const DEFAULT_NEW_PART_TYPE = AVAILABLE_PART_DEFINITIONS[0]?.type ?? "DeployTargetSummaryBlock";

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

function staticRawValue(value: unknown, fallback: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (record.type === "static" && "value" in record) return record.value;
  }
  return value ?? fallback;
}

function staticTextValue(value: unknown, fallback = ""): string {
  const raw = staticRawValue(value, fallback);
  return raw === undefined || raw === null ? "" : String(raw);
}

function staticStringListValue(value: unknown, fallback: string[]): string {
  const raw = staticRawValue(value, fallback);
  return Array.isArray(raw)
    ? raw.map((item) => String(item)).join("\n")
    : fallback.join("\n");
}

function staticJsonText(value: unknown, fallback: SurfaceConfigValue): string {
  return JSON.stringify(staticRawValue(value, fallback), null, 2);
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

function staticValue(value: unknown): SurfaceConfigValue {
  return { type: "static", value } as SurfaceConfigValue;
}

function partDefinition(type: string): A2UIPartDefinition | undefined {
  return AVAILABLE_PART_DEFINITIONS.find((definition) => definition.type === type) ?? getA2UIPartDefinition(type);
}

function mergePreviewPayload(
  payload: Record<string, unknown>,
  parts: A2UIPartConfig[],
): Record<string, unknown> {
  const previewPayload = parts.reduce<Record<string, unknown>>((acc, part) => ({
    ...acc,
    ...(partDefinition(part.type)?.previewPayload ?? {}),
  }), {});
  return { ...previewPayload, ...payload };
}

function payloadActions(payload: Record<string, unknown>): SurfaceAction[] {
  return Array.isArray(payload.actions) ? payload.actions as SurfaceAction[] : [];
}

function simulationFactsFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const service = payload.serviceName ?? payload.service;
  return {
    ...payload,
    ...(typeof service === "string" && service ? { serviceName: service } : {}),
    ...(typeof payload.environment === "string" ? { environment: payload.environment } : {}),
    ...(typeof payload.targetVersion === "string" ? { targetVersion: payload.targetVersion } : {}),
  };
}

function activeButtonStyle(active: boolean) {
  return active
    ? { borderColor: "rgba(91,141,238,.75)", color: "#e4e8ef" }
    : undefined;
}

export function SurfaceConfigEditor({ definition, payloadJson, onApplyToEditor }: SurfaceConfigEditorProps) {
  const [surfaceConfig, setSurfaceConfig] = useState<SurfaceConfig>(() => cloneDeployConfig());
  const [newPartType, setNewPartType] = useState(DEFAULT_NEW_PART_TYPE);
  const [storedTemplate, setStoredTemplate] = useState<StoredTemplateDraft | null>(null);
  const [saveStatus, setSaveStatus] = useState<PreviewStatus | "saving">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [openPartPreviewIds, setOpenPartPreviewIds] = useState<string[]>([]);
  const [previewPayloadMode, setPreviewPayloadMode] = useState<PreviewPayloadMode>("sample");
  const [previewConfigMode, setPreviewConfigMode] = useState<PreviewConfigMode>("draft");
  const [resolvedEnvelope, setResolvedEnvelope] = useState<DynamicA2UIEnvelope | null>(null);
  const [resolvedStatus, setResolvedStatus] = useState<PreviewStatus>("idle");
  const [resolvedMessage, setResolvedMessage] = useState("");

  const payload = useMemo(() => parsePayload(payloadJson), [payloadJson]);
  const samplePayload = useMemo(() => mergePreviewPayload(payload, surfaceConfig.parts), [payload, surfaceConfig.parts]);

  const isDeployTemplate = definition.templateId === "quick_deploy_launchpad" || definition.templateId === "deploy_launchpad";
  const targetCatalogTemplateId = catalogTemplateId(definition.templateId);
  const savedSurfaceConfig = isSurfaceConfig(storedTemplate?.surfaceConfig) ? storedTemplate.surfaceConfig : surfaceConfig;
  const previewSurfaceConfig = previewConfigMode === "saved" ? savedSurfaceConfig : surfaceConfig;

  const sampleEnvelope = useMemo<DynamicA2UIEnvelope>(() => ({
    templateId: definition.templateId,
    version: definition.version,
    payload: samplePayload,
    actions: payloadActions(samplePayload),
    surfaceConfig: previewSurfaceConfig,
    sourceIntent: "admin.surface.preview",
    updatedAt: new Date().toISOString(),
  }), [definition.templateId, definition.version, previewSurfaceConfig, samplePayload]);

  const fullPreviewEnvelope = previewPayloadMode === "resolved" && resolvedEnvelope
    ? {
        ...resolvedEnvelope,
        surfaceConfig: previewSurfaceConfig,
      }
    : sampleEnvelope;

  useEffect(() => {
    if (!isDeployTemplate) return;

    let cancelled = false;
    setSaveStatus("loading");
    setSaveMessage("");
    setStoredTemplate(null);
    setSurfaceConfig(cloneDeployConfig());
    setResolvedEnvelope(null);
    setResolvedStatus("idle");
    setResolvedMessage("");

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

  const runResolvedPreview = useCallback(async () => {
    const facts = simulationFactsFromPayload(payload);
    if (typeof facts.serviceName !== "string" || !facts.serviceName) {
      setResolvedStatus("error");
      setResolvedMessage("Resolved preview needs payload.service or payload.serviceName.");
      return;
    }

    setResolvedStatus("loading");
    setResolvedMessage("");
    try {
      const response = await fetch(`${ADMIN_API_BASE}/admin/templates/${targetCatalogTemplateId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentKey: definition.selectionPolicyDoc.intentKeys[0] ?? "deploy.start",
          facts,
        }),
      });
      const data = await response.json() as SimulateResponse;
      if (!response.ok) throw new Error(data.error ?? `Admin returned ${response.status}`);
      if (data.error) throw new Error(data.error);
      if (!data.envelope) throw new Error("Admin simulate did not return an envelope.");
      setResolvedEnvelope(data.envelope);
      setResolvedStatus("success");
      setResolvedMessage(data.validation?.valid === false
        ? `Resolved with validation errors: ${data.validation.errors?.join(", ") ?? "unknown"}`
        : "Resolved preview loaded from Admin simulate.");
    } catch (error) {
      setResolvedEnvelope(null);
      setResolvedStatus("error");
      setResolvedMessage(error instanceof Error ? error.message : "Resolved preview failed");
    }
  }, [definition.selectionPolicyDoc.intentKeys, payload, targetCatalogTemplateId]);

  useEffect(() => {
    if (previewPayloadMode === "resolved" && !resolvedEnvelope && resolvedStatus === "idle") {
      void runResolvedPreview();
    }
  }, [previewPayloadMode, resolvedEnvelope, resolvedStatus, runResolvedPreview]);

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
        createDefaultPart(newPartType, current.parts.length + 1),
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
    setResolvedEnvelope(null);
    setResolvedStatus("idle");
  }

  function togglePartPreview(partId: string) {
    setOpenPartPreviewIds((current) => current.includes(partId)
      ? current.filter((id) => id !== partId)
      : [...current, partId]);
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
          {surfaceConfig.parts.map((part, index) => {
            const definitionForPart = partDefinition(part.type);
            const previewOpen = openPartPreviewIds.includes(part.id);
            const partPreviewPayload = mergePreviewPayload(payload, [part]);
            const partPreviewSurfaceConfig = createPartPreviewSurfaceConfig(part, {
              title: definitionForPart?.label ?? part.type,
              subtitle: definitionForPart?.description,
            });

            return (
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
                    <div style={{ color: "var(--console-text)", fontSize: 13, fontWeight: 800 }}>
                      {definitionForPart?.label ?? part.type}
                    </div>
                    <div style={{ color: "var(--console-text-secondary)", fontSize: 11 }}>
                      {part.type} · {part.id}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button className={styles.secondaryButton} onClick={() => togglePartPreview(part.id)} type="button">
                      {previewOpen ? "Hide preview" : "Preview"}
                    </button>
                    <button className={styles.iconButton} disabled={index === 0} onClick={() => movePart(index, -1)} type="button">↑</button>
                    <button className={styles.iconButton} disabled={index === surfaceConfig.parts.length - 1} onClick={() => movePart(index, 1)} type="button">↓</button>
                    <button className={styles.iconButton} onClick={() => removePart(index)} type="button">×</button>
                  </div>
                </div>
                <PartPropsEditor
                  definition={definitionForPart}
                  index={index}
                  onUpdate={updatePartProp}
                  part={part}
                />
                {previewOpen ? (
                  <div style={{ marginTop: 12 }}>
                    <A2UISurfaceHost
                      readOnly
                      renderStatus={() => null}
                      surface={{
                        templateId: "admin_part_preview",
                        version: definition.version,
                        payload: partPreviewPayload,
                        actions: [],
                        surfaceConfig: partPreviewSurfaceConfig,
                        sourceIntent: "admin.part.preview",
                        updatedAt: new Date().toISOString(),
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <select className={styles.textInput} onChange={(event) => setNewPartType(event.target.value)} value={newPartType}>
            {AVAILABLE_PART_DEFINITIONS.map((partType) => (
              <option key={partType.type} value={partType.type}>
                [{partType.category}] {partType.label}
              </option>
            ))}
          </select>
          <button className={styles.secondaryButton} onClick={addPart} type="button">+ Add part</button>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
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
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className={styles.chatAwaitingChip}
              onClick={() => setPreviewPayloadMode("sample")}
              style={activeButtonStyle(previewPayloadMode === "sample")}
              type="button"
            >
              Sample payload
            </button>
            <button
              className={styles.chatAwaitingChip}
              onClick={() => setPreviewPayloadMode("resolved")}
              style={activeButtonStyle(previewPayloadMode === "resolved")}
              type="button"
            >
              Resolved payload
            </button>
            <button
              className={styles.chatAwaitingChip}
              onClick={() => setPreviewConfigMode("draft")}
              style={activeButtonStyle(previewConfigMode === "draft")}
              type="button"
            >
              Draft config
            </button>
            <button
              className={styles.chatAwaitingChip}
              onClick={() => setPreviewConfigMode("saved")}
              style={activeButtonStyle(previewConfigMode === "saved")}
              type="button"
            >
              Saved config
            </button>
          </div>
          {previewPayloadMode === "resolved" ? (
            <div style={{ alignItems: "center", display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className={styles.secondaryButton} disabled={resolvedStatus === "loading"} onClick={runResolvedPreview} type="button">
                {resolvedStatus === "loading" ? "Resolving..." : "Run resolved preview"}
              </button>
              {resolvedStatus === "success" ? (
                <span style={{ color: "var(--console-success)", fontSize: 13 }}>{resolvedMessage}</span>
              ) : null}
              {resolvedStatus === "error" ? (
                <span style={{ color: "var(--console-danger)", fontSize: 13 }}>{resolvedMessage}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <A2UISurfaceHost
          readOnly
          renderStatus={() => null}
          surface={fullPreviewEnvelope as unknown as SurfaceEnvelope}
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

function JsonFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<A2UIPartEditorField, { kind: "staticJson" }>;
  value: SurfaceConfigValue | undefined;
  onChange: (value: SurfaceConfigValue) => void;
}) {
  const [error, setError] = useState("");
  const initialText = staticJsonText(value, field.defaultValue);

  return (
    <label className={styles.fieldCard}>
      <span className={styles.metaLabel}>{field.label}</span>
      <textarea
        className={styles.textInput}
        defaultValue={initialText}
        key={initialText}
        onBlur={(event) => {
          try {
            const parsed = JSON.parse(event.currentTarget.value) as unknown;
            onChange(staticValue(parsed));
            setError("");
          } catch (error) {
            setError(error instanceof Error ? error.message : "Invalid JSON");
          }
        }}
        onChange={() => {
          setError("");
        }}
        rows={field.rows ?? 4}
        spellCheck={false}
      />
      {error ? (
        <span style={{ color: "var(--console-danger)", fontSize: 12 }}>{error}</span>
      ) : null}
    </label>
  );
}

function FieldEditor({
  field,
  index,
  value,
  onUpdate,
}: {
  field: A2UIPartEditorField;
  index: number;
  value: SurfaceConfigValue | undefined;
  onUpdate: (index: number, propKey: string, value: SurfaceConfigValue) => void;
}) {
  switch (field.kind) {
    case "bindingPath":
      return (
        <BindingInput
          label={field.label}
          onChange={(path) => onUpdate(index, field.prop, binding(path, field.fallback))}
          path={bindingPath(value) || field.defaultPath}
        />
      );
    case "staticStringList":
      return (
        <label className={styles.fieldCard}>
          <span className={styles.metaLabel}>{field.label}</span>
          <textarea
            className={styles.textInput}
            onChange={(event) => {
              onUpdate(index, field.prop, staticValue(
                event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
              ));
            }}
            rows={4}
            value={staticStringListValue(value, field.defaultValue)}
          />
        </label>
      );
    case "staticText":
      return (
        <label className={styles.fieldCard}>
          <span className={styles.metaLabel}>{field.label}</span>
          <input
            className={styles.textInput}
            onChange={(event) => onUpdate(index, field.prop, staticValue(event.target.value))}
            value={staticTextValue(value, field.defaultValue)}
          />
        </label>
      );
    case "select":
      return (
        <label className={styles.fieldCard}>
          <span className={styles.metaLabel}>{field.label}</span>
          <select
            className={styles.textInput}
            onChange={(event) => onUpdate(index, field.prop, staticValue(event.target.value))}
            value={staticTextValue(value, field.defaultValue)}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      );
    case "staticJson":
      return (
        <JsonFieldEditor
          field={field}
          onChange={(nextValue) => onUpdate(index, field.prop, nextValue)}
          value={value}
        />
      );
  }
}

function PartPropsEditor({
  definition,
  index,
  part,
  onUpdate,
}: {
  definition: A2UIPartDefinition | undefined;
  index: number;
  part: A2UIPartConfig;
  onUpdate: (index: number, propKey: string, value: SurfaceConfigValue) => void;
}) {
  if (!definition) {
    return (
      <div style={{ color: "var(--console-danger)", fontSize: 13, marginTop: 10 }}>
        Unknown part type. It will render with the unknown-part fallback until a catalog definition is added.
      </div>
    );
  }

  const props = part.props ?? {};
  if (definition.editorFields.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: 10 }}>
      {definition.editorFields.map((field) => (
        <FieldEditor
          field={field}
          index={index}
          key={field.prop}
          onUpdate={onUpdate}
          value={props[field.prop]}
        />
      ))}
    </div>
  );
}
