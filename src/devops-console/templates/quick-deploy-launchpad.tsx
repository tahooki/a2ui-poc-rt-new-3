"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { QuickDeployTemplateData } from "@/devops-chat/types/templates";

// ---------------------------------------------------------------------------
// Deploy step definitions (simulated durations)
// ---------------------------------------------------------------------------

type DeployStep = { label: string; duration: number };

const DEPLOY_STEPS: DeployStep[] = [
  { label: "이미지 Pull", duration: 1.5 },
  { label: "컨테이너 생성", duration: 1.2 },
  { label: "헬스체크 실행", duration: 2.0 },
  { label: "트래픽 전환", duration: 1.5 },
  { label: "최종 검증", duration: 1.0 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type DeployPhase = "ready" | "deploying" | "done";

export function QuickDeployLaunchpad({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: QuickDeployTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const [phase, setPhase] = useState<DeployPhase>("ready");
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepTimes, setStepTimes] = useState<Record<number, number>>({});
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (phase === "deploying") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, []);

  // Step auto-advance
  const advanceStep = useCallback((idx: number) => {
    if (idx >= DEPLOY_STEPS.length) {
      setTimeout(() => setPhase("done"), 500);
      return;
    }
    setCurrentStep(idx);
    stepTimerRef.current = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, idx]);
      setStepTimes((prev) => ({ ...prev, [idx]: DEPLOY_STEPS[idx].duration }));
      advanceStep(idx + 1);
    }, DEPLOY_STEPS[idx].duration * 1000);
  }, []);

  function handleStart() {
    setPhase("deploying");
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepTimes({});
    setElapsed(0);
    onPrimaryAction();
    advanceStep(0);
  }

  function handleComplete() {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    const all = DEPLOY_STEPS.map((_, i) => i);
    setCompletedSteps(all);
    const times: Record<number, number> = {};
    for (const i of all) times[i] = DEPLOY_STEPS[i].duration;
    setStepTimes(times);
    setPhase("done");
  }

  function handleCancel() {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ready");
    setCurrentStep(-1);
    setCompletedSteps([]);
  }

  function handleNewDeploy() {
    setPhase("ready");
    setCurrentStep(-1);
    setCompletedSteps([]);
    setStepTimes({});
    setElapsed(0);
    onSecondaryAction();
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const progress = phase === "done" ? 100 : Math.round((completedSteps.length / DEPLOY_STEPS.length) * 100);

  // ===== READY =====
  if (phase === "ready") {
    return (
      <article className={`${styles.templateCard} ${styles.deployFadeIn}`}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow}>Deploy launchpad</div>
            <h4 className={styles.templateTitle}>{template.service}</h4>
            <p className={styles.templateDescription}>{template.helperText}</p>
          </div>
          <StatusChip label="ready" tone="warning" />
        </div>

        <div className={styles.templateMetaGrid}>
          <MetaCard label="Environment" value={template.environment} />
          <MetaCard label="Strategy" value={template.strategy} />
          <MetaCard label="Recommended" value={template.recommendedVersion} />
          <MetaCard label="Target" value={template.targetVersion} />
        </div>

        <div className={styles.calloutCard}>{template.impactSummary}</div>

        <div className={styles.checkList}>
          {template.preflightChecks.map((c) => (
            <div className={styles.checkItem} key={c}>
              <StatusChip label="preflight" tone="info" />
              <span className={styles.propertyValue}>{c}</span>
            </div>
          ))}
        </div>

        <div className={styles.templateActions}>
          <button className={styles.primaryButton} onClick={handleStart} type="button">배포 시작</button>
          <button className={styles.secondaryButton} onClick={onSecondaryAction} type="button">초안 새로 고침</button>
        </div>
      </article>
    );
  }

  // ===== DEPLOYING =====
  if (phase === "deploying") {
    return (
      <article className={`${styles.templateCard} ${styles.deployFadeIn}`}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow}>Deploying...</div>
            <h4 className={styles.templateTitle}>{template.service}</h4>
            <p className={styles.templateDescription}>{template.targetVersion} → {template.environment}</p>
          </div>
          <StatusChip label="배포 중" tone="info" />
        </div>

        {/* Progress bar */}
        <div className={styles.deployProgressBar}>
          <div className={styles.deployProgressFillAnimated} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.deployElapsed}>{progress}% · 경과 {fmt(elapsed)}</div>

        {/* Steps */}
        <div className={styles.checkList}>
          {DEPLOY_STEPS.map((step, idx) => {
            const done = completedSteps.includes(idx);
            const active = currentStep === idx && !done;
            const pending = idx > currentStep;
            return (
              <div
                className={`${styles.stepItem} ${done ? styles.stepItemComplete : ""}`}
                key={step.label}
                style={{ opacity: pending ? 0.35 : 1, transition: "opacity 0.3s, border-color 0.3s" }}
              >
                <span className={done ? styles.deployStepBounce : active ? styles.deployStepPulse : ""} style={{ fontSize: 16, display: "inline-flex" }}>
                  {done ? "✅" : active ? "🔄" : "○"}
                </span>
                <span className={styles.propertyValue} style={{ flex: 1 }}>
                  {step.label}{active ? <span style={{ opacity: 0.5 }}> 실행 중...</span> : null}
                </span>
                {done && stepTimes[idx] != null ? (
                  <span style={{ fontSize: 11, opacity: 0.45, fontFamily: "var(--console-font-mono, monospace)" }}>{stepTimes[idx]}초</span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={styles.templateActions}>
          <button className={styles.secondaryButton} onClick={handleComplete} type="button">완료 반영</button>
          <button className={styles.secondaryButton} onClick={handleCancel} type="button" style={{ opacity: 0.65 }}>배포 중단</button>
        </div>
      </article>
    );
  }

  // ===== DONE =====
  return (
    <article className={`${styles.templateCard} ${styles.deployFadeIn}`}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Deploy complete</div>
          <h4 className={styles.templateTitle}>{template.service}</h4>
          <p className={styles.templateDescription}>{template.targetVersion} → {template.environment}</p>
        </div>
        <span className={styles.deployStepBounce} style={{ fontSize: 28, display: "inline-block" }}>✅</span>
      </div>

      <div className={`${styles.calloutCard} ${styles.deployDoneCard}`}>
        배포 완료 · 총 소요 시간 {fmt(elapsed)}
      </div>

      <div className={styles.checkList}>
        {DEPLOY_STEPS.map((step, idx) => (
          <div className={`${styles.stepItem} ${styles.stepItemComplete}`} key={step.label} style={{ animationDelay: `${idx * 0.08}s` }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span className={styles.propertyValue} style={{ flex: 1 }}>{step.label}</span>
            <span style={{ fontSize: 11, opacity: 0.45, fontFamily: "var(--console-font-mono, monospace)" }}>
              {stepTimes[idx] != null ? `${stepTimes[idx]}초` : "완료"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.templateActions}>
        <button className={styles.primaryButton} onClick={handleNewDeploy} type="button">새 배포 시작</button>
        <button className={styles.secondaryButton} onClick={onSecondaryAction} type="button">이력 보기</button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-component
// ---------------------------------------------------------------------------

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.templateMetaCard}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{value}</div>
    </div>
  );
}
