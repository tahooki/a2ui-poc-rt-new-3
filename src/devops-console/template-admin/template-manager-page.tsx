"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { getRegistryDefinition } from "@/devops-chat/template-registry/template-registry";
import { TemplateListPanel } from "./template-list-panel";
import { TemplateContractViewer } from "./template-contract-viewer";
import { ExamplePayloadEditor } from "./example-payload-editor";
import { TemplateLivePreview } from "./template-live-preview";
import { SelectionPolicyViewer } from "./selection-policy-viewer";
import { DecisionSimulator } from "./decision-simulator";

type TabKey = "contract" | "preview" | "policy" | "simulator";

export function TemplateManagerPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("contract");
  const [payloadJson, setPayloadJson] = useState("{}");
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const definition = selectedId ? getRegistryDefinition(selectedId) : null;

  function handlePayloadChange(json: string) {
    setPayloadJson(json);
    setParseError(null);
    setValidationErrors([]);
    try {
      JSON.parse(json);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedId(templateId);
    const def = getRegistryDefinition(templateId);
    if (def?.previewCases[0]) {
      setPayloadJson(JSON.stringify(def.previewCases[0].payload, null, 2));
    } else {
      setPayloadJson("{}");
    }
    setParseError(null);
    setValidationErrors([]);
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "contract", label: "Contract" },
    { key: "preview", label: "Preview" },
    { key: "policy", label: "Policy" },
    { key: "simulator", label: "Simulator" },
  ];

  return (
    <div className={styles.templateManagerLayout}>
      <TemplateListPanel selectedId={selectedId} onSelect={handleSelectTemplate} />
      <div className={styles.templateDetailPane}>
        {!definition ? (
          <div className={styles.templateDetailEmpty}>
            좌측에서 template를 선택하세요.
          </div>
        ) : (
          <>
            <div className={styles.templateDetailHeader}>
              <h3 className={styles.templateDetailTitle}>{definition.title}</h3>
              <p className={styles.templateDetailDesc}>{definition.description}</p>
            </div>
            <div className={styles.templateTabs}>
              {TABS.map((tab) => (
                <button
                  className={`${styles.templateTab} ${activeTab === tab.key ? styles.templateTabActive : ""}`}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "contract" ? (
              <TemplateContractViewer definition={definition} />
            ) : null}

            {activeTab === "preview" ? (
              <div className={styles.templatePreviewSplit}>
                <ExamplePayloadEditor
                  definition={definition}
                  onChange={handlePayloadChange}
                  parseError={parseError}
                  validationErrors={validationErrors}
                  value={payloadJson}
                />
                <TemplateLivePreview
                  payloadJson={payloadJson}
                  templateId={definition.templateId}
                />
              </div>
            ) : null}

            {activeTab === "policy" ? (
              <SelectionPolicyViewer definition={definition} />
            ) : null}

            {activeTab === "simulator" ? (
              <DecisionSimulator />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
