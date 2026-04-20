"use client";

import { StatusBadge } from "../../primitives/StatusBadge";
import { PartSection } from "../shared";

const DEFAULT_STEPS = ["이미지 Pull", "컨테이너 생성", "헬스체크 실행", "트래픽 전환", "최종 검증"];

function normalizeSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_STEPS;
  const steps = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return steps.length > 0 ? steps : DEFAULT_STEPS;
}

export function DeployRolloutProgressBlock(props: Record<string, unknown>) {
  const state = typeof props.state === "string" ? props.state : "ready";
  const steps = normalizeSteps(props.steps);
  const completed = state === "done" || state === "succeeded"
    ? steps.length
    : state === "deploying"
      ? Math.max(1, Math.floor(steps.length / 2))
      : 0;
  const progress = Math.round((completed / steps.length) * 100);
  const badge = state === "deploying"
    ? { label: "deploying", level: "warning" as const }
    : state === "done" || state === "succeeded"
      ? { label: "done", level: "success" as const }
      : { label: "planned", level: "info" as const };

  return (
    <PartSection subtitle="Execution path after the deploy action starts." title="Rollout progress">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
        <StatusBadge label={badge.label} level={badge.level} />
        <span style={{ color: "#8b9ab5", fontSize: 12 }}>{progress}%</span>
      </div>
      <div style={{ height: 8, background: "rgba(37,50,68,.82)", borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: state === "deploying" ? "#f7c948" : "#34c38f",
            transition: "width .42s ease",
          }}
        />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {steps.map((step, index) => {
          const done = index < completed;
          const active = state === "deploying" && index === completed;
          return (
            <div
              key={`${step}-${index}`}
              style={{
                alignItems: "center",
                color: done ? "#34c38f" : active ? "#f7c948" : "#8b9ab5",
                display: "flex",
                fontSize: 13,
                gap: 10,
              }}
            >
              <span>{done ? "✓" : active ? "●" : "○"}</span>
              <span>{step}{active ? " 실행 중" : ""}</span>
            </div>
          );
        })}
      </div>
    </PartSection>
  );
}
