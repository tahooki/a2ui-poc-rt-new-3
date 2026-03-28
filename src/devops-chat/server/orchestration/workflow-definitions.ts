import type { IntentKey } from "@/devops-chat/types/conversation";

export type WorkflowStep = {
  stepKey: string;
  description: string;
};

export type WorkflowDefinition = {
  flowKey: string;
  intentKey: IntentKey;
  steps: WorkflowStep[];
};

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  "deploy.start": {
    flowKey: "deploy.start",
    intentKey: "deploy.start",
    steps: [
      { stepKey: "collect_service", description: "배포할 서비스를 수집한다" },
      { stepKey: "collect_context", description: "서비스 배포 컨텍스트를 조회한다" },
      { stepKey: "collect_environment", description: "환경을 확인한다" },
      { stepKey: "ready", description: "배포 준비 완료" },
    ],
  },
  "rollback.start": {
    flowKey: "rollback.start",
    intentKey: "rollback.start",
    steps: [
      { stepKey: "collect_target", description: "롤백 대상을 수집한다" },
      { stepKey: "collect_context", description: "롤백 컨텍스트를 조회한다" },
      { stepKey: "ready", description: "롤백 준비 완료" },
    ],
  },
  "approval.review": {
    flowKey: "approval.review",
    intentKey: "approval.review",
    steps: [
      { stepKey: "collect_target", description: "승인 대상을 수집한다" },
      { stepKey: "review", description: "승인 검토 상태" },
    ],
  },
};

export function getWorkflowForIntent(intentKey: IntentKey): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[intentKey] ?? null;
}

export function getNextStep(flowKey: string, currentStepKey: string): WorkflowStep | null {
  const workflow = WORKFLOW_DEFINITIONS[flowKey];
  if (!workflow) return null;
  const idx = workflow.steps.findIndex((s) => s.stepKey === currentStepKey);
  if (idx < 0 || idx >= workflow.steps.length - 1) return null;
  return workflow.steps[idx + 1];
}
