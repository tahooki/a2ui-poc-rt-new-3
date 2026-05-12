"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";

type ExamplePayloadEditorProps = {
  definition: TemplateRegistryDefinition;
  value: string;
  onChange: (json: string) => void;
  parseError: string | null;
  validationErrors: string[];
};

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_A2UI_ADMIN_URL ?? "http://localhost:3100";

export function ExamplePayloadEditor({
  definition,
  value,
  onChange,
  parseError,
  validationErrors,
}: ExamplePayloadEditorProps) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  async function handleSave() {
    setSaveStatus("saving");
    setSaveMessage("");
    try {
      const body = JSON.parse(value);
      const res = await fetch(`${ADMIN_API_BASE}/admin/templates/${definition.templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("success");
        setSaveMessage("Saved");
      } else {
        setSaveStatus("error");
        setSaveMessage(data.details?.join(", ") ?? data.error ?? "Save failed");
      }
    } catch (e) {
      setSaveStatus("error");
      setSaveMessage(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div>
      <div className={styles.sectionEyebrow}>Payload Editor</div>
      <div className={styles.previewCaseSelector}>
        {definition.previewCases.map((pc) => (
          <button
            className={styles.chatAwaitingChip}
            key={pc.id}
            onClick={() => {
              onChange(JSON.stringify(pc.payload, null, 2));
              setSaveStatus("idle");
            }}
            type="button"
          >
            {pc.title}
          </button>
        ))}
      </div>
      <textarea
        className={styles.payloadEditor}
        onChange={(e) => {
          onChange(e.target.value);
          setSaveStatus("idle");
        }}
        rows={16}
        spellCheck={false}
        value={value}
      />
      {parseError ? (
        <div className={styles.editorError}>Parse error: {parseError}</div>
      ) : null}
      {validationErrors.length > 0 ? (
        <div className={styles.editorError}>
          {validationErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className={styles.primaryButton}
          disabled={!!parseError || saveStatus === "saving"}
          onClick={handleSave}
          type="button"
        >
          {saveStatus === "saving" ? "Saving..." : "Save"}
        </button>
        {saveStatus === "success" ? (
          <span style={{ color: "var(--console-success)", fontSize: 13 }}>{saveMessage}</span>
        ) : null}
        {saveStatus === "error" ? (
          <span style={{ color: "var(--console-danger)", fontSize: 13 }}>{saveMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
