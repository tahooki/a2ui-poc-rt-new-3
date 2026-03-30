"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatAssistantPanel } from "@/devops-console/assistant/chat-assistant-panel";
import styles from "@/devops-console/console-page.module.css";
import { ActivityTimeline } from "@/devops-console/sections/activity-timeline";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { DataTable } from "@/devops-console/foundation/data-table";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { SummaryBand } from "@/devops-console/sections/summary-band";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import { buildConsoleViewModel } from "@/devops-chat/view-models/build-console-view-model";
import type { TableRowViewModel } from "@/devops-chat/view-models/build-console-view-model";

type DeployStage = "image" | "request" | "run";

const workflowSteps: Array<{ key: DeployStage; href: string; label: string }> = [
  { key: "image", href: "/deploy/image", label: "1. Image" },
  { key: "request", href: "/deploy/request", label: "2. Request" },
  { key: "run", href: "/deploy/run", label: "3. Run" },
];

const environmentOptions = ["production", "staging"];
const strategyOptions = ["rolling", "canary_10_50_100", "blue_green"];
const buildStatusOptions = ["registered", "push_verified", "build_failed"];
const cpuOptions = [
  { value: "256", label: "0.25 vCPU" },
  { value: "512", label: "0.5 vCPU" },
  { value: "1024", label: "1 vCPU" },
  { value: "2048", label: "2 vCPU" },
];
const memoryOptions = [
  { value: "512", label: "512 MiB" },
  { value: "1024", label: "1 GiB" },
  { value: "2048", label: "2 GiB" },
  { value: "4096", label: "4 GiB" },
];

function getCpuLabel(value: string) {
  return cpuOptions.find((option) => option.value === value)?.label ?? value;
}

function getMemoryLabel(value: string) {
  return memoryOptions.find((option) => option.value === value)?.label ?? value;
}

const stageCopy = {
  image: {
    title: "Deploy image registration",
    role: "Registry에 push된 이미지를 등록하고 배포 가능한 artifact로 관리하는 단계입니다.",
    aws: "AWS 기준으로는 ECR 또는 container registry에 push된 이미지 메타데이터를 운영자가 확인하는 흐름을 단순화합니다.",
  },
  request: {
    title: "Deploy request composition",
    role: "등록된 이미지를 선택하고 서비스별 배포 정의를 만드는 단계입니다.",
    aws: "AWS 기준으로는 ECS task definition 및 service deployment config를 request 형태로 조합하는 흐름을 단순화합니다.",
  },
  run: {
    title: "Deploy run execution",
    role: "생성된 request를 실행하고 rollout, health, verification 상태를 추적하는 단계입니다.",
    aws: "AWS 기준으로는 ECS service deployment와 rollout monitoring을 운영 콘솔에서 추적하는 흐름을 단순화합니다.",
  },
} as const;

function WorkflowNav({ activeStage }: { activeStage: DeployStage }) {
  return (
    <nav className={styles.workflowNav}>
      {workflowSteps.map((step) => (
        <Link
          className={`${styles.workflowNavItem} ${activeStage === step.key ? styles.workflowNavItemActive : ""}`}
          href={step.href}
          key={step.key}
        >
          {step.label}
        </Link>
      ))}
    </nav>
  );
}

export function DeployWorkflowPage({ stage }: { stage: DeployStage }) {
  const router = useRouter();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [imageSubTab, setImageSubTab] = useState<"list" | "register">("list");
  const pages = useDevopsConsoleStore((state) => state.pages);
  const setDeployWorkflowField = useDevopsConsoleStore((state) => state.setDeployWorkflowField);
  const registerDeployImage = useDevopsConsoleStore((state) => state.registerDeployImage);
  const selectDeployImage = useDevopsConsoleStore((state) => state.selectDeployImage);
  const selectDeployRequest = useDevopsConsoleStore((state) => state.selectDeployRequest);
  const submitDeployRequest = useDevopsConsoleStore((state) => state.submitDeployRequest);
  const startDeployRun = useDevopsConsoleStore((state) => state.startDeployRun);
  const completeDeployRun = useDevopsConsoleStore((state) => state.completeDeployRun);
  const viewModel = buildConsoleViewModel("deploy", pages);
  const deployPage = pages.deploy;
  const selectedImage =
    deployPage.images.find((image) => image.id === deployPage.workflow.selectedRegisteredImageId) ?? null;
  const selectedRequestImage =
    deployPage.images.find((image) => image.id === deployPage.workflow.requestDraft.selectedImageId) ?? null;
  const selectedRequest = deployPage.items.find((item) => item.id === deployPage.selectedId) ?? null;

  const summaryMetrics =
    stage === "image"
      ? [
          { label: "등록 이미지", value: `${deployPage.images.length}`, tone: "info" as const },
          {
            label: "push verified",
            value: `${deployPage.images.filter((image) => image.buildStatus === "push_verified").length}`,
            tone: "success" as const,
          },
          { label: "작성된 request", value: `${deployPage.items.length}`, tone: "warning" as const },
          {
            label: "선택 이미지",
            value: selectedImage ? selectedImage.imageTag : "없음",
            tone: "neutral" as const,
          },
        ]
      : stage === "request"
        ? [
            { label: "선택 가능한 이미지", value: `${deployPage.images.length}`, tone: "info" as const },
            {
              label: "request ready",
              value: deployPage.workflow.requestDraft.selectedImageId ? "yes" : "no",
              tone: deployPage.workflow.requestDraft.selectedImageId ? ("success" as const) : ("warning" as const),
            },
            { label: "작성된 request", value: `${deployPage.items.length}`, tone: "warning" as const },
            {
              label: "선택 이미지",
              value: selectedRequestImage ? selectedRequestImage.imageTag : "미선택",
              tone: "neutral" as const,
            },
          ]
        : [
            { label: "생성된 request", value: `${deployPage.items.length}`, tone: "warning" as const },
            {
              label: "진행 중",
              value: `${deployPage.items.filter((item) => item.status === "deploying" || item.status === "verifying").length}`,
              tone: "info" as const,
            },
            {
              label: "완료",
              value: `${deployPage.items.filter((item) => item.status === "succeeded").length}`,
              tone: "success" as const,
            },
            {
              label: "현재 request",
              value: selectedRequest ? selectedRequest.requestId : "없음",
              tone: "neutral" as const,
            },
          ];

  const imageDraft = deployPage.workflow.imageDraft;
  const requestDraft = deployPage.workflow.requestDraft;
  const requestDraftReady = Boolean(
    requestDraft.selectedImageId &&
      requestDraft.service.trim() &&
      requestDraft.environment.trim() &&
      requestDraft.cpu.trim() &&
      requestDraft.memory.trim() &&
      requestDraft.containerPort.trim() &&
      requestDraft.desiredCount.trim() &&
      requestDraft.deploymentStrategy.trim() &&
      requestDraft.minimumHealthyPercent.trim() &&
      requestDraft.maximumPercent.trim() &&
      requestDraft.rollbackBaseline.trim() &&
      requestDraft.requestedBy.trim(),
  );

  const updateImageDraft = (field: keyof typeof imageDraft, value: string) => {
    setDeployWorkflowField("imageDraft", {
      ...imageDraft,
      [field]: value,
    });
  };

  const updateRequestDraft = (field: keyof typeof requestDraft, value: string | null) => {
    setDeployWorkflowField("requestDraft", {
      ...requestDraft,
      [field]: value,
    });
  };

  const imageRows: TableRowViewModel[] = deployPage.images.map((image) => ({
    id: image.id,
    cells: [
      { value: image.repository, mono: true },
      { value: image.imageTag, mono: true },
      { value: image.imageUri, mono: true },
      { value: image.gitRef || image.commitSha, mono: true },
      { value: image.pushedAt, mono: true },
    ],
    statusLabel: image.buildStatus,
    statusTone:
      image.buildStatus === "push_verified"
        ? "success"
        : image.buildStatus === "build_failed"
          ? "danger"
          : "info",
    isSelected: image.id === deployPage.workflow.selectedRegisteredImageId,
  }));

  const requestImageRows: TableRowViewModel[] = deployPage.images.map((image) => ({
    id: image.id,
    cells: [
      { value: image.repository, mono: true },
      { value: image.imageTag, mono: true },
      { value: image.imageUri, mono: true },
      { value: image.imageDigest, mono: true },
      { value: image.buildStatus, mono: true },
    ],
    statusLabel: requestDraft.selectedImageId === image.id ? "selected" : "available",
    statusTone: requestDraft.selectedImageId === image.id ? "success" : "info",
    isSelected: requestDraft.selectedImageId === image.id,
  }));

  const requestRows = viewModel.tableRows.map((row) => ({
    ...row,
    isSelected: row.id === deployPage.selectedId,
  }));

  const selectedRunTone =
    selectedRequest ? viewModel.tableRows.find((row) => row.id === selectedRequest.id)?.statusTone ?? "info" : "neutral";
  const selectedRunLabel =
    selectedRequest ? viewModel.tableRows.find((row) => row.id === selectedRequest.id)?.statusLabel ?? "not started" : "not selected";

  const assistant = <ChatAssistantPanel aiEnabled={aiEnabled} onClose={() => setAssistantOpen(false)} pageKey="deploy" selectedItem={selectedRequest} />;

  return (
    <AppFrame
      activePage="deploy"
      aiEnabled={aiEnabled}
      assistant={assistant}
      assistantOpen={assistantOpen}
      lastUpdated={viewModel.lastUpdated}
      onToggleAi={() => setAiEnabled((v) => !v)}
      onToggleAssistant={() => setAssistantOpen((value) => !value)}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope={viewModel.pageScope}
      pageTitle="Deploy workflow"
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>문서 기준 workflow: image 등록 -&gt; request 생성 -&gt; request 실행/추적</span>
        <span className={styles.headerMetaBadge}>aws-aligned manual flow</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Deploy</div>
            <h1 className={styles.pageTitle}>{stageCopy[stage].title}</h1>
          </div>
        </div>
        <div className={styles.descriptionStack}>
          <div className={styles.calloutCard}>
            <div className={styles.metaLabel}>제품 내 역할</div>
            <div className={styles.propertyValue}>{stageCopy[stage].role}</div>
          </div>
          <div className={styles.calloutCard}>
            <div className={styles.metaLabel}>AWS 의미 설명</div>
            <div className={styles.propertyValue}>{stageCopy[stage].aws}</div>
          </div>
        </div>
      </section>

      <WorkflowNav activeStage={stage} />
      <SummaryBand metrics={summaryMetrics} />

      {stage === "image" ? (
        <>
          <nav className={styles.subTabNav}>
            <button
              className={`${styles.subTabButton} ${imageSubTab === "list" ? styles.subTabButtonActive : ""}`}
              onClick={() => setImageSubTab("list")}
              type="button"
            >
              목록
            </button>
            <button
              className={`${styles.subTabButton} ${imageSubTab === "register" ? styles.subTabButtonActive : ""}`}
              onClick={() => setImageSubTab("register")}
              type="button"
            >
              등록
            </button>
          </nav>

          {imageSubTab === "list" ? (
            <div className={styles.workspaceGrid}>
              <div className={styles.mainColumn}>
                <DataTable
                  columns={["Repository", "Image tag", "Image URI", "Git ref / SHA", "Pushed at", "Status"]}
                  description="등록된 이미지 목록을 관리하고, request 단계에서 사용할 artifact를 검토합니다."
                  onSelectRow={selectDeployImage}
                  rows={imageRows}
                  title="Registered images"
                />
              </div>

              <div className={styles.detailColumn}>
                {selectedImage ? (
                  <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2 className={styles.panelTitle}>Selected image detail</h2>
                        <p className={styles.panelDescription}>현재 등록 목록에서 선택한 이미지의 registry metadata입니다.</p>
                      </div>
                      <StatusChip
                        label={selectedImage.buildStatus}
                        tone={selectedImage.buildStatus === "push_verified" ? "success" : "info"}
                      />
                    </div>
                    <div className={styles.propertyList}>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Repository</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedImage.repository}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Image tag</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedImage.imageTag}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Image URI</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedImage.imageUri}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Image digest</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedImage.imageDigest}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Notes</div>
                        <div className={styles.stackList}>
                          {selectedImage.notes.map((note) => (
                            <div className={styles.propertyValue} key={note}>
                              {note}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <EmptyState
                    description="등록된 이미지를 선택하면 registry metadata와 운영 메모가 표시됩니다."
                    title="선택된 이미지 없음"
                  />
                )}
              </div>
            </div>
          ) : (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Image registration</h2>
                  <p className={styles.panelDescription}>
                    로컬 build/push 결과를 기준으로 배포 가능한 registry artifact를 등록합니다.
                  </p>
                </div>
                <span className={styles.headerMetaBadge}>step 1 / register</span>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Repository</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("repository", event.target.value)} value={imageDraft.repository} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Image tag</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("imageTag", event.target.value)} value={imageDraft.imageTag} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Image URI</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("imageUri", event.target.value)} value={imageDraft.imageUri} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Git ref</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("gitRef", event.target.value)} value={imageDraft.gitRef} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Commit SHA</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("commitSha", event.target.value)} value={imageDraft.commitSha} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Image digest</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("imageDigest", event.target.value)} value={imageDraft.imageDigest} />
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Build status</span>
                  <div className={styles.choiceGrid}>
                    {buildStatusOptions.map((option) => (
                      <button
                        className={`${styles.choiceButton} ${imageDraft.buildStatus === option ? styles.choiceButtonActive : ""}`}
                        key={option}
                        onClick={() => updateImageDraft("buildStatus", option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </label>
                <label className={styles.fieldCard}>
                  <span className={styles.metaLabel}>Pushed at</span>
                  <input className={styles.textInput} onChange={(event) => updateImageDraft("pushedAt", event.target.value)} value={imageDraft.pushedAt} />
                </label>
              </div>

              <div className={styles.inlineActions}>
                <button className={styles.primaryButton} onClick={() => { registerDeployImage(); setImageSubTab("list"); }} type="button">
                  이미지 등록
                </button>
              </div>
            </section>
          )}
        </>
      ) : stage === "request" ? (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            {deployPage.images.length > 0 ? (
              <DataTable
                columns={["Repository", "Image tag", "Image URI", "Digest", "Build status", "Availability"]}
                description="request를 만들 이미지를 여기서 직접 선택합니다. image 단계의 선택이 자동 handoff되지는 않습니다."
                onSelectRow={(imageId) => {
                  const image = deployPage.images.find((candidate) => candidate.id === imageId);
                  updateRequestDraft("selectedImageId", imageId);
                  if (image && !requestDraft.service) {
                    updateRequestDraft("service", image.services[0] ?? image.repository);
                  }
                }}
                rows={requestImageRows}
                title="Image picker"
              />
            ) : (
              <EmptyState
                description="등록된 image가 없으면 deploy request를 만들 수 없습니다. 먼저 image 단계에서 registry artifact를 등록하세요."
                title="등록된 이미지 없음"
              />
            )}

            <section className={`${styles.panel} ${!requestDraft.selectedImageId ? styles.panelDisabled : ""}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Request form</h2>
                  <p className={styles.panelDescription}>
                    등록된 이미지 선택 후 서비스, 환경, ECS-style 배포 설정을 구성합니다.
                  </p>
                </div>
                <span className={styles.headerMetaBadge}>step 2 / compose</span>
              </div>

              {!requestDraft.selectedImageId ? (
                <div className={styles.warningCard}>이미지를 선택하기 전까지 request form은 비활성 상태입니다.</div>
              ) : null}

              <fieldset className={styles.fieldsetReset} disabled={!requestDraft.selectedImageId}>
                <div className={styles.fieldGrid}>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Selected image</span>
                    <input className={styles.textInput} readOnly value={selectedRequestImage?.imageUri ?? ""} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Service</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("service", event.target.value)} value={requestDraft.service} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Environment</span>
                    <div className={styles.choiceGrid}>
                      {environmentOptions.map((option) => (
                        <button
                          className={`${styles.choiceButton} ${requestDraft.environment === option ? styles.choiceButtonActive : ""}`}
                          key={option}
                          onClick={() => updateRequestDraft("environment", option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Deployment strategy</span>
                    <div className={styles.choiceGrid}>
                      {strategyOptions.map((option) => (
                        <button
                          className={`${styles.choiceButton} ${requestDraft.deploymentStrategy === option ? styles.choiceButtonActive : ""}`}
                          key={option}
                          onClick={() => updateRequestDraft("deploymentStrategy", option)}
                          type="button"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>CPU</span>
                    <select
                      className={styles.textInput}
                      onChange={(event) => updateRequestDraft("cpu", event.target.value)}
                      value={requestDraft.cpu}
                    >
                      <option value="">Select CPU</option>
                      {cpuOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Memory</span>
                    <select
                      className={styles.textInput}
                      onChange={(event) => updateRequestDraft("memory", event.target.value)}
                      value={requestDraft.memory}
                    >
                      <option value="">Select memory</option>
                      {memoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Container port</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("containerPort", event.target.value)} value={requestDraft.containerPort} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Desired count</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("desiredCount", event.target.value)} value={requestDraft.desiredCount} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Minimum healthy percent</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("minimumHealthyPercent", event.target.value)} value={requestDraft.minimumHealthyPercent} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Maximum percent</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("maximumPercent", event.target.value)} value={requestDraft.maximumPercent} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Rollback baseline</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("rollbackBaseline", event.target.value)} value={requestDraft.rollbackBaseline} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Requested by</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("requestedBy", event.target.value)} value={requestDraft.requestedBy} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Execution profile</span>
                    <input className={styles.textInput} onChange={(event) => updateRequestDraft("executionProfile", event.target.value)} value={requestDraft.executionProfile} />
                  </label>
                  <label className={styles.fieldCard}>
                    <span className={styles.metaLabel}>Operator note</span>
                    <textarea className={styles.textArea} onChange={(event) => updateRequestDraft("operatorNote", event.target.value)} value={requestDraft.operatorNote} />
                  </label>
                </div>
                <div className={styles.inlineActions}>
                  <button
                    className={styles.primaryButton}
                    disabled={!requestDraftReady}
                    onClick={() => {
                      submitDeployRequest();
                      router.push("/deploy/run");
                    }}
                    type="button"
                  >
                    Deploy request 생성
                  </button>
                </div>
              </fieldset>
            </section>
          </div>
        </div>
      ) : deployPage.items.length === 0 ? (
        <EmptyState
          description="생성된 request가 없으면 run을 시작할 수 없습니다. request 단계에서 이미지를 선택하고 배포 요청을 먼저 만드세요."
          title="실행할 request 없음"
        />
      ) : (
        <div className={styles.workspaceGrid}>
          <div className={styles.mainColumn}>
            <DataTable
              columns={["Request ID", "Service", "Environment", "Image tag", "Strategy", "Requested By", "Updated At", "Status"]}
              description="실행할 request를 선택한 뒤 rollout과 verification을 추적합니다."
              onSelectRow={selectDeployRequest}
              rows={requestRows}
              title="Request execution queue"
            />

            {selectedRequest ? (
              <>
                <section className={styles.selectedHighlight}>
                  <div className={styles.panelHeader}>
                    <div>
                      <div className={styles.sectionEyebrow}>Request execution</div>
                      <h2 className={styles.panelTitle}>{selectedRequest.requestId}</h2>
                      <p className={styles.panelDescription}>
                        request 중심으로 이미지, rollout, health, verification 상태를 함께 추적합니다.
                      </p>
                    </div>
                    <StatusChip label={selectedRunLabel} tone={selectedRunTone} />
                  </div>
                  <div className={styles.heroSplit}>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>Selected image</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedRequest.targetVersion}</div>
                      <div className={styles.propertyValue}>{selectedRequest.artifact}</div>
                    </div>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>Service / Env</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedRequest.service}</div>
                      <div className={styles.propertyValue}>{selectedRequest.environment}</div>
                    </div>
                  </div>
                </section>

                <div className={styles.focusGrid}>
                  <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2 className={styles.panelTitle}>Run summary</h2>
                        <p className={styles.panelDescription}>request 기반 실행 컨텍스트를 먼저 확인합니다.</p>
                      </div>
                    </div>
                    <div className={styles.propertyList}>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Request ID</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.requestId}</div>
                      </div>
                      <div className={styles.propertyItem}>
                      <div className={styles.metaLabel}>CPU / Memory</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>
                          {getCpuLabel(selectedRequest.cpu)} / {getMemoryLabel(selectedRequest.memory)}
                        </div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Desired count</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.desiredCount}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Deployment strategy</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.strategy}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Task definition revision</div>
                        <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.taskDefinitionRevision}</div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h2 className={styles.panelTitle}>Rollout and verify</h2>
                        <p className={styles.panelDescription}>현재 stage, health, verification 상태를 추적합니다.</p>
                      </div>
                    </div>
                    <div className={styles.propertyList}>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Current stage</div>
                        <div className={styles.propertyValue}>{selectedRequest.currentStage}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Rollout progress</div>
                        <div className={styles.propertyValue}>{selectedRequest.rolloutProgress}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Health status</div>
                        <div className={styles.propertyValue}>{selectedRequest.healthStatus}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Verification status</div>
                        <div className={styles.propertyValue}>{selectedRequest.verificationStatus}</div>
                      </div>
                      <div className={styles.propertyItem}>
                        <div className={styles.metaLabel}>Running count</div>
                        <div className={styles.propertyValue}>{selectedRequest.runningCount}</div>
                      </div>
                    </div>
                    <div className={styles.inlineActions}>
                      <button
                        className={styles.primaryButton}
                        disabled={selectedRequest.status === "deploying" || selectedRequest.status === "succeeded"}
                        onClick={startDeployRun}
                        type="button"
                      >
                        Run 시작
                      </button>
                      <button
                        className={styles.secondaryButton}
                        disabled={selectedRequest.status !== "deploying" && selectedRequest.status !== "verifying"}
                        onClick={completeDeployRun}
                        type="button"
                      >
                        완료 반영
                      </button>
                    </div>
                  </section>
                </div>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2 className={styles.panelTitle}>Health and event log</h2>
                      <p className={styles.panelDescription}>request 실행 중 누적되는 health signal과 이벤트입니다.</p>
                    </div>
                  </div>
                  <div className={styles.checkList}>
                    {selectedRequest.healthSignals.map((signal) => (
                      <div className={styles.checkItem} key={signal}>
                        <StatusChip label="health" tone="info" />
                        <span className={styles.propertyValue}>{signal}</span>
                      </div>
                    ))}
                    {selectedRequest.events.map((event) => (
                      <div className={styles.checkItem} key={event}>
                        <StatusChip label="event" tone="neutral" />
                        <span className={styles.propertyValue}>{event}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <ActivityTimeline
                  description="request 생성부터 rollout 완료까지의 운영 타임라인입니다."
                  entries={selectedRequest.activityLog}
                  title="Run timeline"
                />
              </>
            ) : null}
          </div>

          <div className={styles.detailColumn}>
            {selectedRequest ? (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Selected image summary</h2>
                    <p className={styles.panelDescription}>현재 request가 참조하는 image와 rollback baseline입니다.</p>
                  </div>
                </div>
                <div className={styles.propertyList}>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Selected image</div>
                    <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.artifact}</div>
                  </div>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Rollback baseline</div>
                    <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedRequest.rollbackBaseline}</div>
                  </div>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Operator note</div>
                    <div className={styles.propertyValue}>{selectedRequest.operatorNote || "-"}</div>
                  </div>
                </div>
              </section>
            ) : (
              <EmptyState
                description="request를 선택하면 image summary와 rollback baseline이 함께 표시됩니다."
                title="선택된 request 없음"
              />
            )}
          </div>
        </div>
      )}
    </AppFrame>
  );
}
