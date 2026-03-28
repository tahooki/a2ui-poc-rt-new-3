# Conversation Foundation 1차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 1차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지에 한정한다.

* conversation store 도입
* response protocol 정리
* text-only + tool-based answer 흐름 구축

이번 단계는 foundation 정리 단계다.  
즉, A2UI decision engine, template policy, admin registry, action bridge까지 한 번에 들어가지 않는다.  
대신 앞으로 그 위에 안정적으로 쌓을 수 있도록 **assistant 상태, 서버 응답 규약, tool 실행 진입점**을 먼저 바로잡는다.

---

## 현재 코드베이스 진단

### 1. assistant 상태가 이중화되어 있다

현재 assistant 관련 상태는 두 군데에 나뉘어 있다.

* [src/devops-chat/store/chat-assistant-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/chat-assistant-store.ts)
* [src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)

문제는 둘의 책임이 겹치는데도 서로 다른 방향으로 진화하고 있다는 점이다.

* `chat-assistant-store.ts`는 `/assistant` 전용 텍스트 채팅 store처럼 동작한다.
* `app-store.ts`는 deploy/approve/rollback 각 페이지 runtime 내부에 assistant 상태를 따로 들고 있다.
* 이 구조에서는 conversation-first foundation이 아니라 여전히 page-scoped assistant가 기준이 된다.

### 2. 현재 `/api/chat`은 conversation 응답이 아니라 텍스트 스트림 프록시다

[src/app/api/chat/route.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/app/api/chat/route.ts)는 현재 다음 역할만 수행한다.

* pageKey 기반 system prompt 생성
* selected item JSON 전달
* OpenAI SSE를 `delta` / `done` 이벤트로 중계

즉 서버가 턴을 오케스트레이션하지 않는다.

* tool 실행이 없다
* structured response가 없다
* awaiting 상태가 없다
* decision metadata가 없다
* surface는 request에 `templateId`가 들어가도 실제 응답 구조에 반영되지 않는다

### 3. routing 기준이 conversation state가 아니라 selected item이다

[src/devops-chat/lib/prompt-router.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/prompt-router.ts)는 현재 아래 전제를 갖고 있다.

* 사용자는 이미 특정 row를 선택했다
* 현재 pageKey가 명확하다
* prompt는 그 선택된 항목에 대한 보조 질문이다

이 방식은 deploy/approve/rollback의 현재 mock UI에는 맞지만, 다음 요구에는 맞지 않는다.

* 선택 전 일반 대화
* 서비스 선택 follow-up
* conversation facts 기반 continuation
* page-independent assistant

### 4. template 상태가 실제 assistant 응답 흐름과 분리되어 있다

[src/devops-chat/view-models/build-console-view-model.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/view-models/build-console-view-model.ts)를 보면:

* deploy는 항상 `buildDeployTemplate(selectedItem)`를 사용한다
* approve도 항상 `buildApprovalTemplate(selectedItem)`를 사용한다
* rollback만 `assistant.activeTemplateId`를 일부 반영한다

즉 현재 구조에서는 assistant가 어떤 판단을 내렸는지가 template surface에 일관되게 반영되지 않는다.

### 5. workspace 방향의 UI는 있는데 실제 주 경로에 연결되지 않았다

다음 파일들은 workspace foundation 방향으로 이미 존재한다.

* [src/devops-console/shell/assistant-workspace.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/assistant-workspace.tsx)
* [src/devops-console/assistant/template-surface.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/template-surface.tsx)
* [src/devops-console/assistant/activity-log.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/activity-log.tsx)
* [src/devops-console/assistant/command-composer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/command-composer.tsx)

하지만 실제 deploy 화면은 여전히 [src/devops-console/assistant/chat-assistant-panel.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/chat-assistant-panel.tsx)를 붙여 쓰고 있고, `AssistantWorkspace`는 아직 사용되지 않는다.

즉 UI foundation도 중간 상태다.

### 6. 테스트 기반이 없다

현재 `package.json`에는 `lint`만 있고, unit/integration test runner가 없다.

이 단계부터는 상태 전이와 protocol이 늘어나기 때문에 테스트 기반 없이 진행하면 회귀가 빠르게 쌓일 가능성이 높다.

### 7. inflight 요청과 context 변경 경쟁 상태가 고려되지 않았다

현재 구조에서는 assistant 요청이 진행 중일 때:

* 다른 row를 선택하거나
* 다른 탭으로 이동하거나
* 다른 page conversation으로 전환하거나
* 같은 대화에 다시 submit하는 상황

에 대한 명확한 정책이 없다.

이 상태로 conversation foundation을 올리면 다음 문제가 생길 수 있다.

* 늦게 도착한 delta가 잘못된 conversation에 append됨
* 이전 selection 기준 응답이 현재 context 위에 섞여 보임
* 같은 대화에 두 turn이 동시에 열려 message ordering이 깨짐

따라서 1차 기반에서도 최소한의 request identity와 abort/cancel 정책은 필요하다.

---

## 이번 단계의 목표

이번 1차 기반의 완료 기준은 아래와 같다.

1. assistant 상태의 기준점을 page 내부 assistant runtime이 아니라 conversation store로 옮긴다.
2. `/api/chat` 응답을 단순 문자열 스트리밍이 아니라 structured turn response로 바꾼다.
3. 최소한의 tool registry / executor를 도입해 text-only이지만 tool-backed 답변이 가능해진다.
4. 기존 deploy/approve/rollback UI는 깨지지 않은 상태를 유지한다.
5. A2UI surface는 아직 본격 전환하지 않더라도, 이후 확장을 위해 `surface: null | {...}` 형태의 protocol 자리를 확보한다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* template selection policy 엔진 본격 도입
* render_surface 판단 엔진 완성
* template registry / admin 탭 구축
* button action bridge 리팩터링
* deploy/rollback/approval 실행 액션을 tool화하는 작업
* workspace UI 전면 교체

이번 단계는 "구조를 버틸 수 있게 만드는 단계"다.  
화려한 surface보다 상태 모델과 protocol을 먼저 안정화해야 한다.

---

## 권장 구현 전략

## 1. conversation 타입을 먼저 독립시킨다

현재 `AssistantMessage`, `AssistantIntent` 같은 타입은 [src/devops-chat/types/domain.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/domain.ts)에 섞여 있다.

이 상태로는 assistant의 기준 모델이 계속 page domain 타입에 종속된다.

이번 단계에서는 conversation 전용 타입 파일을 분리하는 것이 맞다.

권장 신규 파일:

* `src/devops-chat/types/conversation.ts`
* `src/devops-chat/types/assistant-response.ts`

여기서 최소한 아래 구조를 정의해야 한다.

```ts
type ConversationId = string;

type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  status: "complete" | "streaming" | "error";
};

type ConversationFacts = {
  pageKey?: "deploy" | "approve" | "rollback";
  selectedEntity?: Record<string, unknown> | null;
  deploy?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  rollback?: Record<string, unknown>;
};

type ConversationAwaiting =
  | null
  | {
      kind: "free_text" | "service_selection" | "confirmation";
      prompt: string;
    };

type PendingToolState =
  | null
  | {
      toolName: string;
      status: "running" | "done" | "error";
      summary?: string;
    };

type ConversationDecision = {
  mode: "text" | "ask_followup" | "render_surface";
  reason?: string;
};
```

핵심은 `selectedItem` 타입 자체를 conversation state의 중심으로 두지 않는 것이다.

그리고 1차 기반부터 아래 필드도 같이 고려하는 편이 안전하다.

```ts
type ConversationState = {
  id: ConversationId;
  messages: ConversationMessage[];
  facts: ConversationFacts;
  awaiting: ConversationAwaiting;
  pendingTool: PendingToolState;
  decision: ConversationDecision | null;
  activeSurface: null | {
    templateId: string;
    payload: Record<string, unknown>;
  };
  activeRequestId: string | null;
};
```

`activeRequestId`는 streaming/event ordering 안정성을 위해 1차부터 넣어 두는 것이 좋다.

---

## 2. assistant store를 conversation store로 재편한다

현재는 `chat-assistant-store.ts`와 `app-store.ts` 내부 assistant runtime이 병존한다.

이번 단계에서의 원칙은 명확하다.

* **assistant 상태의 source of truth는 conversation store 하나로 통일한다**
* `app-store.ts`는 deploy/approve/rollback domain runtime과 action만 담당한다
* conversation context를 만들기 위한 snapshot은 `app-store.ts`에서 읽어올 수 있지만, 메시지와 응답 상태는 conversation store가 가져간다

권장 신규 파일:

* `src/devops-chat/store/conversation-store.ts`

권장 액션:

* `ensureConversation(conversationId, seedContext)`
* `setComposerText(conversationId, value)`
* `startUserTurn(conversationId, input)`
* `appendAssistantDelta(conversationId, text)`
* `completeAssistantTurn(conversationId, result)`
* `failAssistantTurn(conversationId, error)`
* `mergeFacts(conversationId, factsPatch)`
* `setAwaiting(conversationId, awaiting)`
* `setPendingTool(conversationId, pendingTool)`
* `resetConversation(conversationId)`
* `cancelActiveTurn(conversationId)`

여기서 중요한 구현 포인트:

* `/assistant` 페이지와 deploy sidebar가 같은 protocol을 쓰게 만들어야 한다
* 아직 완전한 cross-page conversation merge는 무리여도, store shape는 conversation-first여야 한다
* 초기 단계에서는 `conversationId`를 page별 고정 ID로 두어도 된다
* submit 시 `requestId`를 발급해서 delta/result 적용 전에 conversation의 active request와 일치하는지 확인해야 한다

예:

* `assistant:deploy`
* `assistant:approve`
* `assistant:rollback`
* `assistant:global`

이렇게 시작한 뒤, 나중에 selection/facts 기반으로 세분화해도 된다.

또한 `completeAssistantTurn`은 단순히 message만 끝내지 말고 아래를 같이 반영해야 한다.

* tool adapter가 만든 facts patch merge
* awaiting 상태 반영
* decision 반영
* active surface 반영
* pending tool 해제

---

## 3. app-store에서는 assistant runtime을 걷어내는 방향으로 간다

[src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)는 지금 너무 많은 역할을 가진다.

현재 혼합된 책임:

* page seed/runtime 관리
* row selection
* deploy/rollback action 실행
* assistant message append
* prompt submit
* template 전환

이번 단계에서는 아래처럼 정리해야 한다.

남길 책임:

* deploy/approve/rollback runtime
* row selection / workflow form 상태
* domain action 실행

빼낼 책임:

* assistant message lifecycle
* chat streaming lifecycle
* assistant error/loading
* prompt submission orchestration

주의할 점:

* 한 번에 전부 삭제하지 말고, 먼저 conversation store를 붙인 뒤 `app-store.ts`의 assistant state를 read-only adapter 수준으로 축소하는 것이 안전하다
* 특히 `runPrimaryTemplateAction`, `runSecondaryTemplateAction`는 아직 유지해야 하므로 domain action 부분은 손대지 않는다

추가로 1차 단계에서 selection/context 변경 시 정책도 명확히 해야 한다.

권장 정책:

* row/tab/page 변경은 conversation history를 즉시 초기화하지 않는다
* 대신 `facts.pageKey`, `facts.selectedEntity`, `contextSnapshot`만 최신값으로 동기화한다
* 이미 진행 중인 request는 abort하거나, 완료되더라도 `activeRequestId` 불일치 시 폐기한다

---

## 4. `/api/chat`을 orchestrated turn endpoint로 바꾼다

현재 [src/app/api/chat/route.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/app/api/chat/route.ts)는 OpenAI 프록시 역할만 한다.

1차 기반에서는 이 route가 아래 일을 해야 한다.

1. conversation request를 받는다
2. 현재 context snapshot과 history를 읽는다
3. 간단한 tool resolver를 실행한다
4. 필요하면 tool을 실행한다
5. tool 결과를 normalized summary/facts로 변환한다
6. 최종 assistant message를 생성한다
7. structured turn response를 SSE로 보낸다

즉 route는 이제 "LLM 호출 통로"가 아니라 "대화 턴 처리 진입점"이 되어야 한다.

권장 신규 파일:

* `src/devops-chat/server/orchestrate-chat-turn.ts`
* `src/devops-chat/server/tools/tool-registry.ts`
* `src/devops-chat/server/tools/tool-executor.ts`
* `src/devops-chat/server/tools/tool-result-adapter.ts`

---

## 5. 1차에서는 read-only tool만 도입한다

이번 단계에서 action tool까지 넣으면 범위가 너무 커진다.

따라서 1차 기반 tool은 조회성으로 제한하는 것이 맞다.

권장 1차 tool 후보:

* `getPreviousDeployments`
* `getDeployableServices`
* `getApprovalQueueSummary`
* `getRollbackCandidates`
* `getSelectedContextSummary`

데이터 소스는 우선 seed data 기반으로 시작해도 된다.

* [src/devops-chat/data/seed/deploy.json](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/data/seed/deploy.json)
* [src/devops-chat/data/seed/approve.json](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/data/seed/approve.json)
* [src/devops-chat/data/seed/rollback.json](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/data/seed/rollback.json)

이 단계에서 중요한 것은 "실제 데이터를 읽어 structured summary를 만드는 경로"를 확보하는 것이다.  
LLM이 도구 없이 즉석에서 말하게 두는 것은 foundation 단계에서 피해야 한다.

---

## 6. response protocol은 지금 바로 구조화해야 한다

현재 [src/devops-chat/lib/chat-api.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/chat-api.ts)는 `delta` / `done`만 파싱한다.

이제는 최소 아래 형태를 지원해야 한다.

```ts
type AssistantTurnResponse = {
  message: {
    role: "assistant";
    text: string;
  };
  surface: null;
  awaiting: ConversationAwaiting;
  pendingTool: PendingToolState;
  decision: {
    mode: "text" | "ask_followup" | "render_surface";
    reason?: string;
  };
  toolResults?: Array<{
    toolName: string;
    summary: string;
  }>;
};
```

이번 단계에서는 `surface`를 거의 항상 `null`로 두더라도 괜찮다.  
중요한 것은 프론트와 서버가 이제부터 **문자열이 아니라 턴 결과 객체를 주고받는다는 점**이다.

권장 SSE 이벤트:

* `delta`
* `tool`
* `result`
* `error`
* `done`

---

## 7. UI는 panel 유지, 데이터 모델만 먼저 교체한다

이번 단계에서 UI 전면 개편까지 가면 산만해진다.

따라서 UI 전략은 아래가 맞다.

* `ChatAssistantPanel`은 유지
* `AssistantWorkspace` 전면 도입은 보류
* 대신 `ChatAssistantPanel`이 conversation store와 structured response를 읽도록 바꾼다

즉 이번 단계 UI 변경 목표:

* message rendering 유지
* pending tool 표시 추가
* awaiting 상태 표시 추가
* error 표시 유지
* surface는 아직 렌더하지 않아도 protocol상 저장은 가능하게 둔다

---

## 파일별 수정 계획

## 새로 만들 파일

* `src/devops-chat/types/conversation.ts`
* `src/devops-chat/types/assistant-response.ts`
* `src/devops-chat/store/conversation-store.ts`
* `src/devops-chat/server/orchestrate-chat-turn.ts`
* `src/devops-chat/server/tools/tool-registry.ts`
* `src/devops-chat/server/tools/tool-executor.ts`
* `src/devops-chat/server/tools/tool-result-adapter.ts`
* `src/devops-chat/server/tools/builtin/get-previous-deployments.ts`
* `src/devops-chat/server/tools/builtin/get-deployable-services.ts`
* `src/devops-chat/server/tools/builtin/get-approval-queue-summary.ts`
* `src/devops-chat/server/tools/builtin/get-rollback-candidates.ts`

## 수정이 필요한 기존 파일

* [src/devops-chat/store/chat-assistant-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/chat-assistant-store.ts)
  현재 standalone text chat store다. 삭제 또는 legacy wrapper로 축소하는 것이 맞다.

* [src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)
  assistant 상태와 submit 로직을 빼내고 domain runtime 중심으로 정리해야 한다.

* [src/devops-chat/lib/chat-api.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/chat-api.ts)
  request/response 타입과 SSE 파서를 structured protocol 기준으로 교체해야 한다.

* [src/app/api/chat/route.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/app/api/chat/route.ts)
  단순 OpenAI proxy에서 orchestrated endpoint로 바꿔야 한다.

* [src/devops-chat/lib/prompt-router.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/prompt-router.ts)
  1차 기반의 핵심 진입점으로 더 키우지 말고 legacy routing으로 격하해야 한다.

* [src/devops-chat/view-models/build-console-view-model.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/view-models/build-console-view-model.ts)
  assistant 데이터를 `page.assistant`가 아니라 conversation selector에서 읽도록 바꿔야 한다.

* [src/devops-console/assistant/chat-assistant-panel.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/chat-assistant-panel.tsx)
  pending tool / awaiting / structured result 반영이 필요하다.

* [src/devops-console/assistant-page.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant-page.tsx)
  selected item 전달 중심에서 conversation context 기반으로 바꿔야 한다.

---

## 상세 Todo List

## A. 타입 모델 정리

* [x] `src/devops-chat/types/conversation.ts`를 추가하고 conversation 전용 상태 타입을 정의한다.
* [x] `ConversationMessage`에 `role: "tool"`을 열어 두고, 추후 tool log 메시지를 담을 수 있게 한다.
* [x] `ConversationFacts`를 페이지 선택 상태의 복사본이 아니라 "현재 대화에서 수집된 사실" 중심으로 설계한다.
* [x] `ConversationAwaiting` 타입을 추가하고 최소 `free_text`, `service_selection`, `confirmation`을 포함한다.
* [x] `PendingToolState` 타입을 추가해 UI에서 로딩 상태를 텍스트 외에도 표현할 수 있게 한다.
* [x] `ConversationDecision` 타입을 추가하고 `text | ask_followup | render_surface`를 명시한다.
* [x] `src/devops-chat/types/assistant-response.ts`를 추가하고 `AssistantTurnRequest`, `AssistantTurnResponse`, SSE event payload 타입을 정의한다.
* [x] `src/devops-chat/types/domain.ts`에 있는 assistant 관련 타입을 그대로 둘지, conversation 타입으로 이관할지 결정하고 한 방향으로 정리한다.

## B. conversation store 도입

* [x] `src/devops-chat/store/conversation-store.ts`를 추가한다.
* [x] store shape를 `conversations: Record<ConversationId, ConversationState>` 구조로 만든다.
* [x] page별 기본 conversation ID 정책을 정의한다.
* [x] `ensureConversation` 액션으로 conversation이 없는 경우 초기 생성되게 한다.
* [x] `setComposerText`, `clearError`, `resetConversation` 액션을 conversation ID 기준으로 제공한다.
* [x] `startUserTurn`에서 user message와 assistant streaming placeholder를 동시에 생성한다.
* [x] `appendAssistantDelta`에서 placeholder message에 delta를 누적한다.
* [x] `completeAssistantTurn`에서 `message`, `awaiting`, `pendingTool`, `decision`, `surface`를 한 번에 반영한다.
* [x] `failAssistantTurn`에서 streaming placeholder를 error 상태로 정리한다.
* [x] 메시지 trim 정책을 store 내부 공통 로직으로 모은다.
* [x] `/assistant` 전용 페이지와 각 workflow sidebar가 같은 store 인스턴스를 쓰도록 만든다.

## C. 기존 store 중복 제거

* [x] `chat-assistant-store.ts`를 conversation store wrapper로 바꾸거나 제거한다.
* [x] `app-store.ts`의 `assistant` runtime 타입 정의를 축소 또는 제거한다.
* [x] `app-store.ts`에서 `submitPrompt`, `setComposerText`, `activateIntent`, assistant error/loading 관리 코드를 conversation store로 이동한다.
* [x] `app-store.ts`에 남아야 할 것은 domain runtime과 실제 page action뿐인지 확인하고 책임을 다시 분리한다.
* [x] `app-store.ts`의 deploy/approve/rollback row selection 시 assistant message를 직접 reset하는 로직을 제거하거나 conversation context sync로 바꾼다.
* [x] row selection이 conversation을 무조건 초기화하지 않도록 정책을 정한다.

## D. conversation context snapshot 정리

* [x] 각 page runtime에서 conversation request에 포함할 context snapshot shape를 정의한다.
* [x] deploy는 선택된 request, 선택 이미지, workflow draft 일부를 snapshot으로 제공한다.
* [x] approve는 active tab, selected request, risk summary를 snapshot으로 제공한다.
* [x] rollback은 selected service, active deployment, current status를 snapshot으로 제공한다.
* [x] snapshot builder를 별도 함수로 분리해 UI 컴포넌트에서 직접 JSON 조립하지 않게 한다.
* [x] selection/tab/page 변경 시 snapshot을 언제 갱신할지 명시한다.
* [x] 권장안은 "submit 시점 snapshot 캡처 + selection 변경 시 facts.selectedEntity 동기화"다.
* [x] snapshot에는 화면 렌더용 전체 runtime을 싣지 말고, assistant 판단에 필요한 최소 필드만 담는다.

## E. tool foundation 도입

* [x] `tool-registry.ts`에 tool 정의 타입과 registry 생성 함수를 만든다.
* [x] `tool-executor.ts`에 공통 실행 결과 포맷을 만든다.
* [x] `tool-result-adapter.ts`에 tool 결과를 conversation facts에 반영하는 adapter를 만든다.
* [x] deploy seed에서 최근 배포 목록을 요약할 수 있는 `getPreviousDeployments`를 구현한다.
* [x] deploy seed에서 서비스 목록을 뽑는 `getDeployableServices`를 구현한다.
* [x] approval seed에서 대기 큐 요약을 반환하는 `getApprovalQueueSummary`를 구현한다.
* [x] rollback seed에서 후보 버전과 상태를 반환하는 `getRollbackCandidates`를 구현한다.
* [x] 조회성 tool은 모두 read-only로 유지하고, 상태 변경은 이번 단계에서 금지한다.
* [x] tool 결과 객체에 `ok`, `toolName`, `data`, `summary` 필드를 공통으로 맞춘다.
* [x] tool 결과 adapter가 `factsPatch`를 반환하도록 맞춘다.
* [x] tool이 없어도 deterministic하게 답할 수 있는 기본 contextual summarizer를 준비한다.

## F. orchestrator 도입

* [x] `orchestrate-chat-turn.ts`를 추가한다.
* [x] orchestrator 입력은 `conversationId`, `prompt`, `history`, `contextSnapshot`, `facts`가 되게 한다.
* [x] 1차 기반에서는 LLM 자유 판단에만 의존하지 않고, keyword + context 기반의 간단한 resolver를 둔다.
* [x] "이전 배포", "최근 배포", "deployable service", "rollback candidate" 같은 대표 질의는 명시적으로 tool로 연결한다.
* [x] tool이 선택되면 먼저 실행하고, 결과를 요약한 뒤 assistant text를 만든다.
* [x] tool이 불필요한 경우에만 plain contextual answer 경로로 보낸다.
* [x] follow-up이 필요한 경우 `decision.mode = "ask_followup"`과 `awaiting`을 반환한다.
* [x] 이번 단계에서는 `decision.mode = "render_surface"`를 거의 쓰지 않더라도 필드는 남겨 둔다.
* [x] 1차 기반의 기본 원칙은 "tool 결과만으로도 답변이 성립"이 되도록 잡는다.
* [x] 즉 `OPENAI_API_KEY`가 없거나 LLM 호출이 실패해도 tool summary 기반 응답은 가능해야 한다.
* [x] orchestrator는 최종적으로 `factsPatch`, `decision`, `awaiting`, `surface`, `message`를 함께 반환한다.

## G. API route 리팩터링

* [x] `/api/chat` request body를 `pageKey`, `selectedItem`, `templateId` 중심에서 `conversationId`, `input`, `contextSnapshot`, `history`, `facts` 중심으로 재설계한다.
* [x] route 내부 OpenAI 직접 프록시 코드를 orchestrator 호출 구조로 바꾼다.
* [x] 필요 시 orchestrator 내부에서만 OpenAI를 호출하게 해 route의 책임을 줄인다.
* [x] SSE 응답에 `delta`, `tool`, `result`, `error`, `done` 이벤트를 보낼 수 있게 한다.
* [x] `result` 이벤트에 structured turn response 전체를 담는다.
* [x] tool 실행 전후를 SSE로 흘려 UI가 pending state를 표현할 수 있게 한다.
* [x] fallback text 생성 책임을 프론트가 아니라 서버 orchestrator 쪽으로 옮긴다.
* [x] `requestId`를 request/response 양쪽에 포함해 client가 stale event를 무시할 수 있게 한다.
* [x] tool-only 응답은 text delta가 하나도 없어도 `result` 이벤트만으로 정상 완료될 수 있게 한다.
* [x] response shape에 `protocolVersion` 필드를 둘지 검토한다.

## H. client chat API 정리

* [x] `src/devops-chat/lib/chat-api.ts`의 request 타입을 새 protocol 기준으로 수정한다.
* [x] SSE parser가 `delta` 외 이벤트를 인식하도록 확장한다.
* [x] `onTool`, `onResult`, `onError`, `onDone` 핸들러를 추가한다.
* [x] 단순 text accumulation과 structured result 반영을 분리한다.
* [x] parse 실패 시 event 단위 에러 메시지가 충분히 보이도록 한다.
* [x] request별 `AbortController` 또는 동등한 취소 메커니즘을 도입한다.
* [x] 같은 conversation에 새 turn이 시작되면 이전 inflight request를 취소하거나 결과를 폐기하는 정책을 구현한다.
* [x] `result`가 도착했는데도 `requestId`가 현재 active request와 다르면 반영하지 않도록 가드한다.

## I. UI 반영

* [x] `ChatAssistantPanel`이 conversation ID를 받아 conversation store를 읽도록 바꾼다.
* [x] `selectedItem` 직접 전달 의존을 줄이고, 필요 정보는 context snapshot builder를 통해 전달한다.
* [x] panel에 pending tool 상태를 보여줄 영역을 추가한다.
* [x] panel에 awaiting follow-up 상태를 보여줄 보조 문구를 추가한다.
* [x] 현재 에러 렌더링은 유지하되, protocol error와 transport error를 구분할 수 있게 한다.
* [x] streaming placeholder 문구를 structured turn lifecycle에 맞게 다듬는다.
* [x] tool-only 응답처럼 delta 없이 final result만 오는 경우도 자연스럽게 렌더되게 한다.
* [x] selection이 바뀌었는데 이전 turn이 늦게 끝난 경우 현재 conversation과 맞지 않는 응답이 보이지 않게 한다.

## J. view-model 및 page 연결

* [x] `buildConsoleViewModel.ts`가 assistant 메시지와 composer state를 conversation store selector 기반으로 읽도록 바꾼다.
* [x] deploy/approve/rollback별 conversation ID 결정 로직을 공통화한다.
* [x] 현재 deploy/approve는 `activeTemplateId`가 사실상 무시되는 문제를 문서화하고, 1차에서는 template surface를 selected item 기반으로 유지할지 명확히 결정한다.
* [x] 1차 단계에서는 template surface를 크게 건드리지 않더라도, conversation state에 `surface` 필드를 저장해 이후 연결점을 확보한다.
* [x] `/assistant` 페이지와 각 workflow page 사이에서 protocol 차이가 생기지 않도록 맞춘다.
* [x] page 이동 또는 row/tab 변경 시 conversation reset 여부를 명시하고 기본값은 "reset하지 않음"으로 유지한다.

## K. legacy 정리

* [x] `prompt-router.ts`는 더 이상 핵심 orchestrator가 아니라 legacy helper임을 주석 또는 파일 구조상 분명히 한다.
* [x] `build-template-envelope.ts`는 1차 단계에서 직접 확장하지 말고, 이후 facts 기반 selector로 넘어갈 교체 지점을 문서화한다.
* [x] 사용되지 않는 `AssistantWorkspace`를 이번 단계에서 도입할지 보류할지 결정하고 문서에 남긴다.
* [x] 권장안은 이번 단계에서는 `AssistantWorkspace` 도입 보류, 데이터 모델만 정리다.

## L. 테스트 및 검증

* [x] 테스트 러너 부재를 해소할지 결정한다. 권장안은 최소 Vitest 도입이다.
* [x] conversation store 상태 전이 테스트를 추가한다.
* [x] chat API SSE parser 테스트를 추가한다.
* [x] tool executor 결과 포맷 테스트를 추가한다.
* [x] orchestrator의 대표 질의 분기 테스트를 추가한다.
* [x] facts patch merge 테스트를 추가한다.
* [x] inflight request 경쟁 상태 테스트를 추가한다.
* [x] selection 변경 후 stale response 무시 테스트를 추가한다.
* [x] `OPENAI_API_KEY`가 없어도 tool-backed deterministic response가 가능한지 테스트한다.
* [x] 수동 검증 시나리오를 문서로 남긴다.
* [x] 최소 수동 검증 항목:
  * [x] 일반 질문이 text-only로 응답되는가
  * [x] 조회성 질문이 tool 기반 요약으로 응답되는가
  * [x] context가 부족하면 follow-up 상태가 생기는가
  * [x] deploy/approve/rollback 페이지에서 assistant가 공통 protocol로 동작하는가
  * [x] `/assistant` 페이지와 workflow sidebar의 응답 구조가 동일한가
  * [x] row를 바꾼 직후 이전 요청 응답이 늦게 도착해도 화면이 오염되지 않는가
  * [x] 같은 conversation에 연속 submit 시 마지막 요청만 유효하게 반영되는가

---

## 구현 순서 제안

1. 타입 파일 추가
2. conversation store 추가
3. chat-api protocol 수정
4. server orchestrator + tool registry 추가
5. `/api/chat` route 리팩터링
6. `ChatAssistantPanel` 연결 교체
7. `app-store.ts` assistant 로직 제거
8. `buildConsoleViewModel.ts` 연결 정리
9. 테스트 및 수동 검증

이 순서를 권장하는 이유는, `app-store.ts`를 먼저 뜯으면 UI가 바로 불안정해지기 때문이다.  
먼저 새 conversation 경로를 만들고, 기존 store를 마지막에 걷어내는 편이 안전하다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* assistant 상태가 conversation store 하나로 수렴하기 시작했다
* `/api/chat`이 structured turn response를 반환한다
* 최소 1개 이상의 read-only tool이 실제 응답에 사용된다
* deploy/approve/rollback 어느 페이지에서도 assistant가 같은 lifecycle로 동작한다
* 이후 2차 기반에서 awaiting selection / slot memory / A2UI decision engine을 올릴 수 있는 자리가 확보된다

---

## 다음 문서로 넘길 항목

이번 문서가 끝나면 다음 2차 기반 문서에서는 아래를 본격적으로 다뤄야 한다.

* awaiting selection / slot memory
* intent continuation
* conversation facts 누적
* ask_followup / render_surface 판단 로직
* turn-by-turn 상태기계

즉 1차 기반 문서는 "대화 엔진이 설 자리를 만드는 문서"이고, 다음 문서부터 진짜 conversation orchestration으로 들어간다.
