"use client";

import { useState, useEffect, useRef } from "react";
import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { QuickDeployTemplateData, DeployImageDetail, DeployRequestDetail } from "@/devops-chat/types/templates";

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
  const [imageDetail, setImageDetail] = useState<DeployImageDetail | undefined>(template.imageDetail);
  const [requestDetail, setRequestDetail] = useState<DeployRequestDetail | undefined>(template.requestDetail);
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
  function advanceStep(idx: number) {
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
  }

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

        {imageDetail && (
          <CollapsibleImageDetail data={imageDetail} onChange={setImageDetail} />
        )}

        {requestDetail && (
          <CollapsibleRequestDetail data={requestDetail} onChange={setRequestDetail} />
        )}

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

// ---------------------------------------------------------------------------
// Collapsible editable detail sections
// ---------------------------------------------------------------------------

const buildStatusOptions = ["registered", "push_verified", "build_failed"];
const strategyOptions = ["rolling", "canary_10_50_100", "blue_green"];
const cpuOptions = [
  { value: "256", label: "0.25 vCPU" },
  { value: "512", label: "0.5 vCPU" },
  { value: "1024", label: "1 vCPU" },
  { value: "2048", label: "2 vCPU" },
];
const memoryOptions = [
  { value: "512", label: "512 MiB" },
  { value: "1024", label: "1 GiB" },
  { value: "2048", label: "2 GiB" },
  { value: "4096", label: "4 GiB" },
];

function CollapsibleImageDetail({
  data,
  onChange,
}: {
  data: DeployImageDetail;
  onChange: (d: DeployImageDetail) => void;
}) {
  const [open, setOpen] = useState(false);
  const update = (field: keyof DeployImageDetail, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <div className={styles.collapsibleSection}>
      <div
        className={styles.collapsibleHeader}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
      >
        <div className={styles.collapsibleHeaderLeft}>
          <span className={`${styles.collapsibleArrow} ${open ? styles.collapsibleArrowOpen : ""}`}>▶</span>
          <span className={styles.collapsibleTitle}>Image 정보</span>
          <span className={styles.collapsibleBadge}>AI 자동 선택</span>
        </div>
        <span style={{ fontSize: 10, opacity: 0.45 }}>8개 항목</span>
      </div>
      <div className={`${styles.collapsibleBody} ${open ? styles.collapsibleBodyOpen : ""}`}>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Repository</span>
            <input className={styles.textInput} value={data.repository} onChange={(e) => update("repository", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Image Tag</span>
            <input className={styles.textInput} value={data.imageTag} onChange={(e) => update("imageTag", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Image URI</span>
            <input className={styles.textInput} value={data.imageUri} onChange={(e) => update("imageUri", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Git Ref</span>
            <input className={styles.textInput} value={data.gitRef} onChange={(e) => update("gitRef", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Commit SHA</span>
            <input className={styles.textInput} value={data.commitSha} onChange={(e) => update("commitSha", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Image Digest</span>
            <input className={styles.textInput} value={data.imageDigest} onChange={(e) => update("imageDigest", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Build Status</span>
            <div className={styles.choiceGrid}>
              {buildStatusOptions.map((opt) => (
                <button
                  className={`${styles.choiceButton} ${data.buildStatus === opt ? styles.choiceButtonActive : ""}`}
                  key={opt}
                  onClick={(e) => { e.stopPropagation(); update("buildStatus", opt); }}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Pushed At</span>
            <input className={styles.textInput} value={data.pushedAt} onChange={(e) => update("pushedAt", e.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}

function CollapsibleRequestDetail({
  data,
  onChange,
}: {
  data: DeployRequestDetail;
  onChange: (d: DeployRequestDetail) => void;
}) {
  const [open, setOpen] = useState(false);
  const update = (field: keyof DeployRequestDetail, value: string) =>
    onChange({ ...data, [field]: value });

  return (
    <div className={styles.collapsibleSection}>
      <div
        className={styles.collapsibleHeader}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
      >
        <div className={styles.collapsibleHeaderLeft}>
          <span className={`${styles.collapsibleArrow} ${open ? styles.collapsibleArrowOpen : ""}`}>▶</span>
          <span className={styles.collapsibleTitle}>Request 설정</span>
          <span className={styles.collapsibleBadge}>AI 추천 구성</span>
        </div>
        <span style={{ fontSize: 10, opacity: 0.45 }}>17개 항목</span>
      </div>
      <div className={`${styles.collapsibleBody} ${open ? styles.collapsibleBodyOpen : ""}`}>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Selected Image ID</span>
            <input className={styles.textInput} value={data.selectedImageId} onChange={(e) => update("selectedImageId", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Selected Image</span>
            <input className={styles.textInput} value={data.selectedImageUri} onChange={(e) => update("selectedImageUri", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Service</span>
            <input className={styles.textInput} value={data.service} onChange={(e) => update("service", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Environment</span>
            <div className={styles.choiceGrid}>
              {["production", "staging", "development"].map((opt) => (
                <button
                  className={`${styles.choiceButton} ${data.environment === opt ? styles.choiceButtonActive : ""}`}
                  key={opt}
                  onClick={(e) => { e.stopPropagation(); update("environment", opt); }}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Deployment Strategy</span>
            <div className={styles.choiceGrid}>
              {strategyOptions.map((opt) => (
                <button
                  className={`${styles.choiceButton} ${data.deploymentStrategy === opt ? styles.choiceButtonActive : ""}`}
                  key={opt}
                  onClick={(e) => { e.stopPropagation(); update("deploymentStrategy", opt); }}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>CPU</span>
            <select className={styles.textInput} value={data.cpu} onChange={(e) => update("cpu", e.target.value)}>
              {cpuOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Memory</span>
            <select className={styles.textInput} value={data.memory} onChange={(e) => update("memory", e.target.value)}>
              {memoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Container Port</span>
            <input className={styles.textInput} value={data.containerPort} onChange={(e) => update("containerPort", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Desired Count</span>
            <input className={styles.textInput} value={data.desiredCount} onChange={(e) => update("desiredCount", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Minimum Healthy %</span>
            <input className={styles.textInput} value={data.minimumHealthyPercent} onChange={(e) => update("minimumHealthyPercent", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Maximum %</span>
            <input className={styles.textInput} value={data.maximumPercent} onChange={(e) => update("maximumPercent", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Health Check Path</span>
            <input className={styles.textInput} value={data.healthCheckPath} onChange={(e) => update("healthCheckPath", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Health Check Grace Period</span>
            <input className={styles.textInput} value={data.healthCheckGracePeriod} onChange={(e) => update("healthCheckGracePeriod", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Rollback Baseline</span>
            <input className={styles.textInput} value={data.rollbackBaseline} onChange={(e) => update("rollbackBaseline", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Requested By</span>
            <input className={styles.textInput} value={data.requestedBy} onChange={(e) => update("requestedBy", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Execution Profile</span>
            <input className={styles.textInput} value={data.executionProfile} onChange={(e) => update("executionProfile", e.target.value)} />
          </label>
          <label className={styles.fieldCard}>
            <span className={styles.metaLabel}>Operator Note</span>
            <textarea className={styles.textArea} value={data.operatorNote} onChange={(e) => update("operatorNote", e.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}
