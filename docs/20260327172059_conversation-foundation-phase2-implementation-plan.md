# Conversation Foundation 2차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 2차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지다.

* chat orchestrator 구축
* awaiting selection / slot memory 도입
* A2UI decision engine 도입

이 문서는 [1차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171526_conversation-foundation-phase1-implementation-plan.md)를 전제로 한다.  
즉 1차에서 conversation store, structured response protocol, read-only tool foundation이 먼저 깔렸다는 가정 위에서 작성한다.

---

## 이번 단계가 필요한 이유

1차 기반만 완료된 상태에서는 assistant가 아래까지만 가능하다.

* text-only 응답
* tool-backed 조회 응답
* structured turn response

하지만 여전히 다음이 부족하다.

* 사용자의 짧은 후속 입력을 이전 문맥과 연결하는 능력
* "지금 무엇이 부족한지"를 상태로 유지하는 능력
* tool 결과를 facts/slots로 누적하는 능력
* "여기서 text로 끝낼지, 질문을 더 할지, surface로 넘어갈 준비가 되었는지"를 판단하는 능력

즉 2차 기반의 핵심은 assistant를 단순 질의응답기가 아니라 **상태를 가진 대화 오케스트레이터**로 바꾸는 것이다.

---

## 2차 기반 완료 기준

이번 단계가 끝나면 최소 아래가 가능해야 한다.

1. 사용자가 `배포하고 싶어`라고 말하면 assistant가 필요한 slot을 확인하고 follow-up을 건다.
2. assistant가 `어떤 서비스를 배포할까요?`라고 물은 뒤 사용자가 `payments-api`라고만 답해도 직전 awaiting 상태를 보고 해석할 수 있다.
3. tool 결과가 conversation facts/slots에 누적된다.
4. orchestrator가 매 턴마다 `text | ask_followup | render_surface` 중 무엇이 맞는지 판단한다.
5. decision engine은 사용자 응답 외에도 matched/missing/reason trace를 남긴다.

중요한 경계:

* 이번 단계는 **render_surface 판단까지**다.
* 실제 `templateId` 최종 선택, payload binding, React renderer 연결은 **3차 기반**에서 한다.

즉 이번 단계에서는 `render_surface 가능 상태`를 판단하고 trace를 남기되, 실제 template surface 렌더링은 다음 단계로 넘긴다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* template selector의 conversation facts 기반 전환 완성
* binding builder의 payload 조립 확장
* active surface 실제 렌더 연결
* template registry / policy editor / simulator UI
* deploy/rollback/approval 액션 bridge 정리
* 운영용 debug UI 전면 구축

이번 단계는 "결정 엔진"까지고, "표면 엔진"은 아니다.

---

## 현재 코드 기준 문제 정리

### 1. `prompt-router.ts`는 상태기계가 아니다

[src/devops-chat/lib/prompt-router.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/prompt-router.ts)는 현재:

* 이미 선택된 item 기준
* 현재 prompt 1개만 보고
* canned message와 next template만 반환

하는 구조다.

이 방식은 다음 입력을 처리하지 못한다.

* `배포하고 싶어`
* `payments-api`
* `프로덕션으로`
* `그래 그걸로 진행해`

즉 phase2부터는 route helper가 아니라 **turn-by-turn orchestrator**가 필요하다.

### 2. facts는 아직 누적 상태가 아니다

1차에서 conversation store와 tool foundation을 넣더라도, 그대로 두면 facts는 단순 context snapshot 수준에 머물 가능성이 높다.

하지만 phase2에서는 facts가 최소 아래 조건을 만족해야 한다.

* 어떤 값이 이미 수집되었는지 안다
* 그 값이 어디서 왔는지 안다
* 같은 slot이 갱신될 때 어떤 값을 우선할지 안다
* intent가 바뀌면 어떤 slot을 유지하고 어떤 slot을 버릴지 안다

즉 facts는 단순 `Record<string, unknown>`보다 더 강한 정책이 필요하다.

### 3. awaiting이 "문구" 수준이면 안 된다

`어떤 서비스를 배포할까요?` 같은 질문은 단순 assistant message로만 남아 있으면 안 된다.

phase2에서는 최소 아래가 같이 상태로 남아야 한다.

* 어떤 slot을 기다리는지
* 어떤 intent 흐름인지
* 어떤 옵션을 제안했는지
* 어떤 입력 형식을 기대하는지
* 이 응답이 어떤 turn의 follow-up인지

그래야 사용자가 `payments-api`처럼 짧게 답해도 deterministic하게 해석할 수 있다.

### 4. render 판단과 template 렌더를 분리해야 한다

현재 구조는 template가 selected item에 거의 직결되어 있다.

phase2에서 이 문제를 한 번에 다 풀려고 하면 범위가 커진다.  
따라서 여기서는 아래처럼 분리해야 한다.

* decision engine: 지금 surface로 넘어갈 준비가 되었는지 판단
* phase3 template selector: 어떤 template를 쓸지 결정
* phase3 binding builder: 어떤 payload로 렌더할지 결정

이 분리를 명확히 하지 않으면 phase2 문서가 template 구현 계획서로 번져 버린다.

---

## 핵심 설계 원칙

## 1. orchestrator는 매 턴 상태기계처럼 동작해야 한다

각 turn은 아래 순서를 따라야 한다.

1. 현재 conversation state 읽기
2. inflight/awaiting 상태 확인
3. user input이 awaiting answer인지 먼저 해석
4. intent를 신규 추정 또는 기존 intent continuation으로 해석
5. 필요한 tool plan 결정
6. tool 실행
7. facts/slots merge
8. decision engine 실행
9. user-facing response 생성

중요한 점은 **intent 추정 전에 awaiting answer 소비를 먼저 시도**해야 한다는 것이다.

예:

* assistant: 어떤 서비스를 배포할까요?
* user: payments-api

이 입력은 새 intent 분류보다 먼저 `awaiting.slot = deploy.service.name` 해석 경로로 들어가야 한다.

## 2. slot memory는 "값 저장"이 아니라 "해석 상태 저장"이다

slot memory는 단순히 `service.name = payments-api`만 담으면 부족하다.

권장 구조 예시:

```ts
type FactEntry<T = unknown> = {
  value: T;
  source: "user" | "tool" | "selection" | "system";
  confidence: number;
  updatedAt: string;
};

type DeployFacts = {
  serviceName?: FactEntry<string>;
  environment?: FactEntry<string>;
  targetVersion?: FactEntry<string>;
  availableServices?: FactEntry<string[]>;
  selectedServiceContext?: FactEntry<Record<string, unknown>>;
};
```

즉 phase2에서는 값뿐 아니라 provenance와 우선순위를 다뤄야 한다.

## 3. user explicit input이 tool/default보다 강해야 한다

slot 우선순위 권장안:

1. user explicit
2. UI selection
3. tool-derived
4. system default

예:

* UI에서 선택된 service가 `payments-api`
* tool이 추천한 default environment가 `production`
* 사용자가 `staging으로 해줘`라고 말함

이 경우 `environment = staging`이 우선되어야 한다.

## 4. decision engine은 rule-based로 시작해야 한다

phase2에서 decision engine을 LLM에게 맡기면 흔들린다.

따라서 우선은 rule-based policy가 맞다.

예:

* deploy.start intent인데 `serviceName`이 없으면 `ask_followup`
* `serviceName`이 있고 `selectedServiceContext`가 준비되면 `render_surface`
* 이전 배포 조회 intent이면 `text`

LLM은 있어도 설명 문구를 다듬는 역할까지만 맡겨야 한다.

## 5. phase2의 render_surface는 "surface-ready signal"이어야 한다

이번 단계에서 `decision.mode = "render_surface"`가 나온다고 해서 바로 template를 렌더하지는 않는다.

권장 방식:

* user-facing response는 여전히 text 중심
* internal state에는 `surfaceCandidate` 또는 `surfaceIntent`를 저장
* decision trace에 어떤 이유로 render_surface가 가능해졌는지 남김

예:

```ts
{
  mode: "render_surface",
  reason: "deploy launchpad로 전환 가능한 핵심 facts가 모두 준비됨",
  surfaceIntent: {
    family: "deploy.launchpad",
    intent: "deploy.start"
  }
}
```

실제 `templateId`와 payload는 phase3에서 이 `surfaceIntent`를 소비해 만든다.

## 6. 사용자 수정과 intent interruption은 정상 경로로 다뤄야 한다

phase2부터는 아래 입력을 예외가 아니라 정상 상태 전이로 다뤄야 한다.

* `아니, staging으로`
* `아니 그 서비스 말고 orders-api`
* `취소하고 이전 배포 보여줘`
* `배포 말고 롤백할래`

즉 awaiting 상태라고 해서 무조건 그 slot만 채우려 하면 안 된다.

권장 우선순위:

1. explicit cancel/correction/interruption 패턴 감지
2. 현재 awaiting 해석 시도
3. 기존 intent carry 또는 새 intent 판정

이 규칙이 없으면 사용자가 흐름을 바꾸는 순간 state machine이 오히려 방해물이 된다.

## 7. slot 저장 전 canonicalization이 필요하다

phase2에서는 user input이나 option label을 그대로 slot에 넣지 말고 canonical value로 정규화해야 한다.

예:

* `프로덕션`, `운영`, `prod` -> `production`
* `페이먼츠 API`, `payments`, `payments-api` -> `payments-api`
* `응`, `네`, `yes`, `맞아` -> confirmation true

권장 원칙:

* display label과 canonical value를 분리한다
* option alias, free-text extractor, selection sync가 모두 같은 canonicalizer를 쓴다
* slot memory에는 canonical value를 저장하고, 필요하면 raw input은 별도 trace로 남긴다

## 8. orchestrator에는 loop guard와 tool failure fallback이 필요하다

phase2부터는 한 turn 안에서:

* slot 채움
* tool 실행
* 추가 slot 보강
* decision 재평가

가 이어질 수 있다.

이때 guard가 없으면 같은 turn 안에서 tool plan과 execution이 반복될 수 있다.

권장 최소 정책:

* turn당 orchestration iteration 상한을 둔다
* 같은 tool + 같은 args 조합은 중복 실행하지 않는다
* tool 실패 시 전체 conversation을 깨지 말고 `ask_followup` 또는 `text fallback`으로 내려간다
* failure reason은 decision trace 또는 orchestration trace에 남긴다

---

## 권장 타입 확장

phase2에서 conversation 타입에 아래 필드를 추가하는 것이 좋다.

```ts
type ConversationState = {
  id: string;
  messages: ConversationMessage[];
  intent: ConversationIntentState | null;
  workflow: ConversationWorkflowState | null;
  facts: ConversationFacts;
  awaiting: ConversationAwaiting | null;
  pendingTool: PendingToolState | null;
  lastDecision: ConversationDecision | null;
  lastDecisionTrace: DecisionTrace | null;
  surfaceIntent: SurfaceIntentCandidate | null;
  activeRequestId: string | null;
};
```

권장 신규 타입:

```ts
type ConversationIntentState = {
  intentKey: string;
  confidence: number;
  source: "rule" | "llm" | "carry";
  startedAt: string;
};

type ConversationWorkflowState = {
  flowKey: string;
  stepKey: string;
  status: "collecting" | "ready" | "waiting" | "done";
};

type ConversationAwaiting = {
  kind: "slot";
  slotKey: string;
  prompt: string;
  expectedInput: "free_text" | "single_select" | "confirmation";
  options?: Array<{ label: string; value: string; aliases?: string[] }>;
  allowFreeform?: boolean;
  retryCount: number;
  originIntentKey: string;
  originRequestId: string;
};

type SurfaceIntentCandidate = {
  family: string;
  intentKey: string;
  readiness: "candidate" | "ready";
};

type DecisionTrace = {
  mode: "text" | "ask_followup" | "render_surface";
  score?: number;
  matched: string[];
  missing: string[];
  disqualified: string[];
  reason: string;
};
```

---

## 파일별 수정 계획

## 새로 만들 파일

* `src/devops-chat/server/orchestration/intent-resolver.ts`
* `src/devops-chat/server/orchestration/workflow-definitions.ts`
* `src/devops-chat/server/orchestration/slot-definitions.ts`
* `src/devops-chat/server/orchestration/slot-memory.ts`
* `src/devops-chat/server/orchestration/slot-extractor.ts`
* `src/devops-chat/server/orchestration/entity-resolver.ts`
* `src/devops-chat/server/orchestration/awaiting-resolver.ts`
* `src/devops-chat/server/orchestration/tool-planner.ts`
* `src/devops-chat/server/orchestration/response-builder.ts`
* `src/devops-chat/server/decision/decision-engine.ts`
* `src/devops-chat/server/decision/decision-trace.ts`
* `src/devops-chat/server/decision/policies/deploy.ts`
* `src/devops-chat/server/decision/policies/approval.ts`
* `src/devops-chat/server/decision/policies/rollback.ts`

## 1차에서 만든 파일을 확장할 대상

* `src/devops-chat/types/conversation.ts`
* `src/devops-chat/types/assistant-response.ts`
* `src/devops-chat/store/conversation-store.ts`
* `src/devops-chat/server/orchestrate-chat-turn.ts`
* `src/devops-chat/server/tools/tool-registry.ts`
* `src/devops-chat/server/tools/tool-result-adapter.ts`
* `src/devops-chat/lib/chat-api.ts`
* `src/app/api/chat/route.ts`

## 계속 수정이 필요한 기존 파일

* [src/devops-chat/lib/prompt-router.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/lib/prompt-router.ts)
  phase2에서는 핵심 경로에서 빼고, 완전히 legacy helper로 내려야 한다.

* [src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)
  selection state와 conversation facts sync 지점을 추가해야 한다.

* [src/devops-console/assistant/chat-assistant-panel.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/chat-assistant-panel.tsx)
  awaiting options, quick-reply, ambiguous selection feedback UI가 필요하다.

* [src/devops-console/assistant/command-composer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/command-composer.tsx)
  선택형 follow-up option chip 렌더에 재사용할 수 있다.

* [src/devops-chat/view-models/build-console-view-model.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/view-models/build-console-view-model.ts)
  lastDecision/awaiting/surfaceIntent 상태를 읽을 수 있게 연결해야 한다.

---

## 상세 Todo List

## A. intent / workflow 모델 도입

* [ ] `ConversationIntentState` 타입을 conversation state에 추가한다.
* [ ] `ConversationWorkflowState` 타입을 추가한다.
* [ ] intent key 체계를 정의한다.
* [ ] 권장 시작 intent:
  * [ ] `deploy.start`
  * [ ] `deploy.history.lookup`
  * [ ] `approval.review`
  * [ ] `rollback.start`
  * [ ] `general.qna`
* [ ] 각 intent에 연결되는 workflow key를 정의한다.
* [ ] deploy.start용 기본 workflow step을 정의한다.
* [ ] rollback.start용 기본 workflow step을 정의한다.
* [ ] intent carry 정책을 정의한다.
* [ ] 직전 intent를 언제 유지하고 언제 초기화할지 rule을 문서화한다.

## B. slot schema 정의

* [ ] `slot-definitions.ts`에서 intent별 required/optional slot을 정의한다.
* [ ] deploy.start 필수 slot을 정의한다.
* [ ] 권장 필수 slot:
  * [ ] `deploy.serviceName`
* [ ] deploy.start 준비 완료용 추가 slot을 정의한다.
* [ ] 권장 준비 slot:
  * [ ] `deploy.selectedServiceContext`
  * [ ] `deploy.environment`
  * [ ] `deploy.targetVersion` 또는 `deploy.recommendedVersion`
* [ ] rollback.start 필수 slot을 정의한다.
* [ ] approval.review 필수 slot을 정의한다.
* [ ] slot type을 문자열/enum/list/object 수준에서 명확히 정리한다.
* [ ] slot마다 source precedence 정책을 정의한다.
* [ ] slot마다 validation rule을 정의한다.
* [ ] slot마다 stale 조건을 정의한다.
* [ ] slot마다 canonical value 규칙을 정의한다.
* [ ] service/environment/confirmation 대표 alias 세트를 정리한다.

## C. slot memory / facts merge 정책

* [ ] facts를 key-value map이 아니라 typed slot memory로 다루는 helper를 만든다.
* [ ] `slot-memory.ts`에 `setSlot`, `clearSlot`, `clearNamespace`, `mergeFactsPatch`를 구현한다.
* [ ] 같은 slot이 여러 source에서 들어올 때 precedence rule을 적용한다.
* [ ] user explicit 값이 기존 tool/default 값을 덮을 수 있게 한다.
* [ ] selection sync가 user explicit 값을 덮지 않도록 가드한다.
* [ ] intent 전환 시 유지해야 할 공통 facts와 지워야 할 workflow-local facts를 구분한다.
* [ ] deploy intent에서 수집한 slot이 rollback intent로 넘어갈 때 그대로 남지 않도록 namespace clear 규칙을 만든다.
* [ ] facts patch merge 후 snapshot과 store state가 어긋나지 않게 한다.
* [ ] raw input과 canonical value를 모두 추적할지 결정한다.

## C-2. 사용자 수정 / backtracking 정책

* [ ] `아니`, `정정`, `다른 걸로`, `취소` 같은 correction/cancel 패턴을 정의한다.
* [ ] correction이 들어오면 어떤 slot을 clear하고 어떤 slot을 유지할지 rule을 만든다.
* [ ] `serviceName` 정정 시 service-context 계열 slot을 함께 invalidation 하도록 만든다.
* [ ] `environment` 정정 시 service context는 유지하되 readiness를 재평가하도록 만든다.
* [ ] 사용자가 `처음부터`, `새로 시작`을 말하면 현재 workflow-local state를 초기화하는 경로를 만든다.
* [ ] correction 이벤트도 trace에 남기도록 한다.

## D. awaiting contract 강화

* [ ] `ConversationAwaiting`을 단순 prompt가 아니라 slot-driven contract로 확장한다.
* [ ] awaiting에 `slotKey`, `expectedInput`, `options`, `retryCount`, `originIntentKey`, `originRequestId`를 넣는다.
* [ ] single-select 옵션 응답을 exact match, alias match, case-insensitive match로 처리한다.
* [ ] ambiguous match 시 재질문 경로를 만든다.
* [ ] no-match 시 재질문 경로를 만든다.
* [ ] `allowFreeform` 여부에 따라 옵션 외 입력 허용 정책을 분리한다.
* [ ] confirm형 awaiting에 yes/no/취소/다시 설명 같은 대표 응답 처리를 넣는다.
* [ ] option label이 아니라 canonical value 기준으로 slot write가 되게 한다.

## E. follow-up answer 해석기

* [ ] `awaiting-resolver.ts`를 만들고 user input이 현재 awaiting을 해소하는지 먼저 판정한다.
* [ ] 현재 awaiting이 있으면 intent resolver보다 먼저 awaiting resolver를 실행한다.
* [ ] single-select awaiting에서 옵션 value를 slot으로 바로 매핑한다.
* [ ] free-text awaiting에서는 slot extractor를 통해 의미를 뽑는다.
* [ ] ambiguous 결과가 나오면 `retryCount`를 증가시키고 다시 `ask_followup` 상태로 남긴다.
* [ ] 일정 retryCount를 넘기면 safer fallback 문구를 만든다.
* [ ] explicit interruption 문구가 감지되면 awaiting 소비보다 intent switch 경로를 우선하는 예외 규칙을 둔다.

## F. intent resolver 고도화

* [ ] `intent-resolver.ts`를 추가한다.
* [ ] 먼저 awaiting answer 소비 여부를 확인한다.
* [ ] 그 다음 explicit keyword/rule 기반 intent 분류를 수행한다.
* [ ] 그래도 불명확하면 기존 intent carry 여부를 본다.
* [ ] 필요하면 phase2에서도 제한적으로 LLM intent assist를 둘 수 있지만 optional이어야 한다.
* [ ] rule 기반만으로도 대표 흐름이 동작하도록 만든다.
* [ ] 새 intent가 잡히면 관련 workflow와 slot namespace reset 정책을 같이 실행한다.
* [ ] awaiting 중에도 새로운 intent가 더 강하게 감지되면 hard switch할 수 있게 한다.

## G. tool planner 확장

* [ ] `tool-planner.ts`를 추가한다.
* [ ] intent와 missing slot에 따라 어떤 tool이 필요한지 결정한다.
* [ ] `deploy.start`에서 serviceName이 없으면 `getDeployableServices`를 먼저 실행한다.
* [ ] user가 serviceName을 고른 뒤에는 `getServiceDeployContext`를 실행하도록 추가한다.
* [ ] rollback.start에서 대상이 없으면 후보 목록 tool을 실행한다.
* [ ] approval.review에서 request identifier가 없으면 queue summary 또는 selection summary tool을 실행한다.
* [ ] 2차에서는 multi-tool chaining이 있어도 최대 1~2단계로 제한한다.
* [ ] 같은 turn에서 동일 tool + 동일 args 재실행을 막는 dedupe 정책을 둔다.

## H. 새 tool 추가

* [ ] phase2에서 `getServiceDeployContext` read-only tool을 추가한다.
* [ ] deploy seed/selection 기반으로 service launchpad에 필요한 핵심 정보를 반환하게 한다.
* [ ] 필요하면 `getApprovalRequestContext`와 `getRollbackTargetContext`를 보강한다.
* [ ] tool 결과 adapter가 slot memory에 바로 들어갈 수 있는 facts patch를 반환하도록 확장한다.
* [ ] tool summary와 slot patch를 분리해 반환한다.
* [ ] tool 실패 시 어떤 slot을 비우고 어떤 trace를 남길지 정책을 정한다.

## I. orchestrator 확장

* [ ] `orchestrate-chat-turn.ts`를 phase2 흐름에 맞게 다시 쪼갠다.
* [ ] 권장 turn 파이프라인:
  * [ ] hydrate conversation
  * [ ] resolve awaiting answer
  * [ ] resolve intent/workflow
  * [ ] plan tool(s)
  * [ ] execute tool(s)
  * [ ] merge facts/slots
  * [ ] evaluate decision
  * [ ] build response
* [ ] 각 단계는 pure helper로 최대한 분리한다.
* [ ] orchestrator 내부에서 side effect와 rule evaluation을 섞지 않도록 한다.
* [ ] slot이 하나 채워지면 같은 turn 안에서 바로 다음 tool까지 이어서 실행할 수 있게 한다.
* [ ] 예: `payments-api` 입력으로 `serviceName`을 채운 뒤 같은 turn에서 `getServiceDeployContext`까지 이어간다.
* [ ] turn당 orchestration iteration 상한을 둔다.
* [ ] 반복 계획/실행으로 빠지는 경우 safety fallback으로 종료한다.
* [ ] tool 일부 실패 시 전체 turn을 실패시키지 말고 `text` 또는 `ask_followup` fallback으로 전환한다.

## J. decision engine 도입

* [ ] `decision-engine.ts`를 추가한다.
* [ ] output은 최소 `text | ask_followup | render_surface`를 보장한다.
* [ ] deploy policy를 별도 파일로 분리한다.
* [ ] approval policy를 별도 파일로 분리한다.
* [ ] rollback policy를 별도 파일로 분리한다.
* [ ] policy는 intent + facts + workflow 상태를 보고 판정하게 한다.
* [ ] `ask_followup`이면 어떤 slot이 부족한지 반드시 trace에 남긴다.
* [ ] `render_surface`이면 어떤 조건이 충족되었는지 trace에 남긴다.
* [ ] `text`이면 왜 surface가 불필요한지 trace에 남긴다.

## K. decision trace 표준화

* [ ] `DecisionTrace` 타입을 정의한다.
* [ ] trace 필드에 `matched`, `missing`, `disqualified`, `reason`, `score`를 넣는다.
* [ ] score는 있으면 쓰되, 없으면 deterministic rule-only로 시작해도 된다.
* [ ] conversation store에 `lastDecisionTrace`를 저장한다.
* [ ] UI에 전면 노출하지 않더라도 디버깅 가능한 형태로 유지한다.

## L. surface-ready 신호 도입

* [ ] phase2에서는 `surfaceIntent` 또는 `surfaceCandidate` 상태를 추가한다.
* [ ] deploy.start에서 launchpad-ready면 `family = deploy.launchpad` 후보를 남긴다.
* [ ] rollback.start에서 summary/confirm 계열 surface-ready를 구분할 수 있는지 검토한다.
* [ ] approval.review에서 inbox surface-ready 신호를 남길지 검토한다.
* [ ] user-facing protocol은 아직 `surface: null`이어도 괜찮지만 internal state에는 후보를 남긴다.
* [ ] phase3 template selector가 이 후보를 바로 소비할 수 있도록 이름 체계를 안정적으로 잡는다.

## M. response protocol 보강

* [ ] `AssistantTurnResponse`에 `awaiting` contract를 richer shape로 확장한다.
* [ ] 필요하면 `surfaceIntent`를 debug/meta 용도로 함께 내려보낼지 검토한다.
* [ ] tool 결과와 최종 decision을 같은 turn result 안에 담는다.
* [ ] follow-up 질문의 경우 user-facing message와 machine-readable awaiting이 항상 같이 오게 한다.
* [ ] render_surface readiness가 생겨도 phase2에서는 user-facing text fallback을 반드시 만든다.

## N. UI 반영

* [ ] `ChatAssistantPanel`에 awaiting option chip 영역을 추가한다.
* [ ] 사용자가 option chip을 누르면 free text 입력과 동일한 submit 경로를 타게 한다.
* [ ] ambiguous selection일 때 선택 후보를 다시 보여주는 UX를 넣는다.
* [ ] assistant가 기다리는 slot이 무엇인지 짧게 설명하는 안내 문구를 넣는다.
* [ ] `payments-api`, `production` 같은 짧은 응답이 자연스럽게 제출되도록 composer 경험을 점검한다.
* [ ] 사용자가 `아니`, `다시`, `취소`를 쉽게 쓸 수 있도록 correction affordance를 검토한다.
* [ ] phase2에서는 실제 template render를 붙이지 않더라도 `surface-ready` 상태를 user에게 과하게 노출하지 않는다.
* [ ] 대신 설명 텍스트로 "필요한 정보가 준비되었습니다" 수준의 응답을 줄 수 있게 한다.

## O. selection sync와 conversation sync

* [ ] row selection 시 `facts.selectedEntity` sync 정책을 구체화한다.
* [ ] UI selection이 바뀌어도 awaiting origin이 다른 turn이면 그대로 유지할지 판단한다.
* [ ] 권장안은 "현재 intent와 같은 namespace면 sync, 완전히 다른 intent면 awaiting clear"다.
* [ ] selection change가 explicit user slot을 덮지 않는지 테스트한다.
* [ ] page/tab 이동 시 current intent carry 여부를 명시한다.
* [ ] selection change와 user correction이 충돌할 때 user explicit correction을 우선하도록 한다.

## P. legacy 경계 정리

* [ ] `prompt-router.ts`는 phase2 주 경로에서 제거한다.
* [ ] 남겨둘 경우 canned explanation helper 수준으로만 둔다.
* [ ] `build-template-envelope.ts`는 phase2에서 직접 호출하지 않는다.
* [ ] render_surface readiness와 actual template selection이 분리되었다는 점을 코드 구조상 드러낸다.

## Q. 테스트 및 검증

* [ ] intent resolver 테스트를 추가한다.
* [ ] awaiting resolver 테스트를 추가한다.
* [ ] slot precedence 테스트를 추가한다.
* [ ] canonicalization/alias normalization 테스트를 추가한다.
* [ ] ambiguous option match 테스트를 추가한다.
* [ ] retryCount 증가 테스트를 추가한다.
* [ ] correction/backtracking 테스트를 추가한다.
* [ ] awaiting 중 intent interruption 테스트를 추가한다.
* [ ] tool planner 테스트를 추가한다.
* [ ] decision engine policy 테스트를 추가한다.
* [ ] decision trace shape 테스트를 추가한다.
* [ ] surfaceIntent candidate 생성 테스트를 추가한다.
* [ ] orchestration loop guard 테스트를 추가한다.
* [ ] tool partial failure fallback 테스트를 추가한다.
* [ ] turn-level integration 테스트를 추가한다.
* [ ] 대표 통합 시나리오:
  * [ ] `배포하고 싶어` -> services tool -> ask_followup(service selection)
  * [ ] `payments-api` -> slot fill -> service context tool -> render_surface readiness
  * [ ] `아니 orders-api` -> service correction -> service context 재조회
  * [ ] `취소하고 이전 배포 알려줘` -> interrupt -> history lookup intent 전환
  * [ ] `이전 배포 알려줘` -> text
  * [ ] `롤백하고 싶어` -> candidate fetch -> ask_followup
* [ ] stale request 경쟁 상태에서도 awaiting/slot state가 깨지지 않는지 확인한다.

---

## 구현 순서 제안

1. conversation 타입 확장
2. intent/workflow/slot definition 파일 추가
3. awaiting resolver와 slot memory helper 추가
4. tool planner + `getServiceDeployContext` 추가
5. orchestrator 파이프라인 분리
6. decision engine + trace 추가
7. response protocol 보강
8. UI quick-reply/awaiting 반영
9. 테스트 및 대표 흐름 검증

이 순서를 권장하는 이유는, decision engine을 먼저 만들면 입력 데이터 모델이 계속 바뀌기 때문이다.  
먼저 intent/slot/awaiting 계약을 고정한 뒤 decision policy를 올리는 편이 안정적이다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* assistant가 현재 awaiting 상태를 기반으로 짧은 후속 입력을 해석할 수 있다
* tool 결과가 slot memory로 누적된다
* orchestrator가 turn-by-turn 상태기계처럼 동작한다
* decision engine이 `text | ask_followup | render_surface`를 rule-based로 판정한다
* render_surface 준비 상태가 internal signal과 trace로 남는다
* phase3에서 template selector와 binding builder를 붙일 수 있는 입력이 정리된다

---

## 다음 문서로 넘길 항목

이번 문서가 끝나면 다음 3차 기반 문서에서는 아래를 본격적으로 다뤄야 한다.

* template selector를 conversation facts 기반으로 전환
* binding builder 확장
* `surfaceIntent`를 실제 `templateId`와 payload로 변환
* active surface 렌더 연결
* selected item 기반 template 경로 제거

즉 2차 기반 문서는 "assistant가 언제 surface-ready인지 판단하는 문서"이고, 다음 문서부터 "실제로 어떤 surface를 어떻게 띄울지"로 들어간다.
