# A2UI Foundation Design — 파운데이션 단계별 개발 설계

> 대화가 먼저이고, 필요할 때만 A2UI surface가 올라온다.

---

## 현재 상태 요약

| 구분 | 현재 | 목표 |
|------|------|------|
| 대화 주체 | 페이지가 먼저, 챗이 보조 | **챗이 먼저**, 필요 시 A2UI surface 생성 |
| 템플릿 선택 | `prompt-router.ts`에서 키워드 매칭 | **selectionPolicy 기반 규칙 엔진** |
| 템플릿 정의 | `types/templates.ts` 렌더 타입만 존재 | **정의 + 바인딩 + 선택근거 + preview** 4층 구조 |
| 데이터 조회 | 없음 (seed 데이터 고정) | **tool/function 계층**으로 데이터 조회 |
| 상태 관리 | `app-store.ts` (page-scoped) | **conversation-scoped assistant store** |
| 어드민 | 없음 | **템플릿 레지스트리 관리 + Swagger식 preview** |

---

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 입력 (prompt)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Chat Orchestrator                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│  │ Intent   │→ │ Tool         │→ │ A2UI Decision         │     │
│  │ Resolver │  │ Executor     │  │ Engine                │     │
│  └──────────┘  └──────────────┘  └───────────────────────┘     │
│       │              │                     │                    │
│       │         facts 수집            mode 결정                 │
│       │              │           (text / ask / surface)         │
│       ▼              ▼                     ▼                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Conversation State                          │   │
│  │  intent, facts, slots, activeSurface, messages           │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
        ┌──────────────────┴──────────────────┐
        ▼                                      ▼
┌───────────────┐                    ┌─────────────────────┐
│ Text Response │                    │ Template Selection  │
│ (일반 답변)    │                    │ Engine              │
└───────────────┘                    │  ┌───────────────┐  │
                                     │  │ Selection     │  │
                                     │  │ Policy 평가   │  │
                                     │  └───────┬───────┘  │
                                     │          ▼          │
                                     │  ┌───────────────┐  │
                                     │  │ Binding Spec  │  │
                                     │  │ → Payload 조립│  │
                                     │  └───────┬───────┘  │
                                     │          ▼          │
                                     │  ┌───────────────┐  │
                                     │  │ Template      │  │
                                     │  │ Envelope      │  │
                                     │  └───────────────┘  │
                                     └──────────┬──────────┘
                                                ▼
                                     ┌─────────────────────┐
                                     │ React Renderer      │
                                     │ (template-renderer)  │
                                     └─────────────────────┘
```

---

## 1단계: 대화 세션 모델 — Conversation Types

> 파운데이션의 바닥. 모든 후속 단계가 이 타입 위에 올라간다.

### 1.1 핵심 타입

```
파일: src/devops-chat/types/conversation.ts
```

#### ConversationSession

대화 하나의 전체 상태를 담는 최상위 객체.

| 필드 | 타입 | 설명 |
|------|------|------|
| `conversationId` | `string` | 대화 고유 ID |
| `messages` | `ConversationMessage[]` | 전체 메시지 이력 |
| `intent` | `ConversationIntent \| null` | 현재 파악된 의도 |
| `facts` | `ConversationFacts` | 대화에서 수집된 엔티티/사실 |
| `mode` | `ConversationMode` | 현재 응답 모드 |
| `activeSurface` | `TemplateEnvelope \| null` | 현재 렌더 중인 surface |
| `surfaceHistory` | `SurfaceHistoryEntry[]` | 이전에 보여준 surface 이력 |
| `pendingTool` | `PendingToolCall \| null` | 실행 중인 tool |
| `awaitingSlot` | `SlotRequest \| null` | 사용자에게 추가 정보 요청 중 |

#### ConversationMode

대화의 현재 응답 방식을 결정.

```
"text"            — 일반 텍스트 답변
"ask_followup"    — 추가 정보 수집 중 (slot filling)
"render_surface"  — A2UI surface 생성/갱신
"tool_executing"  — tool 실행 대기 중
```

#### ConversationIntent

```
{
  type: string           // "deploy.start", "deploy.status", "general.question" 등
  confidence: number     // 0.0 ~ 1.0
  source: "user" | "inferred"
}
```

#### ConversationFacts

대화 중 수집된 엔티티를 도메인별로 구조화. tool 결과나 사용자 발화에서 채워진다.

```
{
  service?: { name, id, team, ... }
  deploy?: { environment, targetVersion, recommendedVersion, strategy, ... }
  approval?: { type, requestId, ... }
  rollback?: { reason, targetVersion, ... }
  raw?: Record<string, unknown>   // 정형화 안 된 사실
}
```

#### SlotRequest

사용자에게 "뭘 배포할지" 같은 추가 정보를 물어보는 구조.

```
{
  slotName: string          // "service.name"
  question: string          // "어떤 서비스를 배포하시겠습니까?"
  options?: SlotOption[]    // 선택지 (있으면 보여줌)
  required: boolean
}
```

```
SlotOption = {
  value: string
  label: string
  description?: string
}
```

### 1.2 메시지 타입 확장

현재 `AssistantMessage`는 `{ id, role, content, status }` 뿐이다.
대화 중심으로 바꾸면 메시지에 더 많은 정보가 붙어야 한다.

#### ConversationMessage

```
{
  id: string
  role: "user" | "assistant" | "system" | "tool_result"
  content: string
  status: "complete" | "streaming" | "error"
  timestamp: number
  // 확장 필드
  toolCall?: ToolCallRecord           // 이 메시지가 tool 호출 결과일 때
  surfaceAttachment?: TemplateEnvelope // 이 메시지에 surface가 붙을 때
  slotRequest?: SlotRequest           // 이 메시지가 slot 요청일 때
  metadata?: Record<string, unknown>
}
```

### 1.3 이 단계에서 하지 않는 것

- 실제 store 구현 (2단계)
- API 변경 (3단계)
- UI 변경 (6단계)

**이 단계의 산출물**: `types/conversation.ts` 파일 하나.
모든 후속 코드가 이 타입을 import한다.

---

## 2단계: 템플릿 레지스트리 데이터 모델

> 렌더용 payload 타입과 관리용 template definition을 분리한다.

### 2.1 4층 구조

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Template Definition                    │
│   메타데이터 + rendererKey + inputSchema         │
├─────────────────────────────────────────────────┤
│ Layer 2: Selection Policy                       │
│   언제 이 템플릿을 선택할지 규칙                    │
├─────────────────────────────────────────────────┤
│ Layer 3: Binding Spec                           │
│   facts → payload 필드 매핑                      │
├─────────────────────────────────────────────────┤
│ Layer 4: Preview Cases                          │
│   Swagger식 샘플 입력 + 렌더 preview              │
└─────────────────────────────────────────────────┘
```

### 2.2 저장 구조

```
src/devops-chat/template-registry/
├── index.ts                              # 레지스트리 로더 + 헬퍼
├── types.ts                              # TemplateDefinition 타입
├── templates/
│   ├── quick-deploy-launchpad.json
│   ├── deployment-approval-inbox.json
│   ├── rollback-summary.json
│   ├── dry-run-stepper.json
│   └── confirm-action.json
```

### 2.3 TemplateDefinition 타입

```
파일: src/devops-chat/template-registry/types.ts
```

```
TemplateDefinition = {
  // --- Layer 1: Definition ---
  templateId: string
  version: string                    // semver
  status: "active" | "draft" | "deprecated"
  domain: "deploy" | "approve" | "rollback" | "general"
  rendererKey: string                // template-renderer.tsx의 switch key
  title: string
  description: string
  tags: string[]

  // inputSchema: JSON Schema 형식
  // 이 스키마가 Swagger 문서 역할을 한다
  inputSchema: JSONSchema7

  // --- Layer 2: Selection Policy ---
  selectionPolicy: TemplateSelectionPolicy

  // --- Layer 3: Binding Spec ---
  bindings: TemplateBindingSpec

  // --- Layer 4: Preview Cases ---
  previewCases: TemplatePreviewCase[]
}
```

### 2.4 Selection Policy — 템플릿 판단 근거

**왜 이 템플릿이 선택되는가?** 를 명시적으로 정의한다.

```
TemplateSelectionPolicy = {
  // 이 템플릿이 매칭되는 intent 타입들
  intentTypes: string[]
  // 예: ["deploy.start", "deploy.prepare"]

  // 반드시 있어야 하는 facts
  requiredFacts: string[]
  // 예: ["service.name", "deploy.environment", "deploy.targetVersion"]

  // 있으면 좋지만 없어도 되는 facts
  optionalFacts: string[]
  // 예: ["deploy.strategy", "deploy.impactSummary"]

  // 이 조건이면 이 템플릿은 제외
  disqualifiers: string[]
  // 예: ["conversation.mode=plain_info_only", "workflow.type=rollback"]

  // 최소 매칭 점수 (0.0 ~ 1.0)
  minConfidence: number

  // 선택 이유를 설명하는 템플릿 문구
  reasonTemplate: string
  // 예: "배포 의도가 확인되었고, 서비스와 환경 정보가 준비되어 launchpad를 노출합니다."
}
```

### 2.5 Binding Spec — facts → payload 매핑

tool 결과나 conversation facts를 템플릿 payload 필드에 어떻게 매핑하는지 정의.

```
TemplateBindingSpec = Record<string, string | BindingExpression>

// 단순 매핑
// "service": "facts.service.name"

// 복합 매핑
BindingExpression = {
  source: string           // facts path
  transform?: string       // "uppercase" | "date_format" | "join_comma" 등
  fallback?: unknown       // source가 없을 때 기본값
}
```

**예시 (quick_deploy_launchpad)**:

```json
{
  "service": "facts.service.name",
  "environment": "facts.deploy.environment",
  "recommendedVersion": "facts.deploy.recommendedVersion",
  "targetVersion": "facts.deploy.targetVersion",
  "strategy": { "source": "facts.deploy.strategy", "fallback": "rolling" },
  "impactSummary": { "source": "facts.deploy.impactSummary", "fallback": "영향 분석 정보 없음" },
  "preflightChecks": { "source": "facts.deploy.preflightChecks", "fallback": [] },
  "state": "ready",
  "primaryActionLabel": "배포 시작",
  "secondaryActionLabel": "초안 새로 고침"
}
```

### 2.6 Preview Cases — Swagger식 예제

```
TemplatePreviewCase = {
  id: string                // "happy-path", "empty-checks", "high-risk"
  label: string             // "기본 배포 시나리오"
  description?: string      // 이 케이스가 뭘 테스트하는지
  payload: Record<string, unknown>  // 실제 렌더에 들어갈 데이터
}
```

### 2.7 Selection Trace — 런타임 선택 결과 로그

실제 선택이 일어났을 때의 기록. 어드민에서 디버깅용으로 핵심.

```
TemplateSelectionTrace = {
  templateId: string
  eligible: boolean
  score: number
  matchedRules: string[]
  missingFacts: string[]
  disqualifiedBy: string[]
  reasonSummary: string
  timestamp: number
}
```

### 2.8 전체 선택 결과

```
TemplateSelectionResult = {
  selected: TemplateSelectionTrace | null     // 최종 선택된 템플릿
  candidates: TemplateSelectionTrace[]        // 모든 후보의 평가 결과
  mode: "render_surface" | "text" | "ask_followup"
}
```

### 2.9 이 단계의 산출물

- `template-registry/types.ts` — 위 타입 정의
- `template-registry/templates/*.json` — 기존 5개 템플릿을 새 형식으로 마이그레이션
- `template-registry/index.ts` — JSON 로딩 + 타입 가드

---

## 3단계: Tool Registry — 데이터 조회 계층

> 챗봇이 "이전 배포 알려줘", "배포할 서비스 목록" 같은 요청에 데이터를 가져올 수 있게 한다.

### 3.1 Tool 타입

```
파일: src/devops-chat/tools/types.ts
```

```
ChatTool = {
  name: string                    // "list_services", "get_deploy_history"
  description: string             // LLM function calling용 설명
  parameters: JSONSchema7         // 입력 파라미터 스키마
  execute: (params) => Promise<ToolResult>
}

ToolResult = {
  success: boolean
  data: unknown                   // 조회 결과
  factsUpdate?: Partial<ConversationFacts>  // 이 결과로 갱신할 facts
  error?: string
}
```

### 3.2 필요한 Tool 목록

| Tool 이름 | 입력 | 출력 | 용도 |
|-----------|------|------|------|
| `list_services` | (없음 또는 filter) | 서비스 목록 | "배포하고 싶어" → 서비스 선택 유도 |
| `get_service_detail` | `serviceName` | 서비스 상세 정보 | 선택한 서비스의 배포 관련 데이터 |
| `get_deploy_history` | `serviceName?, limit?` | 배포 이력 | "이전 배포 알려줘" |
| `get_deploy_status` | `deployId` | 배포 현재 상태 | 특정 배포 상태 조회 |
| `get_approval_list` | `type?, status?` | 승인 요청 목록 | 승인 관련 대화 |
| `get_rollback_candidates` | `serviceName` | 롤백 가능 버전 | 롤백 관련 대화 |

### 3.3 Tool Registry

```
파일: src/devops-chat/tools/registry.ts
```

```
ToolRegistry = {
  tools: Map<string, ChatTool>
  register(tool: ChatTool): void
  get(name: string): ChatTool | undefined
  list(): ChatTool[]
  toFunctionDefinitions(): OpenAIFunctionDef[]   // OpenAI function calling 형식
}
```

### 3.4 Tool Executor

```
파일: src/devops-chat/tools/executor.ts
```

```
ToolExecutor = {
  execute(toolName: string, params: unknown): Promise<ToolResult>
  // 내부적으로:
  // 1. registry에서 tool 찾기
  // 2. params 검증
  // 3. tool.execute() 호출
  // 4. 결과를 ConversationFacts에 반영
  // 5. 실패 시 에러 핸들링
}
```

### 3.5 데이터 소스

현재는 seed JSON 파일에서 가져오지만, 인터페이스를 분리해두면 나중에 실제 API로 교체 가능.

```
파일: src/devops-chat/tools/data-source.ts
```

```
DataSource = {
  listServices(): Promise<ServiceSummary[]>
  getServiceDetail(name: string): Promise<ServiceDetail>
  getDeployHistory(filter?): Promise<DeployHistoryEntry[]>
  getDeployStatus(id: string): Promise<DeployStatus>
  // ...
}

// 초기 구현: seed 데이터에서 읽기
// 나중: 실제 API 호출로 교체
```

### 3.6 이 단계의 산출물

- `tools/types.ts` — Tool, ToolResult 타입
- `tools/registry.ts` — 레지스트리
- `tools/executor.ts` — 실행기
- `tools/data-source.ts` — 데이터 소스 인터페이스 + seed 구현
- `tools/definitions/` — 각 tool 구현 파일

---

## 4단계: Chat Orchestrator — 대화 오케스트레이터

> 핵심 엔진. "일반 답변 / 데이터 조회 / A2UI 진입" 분기를 여기서 한다.

### 4.1 오케스트레이션 플로우

```
사용자 입력
    │
    ▼
┌─────────────────────┐
│ 1. Intent Resolve   │  "이게 일반 질문인가, 배포 요청인가, 상태 조회인가?"
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 2. Slot Check       │  "필요한 정보가 다 있는가?"
│                     │  없으면 → mode: ask_followup (SlotRequest 생성)
└─────────┬───────────┘
          │ (정보 충분)
          ▼
┌─────────────────────┐
│ 3. Tool Execution   │  "데이터를 가져와야 하는가?"
│                     │  필요하면 → tool 실행 → facts 갱신
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ 4. A2UI Decision    │  "이걸 surface로 그릴 것인가?"
│                     │  조건 충족 → mode: render_surface
│                     │  조건 미충족 → mode: text
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  text      render_surface
  응답        │
             ▼
    ┌─────────────────────┐
    │ 5. Template Select  │  selectionPolicy 평가 → templateId 결정
    └─────────┬───────────┘
              ▼
    ┌─────────────────────┐
    │ 6. Payload Build    │  bindings로 facts → payload 조립
    └─────────┬───────────┘
              ▼
    ┌─────────────────────┐
    │ 7. Response Compose │  text(LLM 설명) + surface(TemplateEnvelope) 합성
    └─────────────────────┘
```

### 4.2 Orchestrator 인터페이스

```
파일: src/devops-chat/orchestrator/chat-orchestrator.ts
```

```
ChatOrchestrator = {
  processMessage(
    session: ConversationSession,
    userMessage: string
  ): Promise<OrchestratorResult>
}

OrchestratorResult = {
  // 텍스트 응답 (항상 있음)
  text: string | AsyncIterable<string>   // 스트리밍 지원
  // surface (A2UI를 그릴 때만 있음)
  surface?: TemplateEnvelope
  // session 상태 업데이트
  sessionUpdate: Partial<ConversationSession>
  // 선택 trace (디버깅/어드민용)
  selectionTrace?: TemplateSelectionResult
}
```

### 4.3 Intent Resolver

```
파일: src/devops-chat/orchestrator/intent-resolver.ts
```

현재 `prompt-router.ts`의 키워드 매칭을 확장.
두 가지 방식 혼합:

1. **규칙 기반**: 키워드/패턴 매칭 (빠르고 예측 가능)
2. **LLM 기반**: 규칙으로 안 잡히면 OpenAI에 intent classification 요청

```
IntentResolver = {
  resolve(
    prompt: string,
    currentFacts: ConversationFacts,
    history: ConversationMessage[]
  ): Promise<ConversationIntent>
}
```

**Intent 타입 체계**:

```
일반 대화:
  "general.question"      — 일반 질문
  "general.greeting"      — 인사
  "general.help"          — 도움 요청

배포:
  "deploy.intent"         — 배포 의도 표현 ("배포하고 싶어")
  "deploy.select_service" — 서비스 선택 ("payments-api")
  "deploy.start"          — 배포 시작 요청
  "deploy.status"         — 배포 상태 조회
  "deploy.history"        — 배포 이력 조회

승인:
  "approve.list"          — 승인 목록 조회
  "approve.detail"        — 승인 상세 조회
  "approve.action"        — 승인/보류 액션

롤백:
  "rollback.intent"       — 롤백 의도
  "rollback.dryrun"       — dry run 요청
  "rollback.confirm"      — 롤백 확인
```

### 4.4 Slot Manager

대화에서 부족한 정보를 추적하고 질문을 생성.

```
파일: src/devops-chat/orchestrator/slot-manager.ts
```

```
SlotManager = {
  // 현재 intent에 필요한 slot 목록 확인
  checkSlots(
    intent: ConversationIntent,
    facts: ConversationFacts
  ): SlotCheckResult

  // 사용자 응답에서 slot 값 추출
  fillSlot(
    slotName: string,
    userInput: string,
    options?: SlotOption[]
  ): SlotFillResult
}

SlotCheckResult = {
  satisfied: boolean
  missing: SlotRequest[]     // 아직 채워지지 않은 slot들
}
```

**예시 흐름**:

```
User: "배포하고 싶어"
→ intent: deploy.intent
→ slotCheck: missing = [service.name]
→ tool: list_services 실행
→ response: "어떤 서비스를 배포하시겠습니까?" + 서비스 목록

User: "payments-api"
→ slot fill: service.name = "payments-api"
→ tool: get_service_detail("payments-api") 실행
→ facts 갱신
→ A2UI decision: 충분 → render_surface
→ template select: quick_deploy_launchpad
→ payload build + render
```

### 4.5 A2UI Decision Engine

"지금 A2UI surface를 그릴지 말지" 판단.

```
파일: src/devops-chat/orchestrator/a2ui-decision-engine.ts
```

```
A2UIDecisionEngine = {
  decide(
    intent: ConversationIntent,
    facts: ConversationFacts,
    session: ConversationSession
  ): A2UIDecision
}

A2UIDecision = {
  mode: "text" | "ask_followup" | "render_surface"
  // render_surface일 때만:
  selectionResult?: TemplateSelectionResult
  // ask_followup일 때만:
  followupSlot?: SlotRequest
  // 판단 이유 (디버깅)
  reason: string
}
```

**판단 기준**:

1. intent가 A2UI 대상인가? (`general.*` → text)
2. facts가 충분한가? (부족 → ask_followup)
3. 선택 가능한 템플릿이 있는가? (없음 → text)
4. minConfidence를 넘는가? (안 넘음 → text)
5. 모든 조건 충족 → render_surface

### 4.6 Template Selector

selectionPolicy를 평가해서 가장 적합한 템플릿을 고른다.

```
파일: src/devops-chat/orchestrator/template-selector.ts
```

```
TemplateSelector = {
  select(
    intent: ConversationIntent,
    facts: ConversationFacts,
    registry: TemplateDefinition[]
  ): TemplateSelectionResult
}
```

**평가 알고리즘**:

```
각 템플릿에 대해:
  1. disqualifiers 확인 → 하나라도 매칭되면 제외
  2. intentTypes 매칭 확인
  3. requiredFacts 존재 확인 → 하나라도 없으면 제외
  4. score 계산:
     - intentType 매칭: +0.4
     - requiredFacts 전부 있음: +0.3
     - optionalFacts 비율만큼: +0.2
     - intent.confidence 반영: +0.1
  5. minConfidence 이상인 후보만 남김
  6. 최고 점수 템플릿 선택
```

### 4.7 Payload Builder

bindings를 사용해 facts를 payload로 변환.

```
파일: src/devops-chat/orchestrator/payload-builder.ts
```

```
PayloadBuilder = {
  build(
    definition: TemplateDefinition,
    facts: ConversationFacts
  ): TemplateEnvelope
  // 내부적으로:
  // 1. bindings의 각 필드를 facts에서 resolve
  // 2. transform 적용
  // 3. fallback 처리
  // 4. inputSchema로 validation
  // 5. TemplateEnvelope 생성
}
```

### 4.8 이 단계의 산출물

- `orchestrator/chat-orchestrator.ts` — 메인 오케스트레이터
- `orchestrator/intent-resolver.ts` — 의도 파악
- `orchestrator/slot-manager.ts` — slot filling
- `orchestrator/a2ui-decision-engine.ts` — A2UI 진입 판단
- `orchestrator/template-selector.ts` — 템플릿 선택
- `orchestrator/payload-builder.ts` — payload 조립

---

## 5단계: Chat API 재설계

> route.ts를 오케스트레이터 기반으로 바꾼다.

### 5.1 새 API 계약

**Request**:

```json
{
  "conversationId": "conv-001",
  "prompt": "payments-api를 배포하고 싶어",
  "history": [
    { "role": "user", "content": "안녕" },
    { "role": "assistant", "content": "무엇을 도와드릴까요?" }
  ],
  "sessionSnapshot": {
    "intent": null,
    "facts": {},
    "mode": "text",
    "activeSurface": null
  }
}
```

**Response (SSE)**:

기존 `delta`/`done`/`error` 이벤트에 추가:

```
event: delta
data: {"type": "text", "content": "네, payments-api 배포를 준비하겠습니다."}

event: tool_call
data: {"type": "tool_call", "name": "get_service_detail", "params": {"serviceName": "payments-api"}}

event: tool_result
data: {"type": "tool_result", "name": "get_service_detail", "success": true}

event: surface
data: {"type": "surface", "envelope": { ...TemplateEnvelope... }}

event: session_update
data: {"type": "session_update", "intent": {...}, "facts": {...}, "mode": "render_surface"}

event: done
data: {"type": "done"}
```

### 5.2 이중 응답 구조

모든 응답은 `text + optional surface` 형태.

- **text만**: 일반 대화, 데이터 조회 결과 설명
- **text + surface**: A2UI 렌더. text는 "왜 이걸 보여주는지" 설명

### 5.3 기존 호환

기존 `chat-api.ts`의 `streamAssistantChat()`는 새 이벤트 타입을 파싱하도록 확장.
기존 `chat-assistant-store.ts`는 surface 이벤트를 받아서 `activeSurface`에 저장.

---

## 6단계: Conversation Store

> page-scoped 대신 conversation-scoped 상태 관리.

### 6.1 Store 구조

```
파일: src/devops-chat/store/conversation-store.ts
```

```
ConversationStore = {
  // 상태
  session: ConversationSession
  composerText: string
  isSubmitting: boolean
  error: string | null

  // 대화 액션
  submitPrompt(): Promise<void>
  setComposerText(text: string): void
  clearError(): void

  // surface 액션
  handlePrimaryAction(): void
  handleSecondaryAction(): void
  dismissSurface(): void

  // slot 액션
  selectSlotOption(slotName: string, value: string): void

  // 리셋
  resetSession(): void
}
```

### 6.2 기존 store와의 관계

| Store | 역할 | 변경 |
|-------|------|------|
| `app-store.ts` | 페이지 워크스페이스 상태 (테이블, 필터 등) | 유지. assistant 부분만 분리 |
| `chat-assistant-store.ts` | deploy 전용 채팅 | **deprecated** → conversation-store로 흡수 |
| `conversation-store.ts` (신규) | 대화 중심 상태 | 모든 페이지의 assistant가 이걸 사용 |

### 6.3 이 단계의 산출물

- `store/conversation-store.ts`
- `chat-assistant-store.ts`에 deprecation 주석

---

## 7단계: 프론트 렌더 프로토콜

> 챗 UI에서 text + surface를 함께 처리하는 구조.

### 7.1 ChatPanel 구조 변경

```
ChatPanel (대화 전체)
├── MessageList
│   ├── UserMessage
│   ├── AssistantMessage
│   │   └── [inline surface가 필요하면 여기]
│   ├── ToolResultMessage (접힌 상태로 표시)
│   └── SlotRequestMessage (선택지 카드 형태)
├── ActiveSurface (현재 A2UI surface)
│   └── TemplateRenderer
└── Composer
    └── TextInput + SendButton
```

### 7.2 Surface 표시 방식

두 가지 옵션:

**A. 대화 인라인**: surface가 메시지 사이에 끼어서 나옴
**B. 분리 패널**: 왼쪽 채팅 / 오른쪽 surface (현재와 유사)

→ **B 방식 권장**. A2UI surface는 상호작용이 많아서 대화 인라인에 넣으면 UX가 불편해짐.
단, surface가 없을 때는 채팅이 전체 폭을 차지.

### 7.3 Surface 생명주기

```
없음 → surface 이벤트 수신 → 렌더
렌더 중 → primary action → 상태 전이 → 새 payload로 re-render
렌더 중 → dismiss → 없음으로 복귀
렌더 중 → 새 대화 → 새 surface로 교체 (이전은 history에)
```

---

## 8단계: 어드민 탭 — 템플릿 관리 UI

> Swagger 느낌으로 템플릿을 관리하는 화면.

### 8.1 어드민 탭 구성

```
/admin/templates
├── Template List           # 전체 템플릿 목록
│   ├── 상태 (active/draft/deprecated)
│   ├── 도메인 (deploy/approve/rollback)
│   └── 버전
│
├── Template Detail (선택 시)
│   ├── [Tab: Contract]
│   │   └── inputSchema를 Swagger 형태로 표시
│   │       ├── 필드명, 타입, required 여부
│   │       ├── enum 값 목록
│   │       ├── description
│   │       └── 기본값 / 예제값
│   │
│   ├── [Tab: Selection Policy]
│   │   ├── Intent Types 편집
│   │   ├── Required / Optional Facts 편집
│   │   ├── Disqualifiers 편집
│   │   ├── minConfidence 슬라이더
│   │   └── Reason Template 편집
│   │
│   ├── [Tab: Bindings]
│   │   └── facts path → payload field 매핑 테이블
│   │       ├── source path
│   │       ├── transform (선택)
│   │       └── fallback (선택)
│   │
│   ├── [Tab: Preview]
│   │   ├── Preview Case 선택 드롭다운
│   │   ├── JSON Editor (payload 직접 편집)
│   │   ├── Schema Validation 결과 (실시간)
│   │   └── Live Render Preview (TemplateRenderer로 바로 렌더)
│   │
│   └── [Tab: Decision Simulator]
│       ├── Conversation Facts JSON 입력
│       ├── Intent 입력
│       ├── [시뮬레이션 실행] 버튼
│       └── 결과:
│           ├── 선택된 템플릿
│           ├── 각 후보의 score, matchedRules, missingFacts
│           └── 선택/탈락 이유
```

### 8.2 Decision Simulator 상세

운영자가 "이 상황에서 왜 이 템플릿이 안 뜨지?" 를 디버깅하는 핵심 도구.

**입력**:

```json
{
  "intent": { "type": "deploy.start", "confidence": 0.85 },
  "facts": {
    "service": { "name": "payments-api" },
    "deploy": {
      "environment": "production",
      "targetVersion": "v2.3.18"
    }
  }
}
```

**출력**:

```json
{
  "selected": {
    "templateId": "quick_deploy_launchpad",
    "score": 0.82,
    "matchedRules": [
      "intentTypes: deploy.start ✓",
      "requiredFact: service.name ✓",
      "requiredFact: deploy.environment ✓",
      "requiredFact: deploy.targetVersion ✓"
    ],
    "missingFacts": ["deploy.recommendedVersion"],
    "reasonSummary": "배포 의도가 확인되었고 핵심 정보가 준비됨"
  },
  "candidates": [
    {
      "templateId": "deployment_approval_inbox",
      "eligible": false,
      "score": 0.0,
      "disqualifiedBy": ["intentTypes: deploy.start not in [approve.detail, approve.action]"]
    },
    {
      "templateId": "rollback_summary",
      "eligible": false,
      "score": 0.0,
      "disqualifiedBy": ["intentTypes: deploy.start not in [rollback.intent, rollback.dryrun]"]
    }
  ]
}
```

---

## 개발 순서 요약 (PR 단위)

| PR | 단계 | 내용 | 의존성 |
|----|------|------|--------|
| **PR 1** | 1단계 | Conversation Types 정의 | 없음 |
| **PR 2** | 2단계 | Template Registry 타입 + JSON 마이그레이션 | PR 1 |
| **PR 3** | 3단계 | Tool Registry + Data Source | PR 1 |
| **PR 4** | 4단계 | Chat Orchestrator (핵심 엔진) | PR 1, 2, 3 |
| **PR 5** | 5단계 | Chat API route.ts 재설계 | PR 4 |
| **PR 6** | 6단계 | Conversation Store + 프론트 연결 | PR 4, 5 |
| **PR 7** | 7단계 | 프론트 렌더 프로토콜 (text + surface) | PR 6 |
| **PR 8** | 8단계 | 어드민 탭 (Template List + Contract + Preview) | PR 2 |
| **PR 9** | 8단계 | 어드민 탭 (Selection Policy + Decision Simulator) | PR 4, 8 |

```
PR 1 ──┬── PR 2 ──┐
       │          ├── PR 4 ── PR 5 ── PR 6 ── PR 7
       └── PR 3 ──┘
                  PR 2 ── PR 8 ── PR 9
```

PR 1, 2, 3은 병렬 가능. PR 4가 합류점. PR 8은 독립적으로 진행 가능.

---

## 기존 코드 재사용 정리

| 기존 파일 | 처리 |
|-----------|------|
| `types/templates.ts` | **유지**. 렌더 payload 타입으로 계속 사용 |
| `template-renderer.tsx` | **유지**. rendererKey로 매핑만 확인 |
| `build-template-envelope.ts` | **리팩터**. PayloadBuilder가 bindings 기반으로 대체 |
| `prompt-router.ts` | **리팩터**. IntentResolver + TemplateSelector가 대체 |
| `chat-api.ts` | **확장**. 새 SSE 이벤트 타입 파싱 추가 |
| `app-store.ts` | **유지**. 페이지 워크스페이스 상태는 그대로 |
| `chat-assistant-store.ts` | **deprecated**. conversation-store로 흡수 |
| `data/seed/*.json` | **유지**. DataSource의 seed 구현에서 사용 |
| `devops-console/templates/*` | **유지**. 렌더 컴포넌트는 그대로 |

---

## 핵심 원칙 (전 단계 공통)

1. **챗이 먼저다**. 페이지 컨텍스트에 의존하지 않는다.
2. **구조를 LLM에게 맡기지 않는다**. 템플릿 선택, payload 조립은 로컬 엔진이 한다.
3. **LLM은 설명을 한다**. "왜 이걸 보여주는지", "다음에 뭘 하면 좋은지" 텍스트만.
4. **그냥 대화도 된다**. A2UI가 모든 응답에 붙는 게 아니다. 필요할 때만.
5. **실패해도 대화는 계속된다**. tool 실패, surface 생성 실패 시 텍스트로 폴백.
