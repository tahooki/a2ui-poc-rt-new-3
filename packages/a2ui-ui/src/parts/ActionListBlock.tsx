"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

export function ActionListBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const actions = Array.isArray(props.actions) ? props.actions.filter(isRecord) : [];

  return (
    <PartSection title={title}>
      {actions.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {actions.map((action, index) => (
            <div key={`${stringifyPartValue(action.label)}-${index}`} style={{ color: "#e4e8ef", fontSize: 13 }}>
              {stringifyPartValue(action.label)}
            </div>
          ))}
        </div>
      ) : (
        <EmptyPartState label="No actions configured" />
      )}
    </PartSection>
  );
}

