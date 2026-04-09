"use client";

export type StatusBadgeProps = {
  level: "success" | "warning" | "danger" | "info" | "neutral";
  label: string;
};

const styles: Record<string, { bg: string; color: string }> = {
  success: { bg: "rgba(52,195,143,.15)", color: "#34c38f" },
  warning: { bg: "rgba(247,201,72,.15)", color: "#f7c948" },
  danger: { bg: "rgba(244,106,106,.15)", color: "#f46a6a" },
  info: { bg: "rgba(91,141,238,.15)", color: "#5b8dee" },
  neutral: { bg: "rgba(139,154,181,.15)", color: "#8b9ab5" },
};

export function StatusBadge({ level, label }: StatusBadgeProps) {
  const s = styles[level] ?? styles.neutral;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
}
