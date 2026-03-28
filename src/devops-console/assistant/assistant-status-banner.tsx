"use client";

import styles from "@/devops-console/console-page.module.css";

export type ErrorCategory =
  | "transport"
  | "tool"
  | "binding"
  | "action"
  | "stale_guard"
  | "unknown";

type AssistantStatusBannerProps = {
  error: string | null;
  category?: ErrorCategory;
  fallbackActive?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
};

const CATEGORY_COPY: Record<ErrorCategory, { label: string; hint: string }> = {
  transport: { label: "연결 오류", hint: "서버와의 연결이 끊겼습니다. 다시 시도해 주세요." },
  tool: { label: "도구 실행 오류", hint: "텍스트로 계속 진행합니다." },
  binding: { label: "표면 생성 오류", hint: "텍스트로 계속 진행합니다." },
  action: { label: "액션 실행 오류", hint: "이전 상태를 유지합니다." },
  stale_guard: { label: "상태 변경됨", hint: "최신 상태로 갱신됩니다." },
  unknown: { label: "오류 발생", hint: "다시 시도해 주세요." },
};

export function AssistantStatusBanner({
  error,
  category = "unknown",
  fallbackActive,
  onRetry,
  onDismiss,
}: AssistantStatusBannerProps) {
  if (!error) return null;

  const copy = CATEGORY_COPY[category];

  return (
    <div className={styles.statusBanner} role="alert">
      <div className={styles.statusBannerContent}>
        <strong>{copy.label}</strong>
        <span>{copy.hint}</span>
        {fallbackActive ? <span style={{ opacity: 0.7 }}>(fallback 적용 중)</span> : null}
      </div>
      <div className={styles.statusBannerActions}>
        {onRetry ? (
          <button className={styles.chatAwaitingChip} onClick={onRetry} type="button">
            다시 시도
          </button>
        ) : null}
        {onDismiss ? (
          <button className={styles.chatAwaitingChip} onClick={onDismiss} type="button">
            닫기
          </button>
        ) : null}
      </div>
    </div>
  );
}
