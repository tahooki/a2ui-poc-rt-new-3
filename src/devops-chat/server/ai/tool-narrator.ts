/**
 * Tool result narrator.
 *
 * Converts raw tool summary strings into natural Korean narration,
 * as if an AI assistant is explaining the results.
 */

export function narrateToolResult(
  toolName: string,
  summary: string,
  pageKey?: string,
): string {
  switch (toolName) {
    case "getPreviousDeployments":
      return narrateDeployHistory(summary);
    case "getDeployableServices":
      return narrateDeployableServices(summary);
    case "getServiceDeployContext":
      return narrateServiceContext(summary);
    case "getApprovalQueueSummary":
      return narrateApprovalQueue(summary);
    case "getRollbackCandidates":
      return narrateRollbackCandidates(summary);
    default:
      return `조회 결과를 확인했습니다. ${summary}`;
  }
}

function narrateDeployHistory(summary: string): string {
  return `최근 배포 현황을 정리해 드리겠습니다.\n\n${summary}\n\n특정 서비스의 상세 이력이 궁금하시면 말씀해 주세요.`;
}

function narrateDeployableServices(summary: string): string {
  return `현재 배포 가능한 서비스 목록을 확인했습니다.\n\n${summary}\n\n어떤 서비스를 배포할지 선택해 주세요.`;
}

function narrateServiceContext(summary: string): string {
  return `배포 컨텍스트를 확인했습니다.\n\n${summary}\n\n위 정보를 기반으로 배포를 준비하겠습니다.`;
}

function narrateApprovalQueue(summary: string): string {
  return `승인 대기 큐를 확인했습니다.\n\n${summary}\n\n우선순위가 높은 요청부터 검토하시는 것을 권장합니다.`;
}

function narrateRollbackCandidates(summary: string): string {
  return `롤백 가능한 서비스를 확인했습니다.\n\n${summary}\n\nCritical 인시던트가 있다면 빠른 대응이 필요합니다.`;
}
