"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { runTemplatePreview } from "@/devops-chat/template-registry/run-template-preview";
import { getAllRegistryDefinitions } from "@/devops-chat/template-registry/template-registry";
import type { TemplateRegistryDefinition } from "@/devops-chat/template-registry/registry-types";
import { TemplateRenderer } from "@/devops-chat/templates/template-renderer";

type CatalogFilter = "all" | "deploy" | "approval" | "rollback";

const FILTERS: Array<{ key: CatalogFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "deploy", label: "Deploy" },
  { key: "approval", label: "Approval" },
  { key: "rollback", label: "Rollback" },
];

function familyFor(definition: TemplateRegistryDefinition): Exclude<CatalogFilter, "all"> {
  const intent = definition.selectionPolicyDoc.intentKeys[0] ?? "";
  if (intent.startsWith("approval.")) return "approval";
  if (intent.startsWith("rollback.")) return "rollback";
  return "deploy";
}

function requiredFields(definition: TemplateRegistryDefinition) {
  return definition.inputContract.fields
    .filter((field) => field.required)
    .map((field) => field.path);
}

function TemplateCatalogItem({
  definition,
  selectedCaseId,
  onCaseChange,
  onAction,
}: {
  definition: TemplateRegistryDefinition;
  selectedCaseId?: string;
  onCaseChange: (templateId: string, caseId: string) => void;
  onAction: (entry: string) => void;
}) {
  const previewCase =
    definition.previewCases.find((item) => item.id === selectedCaseId) ??
    definition.previewCases[0];
  const fields = requiredFields(definition);
  const result = previewCase
    ? runTemplatePreview({
        templateId: definition.templateId,
        payloadJson: JSON.stringify(previewCase.payload),
      })
    : null;

  return (
    <section className={styles.catalogTemplateSection} id={definition.templateId}>
      <div className={styles.catalogTemplateHeader}>
        <div className={styles.catalogTemplateTitleBlock}>
          <div className={styles.sectionEyebrow}>{familyFor(definition)} surface</div>
          <h2 className={styles.catalogTemplateTitle}>{definition.title}</h2>
          <p className={styles.catalogTemplateDescription}>{definition.description}</p>
        </div>
        <div className={styles.catalogTemplateBadges}>
          <span className={`${styles.templateListItemStatus} ${styles[`status-${definition.status}`] ?? ""}`}>
            {definition.status}
          </span>
          <span className={styles.headerMetaBadge}>{definition.version}</span>
        </div>
      </div>

      <div className={styles.catalogMetaRow}>
        <span className={styles.signalBadge}>
          <Icon name="terminal" size={13} />
          {definition.rendererKey}
        </span>
        <span className={styles.signalBadge}>
          {definition.previewCases.length} preview case{definition.previewCases.length > 1 ? "s" : ""}
        </span>
        <span className={styles.signalBadge}>
          {definition.selectionPolicyDoc.intentKeys.join(", ")}
        </span>
      </div>

      <div className={styles.catalogFieldRow}>
        {fields.slice(0, 8).map((field) => (
          <span className={styles.filterToken} key={field}>
            {field}
          </span>
        ))}
        {fields.length > 8 ? (
          <span className={styles.filterToken}>+{fields.length - 8}</span>
        ) : null}
      </div>

      {definition.previewCases.length > 1 ? (
        <div className={styles.workflowNav} aria-label={`${definition.title} preview cases`}>
          {definition.previewCases.map((item) => (
            <button
              className={`${styles.workflowNavItem} ${item.id === previewCase?.id ? styles.workflowNavItemActive : ""}`}
              key={item.id}
              onClick={() => onCaseChange(definition.templateId, item.id)}
              type="button"
            >
              {item.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.catalogPreviewSurface}>
        {!result ? (
          <div className={styles.previewError}>Preview case가 없습니다.</div>
        ) : !result.ok ? (
          <div className={styles.previewError}>
            {result.error === "parse_error" ? result.message : result.errors.join("; ")}
          </div>
        ) : (
          <TemplateRenderer
            onAction={(actionId, payload) => {
              onAction(`${definition.templateId}:${actionId}${payload ? ` ${JSON.stringify(payload)}` : ""}`);
            }}
            template={result.template}
          />
        )}
      </div>
    </section>
  );
}

export function A2UITemplateCatalogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("all");
  const [selectedCases, setSelectedCases] = useState<Record<string, string>>({});
  const [actionLog, setActionLog] = useState<string[]>([]);
  const definitions = getAllRegistryDefinitions();
  const visibleDefinitions = definitions.filter((definition) => {
    return activeFilter === "all" || familyFor(definition) === activeFilter;
  });
  const activeCount = definitions.filter((definition) => definition.status === "active").length;
  const previewCaseCount = definitions.reduce((sum, definition) => sum + definition.previewCases.length, 0);
  const intentCount = new Set(definitions.flatMap((definition) => definition.selectionPolicyDoc.intentKeys)).size;

  return (
    <AppFrame
      activePage="a2ui"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated="catalog"
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="a2ui templates"
      pageTitle="A2UI Components"
      sidebarOpen={sidebarOpen}
    >
      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Template catalog</div>
            <h1 className={styles.pageTitle}>A2UI template components</h1>
          </div>
          <div className={styles.catalogQuickLinks}>
            <Link className={styles.secondaryButton} href="/assistant">
              Template Admin
            </Link>
            <Link className={styles.secondaryButton} href="/a2ui-test">
              E2E Test
            </Link>
          </div>
        </div>
        <p className={styles.pageDescription}>
          현재 registry에 등록된 A2UI template surface를 한 화면에서 확인하는 카탈로그입니다.
        </p>
      </section>

      <section className={styles.summaryBand}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Templates</div>
          <div className={styles.metricValue}>{definitions.length}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Active</div>
          <div className={styles.metricValue}>{activeCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Preview cases</div>
          <div className={styles.metricValue}>{previewCaseCount}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Intents</div>
          <div className={styles.metricValue}>{intentCount}</div>
        </div>
      </section>

      <section className={styles.commandBar}>
        <div className={styles.commandBarFilters}>
          {FILTERS.map((filter) => {
            const count =
              filter.key === "all"
                ? definitions.length
                : definitions.filter((definition) => familyFor(definition) === filter.key).length;
            return (
              <button
                className={`${styles.workflowNavItem} ${activeFilter === filter.key ? styles.workflowNavItemActive : ""}`}
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                type="button"
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
        <div className={styles.commandBarActions}>
          <Link className={styles.secondaryButton} href="/a2ui-component-smoke">
            Smoke Renderer
          </Link>
        </div>
      </section>

      <div className={styles.catalogLayout}>
        <aside className={styles.catalogIndexPanel}>
          <div className={styles.sectionEyebrow}>On this page</div>
          {visibleDefinitions.map((definition) => (
            <a className={styles.catalogIndexLink} href={`#${definition.templateId}`} key={definition.templateId}>
              <span>{definition.title}</span>
              <span className={styles.templateListItemVersion}>{definition.previewCases.length}</span>
            </a>
          ))}
        </aside>

        <div className={styles.catalogPreviewList}>
          {visibleDefinitions.map((definition) => (
            <TemplateCatalogItem
              definition={definition}
              key={definition.templateId}
              onAction={(entry) => {
                setActionLog((previous) => [entry, ...previous].slice(0, 8));
              }}
              onCaseChange={(templateId, caseId) => {
                setSelectedCases((previous) => ({ ...previous, [templateId]: caseId }));
              }}
              selectedCaseId={selectedCases[definition.templateId]}
            />
          ))}
        </div>
      </div>

      {actionLog.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.sectionEyebrow}>Action log</div>
              <h2 className={styles.panelTitle}>최근 template action</h2>
            </div>
            <button className={styles.secondaryButton} onClick={() => setActionLog([])} type="button">
              Clear
            </button>
          </div>
          <div className={styles.stackList}>
            {actionLog.map((entry, index) => (
              <div className={`${styles.propertyValue} ${styles.mono}`} key={`${entry}-${index}`}>
                {entry}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppFrame>
  );
}
