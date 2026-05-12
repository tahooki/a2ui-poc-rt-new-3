"use client";

export type ActionButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  onClick: () => void;
};

const variantStyles: Record<string, React.CSSProperties> = {
  primary: { background: "#5b8dee", color: "#fff", border: "none" },
  secondary: { background: "transparent", color: "#5b8dee", border: "1px solid #5b8dee" },
  danger: { background: "#f46a6a", color: "#fff", border: "none" },
  ghost: { background: "transparent", color: "#8b9ab5", border: "1px solid rgba(139,154,181,.3)" },
};

export function ActionButton({ label, variant = "primary", disabled, onClick }: ActionButtonProps) {
  const style = variantStyles[variant] ?? variantStyles.primary;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...style,
        padding: "8px 16px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        marginRight: 8,
      }}
    >
      {label}
    </button>
  );
}
