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

export function ExamplePayloadEditor({
  definition,
  value,
  onChange,
  parseError,
  validationErrors,
}: ExamplePayloadEditorProps) {
  return (
    <div>
      <div className={styles.sectionEyebrow}>Payload Editor</div>
      <div className={styles.previewCaseSelector}>
        {definition.previewCases.map((pc) => (
          <button
            className={styles.chatAwaitingChip}
            key={pc.id}
            onClick={() => onChange(JSON.stringify(pc.payload, null, 2))}
            type="button"
          >
            {pc.title}
          </button>
        ))}
      </div>
      <textarea
        className={styles.payloadEditor}
        onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
}
