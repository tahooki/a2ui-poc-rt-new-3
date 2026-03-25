import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";
import type { SemanticTone } from "@/devops-chat/types/domain";

const toneClassName: Record<SemanticTone, string> = {
  info: styles.toneInfo,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  neutral: "",
};

const toneIcon: Record<SemanticTone, "assistant" | "checkCircle" | "warning"> = {
  info: "assistant",
  success: "checkCircle",
  warning: "warning",
  danger: "warning",
  neutral: "assistant",
};

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: SemanticTone;
}) {
  return (
    <span className={`${styles.statusChip} ${toneClassName[tone]}`}>
      <Icon name={toneIcon[tone]} size={14} />
      {label}
    </span>
  );
}
