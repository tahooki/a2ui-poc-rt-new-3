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
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      <div style={{ width: 280, flexShrink: 0, overflow: "auto" }}>
        <TemplateListPanel selectedId={selectedId} onSelect={handleSelectTemplate} />
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {!definition ? (
          <div style={{ padding: 24, opacity: 0.5 }}>
            좌측에서 template를 선택하세요.
          </div>
        ) : (
          <>
            <h3 className={styles.panelTitle}>{definition.title}</h3>
            <p style={{ opacity: 0.7, marginBottom: 12 }}>{definition.description}</p>
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {TABS.map((tab) => (
                <button
                  className={styles.chatAwaitingChip}
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={activeTab === tab.key ? { fontWeight: 700 } : undefined}
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
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <ExamplePayloadEditor
                    definition={definition}
                    onChange={handlePayloadChange}
                    parseError={parseError}
                    validationErrors={validationErrors}
                    value={payloadJson}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TemplateLivePreview
                    payloadJson={payloadJson}
                    templateId={definition.templateId}
                  />
                </div>
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
