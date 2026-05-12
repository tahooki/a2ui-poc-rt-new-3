"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

export function StepProgressBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const steps = Array.isArray(props.steps) ? props.steps : [];
  const currentStep = typeof props.currentStep === "number" ? props.currentStep : 0;

  return (
    <PartSection title={title}>
      {steps.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {steps.map((step, index) => {
            const label = isRecord(step) ? stringifyPartValue(step.label) : stringifyPartValue(step);
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <div key={`${label}-${index}`} style={{ display: "flex", gap: 10, alignItems: "center", color: done ? "#34c38f" : active ? "#5b8dee" : "#8b9ab5", fontSize: 13 }}>
                <span>{done ? "✓" : active ? "●" : "○"}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPartState label="No steps configured" />
      )}
    </PartSection>
  );
}

