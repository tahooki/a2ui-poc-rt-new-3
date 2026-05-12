"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

export function MetricGridBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const metrics = Array.isArray(props.metrics) ? props.metrics.filter(isRecord) : [];

  return (
    <PartSection title={title}>
      {metrics.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {metrics.map((metric, index) => (
            <div
              key={`${stringifyPartValue(metric.label)}-${index}`}
              style={{
                background: "rgba(17,24,39,.72)",
                border: "1px solid rgba(37,50,68,.55)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ color: "#8b9ab5", fontSize: 11, marginBottom: 4 }}>{stringifyPartValue(metric.label)}</div>
              <div style={{ color: "#e4e8ef", fontSize: 20, fontWeight: 850 }}>{stringifyPartValue(metric.value)}</div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPartState label="No metrics configured" />
      )}
    </PartSection>
  );
}

