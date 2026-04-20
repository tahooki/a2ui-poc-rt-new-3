"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

export function TimelineBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const events = Array.isArray(props.events) ? props.events.filter(isRecord) : [];

  return (
    <PartSection title={title}>
      {events.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {events.map((event, index) => (
            <div key={`${stringifyPartValue(event.title)}-${index}`} style={{ borderLeft: "2px solid #5b8dee", paddingLeft: 10 }}>
              <div style={{ color: "#e4e8ef", fontSize: 13, fontWeight: 700 }}>{stringifyPartValue(event.title)}</div>
              <div style={{ color: "#8b9ab5", fontSize: 12, marginTop: 2 }}>{stringifyPartValue(event.time ?? event.timestamp)}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPartState label="No timeline events configured" />
      )}
    </PartSection>
  );
}

