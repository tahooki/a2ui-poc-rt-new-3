"use client";

import styles from "@/devops-console/console-page.module.css";
import { TemplateRenderer } from "@/devops-chat/templates/template-renderer";
import { runTemplatePreview, type PreviewResult } from "@/devops-chat/template-registry/run-template-preview";

type TemplateLivePreviewProps = {
  templateId: string;
  payloadJson: string;
};

export function TemplateLivePreview({ templateId, payloadJson }: TemplateLivePreviewProps) {
  const result = runTemplatePreview({ templateId, payloadJson });

  if (!result.ok) {
    return (
      <div className={styles.previewError}>
        <div className={styles.sectionEyebrow}>Preview Error</div>
        <div>{result.error === "parse_error" ? result.message : result.errors.join("; ")}</div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionEyebrow}>Live Preview</div>
      <TemplateRenderer
        onAction={() => {}}
        template={result.template}
      />
    </div>
  );
}
