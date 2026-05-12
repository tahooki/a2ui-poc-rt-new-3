"use client";

import { useCallback, useState } from "react";
import type { TemplateAction, ActionCallback } from "../types/action-event";
import { A2UICardShell } from "./A2UICardShell";
import { resolveBindingValue, resolveProps, type BindingContext } from "./binding";
import { getA2UIPart } from "./part-registry";
import type { A2UICardTone, DynamicA2UIEnvelope, SurfaceConfig } from "./schema";

export type DynamicA2UICardRendererProps = {
  envelope: DynamicA2UIEnvelope;
  surfaceConfig: SurfaceConfig;
  onAction: ActionCallback;
};

const toneMap: Record<string, A2UICardTone> = {
  ready: "ready",
  deploying: "warning",
  done: "success",
  succeeded: "success",
  success: "success",
  warning: "warning",
  blocked: "error",
  failed: "error",
  error: "error",
  info: "info",
};

function textValue(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function normalizeTone(value: unknown): A2UICardTone {
  const key = textValue(value, "ready").toLowerCase();
  return toneMap[key] ?? "ready";
}

function UnknownPartFallback({ id, type }: { id: string; type: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(244,106,106,.35)",
        background: "rgba(244,106,106,.08)",
        borderRadius: 8,
        padding: 12,
        color: "#f46a6a",
        fontSize: 13,
      }}
    >
      Unknown A2UI part: <strong>{type}</strong> ({id})
    </div>
  );
}

export function DynamicA2UICardRenderer({
  envelope,
  surfaceConfig,
  onAction,
}: DynamicA2UICardRendererProps) {
  const payloadKey = `${envelope.templateId}:${envelope.freshnessKey ?? envelope.updatedAt}`;
  const [draftState, setDraftState] = useState({
    key: payloadKey,
    payload: envelope.payload,
  });
  const draftPayload = draftState.key === payloadKey ? draftState.payload : envelope.payload;

  const updateDraftPayload = useCallback((payload: Record<string, unknown>) => {
    setDraftState({ key: payloadKey, payload });
  }, [payloadKey]);

  const bindingContext: BindingContext = {
    payload: draftPayload,
    actions: envelope.actions,
    meta: envelope.meta,
  };

  const card = surfaceConfig.card ?? {};
  const title = card.title ? textValue(resolveBindingValue(card.title, bindingContext), envelope.templateId) : envelope.templateId;
  const subtitle = card.subtitle ? textValue(resolveBindingValue(card.subtitle, bindingContext)) : undefined;
  const description = card.description ? textValue(resolveBindingValue(card.description, bindingContext)) : undefined;
  const footerNote = card.footerNote ? textValue(resolveBindingValue(card.footerNote, bindingContext)) : undefined;
  const tone = normalizeTone(card.tone ? resolveBindingValue(card.tone, bindingContext) : envelope.payload.state);
  const actions = card.actions?.source === "templateActions"
    ? envelope.actions as TemplateAction[] | undefined
    : undefined;

  return (
    <A2UICardShell
      actions={actions}
      description={description}
      footerNote={footerNote}
      onAction={onAction}
      payload={draftPayload}
      subtitle={subtitle}
      title={title}
      tone={tone}
    >
      {surfaceConfig.parts.map((part) => {
        const Part = getA2UIPart(part.type);
        if (!Part) {
          return <UnknownPartFallback id={part.id} key={part.id} type={part.type} />;
        }
        const props = resolveProps(part.props, bindingContext);
        return (
          <Part
            key={part.id}
            {...props}
            __a2uiPayload={draftPayload}
            __a2uiSetPayload={updateDraftPayload}
          />
        );
      })}
    </A2UICardShell>
  );
}
