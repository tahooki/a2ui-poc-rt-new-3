"use client";

import { StatusBadge } from "../primitives/StatusBadge";
import { PartSection, stringifyPartValue } from "./shared";

export function AlertBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : "Notice";
  const tone = typeof props.tone === "string" ? props.tone : "info";
  const level = tone === "danger" || tone === "error" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "info";

  return (
    <PartSection>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ color: "#e4e8ef", fontSize: 13, fontWeight: 800 }}>{title}</div>
          <div style={{ color: "#b6c2d2", fontSize: 13, marginTop: 5 }}>{stringifyPartValue(props.message)}</div>
        </div>
        <StatusBadge label={tone} level={level} />
      </div>
    </PartSection>
  );
}

