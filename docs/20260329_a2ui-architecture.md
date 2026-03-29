# A2UI Chatbot Architecture

## 한눈에 보는 전체 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                              │
│                                                                         │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │  Chat Panel   │    │ Conversation     │    │  Template Surface    │  │
│  │  (입력/메시지) │───▶│ Store (Zustand)  │───▶│  (A2UI 렌더링)       │  │
│  └──────┬───────┘    └────────▲─────────┘    └───────────────────────┘  │
│         │                     │                                         │
│         │ POST /api/chat      │ SSE (delta, tool, result, done)         │
└─────────┼─────────────────────┼─────────────────────────────────────────┘
          │                     │
          ▼                     │
┌─────────────────────────────────────────────────────────────────────────┐
│                          Server (Next.js API)                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  orchestrateChatTurn()                           │    │
│  │                     (8-Step Pipeline)                            │    │
│  │                                                                 │    │
│  │  Step 1. State Hydration                                        │    │
│  │      ↓                                                          │    │
│  │  Step 2. Awaiting Resolution ─── 슬롯을 채우고 있는 중인가?      │    │
│  │      ↓                                                          │    │
│  │  Step 3. Intent Resolution ──── 사용자가 뭘 하려는 건가?         │    │
│  │      ↓                                                          │    │
│  │  Step 4-6. Tool Loop ────────── 데이터를 가져와야 하나?          │    │
│  │      ↓                                                          │    │
│  │  Step 7. Decision ──────────── 어떻게 응답할 것인가?             │    │
│  │      ↓                                                          │    │
│  │  Step 8. Response Build ─────── 텍스트? Surface? 추가 질문?      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline 8단계 상세

### Step 1. State Hydration — 상태 복원

서버는 stateless입니다. 매 턴마다 클라이언트가 보내주는 상태를 복원합니다.

```
Client가 보내는 것:
├── userMessage: "payments-api 배포해줘"
├── history: 이전 대화 메시지들
├── intent: 현재 인텐트 (deploy.start 등)
├── workflow: 현재 워크플로우 상태
├── awaiting: 대기 중인 슬롯 정보
├── facts: 축적된 사실들 (슬롯 값, 도구 결과 등)
└── contextSnapshot: { pageKey, selectedEntity }
```

---

### Step 2. Awaiting Resolution — "아까 물어본 거에 대한 답인가?"

이전 턴에서 AI가 질문을 했다면 (`awaiting` 상태), 이번 입력은 그 답변일 수 있습니다.

```
                    awaiting 상태인가?
                         │
                    ┌────┴────┐
                    │ Yes     │ No → Step 3으로
                    ▼
            ┌───────────────┐
            │ AI Resolver   │ ← LLM이 있으면 AI로 판단
            │ (or Rule)     │ ← 없으면 규칙 기반 매칭
            └───────┬───────┘
                    │
        ┌───────────┼───────────┬──────────────┐
        ▼           ▼           ▼              ▼
    fill_slot    correction   cancel       interrupt
    (슬롯 채움)   (정정)       (취소)       (새 인텐트)
        │           │           │              │
        ▼           ▼           ▼              ▼
   facts 업데이트  이전 값 제거  awaiting 해제   Step 3으로
                  다시 질문                    (새 의도 처리)
```

**예시:**
```
AI: "어떤 서비스를 배포할까요?" (awaiting: deploy.serviceName)

👤 "payments-api"  → fill_slot → serviceName = "payments-api"
👤 "아니 checkout" → correction → serviceName = "checkout"
👤 "취소해줘"      → cancel    → awaiting 해제
👤 "롤백하고 싶어" → interrupt → rollback.start로 전환
```

---

### Step 3. Intent Resolution — "사용자가 뭘 하려는 건가?"

사용자 입력에서 **의도(intent)**와 **슬롯(slot)**을 추출합니다.

```
                사용자 입력
                    │
            ┌───────┴───────┐
            │  AI Resolver   │ ← LLM: 의도 + 슬롯 + 신뢰도
            │  (or Regex)    │ ← Fallback: 패턴 매칭
            └───────┬───────┘
                    │
                    ▼
    ┌──────────────────────────────────────┐
    │           7가지 Intent               │
    │                                      │
    │  deploy.start      배포 시작 흐름     │
    │  deploy.history    배포 이력 조회     │
    │  approval.review   승인 처리 흐름     │
    │  approval.status   승인 현황 조회     │
    │  rollback.start    롤백 시작 흐름     │
    │  rollback.status   롤백 상태 조회     │
    │  general.qna       일반 질의응답      │
    └──────────────────────────────────────┘
```

**한 문장에서 인텐트 + 슬롯 동시 추출:**
```
"payments-api 배포해줘"
  → intent: deploy.start
  → slot: deploy.serviceName = "payments-api"
```

**인텐트 전환 시 이전 네임스페이스 슬롯 초기화:**
```
deploy.start → rollback.start 전환 시
  deploy.* 슬롯 전부 제거, rollback.* 슬롯으로 전환
```

---

### Step 4-6. Tool Loop — "데이터를 가져와야 하나?"

인텐트와 현재 슬롯 상태를 보고, 필요한 데이터를 도구로 조회합니다.
**최대 3회 반복** (한 도구 결과가 다음 도구의 입력이 될 수 있음).

```
            ┌─────────────────────────────────────────────┐
            │              Tool Loop (max 3)               │
            │                                             │
            │  Step 4. Plan                               │
            │    intent + facts → 어떤 tool이 필요한가?    │
            │         │                                    │
            │         ▼                                    │
            │  Step 5. Execute                             │
            │    tool.execute(facts) → raw data            │
            │         │                                    │
            │         ▼                                    │
            │  Step 6. Adapt & Merge                       │
            │    raw data → facts patch + slot patch       │
            │    facts = merge(facts, patch)               │
            │         │                                    │
            │         └── 더 필요한 tool? → Step 4로       │
            └─────────────────────────────────────────────┘
```

**도구 실행 예시:**

| Intent | 현재 상태 | 실행할 Tool | 결과 |
|--------|----------|------------|------|
| deploy.start | serviceName 없음 | `getDeployableServices` | 서비스 목록 → 선택지 제공 |
| deploy.start | serviceName 있음 | `getServiceDeployContext` | 버전, 이미지 등 → Surface 데이터 |
| approval.review | — | `getApprovalQueueSummary` | 큐 목록 → Surface 데이터 |
| rollback.start | serviceName 있음 | `getRollbackCandidates` | 롤백 후보 → Surface 데이터 |

**SSE로 도구 실행 상태를 실시간 전달:**
```
event: tool  →  { name: "getServiceDeployContext", status: "running" }
event: tool  →  { name: "getServiceDeployContext", status: "done", summary: "..." }
```

---

### Step 7. Decision — "어떻게 응답할 것인가?"

인텐트별 **정책(Policy)**이 현재 슬롯 상태를 평가하고 응답 방식을 결정합니다.

```
            ┌──────────────────────────────────────────┐
            │          Decision Engine                  │
            │                                          │
            │  intent + filled slots → Policy 평가      │
            │                                          │
            │  ┌─────────────┐                         │
            │  │Deploy Policy│                         │
            │  │ required:   │                         │
            │  │  serviceName│                         │
            │  │ extended:   │                         │
            │  │  context    │                         │
            │  └──────┬──────┘                         │
            │         │                                │
            │    ┌────┼──────────┬──────────────┐      │
            │    ▼    ▼          ▼              ▼      │
            │  text  ask_followup  render_surface      │
            └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │                    3가지 Decision Mode                       │
    │                                                              │
    │  text             일반 텍스트 응답 (QnA, 이력 조회 등)        │
    │  ask_followup     슬롯이 부족 → 사용자에게 추가 질문          │
    │  render_surface   슬롯이 충분 → A2UI Surface 렌더링          │
    └──────────────────────────────────────────────────────────────┘
```

**Deploy 흐름 Decision 예시:**
```
"배포하고 싶어"
  → serviceName: ✗  context: ✗
  → ask_followup ("어떤 서비스를 배포할까요?")

"payments-api"
  → serviceName: ✓  context: ✗  (tool이 자동 조회)
  → serviceName: ✓  context: ✓
  → render_surface (Quick Deploy Launchpad)
```

---

### Step 8. Response Build — "최종 응답 조립"

Decision 결과에 따라 최종 응답을 구성합니다.

```
            Decision Mode
                │
        ┌───────┼────────────┐
        ▼       ▼            ▼
      text   ask_followup  render_surface
        │       │            │
        ▼       ▼            ▼
    LLM/Mock  프롬프트 +    Template 선택
    텍스트     선택지 칩      → Binder 실행
    생성       (awaiting     → Surface 생성
               설정)         + 텍스트 생성
        │       │            │
        └───────┴────────────┘
                │
                ▼
    ┌────────────────────────────────┐
    │    AssistantTurnResponse       │
    │                                │
    │  message: { text: "..." }      │
    │  surface: SurfaceEnvelope?     │
    │  intent: updated state         │
    │  workflow: updated state       │
    │  awaiting: next slot?          │
    │  toolResults: [...]            │
    │  factsPatch: { ... }           │
    └────────────────────────────────┘
```

---

## Template & Surface 시스템

### Surface가 만들어지는 과정

```
    facts (채워진 슬롯들)
         │
         ▼
    ┌─────────────────┐
    │ Template Selector│    7개 템플릿 중 최적 선택
    │                 │    (인텐트 매칭 + facts 커버리지 점수)
    └────────┬────────┘
             │ 선택된 템플릿
             ▼
    ┌─────────────────┐
    │  Template Binder │    facts → 템플릿 전용 데이터로 변환
    │                 │    (예: deploy facts → LaunchpadData)
    └────────┬────────┘
             │ SurfaceEnvelope
             ▼
    ┌─────────────────┐
    │   Validation     │    필수 필드 검증
    └────────┬────────┘
             │
             ▼
    클라이언트로 전송 → Template Surface 컴포넌트가 렌더링
```

### 7가지 Template

```
    ┌─────────────────────────────────────────────────────────────┐
    │                      Templates                              │
    │                                                             │
    │  Deploy                                                     │
    │  └─ quick_deploy_launchpad ─── 배포 실행 패드               │
    │                                                             │
    │  Approval                                                   │
    │  ├─ approval_queue_inbox ───── 승인 큐 목록                  │
    │  └─ deployment_approval_inbox  개별 승인 상세                │
    │                                                             │
    │  Rollback                                                   │
    │  ├─ rollback_target_list ───── 롤백 대상 목록                │
    │  └─ rollback_summary ───────── 인시던트 요약                 │
    │                                                             │
    │  Common                                                     │
    │  ├─ dry_run_stepper ────────── 단계별 진행 표시              │
    │  └─ confirm_action ─────────── 최종 확인 체크리스트           │
    └─────────────────────────────────────────────────────────────┘
```

---

## Slot Memory 시스템

슬롯은 대화 중 축적되는 "사실"이며, 출처와 신뢰도를 함께 저장합니다.

```
    ┌──────────────────────────────────────────────────────┐
    │  Slot: deploy.serviceName                            │
    │                                                      │
    │  value: "payments-api"                               │
    │  source: "user"           ← 사용자가 직접 입력        │
    │  confidence: 1.0                                     │
    │  updatedAt: "2026-03-29T..."                         │
    └──────────────────────────────────────────────────────┘

    Source 우선순위:
    user (사용자 입력) > selection (UI 선택) > tool (도구 결과) > system (기본값)
```

### Stale Invalidation (의존성 무효화)

```
    deploy.serviceName 변경됨
         │
         ▼ staleWhen 체크
    deploy.selectedServiceContext → 무효화 (삭제)

    → 다음 Tool Loop에서 새 서비스의 context를 다시 조회
```

---

## 전체 흐름 — 실제 배포 시나리오

```
Turn 1: "배포하고 싶어"
─────────────────────────────────────────────────────────
  Awaiting: 없음
  Intent:   deploy.start (신규)
  Tools:    getDeployableServices → [payments-api, checkout, catalog-api]
  Decision: ask_followup (serviceName 없음)
  Response: "어떤 서비스를 배포할까요?"
  Awaiting: { slot: "deploy.serviceName", options: [...] }
  Surface:  없음


Turn 2: "payments-api"
─────────────────────────────────────────────────────────
  Awaiting: deploy.serviceName → fill_slot("payments-api")
  Intent:   deploy.start (유지)
  Tools:    getServiceDeployContext → { version, images, ... }
  Decision: render_surface (serviceName ✓, context ✓)
  Response: "필요한 정보가 모두 준비되었습니다."
  Awaiting: 없음
  Surface:  quick_deploy_launchpad


Turn 2 (대안): "아니 롤백하고 싶어"
─────────────────────────────────────────────────────────
  Awaiting: deploy.serviceName → interrupt 감지
  Intent:   rollback.start (전환!) — deploy.* 슬롯 초기화
  Tools:    getRollbackCandidates → [...]
  Decision: ask_followup (serviceName 없음)
  Response: "어떤 서비스를 롤백할까요?"
  Awaiting: { slot: "rollback.serviceName", options: [...] }
  Surface:  없음 (이전 surface 제거)
```

---

## AI 이중 경로 (Dual Mode)

```
    ┌──────────────────────────────────────────────────┐
    │               API Key 있음?                       │
    │                                                  │
    │   Yes ──────────────┐   No ──────────────┐       │
    │                     ▼                    ▼       │
    │              ┌────────────┐       ┌───────────┐  │
    │              │  LLM Path  │       │ Rule Path │  │
    │              │            │       │           │  │
    │              │ • AI Intent│       │ • Regex   │  │
    │              │   Resolver │       │   매칭    │  │
    │              │ • AI Await │       │ • 패턴    │  │
    │              │   Resolver │       │   기반    │  │
    │              │ • 스트리밍  │       │ • Mock    │  │
    │              │   텍스트   │       │   응답DB  │  │
    │              └────────────┘       └───────────┘  │
    │                     │                    │       │
    │                     └────────┬───────────┘       │
    │                              ▼                   │
    │                    동일한 Pipeline 결과            │
    └──────────────────────────────────────────────────┘

    → API 키 없이도 72개 시나리오 데모 가능
```

---

## SSE 스트리밍 프로토콜

```
    Client                          Server
      │                               │
      │  POST /api/chat               │
      │  { userMessage, state... }    │
      │──────────────────────────────▶│
      │                               │ orchestrateChatTurn() 시작
      │                               │
      │  event: delta                 │
      │  data: "payments-api의"       │
      │◀──────────────────────────────│ 텍스트 스트리밍 (글자 단위)
      │                               │
      │  event: delta                 │
      │  data: " 마지막 배포는..."    │
      │◀──────────────────────────────│
      │                               │
      │  event: tool                  │
      │  data: { name, status }       │
      │◀──────────────────────────────│ 도구 실행 상태
      │                               │
      │  event: result                │
      │  data: { message, surface,    │
      │    intent, awaiting, ... }    │
      │◀──────────────────────────────│ 최종 구조화된 응답
      │                               │
      │  event: done                  │
      │◀──────────────────────────────│ 스트림 종료
      │                               │
```

---

## 핵심 파일 맵

```
src/devops-chat/
├── server/
│   ├── orchestrate-chat-turn.ts    ★ 핵심: 8단계 파이프라인
│   │
│   ├── ai/
│   │   ├── ai-intent-resolver.ts       LLM 인텐트 분류
│   │   ├── ai-awaiting-resolver.ts     LLM 슬롯 해석
│   │   ├── mock-responses.ts           Mock 응답 DB (18개)
│   │   ├── tool-narrator.ts            도구 결과 → 자연어 변환
│   │   └── simulate-streaming.ts       Mock 스트리밍 시뮬레이션
│   │
│   ├── intent/
│   │   └── intent-resolver.ts          규칙 기반 인텐트 분류
│   │
│   ├── awaiting/
│   │   └── awaiting-resolver.ts        규칙 기반 슬롯 해석
│   │
│   ├── slots/
│   │   ├── slot-definitions.ts         슬롯 스키마 정의
│   │   └── slot-memory.ts              슬롯 저장/조회/무효화
│   │
│   ├── tools/
│   │   ├── tool-planner.ts             어떤 도구를 실행할지 계획
│   │   ├── tool-executor.ts            도구 실행 엔진
│   │   ├── tool-result-adapter.ts      결과 → facts 변환
│   │   └── builtin/                    내장 도구들
│   │       ├── get-deployable-services.ts
│   │       ├── get-service-deploy-context.ts
│   │       ├── get-approval-queue-summary.ts
│   │       └── get-rollback-candidates.ts
│   │
│   ├── decision/
│   │   ├── decision-engine.ts          Decision 평가 엔진
│   │   └── policies/                   인텐트별 정책
│   │       ├── deploy-policy.ts
│   │       ├── approval-policy.ts
│   │       └── rollback-policy.ts
│   │
│   └── templates/
│       ├── template-definitions.ts     7개 템플릿 정의
│       ├── template-selector.ts        점수 기반 템플릿 선택
│       ├── surface-lifecycle.ts        Surface 생명주기 관리
│       └── binders/                    facts → 템플릿 데이터 변환
│           ├── bind-deploy-launchpad.ts
│           ├── bind-approval-queue.ts
│           └── bind-rollback-target.ts
│
├── components/
│   ├── chat-assistant-panel.tsx    채팅 UI (입력, 메시지, 선택지)
│   ├── template-surface.tsx        Surface 컴포넌트 렌더링
│   └── template-renderer.tsx       templateId → React 컴포넌트 매핑
│
├── store/
│   └── conversation-store.ts       Zustand 상태 관리
│
├── types/
│   └── domain.ts                   도메인 타입 정의
│
└── api/
    └── chat-api.ts                 SSE 클라이언트 (streamAssistantChat)
```
