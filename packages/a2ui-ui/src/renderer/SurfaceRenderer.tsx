"use client";

import type { SurfaceEnvelope } from "../types/surface-envelope";
import type { ActionCallback, TemplateAction } from "../types/action-event";
import { DynamicA2UICardRenderer } from "../dynamic/DynamicA2UICardRenderer";
import type { DynamicA2UIEnvelope } from "../dynamic/schema";
import { getTemplate } from "./TemplateRegistry";

export type SurfaceRendererProps = {
  envelope: SurfaceEnvelope;
  onAction: ActionCallback;
};

export function SurfaceRenderer({ envelope, onAction }: SurfaceRendererProps) {
  if ((envelope as DynamicA2UIEnvelope).surfaceConfig) {
    const dynamicEnvelope = envelope as DynamicA2UIEnvelope;
    return (
      <DynamicA2UICardRenderer
        envelope={dynamicEnvelope}
        onAction={onAction}
        surfaceConfig={dynamicEnvelope.surfaceConfig!}
      />
    );
  }

  const def = getTemplate(envelope.templateId);

  if (!def) {
    return (
      <div
        style={{
          padding: 16,
          background: "#1a1a2e",
          border: "1px solid rgba(244,106,106,.3)",
          borderRadius: 8,
          color: "#f46a6a",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Template not found: {envelope.templateId}
        </div>
        <pre style={{ fontSize: 11, color: "#8b9ab5", overflow: "auto", maxHeight: 200 }}>
          {JSON.stringify(envelope.payload, null, 2)}
        </pre>
      </div>
    );
  }

  const Component = def.component;
  return <Component payload={envelope.payload} actions={envelope.actions as TemplateAction[] | undefined} onAction={onAction} />;
}
