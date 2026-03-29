# Mock AI 응답 시스템 계획

## 현재 문제

AI key가 없을 때:
- `callLlmOrFallback` → `buildContextualSummary` → "현재 배포 페이지입니다" 같은 무미건조한 문구
- 스트리밍 타이핑 효과 없음 — 텍스트가 한 번에 뜸
- 도메인 지식이 없는 generic 응답
- 발표/데모에서 AI가 작동하는 것처럼 보이지 않음

## 목표

AI key 없어도:
1. **자연스러운 한국어 응답**이 나옴
2. **타이핑 애니메이션** (글자 단위 스트리밍)으로 AI가 생성하는 것처럼 보임
3. **도메인 특화 답변** — 배포/승인/롤백 전문 지식
4. **tool 결과 해석** — tool summary를 자연어로 풀어서 설명
5. 실제 AI와 **동일한 UX 흐름** (delta → result)

## 대상 케이스 목록

### Deploy (배포)

| # | 입력 패턴 | mock 응답 |
|---|----------|-----------|
| D-1 | "배포가 뭐야?" | 배포는 새로운 버전의 코드를 서버에 반영하는 과정입니다. 이 콘솔에서는 서비스별로 버전을 선택하고, preflight check을 거친 후 rolling/canary 전략으로 안전하게 배포할 수 있습니다. |
| D-2 | "rolling 배포랑 blue-green 차이" | Rolling 배포는 인스턴스를 순차적으로 교체하는 방식이고, Blue-Green은 새 환경을 완전히 준비한 후 트래픽을 한 번에 전환하는 방식입니다. Rolling은 점진적이라 리스크가 낮고, Blue-Green은 전환이 빠르지만 리소스가 두 배 필요합니다. |
| D-3 | "주의사항 알려줘" | Production 배포 시 주의사항입니다:\n1. Preflight check 결과를 반드시 확인하세요\n2. 배포 전 rollback 계획을 준비하세요\n3. 트래픽이 적은 시간대를 선택하세요\n4. 모니터링 대시보드를 열어두세요\n5. 팀 채널에 배포 시작을 공유하세요 |
| D-4 | tool: 배포 이력 | {tool결과}를 기반으로: 최근 배포 현황을 정리해 드리겠습니다. {서비스}는 {날짜}에 {버전}으로 마지막 배포되었으며, 현재 {상태} 상태입니다. |
| D-5 | tool: 서비스 목록 | 현재 배포 가능한 서비스 목록입니다. 어떤 서비스를 배포할지 선택해 주세요. |
| D-6 | tool: 서비스 컨텍스트 | {서비스} 배포 컨텍스트를 확인했습니다. 추천 버전은 {버전}이며, {환경} 환경에 배포할 수 있습니다. |

### Approval (승인)

| # | 입력 패턴 | mock 응답 |
|---|----------|-----------|
| A-1 | "승인이 뭐야?" | 승인은 보안이나 운영 정책에 따라 특정 작업을 실행하기 전에 권한자의 검토와 허가를 받는 절차입니다. 임시 접근 권한, 설정 변경, 데이터 작업 세 가지 유형이 있습니다. |
| A-2 | "temporary access랑 config change 차이" | 임시 접근 권한(Temporary Access)은 특정 리소스에 대한 일시적 접근을 요청하는 것이고, 설정 변경(Config Change)은 서비스 설정값을 변경하는 승인입니다. 임시 접근은 만료 시간이 있고, 설정 변경은 롤백 방법을 함께 명시해야 합니다. |
| A-3 | "보류하면 어떻게 돼?" | 요청을 보류하면 즉시 거절되지는 않지만 실행이 중단됩니다. 보류 상태에서는 추가 정보를 요청하거나, 다른 승인자에게 위임할 수 있습니다. 요청자에게 보류 사유가 전달됩니다. |
| A-4 | tool: 큐 현황 | {tool결과}를 기반으로: 현재 승인 대기 큐를 정리해 드리겠습니다. 총 {N}건이 대기 중이며, 고위험 요청이 {M}건 있습니다. |

### Rollback (롤백)

| # | 입력 패턴 | mock 응답 |
|---|----------|-----------|
| R-1 | "롤백이 뭐야?" | 롤백은 문제가 발생한 현재 버전을 이전 안정 버전으로 되돌리는 작업입니다. Dry run으로 사전 검증 후, 최종 확인을 거쳐 실행됩니다. 인시던트 상황에서 서비스를 빠르게 복구하는 핵심 수단입니다. |
| R-2 | "dry run이 뭐야?" | Dry run은 실제 롤백을 수행하기 전에 시뮬레이션으로 검증하는 단계입니다. 환경 호환성, 의존성 충돌, 트래픽 전환 가능 여부를 미리 확인합니다. Dry run에서 문제가 발견되면 실제 롤백 전에 대응할 수 있습니다. |
| R-3 | "데이터는 어떻게 돼?" | 롤백 시 코드 버전은 되돌아가지만, 데이터베이스 마이그레이션은 자동으로 되돌아가지 않습니다. 스키마 변경이 포함된 배포의 경우 backward-compatible 마이그레이션인지 먼저 확인해야 합니다. |
| R-4 | tool: 롤백 후보 | {tool결과}를 기반으로: 현재 롤백 가능한 서비스를 정리해 드리겠습니다. {N}개 서비스에서 인시던트가 감지되었으며, 롤백 가능 버전이 총 {M}건 있습니다. |

### 공통

| # | 입력 패턴 | mock 응답 |
|---|----------|-----------|
| C-1 | "고마워" / "됐어" | 도움이 되셨다면 기쁩니다! 다른 작업이 필요하시면 언제든 말씀해 주세요. |
| C-2 | 매칭 안 되는 일반 질문 | 해당 내용은 현재 콘솔 컨텍스트에서 확인하기 어렵습니다. 배포, 승인, 롤백 관련 질문이나 작업을 요청해 주시면 도움드릴 수 있습니다. |

## 구현 방식

### 1. Mock 응답 DB

```ts
// src/devops-chat/server/ai/mock-responses.ts

type MockEntry = {
  patterns: RegExp[];
  response: string | ((ctx) => string);
  domain?: "deploy" | "approval" | "rollback";
};
```

### 2. Tool 결과 해석 템플릿

```ts
// tool summary를 자연어로 변환
type ToolNarrator = (toolName: string, summary: string, ctx) => string;
```

### 3. 타이핑 시뮬레이션

```ts
// 글자 단위로 onDelta 콜백 호출 (20~40ms 간격)
async function simulateStreaming(text: string, onDelta: (chunk: string) => void): Promise<void>
```

### 4. 통합 포인트

```
callLlmOrFallback()에서:
  API key 없음
    → mock DB에서 패턴 매칭
    → tool summary가 있으면 narration 생성
    → simulateStreaming으로 타이핑 효과
    → 자연스러운 한국어 응답 반환
```

---

## Todo List

### A. Mock 응답 DB 작성

* [x] `src/devops-chat/server/ai/mock-responses.ts` 생성
* [x] Deploy 텍스트 응답 6개 등록
* [x] Approval 텍스트 응답 4개 등록
* [x] Rollback 텍스트 응답 4개 등록
* [x] 공통 응답 2개 등록
* [x] 패턴 매칭 함수 `findMockResponse(input, pageKey)` 구현

### B. Tool 결과 해석 (narration)

* [x] `src/devops-chat/server/ai/tool-narrator.ts` 생성
* [x] `getPreviousDeployments` 결과 → 배포 이력 자연어 요약
* [x] `getDeployableServices` 결과 → 서비스 목록 안내 문구
* [x] `getServiceDeployContext` 결과 → 배포 컨텍스트 설명
* [x] `getApprovalQueueSummary` 결과 → 승인 큐 현황 설명
* [x] `getRollbackCandidates` 결과 → 롤백 후보 현황 설명

### C. 타이핑 시뮬레이션

* [x] `src/devops-chat/server/ai/simulate-streaming.ts` 생성
* [x] 글자 단위 스트리밍 (20~40ms 랜덤 간격)
* [x] 문장 끝(마침표, 쉼표)에서 약간 더 긴 pause
* [x] `onDelta` 콜백 호출로 실시간 타이핑 효과

### D. orchestrator 통합

* [x] `callLlmOrFallback`에서 API key 없을 때 mock 경로 사용
* [x] mock 응답 + 타이핑 시뮬레이션 연결
* [x] tool summary가 있으면 narration으로 자연어 변환
* [x] narration도 타이핑 시뮬레이션 적용
* [x] 기존 `buildContextualSummary` 제거 또는 최후 fallback으로 유지

### E. 테스트

* [x] mock 패턴 매칭 테스트 (각 도메인 × 입력)
* [x] tool narrator 테스트
* [x] 타이핑 시뮬레이션이 onDelta를 호출하는지 테스트
* [x] API key 없을 때 전체 흐름 통합 테스트
* [x] 기존 265개 테스트 깨지지 않는지 확인
