"use client";

import styles from "@/devops-console/console-page.module.css";
import { buildContractViewModel } from "@/devops-chat/template-registry/build-contract-view-model";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";

type TemplateContractViewerProps = {
  definition: TemplateRegistryDefinition;
};

export function TemplateContractViewer({ definition }: TemplateContractViewerProps) {
  const vm = buildContractViewModel(definition);

  return (
    <div>
      <div className={styles.sectionEyebrow}>Input Contract</div>
      <h4 className={styles.panelTitle}>{vm.title} — v{vm.schemaVersion}</h4>
      <table className={styles.contractTable}>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
            <th>Example</th>
          </tr>
        </thead>
        <tbody>
          {vm.fields.map((f) => (
            <tr key={f.path}>
              <td><code>{f.path}</code></td>
              <td>{f.type}{f.enumValues.length > 0 ? ` (${f.enumValues.join("|")})` : ""}</td>
              <td>{f.required ? "Y" : ""}</td>
              <td>{f.description}</td>
              <td><code>{f.example}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
