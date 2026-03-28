# Conversation Foundation 3차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 3차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지다.

* template selector를 conversation facts 기반으로 변경
* binding builder 확장
* active surface 렌더 연결

이 문서는 [1차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171526_conversation-foundation-phase1-implementation-plan.md)와 [2차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327172059_conversation-foundation-phase2-implementation-plan.md)를 전제로 한다.  
즉 phase2에서 orchestrator, slot memory, decision engine, `surfaceIntent` 또는 동등한 surface-ready 신호까지 정리되었다는 가정 위에서 작성한다.

---

## 이번 단계가 필요한 이유

phase2까지 끝나면 assistant는 다음을 할 수 있다.

* 대화의 흐름을 이어간다
* 필요한 slot을 모은다
* tool로 facts를 보강한다
* `text | ask_followup | render_surface`를 판단한다
* 왜 그런 판단이 나왔는지 trace를 남긴다

하지만 아직 아래가 비어 있다.

* `render_surface`가 나왔을 때 실제 어떤 template를 쓸지
* facts/tool 결과를 template payload로 어떻게 조립할지
* 그 payload를 어느 렌더러로 어떻게 붙일지
* active surface를 어떤 우선순위로 갱신/교체/제거할지

즉 phase3의 핵심은 **surface-ready signal을 실제 runtime surface로 바꾸는 것**이다.

---

## 3차 기반 완료 기준

이번 단계가 끝나면 최소 아래가 가능해야 한다.

1. phase2 decision engine이 `render_surface`를 반환하면 template selector가 적절한 `templateId`를 고른다.
2. binding builder가 conversation facts와 tool 결과를 합쳐 renderer가 바로 쓸 수 있는 payload를 만든다.
3. assistant response protocol의 `surface` 필드가 실제 payload를 담아 내려온다.
4. 프론트가 `activeSurface`를 상태로 보관하고 실제 React template를 렌더한다.
5. 현재 `selectedItem` 직결 template 경로는 점진적으로 제거되기 시작한다.

중요한 경계:

* 이번 단계는 **surface를 보여주는 단계**다.
* 버튼 액션을 domain action과 제대로 연결하는 bridge는 **4차 기반**에서 다룬다.
* template registry, contract editor, preview system은 **5차 기반**에서 다룬다.

즉 phase3는 runtime surface path를 완성하는 단계이지, 템플릿 운영 체계를 완성하는 단계는 아니다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* template action bridge 전면 정리
* deploy/rollback/approval 액션을 surface 버튼과 완전히 재연결
* template registry admin UI
* live preview editor / decision simulator UI
* registry 기반 versioning / publishing 체계

이번 단계는 "surface를 선택하고 보여주는 것"까지다.

---

## 현재 코드 기준 문제 정리

### 1. template 선택 기준이 아직 conversation이 아니다

[src/devops-chat/templates/build-template-envelope.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/build-template-envelope.ts)는 현재:

* `DeployItem`
* `ApprovalItem`
* `RollbackItem`
* `RollbackDeployment`

같은 page selection 중심 입력을 바로 받아 template를 만든다.

즉 현재 흐름은 사실상 아래다.

* row 선택
* selected item 생성
* template envelope 생성

이 구조는 conversation-first surface path와 맞지 않는다.

phase3에서는 아래로 바뀌어야 한다.

* conversation facts/slots 확정
* surface-ready signal 확인
* selector가 template candidate 평가
* binding builder가 payload 생성
* renderer가 active surface 렌더

### 2. `build-template-envelope.ts`가 selector + binder 역할을 동시에 하고 있다

현재 파일은 다음 역할이 섞여 있다.

* 어떤 template를 써야 하는지 암묵적으로 결정
* 그 template payload를 실제로 조립
* rollback의 경우 일부 runtime 상태(`activeTemplateId`)까지 같이 해석

phase3에서는 이 역할을 분리해야 한다.

* selector: 어떤 template가 맞는지 고른다
* binder: 그 template payload를 만든다
* renderer: 실제 React component를 렌더한다

이 분리가 없으면 selection rule과 payload mapping rule이 계속 뒤섞인다.

### 3. runtime payload 타입과 template 정의 개념이 섞일 위험이 있다

[src/devops-chat/types/templates.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/templates.ts)는 현재 renderer가 사용하는 runtime payload 타입을 담고 있다.

phase3에서 주의할 점은:

* 지금 필요한 것은 **runtime surface payload**다
* phase5에서 필요한 것은 **registry definition / contract / selection policy / preview metadata**다

즉 phase3에서 registry 설계까지 한 번에 밀어 넣으면 범위가 커진다.

이번 단계에서는 runtime envelope에 집중해야 한다.

### 4. view-model이 아직 selected item 기반 template를 직접 만든다

[src/devops-chat/view-models/build-console-view-model.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/view-models/build-console-view-model.ts)를 보면:

* deploy는 항상 `buildDeployTemplate(selectedItem)`
* approve는 항상 `buildApprovalTemplate(selectedItem)`
* rollback만 제한적으로 `activeTemplateId`를 본다

즉 assistant가 어떤 대화 상태에 있든, 최종 surface는 대부분 selected item에 종속된다.

phase3의 핵심 변경점 중 하나는 이 의존을 끊는 것이다.

### 5. renderer는 있는데 active surface lifecycle이 약하다

[src/devops-chat/templates/template-renderer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/template-renderer.tsx)와 [src/devops-console/assistant/template-surface.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/template-surface.tsx)는 이미 존재한다.

하지만 아직 약한 부분은 아래다.

* 어떤 순간에 새로운 surface가 생기는지
* text-only turn에서 기존 surface를 유지할지 지울지
* follow-up 중에는 surface를 잠시 유지할지 접을지
* stale surface를 어떻게 교체할지

즉 component는 있지만 **surface runtime policy**가 없다.

---

## 핵심 설계 원칙

## 1. selector와 binder는 반드시 분리한다

권장 파이프라인:

1. decision engine이 `render_surface`를 반환
2. template selector가 eligible template를 평가
3. best match를 고름
4. binding builder가 payload 생성
5. validation 통과 시 `surface` 반환

selector와 binder를 분리하지 않으면:

* selector rule 수정이 payload mapping을 깨고
* payload 구조 변경이 selection policy를 건드리며
* 나중 registry화할 때 migration이 어려워진다

## 2. template 선택은 facts 중심이어야 한다

phase3에서는 template 선택에 아래 종류의 입력만 쓰는 편이 좋다.

* `intent`
* `workflow`
* `surfaceIntent`
* canonicalized facts/slots
* tool-derived structured context

아래 입력은 직접 기준으로 쓰지 않는 편이 맞다.

* raw user text
* selected row 자체
* 현재 렌더 중인 page component 상태

UI selection 정보가 필요하면 그것도 facts로 정규화해서 selector가 읽게 해야 한다.

## 3. binder는 raw tool result가 아니라 normalized facts를 우선 사용해야 한다

binding builder가 tool raw result shape에 직접 의존하기 시작하면 tool이 바뀔 때 surface 전체가 깨진다.

권장 우선순위:

1. canonical facts/slots
2. normalized tool context
3. raw tool result fallback

예:

* `deploy.serviceName`
* `deploy.environment`
* `deploy.selectedServiceContext`
* `deploy.recommendedVersion`

이렇게 정리된 값을 읽어 payload를 만드는 편이 안정적이다.

## 4. renderer가 받는 것은 항상 validated surface envelope여야 한다

phase3부터는 `surface`가 단순 `{ templateId, payload }`만으로 끝나면 부족하다.

권장 runtime shape:

```ts
type ActiveSurface = {
  templateId: string;
  payload: TemplateEnvelope;
  sourceIntent: string;
  updatedAt: string;
  freshnessKey?: string;
};
```

핵심은 renderer 앞단에서 이미 payload가 유효한 상태여야 한다는 점이다.  
validation 실패는 renderer가 아니라 selector/binder 단계에서 걸러야 한다.

## 5. surface lifecycle은 별도 규칙이 있어야 한다

phase3에서는 아래 정책을 정해야 한다.

* 새 surface가 오면 기존 surface를 교체한다
* `ask_followup`일 때 surface를 유지할지 숨길지 정한다
* `text` 응답일 때 기존 active surface를 유지할지 해제할지 정한다
* binding 실패 시 이전 surface를 유지할지 fallback null로 둘지 정한다
* 사용자가 surface를 명시적으로 닫았을 때 언제 다시 보여줄지 정한다

권장 기본 정책:

* `render_surface`: 새 surface로 교체
* `ask_followup`: 현재 flow에 속한 surface면 유지, 다른 flow면 숨김 또는 해제
* `text`: 일반 질의면 active surface 해제, 같은 workflow 보조 설명이면 유지 가능

이 규칙이 없으면 surface가 화면에 남는 기준이 매번 흔들린다.

추가로 phase3에서는 surface freshness 판정도 필요하다.

예:

* serviceName이 바뀌었는데 이전 service launchpad가 그대로 남아 있음
* environment가 바뀌었는데 이전 payload가 다시 validation 없이 재사용됨

따라서 active surface에는 payload 자체뿐 아니라 facts 기반 freshness key를 두고, 현재 conversation facts와 맞지 않으면 stale로 간주하는 정책이 필요하다.

## 6. phase3에서는 runtime selection policy만 코드로 둔다

phase5에서 registry/policy editor가 들어오기 전까지는:

* selection policy
* binding rule
* validation rule

을 코드에 두는 것이 맞다.

다만 나중 registry로 빼기 쉽게 아래처럼 구조화해 두어야 한다.

* template definition list
* selection predicate
* binding function
* payload validator

즉 phase3의 코드는 phase5 registry의 초안이어야 한다.

---

## 권장 타입 확장

phase3에서 추천하는 타입 구조는 아래와 같다.

```ts
type SurfaceEnvelope = {
  templateId: TemplateEnvelope["templateId"];
  payload: TemplateEnvelope;
  sourceIntent: string;
  updatedAt: string;
  freshnessKey?: string;
  bindingTrace?: {
    usedFacts: string[];
    missingFacts: string[];
  };
};
```

또한 selection/binding 계층용 타입을 분리하는 것이 좋다.

```ts
type TemplateSelectionContext = {
  intentKey: string;
  workflow: ConversationWorkflowState | null;
  facts: ConversationFacts;
  surfaceIntent: SurfaceIntentCandidate | null;
};

type TemplateCandidateScore = {
  templateId: TemplateEnvelope["templateId"];
  eligible: boolean;
  score: number;
  matched: string[];
  missing: string[];
  disqualified: string[];
  reason: string;
};

type BindingResult =
  | {
      ok: true;
      surface: SurfaceEnvelope;
    }
  | {
      ok: false;
      reason: string;
      missingFacts: string[];
    };
```

---

## 파일별 수정 계획

## 새로 만들 파일

* [x] `src/devops-chat/templates/template-definitions.ts`
* [x] `src/devops-chat/templates/template-selector.ts`
* [x] ~~`src/devops-chat/templates/template-candidates.ts`~~ — selector 내부에 통합
* [x] ~~`src/devops-chat/templates/template-selection-trace.ts`~~ — TemplateCandidateScore 타입을 conversation.ts에 정의
* [x] `src/devops-chat/templates/binders/bind-deploy-launchpad.ts`
* [x] `src/devops-chat/templates/binders/bind-approval-inbox.ts`
* [x] `src/devops-chat/templates/binders/bind-rollback-summary.ts`
* [x] `src/devops-chat/templates/binders/bind-dry-run-stepper.ts`
* [x] `src/devops-chat/templates/binders/bind-confirm-action.ts`
* [x] `src/devops-chat/templates/binders/index.ts`
* [x] `src/devops-chat/templates/validate-surface-envelope.ts`
* [x] `src/devops-chat/templates/surface-lifecycle.ts`

## phase1/phase2 파일 중 확장 대상

* `src/devops-chat/types/conversation.ts`
* `src/devops-chat/types/assistant-response.ts`
* `src/devops-chat/types/templates.ts`
* `src/devops-chat/store/conversation-store.ts`
* `src/devops-chat/server/orchestrate-chat-turn.ts`
* `src/devops-chat/server/decision/decision-engine.ts`
* `src/devops-chat/server/orchestration/response-builder.ts`
* `src/devops-chat/lib/chat-api.ts`
* `src/app/api/chat/route.ts`

## 역할을 재정의할 기존 파일

* [src/devops-chat/templates/build-template-envelope.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/build-template-envelope.ts)
  phase3에서는 selected item 기반 template factory에서 binder helper 또는 legacy adapter로 축소하는 편이 맞다.

* [src/devops-chat/view-models/build-console-view-model.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/view-models/build-console-view-model.ts)
  template 생성 책임을 내려놓고 conversation active surface를 읽는 방향으로 바뀌어야 한다.

* [src/devops-chat/templates/template-renderer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/template-renderer.tsx)
  renderer 자체는 유지하되 validated `payload`만 받는 방향으로 단순화한다.

* [src/devops-console/assistant/template-surface.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/template-surface.tsx)
  now-active surface lifecycle 반영이 필요하다.

* [src/devops-console/shell/assistant-workspace.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/assistant-workspace.tsx)
  phase3부터는 workspace path에서 active surface를 실제로 보여줄 수 있는 진입점이 된다.

---

## 상세 Todo List

## A. template runtime 경계 정리

* [x] runtime surface payload와 phase5 registry definition 개념을 명시적으로 분리한다.
* [x] `types/templates.ts`는 runtime renderer payload 중심으로 유지한다.
* [x] phase3에서는 registry metadata 타입을 섣불리 섞지 않는다.
* [x] `SurfaceEnvelope` 또는 동등한 runtime wrapper 타입을 추가한다.
* [x] conversation state에 `activeSurface` 타입을 runtime envelope 기준으로 명확히 넣는다.
* [x] active surface에 dismissal/hide 상태를 별도로 둘지 검토한다.

## B. template definition 코드 구조 도입

* [x] `template-definitions.ts`를 만들고 현재 runtime template 목록을 한 곳에 모은다.
* [x] 각 definition은 최소 아래를 가져가게 한다.
* [x] `templateId`
* [x] `family`
* [x] `intentKeys`
* [x] `selector`
* [x] `binder`
* [x] `validate`
* [x] `rendererKey`
* [x] deploy/approval/rollback template를 이 구조로 옮긴다.
* [x] phase5 registry로 옮기기 쉬운 형태로 export 구조를 정리한다.

## C. selector 도입

* [x] `template-selector.ts`를 추가한다.
* [x] 입력은 `intent`, `workflow`, `facts`, `surfaceIntent`, `lastDecisionTrace`로 받게 한다.
* [x] output은 best candidate + selection trace가 되게 한다.
* [x] `render_surface`가 아니면 selector가 실행되지 않거나 null을 반환하게 한다.
* [x] deploy.start에 대한 launchpad selector rule을 구현한다.
* [x] approval.review에 대한 inbox selector rule을 구현한다.
* [x] rollback.start에 대한 summary/stepper/confirm selector rule을 구현한다.
* [x] selector rule은 raw page selection이 아니라 facts만 사용하도록 강제한다.
* [x] eligible candidate가 여러 개일 때 score 기반 tie-break rule을 정한다.
* [x] candidate가 하나도 없을 때 graceful fallback 정책을 정한다.

## D. selection trace 표준화

* [x] `TemplateCandidateScore` 타입을 정의한다.
* [x] 각 candidate에 `eligible`, `score`, `matched`, `missing`, `disqualified`, `reason`을 남긴다.
* [x] conversation store나 debug metadata에 마지막 template selection trace를 저장할지 결정한다.
* [x] phase3에서는 UI 노출이 없어도 디버깅 가능한 수준으로 남긴다.
* [x] selection trace와 binding trace를 구분해 저장할지 결정한다.

## E. binder 분리

* [x] `build-template-envelope.ts`의 payload 생성 로직을 template별 binder로 나눈다.
* [x] deploy binder를 `bind-deploy-launchpad.ts`로 옮긴다.
* [x] approval binder를 `bind-approval-inbox.ts`로 옮긴다.
* [x] rollback summary binder를 분리한다.
* [x] dry-run stepper binder를 분리한다.
* [x] confirm-action binder를 분리한다.
* [x] 각 binder는 conversation facts와 normalized tool context만 우선 사용하도록 한다.
* [x] binder가 selected item 전체 객체를 직접 전제하지 않도록 리팩터링한다.
* [x] 꼭 필요한 경우에만 legacy adapter를 통해 old item shape를 읽도록 한다.
* [x] binder가 어떤 facts를 사용했는지 `bindingTrace.usedFacts`에 남기도록 한다.
* [x] binder가 부족했던 facts를 `bindingTrace.missingFacts`에 남기도록 한다.

## F. binding input 정리

* [x] deploy binder가 요구하는 최소 facts 목록을 정한다.
* [x] 권장 입력:
  * [x] `deploy.serviceName`
  * [x] `deploy.environment`
  * [x] `deploy.selectedServiceContext`
  * [x] `deploy.recommendedVersion`
* [x] approval binder 최소 facts를 정한다.
* [x] rollback summary/confirm 계열 binder 최소 facts를 정한다.
* [x] binder 입력으로 raw tool result가 필요하면 먼저 normalized context helper를 거치게 한다.
* [x] binder 내부에서 fallback default를 어디까지 허용할지 정한다.

## G. payload validation 추가

* [x] `validate-surface-envelope.ts`를 추가한다.
* [x] template별 필수 필드 validation을 구현한다.
* [x] validation 실패 시 renderer까지 보내지 않도록 한다.
* [x] validation 실패는 `render_surface -> text fallback` 또는 `ask_followup`로 되돌리는 정책을 만든다.
* [x] validation error trace를 남긴다.
* [x] validation 전에 freshnessKey 계산 시점을 정한다.

## H. surface lifecycle 정책 구현

* [x] `surface-lifecycle.ts`를 추가한다.
* [x] 새 surface가 생성되면 기존 active surface를 어떻게 교체할지 규칙을 구현한다.
* [x] 같은 template family의 surface는 update-in-place 할지 replace 할지 결정한다.
* [x] `ask_followup`에서 기존 surface 유지 조건을 정의한다.
* [x] `text` 응답에서 기존 surface 해제 조건을 정의한다.
* [x] binding 실패 시 이전 active surface 유지 여부를 정한다.
* [x] conversation reset 시 active surface clear 규칙을 명확히 한다.
* [x] 사용자가 surface를 dismiss했을 때 현재 flow에서 자동 재등장시킬 조건을 정한다.
* [x] `surfaceIntent`는 그대로지만 facts가 바뀐 경우 stale invalidation 규칙을 만든다.
* [x] freshnessKey 비교로 기존 surface 재사용/교체 여부를 결정한다.
* [x] stale surface를 숨길지 즉시 교체할지 정책을 정한다.

## I. response protocol에 실제 surface 연결

* [x] `AssistantTurnResponse.surface`가 실제 `SurfaceEnvelope | null`을 담도록 확장한다.
* [x] `response-builder.ts`가 selector + binder 결과를 surface 필드에 넣도록 바꾼다.
* [x] `render_surface` decision인데 binding 실패 시 어떤 fallback response를 보낼지 정한다.
* [x] `surface`가 내려왔을 때와 내려오지 않았을 때 메시지 문구 정책을 분리한다.
* [x] SSE `result` 이벤트가 active surface payload까지 포함하도록 한다.

## J. conversation store의 active surface 반영

* [x] `conversation-store.ts`에 `setActiveSurface` 또는 동등한 갱신 경로를 추가한다.
* [x] `completeAssistantTurn`에서 `surface`를 같이 반영한다.
* [x] `ask_followup` 시 surface 유지 정책을 store 레벨에서도 반영한다.
* [x] `text` 응답 시 surface clear 정책을 store 레벨에서도 반영한다.
* [x] stale response가 active surface를 덮지 않도록 requestId 가드를 유지한다.
* [x] facts가 바뀌어 active surface가 stale해지면 store에서 invalidation 할 수 있게 한다.
* [x] 사용자 dismiss 상태가 있으면 store에서 surface lifecycle과 함께 관리한다.

## K. view-model과 UI 연결 전환

* [x] `build-console-view-model.ts`에서 selected item 기반 template 생성 코드를 제거하기 시작한다.
* [x] deploy의 `template: selectedItem ? buildDeployTemplate(selectedItem) : null` 경로를 conversation active surface 기반으로 바꾼다.
* [x] approve도 같은 방식으로 바꾼다.
* [x] rollback의 `activeTemplateId` 특례도 active surface 기준으로 치환한다.
* [x] page detail sidebar와 assistant surface가 서로 다른 source of truth를 보지 않도록 한다.
* [x] phase3에서는 detail/sidebar는 selected item을 유지하되 assistant surface만 conversation runtime을 보게 분리할 수 있다.

## L. `build-template-envelope.ts` 재정의

* [x] 현재 파일을 selector/binder의 legacy wrapper로 축소할지 결정한다.
* [x] 권장안은 template별 binder로 로직을 옮기고 이 파일은 deprecated adapter로 남기는 것이다.
* [x] 기존 호출부를 단계적으로 새 binder/selector 체계로 옮긴다.
* [x] 더 이상 새 로직을 `build-template-envelope.ts`에 추가하지 않는 규칙을 문서화한다.

## M. renderer 경계 단순화

* [x] `template-renderer.tsx`는 validated payload만 받는다는 전제를 명확히 한다.
* [x] renderer 내부에서 selection/business rule을 해석하지 않게 한다.
* [x] renderer는 `templateId` 분기와 component 연결만 담당하게 유지한다.
* [x] template props가 runtime payload 타입과 정확히 맞는지 다시 점검한다.

## N. assistant UI 반영

* [x] `template-surface.tsx`가 conversation의 actual active surface를 렌더하게 한다.
* [x] active surface가 없을 때의 empty state를 conversation-first 문구로 바꾼다.
* [x] follow-up 중 surface가 유지되는 경우 사용자에게 혼란이 없도록 보조 copy를 검토한다.
* [x] binding 실패로 surface가 비어도 text response만으로 흐름이 이어지게 한다.
* [x] `/assistant` page와 workflow sidebar에서 surface rendering path가 동일한지 확인한다.
* [x] 사용자가 surface를 닫을 수 있게 할지 검토하고, 닫는다면 dismiss action을 추가한다.

## O. selected item 의존 제거 전략

* [x] selected row는 detail/sidebar/table에만 남기고 surface path에서는 점진적으로 제거한다.
* [x] deploy surface 생성이 selected request 없이도 가능하도록 만든다.
* [x] approval surface도 selected row가 아니라 conversation facts 기준으로 뜰 수 있게 한다.
* [x] rollback surface도 추천 대상 facts와 workflow state 기반으로 뜰 수 있게 한다.
* [x] UI selection sync는 facts 보강용 입력이지 selector의 직접 입력이 아니게 한다.

## P. fallback 전략

* [x] selector 실패 시 text fallback 정책을 정의한다.
* [x] binder 실패 시 ask_followup fallback 여부를 정의한다.
* [x] validation 실패 시 user-facing 문구를 만든다.
* [x] render_surface가 나왔지만 surface 생성 실패한 경우 대화가 끊기지 않게 한다.
* [x] partial tool context만 있어도 최소 surface를 허용할지 검토한다.

## Q. 테스트 및 검증

* [x] template selector rule 테스트를 추가한다.
* [x] tie-break/score 테스트를 추가한다.
* [x] binder별 payload 생성 테스트를 추가한다.
* [x] binder 입력 부족 시 실패 테스트를 추가한다.
* [x] bindingTrace 기록 테스트를 추가한다.
* [x] payload validation 테스트를 추가한다.
* [x] surface lifecycle 유지/교체/해제 테스트를 추가한다.
* [x] freshnessKey 비교 기반 stale invalidation 테스트를 추가한다.
* [x] 사용자 dismiss 이후 재등장 정책 테스트를 추가한다.
* [x] response-builder surface 포함 테스트를 추가한다.
* [x] conversation store active surface 반영 테스트를 추가한다.
* [x] `buildConsoleViewModel`이 active surface를 읽는 테스트를 추가한다.
* [x] 대표 통합 시나리오:
  * [x] `배포하고 싶어` -> follow-up -> `payments-api` -> service context -> `quick_deploy_launchpad` surface 렌더
  * [x] approval review 흐름에서 `deployment_approval_inbox` surface 렌더
  * [x] rollback flow에서 summary -> stepper -> confirm 계열 surface candidate가 각각 올바른 template로 연결
  * [x] render_surface 판단 후 binding 실패 시 text fallback 유지
  * [x] 일반 질의에서는 기존 active surface가 정책대로 유지/해제되는지 확인

---

## 구현 순서 제안

1. runtime surface 타입 추가
2. template definition + selector 도입
3. binder 분리
4. validation 추가
5. response-builder에 surface 연결
6. conversation store active surface 반영
7. view-model/UI 연결 전환
8. legacy envelope 경로 축소
9. 테스트 및 통합 검증

이 순서를 권장하는 이유는, UI를 먼저 바꾸면 surface 생성 경로가 아직 불안정해서 디버깅이 어려워지기 때문이다.  
먼저 selector/binder/validation을 안정화한 뒤 UI를 바꾸는 편이 안전하다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* `render_surface` decision이 실제 surface envelope 생성으로 이어진다
* template 선택 기준이 selected item이 아니라 conversation facts 중심으로 이동한다
* binder가 template payload를 runtime용으로 안정적으로 조립한다
* assistant UI가 실제 active surface를 conversation store에서 읽어 렌더한다
* phase4에서 button/action bridge를 붙일 수 있는 surface runtime path가 준비된다

---

## 다음 문서로 넘길 항목

이번 문서가 끝나면 다음 4차 기반 문서에서는 아래를 본격적으로 다뤄야 한다.

* template action bridge 연결
* surface button과 domain action/store action 연동
* deploy/rollback/approval 실행 액션 연결
* activity log와 surface refresh 동기화
* action 이후 follow-up surface 재생성

즉 3차 기반 문서는 "surface를 선택하고 띄우는 문서"이고, 다음 문서부터 "surface가 실제로 일을 하게 만드는 단계"로 들어간다.
