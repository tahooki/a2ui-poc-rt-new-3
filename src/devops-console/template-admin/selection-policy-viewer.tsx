"use client";

import styles from "@/devops-console/console-page.module.css";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";

type SelectionPolicyViewerProps = {
  definition: TemplateRegistryDefinition;
};

export function SelectionPolicyViewer({ definition }: SelectionPolicyViewerProps) {
  const policy = definition.selectionPolicyDoc;

  return (
    <div>
      <div className={styles.sectionEyebrow}>Selection Policy</div>
      <table className={styles.contractTable}>
        <tbody>
          <tr>
            <td><strong>Intent Keys</strong></td>
            <td>{policy.intentKeys.join(", ")}</td>
          </tr>
          <tr>
            <td><strong>Required Facts</strong></td>
            <td>{policy.requiredFacts.join(", ") || "—"}</td>
          </tr>
          {policy.optionalFacts ? (
            <tr>
              <td><strong>Optional Facts</strong></td>
              <td>{policy.optionalFacts.join(", ")}</td>
            </tr>
          ) : null}
          {policy.disqualifiers ? (
            <tr>
              <td><strong>Disqualifiers</strong></td>
              <td>{policy.disqualifiers.join(", ")}</td>
            </tr>
          ) : null}
          {policy.minScore !== undefined ? (
            <tr>
              <td><strong>Min Score</strong></td>
              <td>{policy.minScore}</td>
            </tr>
          ) : null}
          {policy.reasonTemplate ? (
            <tr>
              <td><strong>Reason</strong></td>
              <td>{policy.reasonTemplate}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
