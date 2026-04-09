/**
 * LLM Resolver — PoC에서는 canned 텍스트 반환
 */

const CANNED_RESPONSES: Record<string, Record<string, string>> = {
  deploy_launchpad: {
    riskSummary: "이전 배포와 동일한 설정입니다. 롤링 배포로 안전하게 진행됩니다.",
  },
  approval_queue_inbox: {
    queueSummary: "총 10건의 승인 요청이 있으며, 그 중 2건이 고위험으로 분류됩니다.",
  },
  rollback_summary: {
    causeSummary: "최근 배포에서 timeout 설정 변경이 원인으로 추정됩니다.",
    recommendation: "v2.3.16 버전이 24시간 안정 운영되었으므로 추천합니다.",
  },
};

export async function executeLlmResolver(
  templateId: string,
  _context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // PoC: return canned text, no actual LLM call
  return CANNED_RESPONSES[templateId] ?? {};
}
