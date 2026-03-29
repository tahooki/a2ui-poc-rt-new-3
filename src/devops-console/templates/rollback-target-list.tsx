"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { RollbackTargetListTemplateData, RollbackTargetItem } from "@/devops-chat/types/templates";

// ---------------------------------------------------------------------------
// Rollback-specific steps (faster than deploy — emergency recovery)
// ---------------------------------------------------------------------------

type RollbackStep = { label: string; duration: number };

const ROLLBACK_STEPS: RollbackStep[] = [
  { label: "장애 서비스 격리", duration: 0.8 },
  { label: "이전 버전 이미지 복원", duration: 1.2 },
  { label: "상태 검증", duration: 1.0 },
  { label: "트래픽 복구", duration: 0.8 },
  { label: "인시던트 해소 확인", duration: 0.7 },
];

const MTTR_TARGET_MINUTES = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RollbackTargetListProps = {
  template: RollbackTargetListTemplateData;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

type CardPhase = "idle" | "rolling_back" | "done";

function riskTone(risk: string): "warning" | "danger" | "success" {
  if (risk === "high") return "danger";
  if (risk === "low" || risk === "completed") return "success";
  return "warning";
}

// ---------------------------------------------------------------------------
// TargetCard with rollback-specific animation
// ---------------------------------------------------------------------------

function TargetCard({
  target,
  serviceName,
  currentVersion,
  incidentSummary,
  onAction,
}: {
  target: RollbackTargetItem;
  serviceName: string;
  currentVersion: string;
  incidentSummary: string;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
}) {
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepTimes, setStepTimes] = useState<Record<number, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === "rolling_back") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, []);

  const advanceStep = useCallback((idx: number) => {
    if (idx >= ROLLBACK_STEPS.length) {
      setTimeout(() => setPhase("done"), 400);
      return;
    }
    setCurrentStep(idx);
    stepTimerRef.current = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, idx]);
      setStepTimes((prev) => ({ ...prev, [idx]: ROLLBACK_STEPS[idx].duration }));
      advanceStep(idx + 1);
    }, ROLLBACK_STEPS[idx].duration * 1000);
  }, []);

  function handleRollback() {
    setPhase("rolling_back");
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepTimes({});
    setElapsed(0);
    advanceStep(0);
    setTimeout(() => {
      onAction?.(target.actions[0]?.actionId ?? "rollback.select_target", { deploymentId: target.id });
    }, 300);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progress = phase === "done" ? 100 : Math.round((completedSteps.length / ROLLBACK_STEPS.length) * 100);

  // ===== ROLLING BACK =====
  if (phase === "rolling_back") {
    return (
      <div className={`${styles.templateCard} ${styles.deployFadeIn}`} style={{
        marginBottom: 8,
        borderColor: "rgba(240, 173, 78, 0.4)",
      }}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow} style={{ color: "#f0ad4e" }}>⚠ Rolling back...</div>
            <h4 className={styles.templateTitle}>{serviceName} {currentVersion} → {target.version}</h4>
            <p className={styles.templateDescription} style={{ color: "rgba(240, 173, 78, 0.8)" }}>
              {incidentSummary}
            </p>
          </div>
          <StatusChip label="복구 중" tone="warning" />
        </div>

        {/* Rollback progress — orange to green, reverse direction */}
        <div className={styles.deployProgressBar}>
          <div className={styles.rollbackProgressFill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.rollbackMttr}>
          <span>⏱ 복구 시간: {fmt(elapsed)}</span>
          <span style={{ opacity: 0.4 }}>MTTR 목표 {MTTR_TARGET_MINUTES}분</span>
        </div>

        <div className={styles.checkList}>
          {ROLLBACK_STEPS.map((step, idx) => {
            const done = completedSteps.includes(idx);
            const active = currentStep === idx && !done;
            const pending = idx > currentStep;
            return (
              <div
                className={`${styles.stepItem} ${done ? styles.stepItemComplete : ""}`}
                key={step.label}
                style={{ opacity: pending ? 0.3 : 1, transition: "opacity 0.3s, border-color 0.3s" }}
              >
                <span
                  className={done ? styles.deployStepBounce : active ? styles.rollbackStepPulse : ""}
                  style={{ fontSize: 16, display: "inline-flex", color: active ? "#f0ad4e" : undefined }}
                >
                  {done ? "✅" : active ? "⚡" : "○"}
                </span>
                <span className={styles.propertyValue} style={{ flex: 1 }}>
                  {step.label}{active ? <span style={{ opacity: 0.5 }}> 처리 중...</span> : null}
                </span>
                {done && stepTimes[idx] != null ? (
                  <span style={{ fontSize: 11, opacity: 0.45, fontFamily: "var(--console-font-mono, monospace)" }}>{stepTimes[idx]}초</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== DONE =====
  if (phase === "done") {
    return (
      <div className={`${styles.templateCard} ${styles.deployFadeIn}`} style={{
        marginBottom: 8,
        borderColor: "rgba(52, 195, 143, 0.5)",
      }}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow} style={{ color: "#34c38f" }}>✅ Recovered</div>
            <h4 className={styles.templateTitle}>{serviceName} → {target.version}</h4>
            <p className={styles.templateDescription} style={{ color: "rgba(52, 195, 143, 0.7)" }}>
              {incidentSummary} — 해소됨
            </p>
          </div>
          <span className={styles.deployStepBounce} style={{ fontSize: 28, display: "inline-block" }}>✅</span>
        </div>

        <div className={styles.checkList}>
          {ROLLBACK_STEPS.map((step, idx) => (
            <div className={`${styles.stepItem} ${styles.stepItemComplete}`} key={step.label}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span className={styles.propertyValue} style={{ flex: 1 }}>{step.label}</span>
              <span style={{ fontSize: 11, opacity: 0.45, fontFamily: "var(--console-font-mono, monospace)" }}>
                {stepTimes[idx] != null ? `${stepTimes[idx]}초` : "완료"}
              </span>
            </div>
          ))}
        </div>

        <div className={`${styles.calloutCard} ${styles.rollbackDoneCard}`} style={{ fontSize: 14 }}>
          <div>🔥 복구 완료 · MTTR {fmt(elapsed)}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>서비스 정상화됨</div>
        </div>
      </div>
    );
  }

  // ===== IDLE =====
  return (
    <div className={`${styles.templateCard} ${styles.deployFadeIn}`} style={{ marginBottom: 8 }}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>
            {target.isRecommended ? "⭐ 추천" : ""} {target.strategy}
          </div>
          <h4 className={styles.templateTitle}>{target.version}</h4>
          <p className={styles.templateDescription}>{target.whyThisTarget}</p>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <StatusChip label={target.rollbackRisk} tone={riskTone(target.rollbackRisk)} />
          <StatusChip label={target.status} tone={target.status === "executed" ? "success" : "warning"} />
        </div>
      </div>

      {target.evidence.length > 0 ? (
        <div style={{ padding: "0 12px 8px", fontSize: 12, opacity: 0.7 }}>
          {target.evidence.map((e, i) => (
            <div key={i}>· {e}</div>
          ))}
        </div>
      ) : null}

      {target.deployedAt ? (
        <div style={{ padding: "0 12px 8px", fontSize: 12, opacity: 0.5 }}>
          배포일: {target.deployedAt}
        </div>
      ) : null}

      {target.actions.length > 0 ? (
        <div className={styles.templateActions}>
          <button className={styles.primaryButton} onClick={handleRollback} type="button">
            이 버전으로 롤백
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RollbackTargetList({
  template,
  onAction,
}: RollbackTargetListProps) {
  const eligible = template.targets.filter((t) => t.rollbackEligible);
  const notEligible = template.targets.filter((t) => !t.rollbackEligible);
  const severityTone = template.severity === "critical" ? "danger" : template.severity === "high" ? "warning" : "success";

  return (
    <article>
      <div className={styles.templateCard} style={{ marginBottom: 16 }}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow}>{template.environment}</div>
            <h4 className={styles.templateTitle}>{template.service} 롤백 대상</h4>
            <p className={styles.templateDescription}>
              현재 {template.currentVersion} · {template.incidentSummary}
            </p>
          </div>
          <StatusChip label={template.severity} tone={severityTone} />
        </div>
      </div>

      {eligible.length > 0 ? (
        <div>
          <div className={styles.sectionEyebrow} style={{ marginBottom: 8 }}>롤백 가능 ({eligible.length})</div>
          {eligible.map((target) => (
            <TargetCard
              currentVersion={template.currentVersion}
              incidentSummary={template.incidentSummary}
              key={target.id}
              onAction={onAction}
              serviceName={template.service}
              target={target}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, textAlign: "center", opacity: 0.5 }}>
          롤백 가능한 배포 인스턴스가 없습니다.
        </div>
      )}

      {notEligible.length > 0 ? (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>롤백 불가 ({notEligible.length})</summary>
          {notEligible.map((target) => (
            <TargetCard
              currentVersion={template.currentVersion}
              incidentSummary={template.incidentSummary}
              key={target.id}
              onAction={onAction}
              serviceName={template.service}
              target={target}
            />
          ))}
        </details>
      ) : null}
    </article>
  );
}
