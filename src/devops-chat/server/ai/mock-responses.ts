/**
 * Mock AI response database.
 *
 * When no OpenAI API key is available, these pattern-matched responses
 * provide realistic Korean answers that simulate AI behavior.
 */

type MockEntry = {
  patterns: RegExp[];
  response: string;
  domain?: "deploy" | "approval" | "rollback";
};

// ---------------------------------------------------------------------------
// Deploy domain
// ---------------------------------------------------------------------------

const DEPLOY_MOCKS: MockEntry[] = [
  {
    patterns: [/배포가\s*뭐/, /배포\s*설명/, /배포\s*개념/],
    response: "배포는 새로운 버전의 코드를 서버에 반영하는 과정입니다. 이 콘솔에서는 서비스별로 버전을 선택하고, preflight check을 거친 후 rolling/canary 전략으로 안전하게 배포할 수 있습니다.",
    domain: "deploy",
  },
  {
    patterns: [/rolling.*blue.?green/, /blue.?green.*rolling/, /배포\s*전략.*차이/, /전략.*비교/],
    response: "Rolling 배포는 인스턴스를 순차적으로 교체하는 방식이고, Blue-Green은 새 환경을 완전히 준비한 후 트래픽을 한 번에 전환합니다. Rolling은 점진적이라 리스크가 낮고, Blue-Green은 전환이 빠르지만 리소스가 두 배 필요합니다.",
    domain: "deploy",
  },
  {
    patterns: [/주의사항/, /주의\s*할\s*점/, /조심/, /체크리스트/],
    response: "Production 배포 시 주의사항입니다:\n1. Preflight check 결과를 반드시 확인하세요\n2. 배포 전 rollback 계획을 준비하세요\n3. 트래픽이 적은 시간대를 선택하세요\n4. 모니터링 대시보드를 열어두세요\n5. 팀 채널에 배포 시작을 공유하세요",
    domain: "deploy",
  },
  {
    patterns: [/canary.*뭐/, /canary.*설명/, /카나리/],
    response: "Canary 배포는 새 버전을 소수의 인스턴스(보통 5~10%)에 먼저 배포하고, 문제가 없으면 점진적으로 100%까지 확대하는 전략입니다. 문제 발생 시 소수의 트래픽만 영향받으므로 안전합니다.",
    domain: "deploy",
  },
  {
    patterns: [/배포\s*실패/, /실패\s*하면/, /배포.*잘못/],
    response: "배포 실패 시 자동으로 이전 버전으로 롤백됩니다. 헬스체크에서 실패하면 트래픽 전환이 중단되고, 롤백 탭에서 수동 롤백도 가능합니다. 실패 원인은 배포 이력에서 확인할 수 있습니다.",
    domain: "deploy",
  },
];

// ---------------------------------------------------------------------------
// Approval domain
// ---------------------------------------------------------------------------

const APPROVAL_MOCKS: MockEntry[] = [
  {
    patterns: [/승인이\s*뭐/, /승인\s*설명/, /승인\s*개념/, /승인\s*절차/],
    response: "승인은 보안이나 운영 정책에 따라 특정 작업을 실행하기 전에 권한자의 검토와 허가를 받는 절차입니다. 이 콘솔에서는 임시 접근 권한, 설정 변경, 데이터 작업 세 가지 유형의 승인을 처리합니다.",
    domain: "approval",
  },
  {
    patterns: [/temporary.*config/, /config.*temporary/, /임시.*설정/, /접근.*변경.*차이/],
    response: "임시 접근 권한(Temporary Access)은 특정 리소스에 대한 일시적 접근을 요청하는 것이고, 설정 변경(Config Change)은 서비스 설정값을 변경하는 승인입니다. 임시 접근은 만료 시간이 있고, 설정 변경은 롤백 방법을 함께 명시해야 합니다.",
    domain: "approval",
  },
  {
    patterns: [/보류.*어떻게/, /보류.*되/, /hold.*하면/],
    response: "요청을 보류하면 즉시 거절되지는 않지만 실행이 중단됩니다. 보류 상태에서는 추가 정보를 요청하거나 다른 승인자에게 위임할 수 있습니다. 요청자에게 보류 사유가 전달됩니다.",
    domain: "approval",
  },
  {
    patterns: [/고위험.*처리/, /고위험.*어떻게/, /위험.*요청/, /danger/i],
    response: "고위험 요청은 riskTone이 danger로 표시됩니다. 일반 요청보다 더 신중한 검토가 필요하며, 영향 범위(blast radius)와 복구 방법을 반드시 확인한 후 승인해야 합니다.",
    domain: "approval",
  },
  {
    patterns: [/승인\s*권한/, /누가.*승인/, /권한.*누구/],
    response: "승인 권한은 요청 유형과 환경에 따라 다릅니다. Production 환경의 경우 팀 리드 이상, staging은 시니어 엔지니어 이상이 승인할 수 있습니다. 현재 콘솔에서는 사용자의 권한에 맞는 요청만 표시됩니다.",
    domain: "approval",
  },
];

// ---------------------------------------------------------------------------
// Rollback domain
// ---------------------------------------------------------------------------

const ROLLBACK_MOCKS: MockEntry[] = [
  {
    patterns: [/롤백이\s*뭐/, /롤백\s*설명/, /롤백\s*개념/],
    response: "롤백은 문제가 발생한 현재 버전을 이전 안정 버전으로 되돌리는 작업입니다. Dry run으로 사전 검증 후, 최종 확인을 거쳐 실행됩니다. 인시던트 상황에서 서비스를 빠르게 복구하는 핵심 수단입니다.",
    domain: "rollback",
  },
  {
    patterns: [/dry\s*run.*뭐/i, /드라이\s*런/, /사전\s*검증/],
    response: "Dry run은 실제 롤백 전에 시뮬레이션으로 검증하는 단계입니다. 환경 호환성, 의존성 충돌, 트래픽 전환 가능 여부를 미리 확인합니다. 문제가 발견되면 실제 롤백 전에 대응할 수 있습니다.",
    domain: "rollback",
  },
  {
    patterns: [/데이터.*어떻게/, /데이터.*돼/, /DB.*롤백/, /마이그레이션/],
    response: "롤백 시 코드 버전은 되돌아가지만, 데이터베이스 마이그레이션은 자동으로 되돌아가지 않습니다. 스키마 변경이 포함된 배포의 경우 backward-compatible 마이그레이션인지 먼저 확인해야 합니다.",
    domain: "rollback",
  },
  {
    patterns: [/canary.*rolling.*롤백/, /rolling.*canary.*롤백/, /롤백.*전략.*차이/],
    response: "Canary 롤백은 소수 인스턴스부터 순차 복구하여 안전하게 되돌리고, Rolling 롤백은 전체 인스턴스를 동시에 이전 버전으로 교체합니다. Canary가 더 안전하지만 시간이 더 걸립니다.",
    domain: "rollback",
  },
  {
    patterns: [/롤백\s*실패/, /롤백.*잘못/, /실패.*롤백/],
    response: "롤백이 실패하면 현재 상태가 유지됩니다. Dry run에서 실패했다면 다른 버전으로 재시도할 수 있고, 트래픽 전환에서 실패했다면 수동 개입이 필요합니다. 운영팀에 즉시 에스컬레이션하는 것을 권장합니다.",
    domain: "rollback",
  },
];

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

const COMMON_MOCKS: MockEntry[] = [
  {
    patterns: [/고마워/, /감사/, /땡큐/, /thank/i],
    response: "도움이 되셨다면 기쁩니다! 다른 작업이 필요하시면 언제든 말씀해 주세요.",
  },
  {
    patterns: [/됐어/, /괜찮아/, /그만/, /끝/],
    response: "알겠습니다. 추가 작업이 필요하시면 말씀해 주세요.",
  },
  {
    patterns: [/안녕/, /하이/, /hello/i, /hi\b/i],
    response: "안녕하세요! 배포, 승인, 롤백 관련 작업을 도와드릴 수 있습니다. 무엇을 도와드릴까요?",
  },
];

// ---------------------------------------------------------------------------
// All entries combined
// ---------------------------------------------------------------------------

const ALL_MOCKS: MockEntry[] = [
  ...DEPLOY_MOCKS,
  ...APPROVAL_MOCKS,
  ...ROLLBACK_MOCKS,
  ...COMMON_MOCKS,
];

// ---------------------------------------------------------------------------
// Lookup function
// ---------------------------------------------------------------------------

const FALLBACK_RESPONSE = "배포, 승인, 롤백 관련 질문이나 작업을 요청해 주시면 도움드리겠습니다. 예를 들어 \"배포하고 싶어\", \"승인 요청 확인해줘\", \"롤백 후보 알려줘\" 등을 시도해 보세요.";

export function findMockResponse(
  input: string,
  pageKey?: string,
): string {
  const trimmed = input.trim();

  // Try domain-specific first if on matching page
  if (pageKey) {
    const domainMocks = ALL_MOCKS.filter((m) => m.domain === pageKey || !m.domain);
    for (const entry of domainMocks) {
      if (entry.patterns.some((p) => p.test(trimmed))) {
        return entry.response;
      }
    }
  }

  // Try all patterns
  for (const entry of ALL_MOCKS) {
    if (entry.patterns.some((p) => p.test(trimmed))) {
      return entry.response;
    }
  }

  return FALLBACK_RESPONSE;
}
