# A2UI PoC 실행 설계 문서

## 1. 문서 목적

이 문서는 아래 3개 입력을 하나의 실행 계획으로 합치는 문서다.

- `docs/20260406_a2ui-platform-planning.md`
- `docs/20260406_a2ui-agent-integration-cases.md`
- `docs/20260329_scenario-storytelling.md`

이번 문서의 목적은 기획 요약이 아니라, 실제로 어떤 코드와 어떤 제품 조각을 만들어서 PoC를 완성할지 정리하는 것이다.

핵심 전제는 다음과 같다.

- 이미 동작하는 chatbot 서비스가 있다.
- 먼저 이 chatbot의 실행 주체를 Python agent로 바꿔야 한다.
- 그 서비스에 `front a2ui lib`를 붙여 A2UI surface를 렌더링해야 한다.
- `admin`에서 template, contract, resolver, preview를 다뤄야 한다.
- Python agent가 text-only chatbot을 먼저 동작시키고, 그 다음 `python agent lib`를 붙여 MCP로 A2UI runtime과 통신하게 해야 한다.
- PoC는 문서로 끝나는 것이 아니라, 실제 코드, 실제 agent server, 실제 적용 흐름까지 보여줘야 한다.

한 줄로 요약하면:

`기존 chatbot 서비스에 A2UI capability를 sidecar처럼 붙여, agent가 필요할 때 MCP를 통해 surface를 받고 프론트가 렌더링하며 action을 다시 runtime으로 연결하는 end-to-end PoC를 만든다.`

이번 PoC의 전환 순서는 아래처럼 본다.

1. Python agent를 만든다.
2. chatbot이 먼저 그 Python agent로 text 응답 기준 정상 동작하게 만든다.
3. 그 Python agent에 `python agent lib`를 붙인다.
4. `python agent lib`가 MCP를 통해 A2UI runtime을 호출하게 만든다.
5. chatbot 프론트의 내장 A2UI renderer가 `templateId` 기준으로 라이브러리 컴포넌트를 그리게 만든다.

---

## 2. 지금 문서들이 말하는 공통 결론

세 문서를 합치면 방향은 명확하다.

### 2.1 플랫폼 관점

- `A2UI UI Library`는 렌더링 전용 레이어다.
- `Admin`은 template와 resolver를 설계하는 control plane이다.
- `Runtime/MCP Server`는 published 정의만 실행하는 execution plane이다.
- `Agent Library`는 기존 agent에 A2UI를 끼워 넣는 integration plane이다.

### 2.2 Agent 통합 관점

기존 agent는 저수준 MCP 함수 여러 개를 직접 호출하면 안 된다.

기존 agent 입장에서는 아래처럼 보여야 한다.

- `render_or_fallback()`
- `maybe_render_a2ui()`
- `handle_a2ui_action()`

즉, `template list 조회 → contract 조회 → 권한 체크 → payload 조립`은 agent 코드에 흩어지면 안 되고 agent library 내부로 들어가야 한다.

### 2.3 사용자 스토리 관점

story 기준으로 PoC는 아래 3개 도메인에서 설득력을 가져야 한다.

- 배포: `Quick Deploy Launchpad`
- 승인: `Approval Queue Inbox`, `Deployment Approval Inbox`
- 롤백: `Rollback Summary`, `Rollback Target List`, `Dry Run Stepper`, `Confirm Action`

즉 이번 PoC의 본질은 "챗봇이 말을 예쁘게 한다"가 아니라, "복잡한 작업을 surface 단위의 조작 가능한 UI로 압축한다"는 점이다.

---

## 3. 현재 repo 기준으로 이미 있는 것

이 저장소에는 이미 A2UI PoC의 핵심 뼈대가 꽤 구현되어 있다.

### 3.1 현재 구현된 핵심 자산

| 현재 위치 | 현재 역할 | 이후 제품화 방향 |
|---|---|---|
| `src/devops-console/templates/*` | 실제 surface React 컴포넌트 | `front a2ui lib`의 template renderer 자산 |
| `src/devops-chat/types/templates.ts` | template payload 타입 | `a2ui contracts`의 TypeScript contract |
| `src/devops-chat/templates/template-renderer.tsx` | templateId 기반 renderer | `front a2ui lib`의 `SurfaceRenderer` |
| `src/devops-chat/templates/binders/*` | facts -> surface payload 바인딩 | runtime의 binder/recipe 실행기 |
| `src/devops-chat/templates/template-definitions.ts` | runtime template 메타 | runtime registry의 기초 |
| `src/devops-chat/template-registry/*` | admin용 registry/view model | `admin` control plane의 초안 |
| `src/devops-console/template-admin/*` | template list/contract/preview/simulator UI | `admin` UI의 시작점 |
| `src/devops-chat/server/*` | intent/tool/decision/orchestration | runtime engine 또는 demo chatbot adapter의 출발점 |
| `src/devops-chat/actions/*` | surface action dispatch | runtime action handling의 출발점 |
| `src/app/api/chat/route.ts` | SSE chat endpoint | demo chatbot integration adapter |

### 3.2 현재 구조의 한계

현재 구조는 PoC 데모에는 좋지만, 플랫폼 제품 구조로는 아직 아래 한계가 있다.

- runtime이 Next.js app 안에 in-process로 들어가 있다.
- template registry가 admin 문서 레이어이고 runtime source-of-truth는 따로 있다.
- MCP server가 아직 없다.
- Python agent lib가 없다.
- publish된 정의와 draft 정의의 분리가 없다.
- auth, audit, resolver policy, timeout, fallback 같은 runtime 운영 개념이 약하다.

즉, "아무것도 없는 상태"는 아니고, "한 repo 안에 platform의 씨앗이 섞여 있는 상태"라고 보는 것이 맞다.

---

## 4. 이번 PoC에서 실제로 만들어야 하는 제품

이번 PoC의 산출물은 아래 5개다.

### 4.1 Front A2UI Lib

챗봇 프론트에서 `surface`를 받아 렌더링하는 라이브러리다.

반드시 포함할 것:

- `SurfaceRenderer`
- template component registry
- action click bridge
- stale/refresh handling
- text fallback과 같이 쓸 수 있는 response model

### 4.2 A2UI Admin

template와 runtime 정의를 관리하는 control plane이다.

반드시 포함할 것:

- template 목록
- input contract 조회
- example payload preview
- selection policy / simulator
- resolver/binding recipe 정의
- publish 개념

### 4.3 A2UI Runtime / MCP Server

published template와 resolver 정의만 안전하게 실행하는 실행 레이어다.

반드시 포함할 것:

- MCP tool set
- schema validation
- binder/recipe execution
- action handling
- logging / trace / fallback

### 4.4 Python Agent Lib

이미 chatbot의 실행 주체가 된 Python agent에 A2UI를 step 하나처럼 붙일 수 있게 해주는 라이브러리다.

반드시 포함할 것:

- MCP client wrapper
- `render_or_fallback()`
- `handle_a2ui_action()`
- chatbot response envelope helper

### 4.5 Existing Chatbot Integration

기존 chatbot 서비스에 실제로 적용된 예시 코드다.

반드시 포함할 것:

- chatbot backend가 Python agent를 호출하도록 변경
- Python agent 기준 text-only 응답이 먼저 정상 동작
- chat response에 `surface` 포함
- 프론트 렌더링
- button action -> backend -> python lib -> MCP runtime -> updated response

---

## 5. 권장 목표 아키텍처

이 PoC에서 `a2ui`는 "agent가 직접 그리는 UI 포맷"이 아니라, `chatbot 프론트에 내장된 parsing/rendering capability`로 본다.

- agent/runtime은 UI 컴포넌트 코드를 직접 보내지 않는다.
- agent/runtime은 `templateId + payload`가 들어있는 `SurfaceEnvelope`만 내려준다.
- chatbot 프론트의 내장 A2UI parser/renderer가 `templateId`를 읽는다.
- parser/renderer는 프론트에 포함된 `A2UI UI library`에서 같은 `templateId`를 가진 컴포넌트를 찾아 렌더링한다.

즉 실제 렌더링 책임은 agent가 아니라 프론트의 A2UI renderer와 UI library에 있다.

단, 이 구조는 처음부터 한 번에 들어가는 것이 아니라 아래 migration 순서로 들어간다.

```text
Current
  Next.js route -> in-process orchestrateChatTurn()

Step 1
  Next.js route -> Python agent
  -> text-only chatbot 정상화

Step 2
  Python agent + a2ui_agent lib
  -> MCP runtime 호출
  -> text + surface 응답

Step 3
  Chatbot frontend A2UI renderer
  -> templateId 기반 UI library component 렌더링
```

### Current `route.ts` -> Target Python Agent Adapter 상세 흐름

현재 실제 코드는 Next.js route가 직접 orchestration을 수행한다.

```text
Current

chatbot frontend
  -> POST /api/chat
  -> Next.js route.ts
  -> orchestrateChatTurn()
  -> intent / tool / decision / binder
  -> AssistantTurnResponse
  -> SSE result
  -> chatbot frontend 렌더링
```

이 구조에서 Next.js는 단순 adapter가 아니라 실질적인 agent runtime 역할까지 맡고 있다.

목표 구조에서는 Next.js를 thin adapter로 줄이고, 실제 agent 실행 책임을 Python agent로 넘긴다.

```text
Target

chatbot frontend
  -> POST /api/chat
  -> Next.js route.ts (adapter only)
  -> Python agent /turn
  -> Python agent planner / tools / narrator
  -> a2ui_agent.render_or_fallback()
  -> MCP a2ui.resolve_surface
  -> Python agent response { text, surface }
  -> Next.js SSE relay
  -> chatbot frontend 렌더링
```

즉 `route.ts`의 역할은 아래처럼 바뀐다.

- 현재: chat orchestration 본체
- 목표: Python agent 호출 + SSE 중계 + auth/session/context 전달

### 단계별 시퀀스

#### 현재 시퀀스

```text
1. frontend가 `/api/chat`에 user input 전송
2. `route.ts`가 `AssistantTurnRequest`를 받음
3. `route.ts`가 `orchestrateChatTurn()` 직접 호출
4. TS runtime이 intent/tool/decision/template binding 수행
5. SSE `delta/tool/result/done` 이벤트를 frontend로 전송
6. frontend가 text와 surface를 렌더링
```

#### 목표 시퀀스 1: Python agent text-only 전환

```text
1. frontend가 `/api/chat`에 user input 전송
2. `route.ts`가 request를 Python agent 요청 형식으로 변환
3. `route.ts`가 Python agent `/turn` 또는 stream endpoint 호출
4. Python agent가 LLM/text 응답 생성
5. `route.ts`가 Python agent 응답을 SSE로 relay
6. frontend가 text-only chatbot으로 정상 동작
```

이 단계에서는 A2UI가 아직 없어도 된다.
완료 기준은 "기존 chatbot이 Python agent 답변으로 정상 동작한다"는 것이다.

#### 목표 시퀀스 2: Python agent + A2UI 삽입

```text
1. frontend가 `/api/chat`에 user input 전송
2. `route.ts`가 Python agent 호출
3. Python agent가 planner / tools / narrator로 text draft 생성
4. Python agent가 `a2ui_agent.render_or_fallback()` 호출
5. `a2ui_agent`가 MCP `a2ui.resolve_surface` 호출
6. A2UI runtime이 template 선택, resolver 실행, binder 실행, validation 수행
7. Python agent가 `{ text, surface }` 응답 반환
8. `route.ts`가 SSE result를 frontend로 relay
9. frontend의 내장 A2UI renderer가 `templateId`를 읽음
10. UI library에서 matching component를 선택해 렌더링
```

#### 목표 시퀀스 3: action round-trip

```text
1. 사용자가 frontend에서 A2UI button 클릭
2. frontend가 action event를 backend에 전송
3. backend가 Python agent의 action handler 호출
4. Python agent가 `a2ui_agent.handle_a2ui_action()` 호출
5. `a2ui_agent`가 MCP `a2ui.handle_action` 호출
6. A2UI runtime이 action 처리 후 새 text/surface 또는 factsPatch 반환
7. Python agent가 후속 응답 생성
8. frontend가 갱신된 text/surface를 다시 렌더링
```

### `route.ts`에서 실제로 바뀌는 책임

PoC 구현 시 `src/app/api/chat/route.ts`는 최종적으로 아래 책임만 남기는 것이 바람직하다.

- request validation
- conversation/session/user context 전달
- Python agent 호출
- Python agent streaming 결과 SSE relay
- 에러 처리와 timeout 처리

반대로 아래 책임은 `route.ts` 밖으로 빠져야 한다.

- intent resolution
- tool planning/execution
- decision policy
- surface binding
- A2UI surface/action orchestration

```text
┌───────────────────────────────────────────────────────────────┐
│ Existing Chatbot Service                                      │
│                                                               │
│  Frontend                                                     │
│  ├─ chat message list                                         │
│  ├─ @a2ui/react SurfaceRenderer                               │
│  └─ action webhook client                                     │
│                                                               │
│  Backend                                                      │
│  ├─ existing chat handler                                     │
│  ├─ existing python agent                                     │
│  └─ a2ui_agent.render_or_fallback()                           │
└───────────────────────────────────────────────────────────────┘
                         │
                         │ MCP
                         ▼
┌───────────────────────────────────────────────────────────────┐
│ A2UI Runtime / MCP Server                                     │
│                                                               │
│  ├─ template registry loader                                  │
│  ├─ contract validator                                         │
│  ├─ resolver executor                                          │
│  ├─ binder / recipe executor                                   │
│  ├─ action dispatcher                                          │
│  └─ audit / trace / fallback                                   │
└───────────────────────────────────────────────────────────────┘
                         ▲
                         │ publish
                         │
┌───────────────────────────────────────────────────────────────┐
│ A2UI Admin                                                     │
│                                                               │
│  ├─ template catalog                                           │
│  ├─ contract viewer/editor                                     │
│  ├─ preview / simulator                                        │
│  ├─ resolver / binding recipe editor                           │
│  └─ publish management                                         │
└───────────────────────────────────────────────────────────────┘
```

핵심은 다음 두 줄이다.

- Admin과 Runtime은 같은 제품군처럼 보여도 책임은 분리한다.
- 기존 chatbot은 A2UI를 "새 agent"로 붙이는 것이 아니라 "새 capability"로 붙인다.

---

## 6. 공통 계약(contract)은 먼저 고정해야 한다

이번 PoC에서 가장 먼저 굳혀야 하는 것은 UI나 Admin 화면이 아니라 contract다.

현재 repo를 기준으로 보면 이 역할은 아래 파일들이 맡고 있다.

- `src/devops-chat/types/templates.ts`
- `src/devops-chat/types/conversation.ts`
- `src/devops-chat/actions/action-types.ts`
- `src/devops-chat/templates/validate-surface-envelope.ts`

이 구조를 제품용 공통 contract로 올려야 한다.

### 6.1 최소 공통 타입

#### Template Contract

```ts
type TemplateContract = {
  templateId: string;
  version: string;
  rendererId: string;
  inputSchema: Record<string, unknown>;
  actionSchema?: Record<string, unknown>;
};
```

#### Surface Envelope

```ts
type SurfaceEnvelope = {
  templateId: string;
  payload: Record<string, unknown>;
  sourceIntent: string;
  updatedAt: string;
  freshnessKey?: string;
};
```

#### Canonical Payload Boundary

이번 PoC에서 표준으로 삼을 형식은 `TemplateEnvelope`가 아니라 `SurfaceEnvelope`다.

- runtime이 저장하고 반환하는 canonical wire format은 항상 `SurfaceEnvelope`
- MCP 응답도 항상 `SurfaceEnvelope`
- chatbot backend가 프론트로 넘기는 형식도 항상 `SurfaceEnvelope`
- React template component는 `SurfaceEnvelope`를 직접 받지 않고, front lib adapter가 `surface.payload`를 꺼내서 전달

즉 경계는 아래처럼 고정한다.

```text
Runtime / MCP / Backend
  -> SurfaceEnvelope
       -> payload
            -> template-specific payload
                 -> front adapter unwrap
                      -> React template component props
```

현재 repo의 `TemplateEnvelope`는 사실상 "React renderer가 받는 template-specific payload 타입"에 가깝다.
패키지 분리 시에는 이 이름을 제품 표준으로 쓰기보다 아래 의미로 정리하는 편이 낫다.

- `SurfaceEnvelope`: 네트워크/저장/런타임 표준
- `TemplatePayload`: 템플릿 전용 렌더링 입력

권장 형식은 다음과 같다.

```ts
type TemplatePayload =
  | QuickDeployTemplateData
  | DeploymentApprovalTemplateData
  | ApprovalQueueTemplateData
  | RollbackTargetListTemplateData
  | RollbackSummaryTemplateData
  | DryRunStepperTemplateData
  | ConfirmActionTemplateData;
```

```ts
type SurfaceEnvelope = {
  templateId: string;
  payload: TemplatePayload;
  sourceIntent: string;
  updatedAt: string;
  freshnessKey?: string;
};
```

추가 규칙도 같이 고정한다.

- `surface.templateId`와 `surface.payload.templateId`는 항상 같아야 한다.
- front lib는 렌더링 전에 이 일치 여부를 검증한다.
- 불일치 시 템플릿을 렌더링하지 않고 text fallback 또는 error surface로 내린다.

#### Surface Action

```ts
type SurfaceActionEvent = {
  actionId: string;
  surfaceId?: string;
  templateId: string;
  targetRef?: {
    entityType: string;
    entityId: string;
    entityVersion?: string;
  };
  payload?: Record<string, unknown>;
};
```

#### Agent Response Envelope

```ts
type AgentResponse = {
  text?: string;
  surface?: SurfaceEnvelope | null;
  meta?: Record<string, unknown>;
};
```

### 6.2 이번 PoC에서 contract로 꼭 잠가야 하는 것

- templateId naming
- template payload shape
- action event shape
- resolve result shape
- fallback response shape

이 다섯 가지가 잠기면 프론트, runtime, python lib를 병렬로 만들 수 있다.

---

## 7. 제품별 구현 범위

## 7.1 Front A2UI Lib

### 역할

- chatbot message 안에 들어온 `surface`를 렌더링한다.
- chatbot에 내장된 A2UI parser/renderer 역할을 수행한다.
- `templateId`에 맞는 renderer를 선택한다.
- `SurfaceEnvelope`를 검증하고 `TemplatePayload`로 unwrapping 한다.
- action click을 표준 event로 올린다.
- surface가 실패하거나 모르는 template이면 text fallback으로 내려간다.

### 현재 repo에서 재사용할 수 있는 코드

- `src/devops-chat/templates/template-renderer.tsx`
- `src/devops-console/templates/*`
- `src/devops-chat/types/templates.ts`

### 제품화 시 권장 public API

```ts
renderSurface(surface: SurfaceEnvelope, options?: RenderOptions): ReactNode
```

```ts
<A2UISurface
  surface={surface}
  onAction={(event) => postAction(event)}
  fallback={<PlainTextCard text="지원되지 않는 surface입니다." />}
/>
```

이 컴포넌트는 개념적으로 "chatbot에 내장되는 A2UI parser/renderer"다.
동작 순서는 아래와 같다.

```text
agent/runtime
  -> SurfaceEnvelope { templateId, payload }
  -> chatbot frontend receives surface
  -> A2UISurface parses templateId
  -> component registry resolves matching library component
  -> resolved component renders payload
```

프론트 라이브러리의 adapter 책임은 명확히 아래까지로 제한한다.

1. `surface.templateId` 존재 여부 확인
2. `surface.payload` 존재 여부 확인
3. `surface.payload.templateId === surface.templateId` 검증
4. 검증 통과 시 `payload`를 template component에 전달

즉 React template component는 `SurfaceEnvelope` 전체를 알 필요가 없고, `TemplatePayload`만 받는다.
`SurfaceEnvelope`는 transport/runtime contract이고, `TemplatePayload`는 render contract다.

### 이번 PoC에서 꼭 보여줘야 하는 것

- `quick_deploy_launchpad`
- `approval_queue_inbox`
- `deployment_approval_inbox`
- `rollback_target_list`
- `rollback_summary`
- `dry_run_stepper`
- `confirm_action`

즉 현재 repo에 이미 있는 7개 template를 `front a2ui lib`의 초기 카탈로그로 삼으면 된다.

---

## 7.2 A2UI Admin

### 역할

- 어떤 template가 있는지 본다.
- template input contract를 본다.
- example payload로 preview한다.
- 어떤 상황에서 선택되는지 simulator로 본다.
- resolver와 binding recipe를 정의한다.
- publish하여 runtime에 배포한다.

### 현재 repo에서 재사용할 수 있는 코드

- `src/devops-console/template-admin/*`
- `src/devops-chat/template-registry/*`

### 현재 Admin의 상태

현재 repo의 admin은 아래를 이미 보여준다.

- template list
- contract viewer
- preview editor
- selection policy viewer
- simulator

하지만 아직 아래가 없다.

- resolver registry
- binding recipe editor
- publish version 관리
- runtime publish target

### 이번 PoC에서 Admin이 최소로 가져야 할 기능

1. template catalog
2. input contract view
3. preview
4. decision simulator
5. binding recipe JSON 편집
6. publish 버튼

PoC 기준에서는 DB 대신 JSON 또는 file-based registry여도 충분하다.

### Admin 설계와 Python agent 실행의 관계

이 부분은 역할을 명확히 나누는 것이 중요하다.

- Admin은 필요한 데이터를 "어떻게 가져올지" 설계한다.
- Python agent는 그 설계를 직접 해석해서 API를 호출하지 않는다.
- Runtime/MCP server가 Admin에서 publish된 설계를 실제로 실행한다.
- Python agent는 Runtime/MCP server에 상위 요청만 보낸다.

즉 책임은 아래처럼 나뉜다.

```text
Admin
  -> template contract 정의
  -> resolver 정의
  -> binding recipe 정의
  -> publish

Runtime / MCP
  -> published resolver / recipe 로드
  -> 실제 API / DB / LLM / transform 실행
  -> payload 조립

Python agent
  -> "이번 턴에 A2UI surface가 필요함" 판단
  -> MCP resolve_surface / handle_action 호출
  -> text + surface 응답에 통합
```

이 구조를 택하는 이유는 다음과 같다.

- resolver 변경 시 Python agent 코드를 수정하지 않아도 된다.
- 데이터 패칭 로직이 Python agent 안에 중복되지 않는다.
- Admin은 control plane, Runtime은 execution plane, Python agent는 integration plane 역할에 집중할 수 있다.

반대로 Python agent가 publish된 recipe를 직접 읽어서 각 API를 호출하기 시작하면 아래 문제가 생긴다.

- Runtime과 Python agent에 중복 구현이 생김
- publish contract가 바뀔 때 Python 코드도 같이 깨짐
- 권한, timeout, retry, audit 같은 실행 정책이 분산됨

따라서 이번 PoC의 권장 구조는 항상 아래여야 한다.

```text
Admin에서 데이터 패칭 설계
  -> publish
  -> Runtime/MCP가 설계 실행
  -> Python agent는 Runtime 결과를 호출해서 사용
```

---

## 7.3 A2UI Runtime / MCP Server

### 역할

- published 정의를 로드한다.
- context와 facts를 받아 template를 선택한다.
- resolver chain을 실행한다.
- binder를 통해 payload를 만든다.
- schema validation을 수행한다.
- surface action을 다시 처리한다.

### 현재 repo에서 재사용할 수 있는 코드

- `src/devops-chat/server/orchestrate-chat-turn.ts`
- `src/devops-chat/server/decision/*`
- `src/devops-chat/server/tools/*`
- `src/devops-chat/templates/binders/*`
- `src/devops-chat/actions/*`

### 현재 구조를 runtime 관점에서 해석하면

- `tool-registry.ts`는 resolver/tool registry의 초안이다.
- `binders/*`는 binding recipe executor의 초안이다.
- `action-dispatcher.ts`는 action runtime의 초안이다.
- `validate-surface-envelope.ts`는 contract validator의 초안이다.

### Runtime이 Admin 설계를 실행하는 방식

Admin에서 publish한 정의는 Runtime 입장에서 실행 명세가 된다.

예를 들어 Admin에서 아래를 설계할 수 있다.

- template: `quick_deploy_launchpad`
- required data:
  - `serviceName`
  - `selectedServiceContext`
  - `availableImages`
- resolver chain:
  - `get_service`
  - `get_deploy_context`
  - `select_recommended_image`
- binding recipe:
  - `payload.service <- facts.deploy.serviceName`
  - `payload.targetVersion <- resolver.get_deploy_context.recommendedVersion`
  - `payload.imageDetail <- resolver.select_recommended_image`

그러면 Python agent는 이를 직접 해석하지 않고, Runtime에 아래처럼 상위 요청만 한다.

```text
Python agent
  -> a2ui_agent.render_or_fallback()
  -> MCP a2ui.resolve_surface(intent, context, facts)
  -> Runtime이 publish된 resolver/binding recipe 실행
  -> SurfaceEnvelope 반환
```

즉 실제 데이터 패칭의 실행 주체는 Runtime이고, Python agent는 실행 요청자다.

### Admin 설계 -> Publish -> Runtime 실행 -> Python agent 호출 시퀀스

```text
1. Admin에서 template contract, resolver, binding recipe 설계
2. Admin이 해당 정의를 publish
3. Runtime/MCP가 publish된 정의를 로드
4. Python agent가 `resolve_surface` 또는 `handle_action` 호출
5. Runtime이 resolver chain을 실행하여 실제 데이터를 fetch
6. Runtime이 binding recipe로 payload를 조립
7. Runtime이 validation 후 `SurfaceEnvelope` 반환
8. Python agent가 text 응답과 합쳐 chatbot에 반환
```

이 시퀀스가 성립하면, Admin이 설계한 데이터 패칭 흐름을 Python agent 기반 chatbot에서도 실제로 사용할 수 있다.

### PoC용 MCP tool 제안

#### `a2ui.list_templates`

- 목적: runtime에 publish된 template 목록 조회

#### `a2ui.get_template_contract`

- 목적: 특정 template의 input/action contract 조회

#### `a2ui.resolve_surface`

- 목적: 현재 context와 facts를 기반으로 surface 생성

입력 예시:

```json
{
  "intent": "deploy.start",
  "context": {
    "userId": "u-1",
    "orgId": "demo",
    "conversationId": "c-1"
  },
  "facts": {
    "deploy": {
      "serviceName": "payments-api"
    }
  }
}
```

출력 예시:

```json
{
  "decision": "render_surface",
  "text": "payments-api 배포를 준비했습니다.",
  "surface": {
    "templateId": "quick_deploy_launchpad",
    "payload": {
      "service": "payments-api"
    },
    "sourceIntent": "deploy.start",
    "updatedAt": "2026-04-08T00:00:00Z"
  }
}
```

#### `a2ui.handle_action`

- 목적: 버튼/선택 액션 처리 후 새 상태나 새 surface 반환

입력 예시:

```json
{
  "action": {
    "actionId": "deploy.start",
    "templateId": "quick_deploy_launchpad",
    "targetRef": {
      "entityType": "service",
      "entityId": "payments-api"
    }
  },
  "context": {
    "conversationId": "c-1"
  }
}
```

### PoC에서 runtime이 꼭 보여줘야 하는 운영 개념

- validation failure 시 text fallback
- unknown template/action 방어
- timeout 또는 resolver 실패 시 graceful degrade
- trace/debug 정보 남기기

---

## 7.4 Python Agent Lib

### 역할

먼저 text-only chatbot을 정상적으로 구동하는 Python agent가 있어야 한다.
그 다음 이 라이브러리가 붙어서 A2UI를 "MCP 여러 번 호출하는 귀찮은 일"이 아니라 "상위 capability 한 번 호출하는 일"로 보이게 만든다.

### 권장 public API

```python
class A2UIAgent:
    async def render_or_fallback(self, *, intent, context, facts, text=None) -> dict: ...
    async def maybe_render_a2ui(self, *, intent, context, facts) -> dict: ...
    async def handle_a2ui_action(self, *, action, context, facts=None) -> dict: ...
```

### 권장 사용 예시

```python
async def run_agent_turn(user_input: str, state: dict) -> dict:
    plan = planner.plan(user_input, state)
    tool_result = await executor.run(plan)
    text = await narrator.generate(user_input=user_input, tool_result=tool_result)

    return await a2ui_agent.render_or_fallback(
        intent=state.get("intent"),
        context={
            "conversation_id": state["conversation_id"],
            "user_id": state["user_id"],
        },
        facts=state,
        text=text,
    )
```

### 이 라이브러리에서 숨겨야 하는 것

- MCP transport 설정
- request/response serialization
- retry / timeout
- contract mismatch 처리
- text fallback 결정

즉 Python agent 개발자는 `a2ui_agent`를 기존 workflow 마지막 단계 또는 action loop 진입점에만 끼워 넣으면 되어야 한다.

중요한 점은 이 라이브러리가 Python agent 자체를 대체하는 것이 아니라는 점이다.

- Python agent 본체: text 응답, tool 호출, memory, workflow 담당
- `python agent lib`: A2UI surface 생성과 action round-trip 담당

즉 순서는 항상 아래와 같다.

```text
Python agent 먼저 구축
  -> chatbot text 응답 연결
  -> a2ui_agent lib 추가
  -> surface/action capability 확장
```

---

## 7.5 기존 Chatbot 서비스 적용 방식

### 1단계: Python agent로 먼저 교체

현재 repo는 Next.js route가 직접 orchestration을 수행한다.
PoC의 첫 단계는 이 route를 Python agent 호출용 adapter로 바꾸는 것이다.

```text
chatbot frontend
  -> Next.js chat route
  -> Python agent
  -> text response
```

이 단계의 완료 기준은 A2UI 없이도 chatbot이 Python agent 기반으로 정상 응답하는 것이다.

### 2단계: 응답 직전에 A2UI 삽입

Python agent가 먼저 정상 동작한 뒤, 가장 현실적인 POC 통합은 최종 응답 직전에 A2UI를 한 번 태우는 방식이다.

```text
python agent planner/executor/narrator
  -> text draft 생성
  -> a2ui_agent.render_or_fallback()
  -> response = { text, surface }
```

### 프론트 적용 방식

```text
chat response 수신
  -> text 렌더링
  -> surface가 있으면 @a2ui/react로 렌더링
  -> button click 시 action event POST
  -> backend가 python lib 통해 MCP handle_action 호출
  -> 새 text/surface 반영
```

### 이 통합에서 중요한 점

- 먼저 chatbot의 실행 주체를 Python agent로 바꾼다.
- 기존 chatbot 본체를 갈아엎지 않는다.
- Python agent의 tool/memory/workflow는 그대로 둔다.
- A2UI는 response enrichment 레이어로 붙는다.

---

## 8. repo / 모듈 구조 권장안

이번 PoC는 처음부터 repo를 쪼개는 것보다, 먼저 모듈 경계를 명확히 만드는 편이 낫다.

### 8.1 PoC 1단계: 한 repo 안에서 경계부터 분리

```text
src/
  a2ui/
    contracts/
    react/
    admin/
    runtime/
  demo-chatbot/
python/
  a2ui_agent/
```

이 방식의 장점은 다음과 같다.

- 현재 repo 자산을 빠르게 재배치할 수 있다.
- UI/contract/runtime 분리가 먼저 일어난다.
- 데모 속도가 빠르다.

### 8.2 PoC 2단계: 패키지화

PoC가 통과하면 이후 아래 구조로 옮기면 된다.

```text
apps/
  demo-chatbot
  a2ui-admin
packages/
  a2ui-contracts
  a2ui-react
services/
  a2ui-runtime
python/
  a2ui_agent
```

### 8.3 현재 repo 코드의 추천 이동 방향

| 현재 코드 | 추천 이동 위치 |
|---|---|
| `src/devops-chat/types/templates.ts` | `src/a2ui/contracts/templates.ts` |
| `src/devops-chat/types/conversation.ts` 일부 surface/action 타입 | `src/a2ui/contracts/runtime.ts` |
| `src/devops-chat/actions/action-types.ts` | `src/a2ui/contracts/actions.ts` |
| `src/devops-chat/templates/template-renderer.tsx` | `src/a2ui/react/surface-renderer.tsx` |
| `src/devops-console/templates/*` | `src/a2ui/react/templates/*` |
| `src/devops-chat/template-registry/*` | `src/a2ui/admin/registry/*` |
| `src/devops-console/template-admin/*` | `src/a2ui/admin/ui/*` |
| `src/devops-chat/server/tools/*` | `src/a2ui/runtime/resolvers/*` |
| `src/devops-chat/templates/binders/*` | `src/a2ui/runtime/binders/*` |
| `src/devops-chat/actions/*` | `src/a2ui/runtime/actions/*` |

---

## 9. 권장 개발 순서

## Phase 1. Python agent 먼저 구축

- 단순 text-only Python agent 작성
- LLM 호출 또는 최소 tool 호출만으로 챗봇 응답 가능하게 구성
- Next.js chat route가 Python agent를 호출하게 연결

완료 기준:

- chatbot이 더 이상 in-process TS orchestration이 아니라 Python agent 응답으로 동작한다.

## Phase 2. Contract 고정

- surface envelope 타입 정리
- action event 타입 정리
- template payload 타입 정리
- validator 위치 정리

완료 기준:

- front lib, runtime, python lib가 같은 JSON shape를 쓴다.

## Phase 3. Front A2UI Lib 추출

- 현재 template renderer와 7개 template 컴포넌트 추출
- `onAction` 표준화
- unknown template fallback 추가

완료 기준:

- 어떤 chatbot 페이지에서도 `surface`만 주면 렌더링 가능하다.

## Phase 4. Runtime 분리

- binder/decision/action runtime을 `a2ui runtime` 모듈로 이동
- published registry 로딩 구조 추가
- MCP tool 인터페이스 추가

완료 기준:

- Next app 내부 함수가 아니라 별도 runtime service처럼 호출 가능하다.

## Phase 5. Admin 확장

- existing template admin을 control plane 화면으로 재배치
- binding recipe 편집
- publish 개념 추가

완료 기준:

- draft -> preview -> publish 흐름이 보인다.

## Phase 6. Python Agent Lib 작성

- MCP client 래퍼 작성
- 고수준 helper 함수 3개 작성
- fallback 정책 내장

완료 기준:

- 이미 동작 중인 Python agent 코드에서 A2UI 통합이 함수 한두 개 수준으로 끝난다.

## Phase 7. Existing Chatbot Integration

- chat response에 `surface` 포함
- 프론트 렌더링 연결
- action round-trip 연결

완료 기준:

- Python agent 기반 chatbot에서 사용자 질문 -> surface 렌더링 -> 버튼 클릭 -> 후속 처리까지 end-to-end 시연 가능하다.

---

## 10. story 기준 데모 시나리오 매핑

### Deploy

- 입력: `payments-api 배포해줘`
- runtime 결과: `quick_deploy_launchpad`
- action: `deploy.start`

### Approval

- 입력: `승인 요청 확인해줘`
- runtime 결과: `approval_queue_inbox`
- 후속 상세: `deployment_approval_inbox`
- action: `approval.approve_item`, `approval.hold_item`

### Rollback

- 입력: `payments-api 롤백하고 싶어`
- runtime 결과: `rollback_target_list`
- 후속 단계: `dry_run_stepper` -> `confirm_action`
- action: `rollback.select_target`, `rollback.start_dry_run`, `rollback.confirm`

즉 story에 있는 사용 시나리오가 그대로 template catalog와 action catalog가 되어야 한다.

---

## 11. 이번 PoC에서 굳이 하지 않아도 되는 것

- 범용 drag-and-drop admin builder
- 복잡한 multi-tenant 권한 체계
- 실제 배포/승인/롤백 외의 모든 도메인 일반화
- 완전한 DB 기반 운영 시스템
- 모든 language용 agent SDK

이번 PoC의 목표는 "작게라도 end-to-end를 진짜로 보여주는 것"이지, 처음부터 완제품 플랫폼을 다 만드는 것이 아니다.

---

## 12. 최종 권장 결론

이번 PoC는 아래 전략으로 가는 것이 가장 현실적이다.

1. 현재 repo에 이미 있는 template, binder, action, admin prototype을 버리지 않는다.
2. 먼저 `contract`, `front lib`, `runtime`, `admin` 경계를 한 repo 안에서 분리한다.
3. runtime은 MCP server 형태로 노출한다.
4. Python agent lib는 저수준 MCP 호출을 숨기고 `render_or_fallback()` 중심으로 제공한다.
5. 기존 chatbot 서비스에는 응답 직전 삽입 방식으로 적용한다.

즉 이번에 만들어야 하는 것은 단순한 데모 페이지가 아니라 아래 4개가 연결된 작은 플랫폼이다.

- 렌더링 가능한 `front a2ui lib`
- 설계 가능한 `admin`
- 실행 가능한 `runtime / MCP server`
- 쉽게 붙일 수 있는 `python agent lib`

이 네 조각이 연결되면, 기존 chatbot 서비스에 A2UI를 capability로 붙이는 PoC 메시지가 가장 설득력 있게 성립한다.
