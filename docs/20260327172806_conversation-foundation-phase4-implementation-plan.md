# Conversation Foundation 4차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 4차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지다.

* template action bridge 연결
* deploy/rollback/approval 액션 연동
* activity log 반영

이 문서는 [3차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327172505_conversation-foundation-phase3-implementation-plan.md)를 전제로 한다.  
즉 phase3에서 conversation facts 기반 surface selection, binding, active surface rendering까지 완료되었다는 가정 위에서 작성한다.

---

## 이번 단계가 필요한 이유

phase3까지 끝나면 assistant는:

* text와 surface를 함께 보여주고
* 대화 상태에 맞는 template를 선택하고
* payload를 만들고
* 실제 React renderer로 surface를 띄울 수 있다

하지만 아직 surface는 대부분 "보여주기만 하는 카드"에 가깝다.

현재 부족한 부분은 아래다.

* 버튼이 무슨 action인지 runtime에서 식별할 수 없다
* 버튼 클릭이 domain action으로 안정적으로 연결되지 않는다
* action 실행 결과가 conversation log와 domain state에 같이 반영되지 않는다
* action 후 surface를 어떤 상태로 refresh할지 규칙이 없다

즉 phase4의 핵심은 **surface를 실제 실행형 UI로 만드는 것**이다.

---

## 4차 기반 완료 기준

이번 단계가 끝나면 최소 아래가 가능해야 한다.

1. template 버튼이 label이 아니라 명시적인 action id를 가진다.
2. action bridge가 surface action id를 domain command로 매핑한다.
3. deploy/approval/rollback 각 surface에서 action이 실제 store/domain runtime을 변경한다.
4. action 실행 결과가 assistant activity log에 기록된다.
5. action 후 conversation facts, active surface, user-facing message가 함께 refresh된다.

중요한 경계:

* 이번 단계는 runtime action bridge까지다.
* template registry 기반 action schema 관리나 admin tooling은 **5차 이후**로 넘긴다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* template registry UI에서 action schema 편집
* backend persistence / real API 연동 고도화
* action approval policy 엔진
* 운영 감사 로그 시스템 전면 구축
* multi-user collaboration lock

이번 단계는 assistant runtime 안에서 action이 "제대로 연결되고 갱신되는 것"이 목표다.

---

## 현재 코드 기준 문제 정리

### 1. template 버튼은 action identity가 없다

[src/devops-chat/types/templates.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/templates.ts)를 보면 현재 template payload에는:

* `primaryActionLabel`
* `secondaryActionLabel`

만 있다.

즉 현재 버튼은:

* 무엇을 실행하는지 식별할 수 없고
* 어느 entity를 대상으로 하는지 명시하지 않으며
* optimistic/disabled/loading 상태를 가지지 않는다

phase4에서는 버튼이 label이 아니라 **실행 가능한 action descriptor**를 가져야 한다.

### 2. action 구현이 `app-store.ts` 안에 page별로 흩어져 있다

[src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)에는 현재 아래 로직이 뒤섞여 있다.

* `runPrimaryTemplateAction`
* `runSecondaryTemplateAction`
* `quickRollback`
* `startRollbackDryRun`
* `confirmRollback`
* `submitDeployRequest`
* `startDeployRun`
* `completeDeployRun`

문제는 이 구조가:

* pageKey 기반이고
* template identity를 모르며
* action parameters를 별도로 받지 않고
* assistant conversation runtime과 domain mutation이 강하게 결합되어 있다는 점이다

phase4에서는 이 로직을 바로 없애기보다, **bridge layer 뒤로 숨기고 점진적으로 치환**하는 방향이 안전하다.

### 3. template component는 generic callback만 받는다

예를 들어:

* [src/devops-console/templates/quick-deploy-launchpad.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/templates/quick-deploy-launchpad.tsx)
* [src/devops-console/templates/deployment-approval-inbox.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/templates/deployment-approval-inbox.tsx)
* [src/devops-console/templates/dry-run-stepper.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/templates/dry-run-stepper.tsx)
* [src/devops-console/templates/confirm-action.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/templates/confirm-action.tsx)

는 모두 아래 패턴이다.

* `onPrimaryAction`
* `onSecondaryAction`

이 패턴은 초기 데모에는 편하지만, phase4에서 문제가 된다.

* tertiary action 추가가 어렵다
* action disable/loading/error를 action별로 표현하기 어렵다
* runtime action metadata를 component에서 읽을 수 없다

### 4. activity log가 "assistant text log"와 "action log"를 구분하지 않는다

[src/devops-console/assistant/activity-log.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/activity-log.tsx)는 현재 assistant/user message만 렌더한다.

하지만 phase4부터는 아래 이벤트가 필요하다.

* action started
* action succeeded
* action failed
* action canceled
* surface refreshed

즉 activity log는 더 이상 단순 chat transcript만으로 충분하지 않다.

### 5. action 후 상태 재생성이 명확하지 않다

현재 `runPrimaryTemplateAction` / `runSecondaryTemplateAction`는 직접 상태를 바꾸고 assistant 메시지를 append한다.

문제는 이 방식이:

* conversation facts를 다시 계산하는지 불명확하고
* active surface를 refresh하는지 일관되지 않으며
* decision engine을 다시 태우는지 불명확하다

phase4에서는 action 이후 파이프라인을 명시해야 한다.

권장 post-action 흐름:

1. domain command 실행
2. domain state 갱신
3. action result를 facts patch로 반영
4. activity log 기록
5. decision/selector/binder 재실행
6. updated surface 렌더

---

## 핵심 설계 원칙

## 1. template payload 안에 action descriptor를 넣는다

phase4부터는 template payload가 label만 가지면 안 된다.

권장 구조 예시:

```ts
type SurfaceAction = {
  actionId: string;
  label: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  confirmationRequired?: boolean;
  pendingLabel?: string;
  payload?: Record<string, unknown>;
};
```

각 template payload는 최소 1개 이상의 `actions`를 가져가고, renderer는 action descriptor를 기준으로 버튼을 그리게 하는 편이 맞다.

## 2. action bridge는 template-specific이 아니라 runtime command adapter여야 한다

권장 파이프라인:

1. user clicks surface action
2. client emits `surfaceActionRequested`
3. action bridge resolves action id + payload
4. bridge dispatches domain command
5. domain command returns result
6. result is translated into conversation updates + log + surface refresh

즉 bridge는 버튼 onClick handler의 모음이 아니라, **surface action과 domain command를 연결하는 adapter 계층**이어야 한다.

## 3. action execution과 action logging은 같이 간다

phase4부터는 action이 발생하면 최소 아래 3개가 항상 같이 남아야 한다.

* 어떤 action을 눌렀는지
* 어떤 대상(entity)에 대해 실행했는지
* 성공/실패/부분 성공 결과가 무엇인지

이게 없으면 assistant workspace가 "실행형 UI"가 아니라 "버튼 달린 카드" 수준에 머문다.

## 4. post-action surface refresh는 rule-based로 통일한다

권장 정책:

* domain state가 바뀌면 facts를 다시 hydrate
* decision engine을 다시 실행
* 같은 flow라면 surface update-in-place
* 다른 flow로 넘어가면 surface replace
* action 실패 시 surface를 유지하고 error state만 반영 가능

즉 action 이후에는 "메시지 한 줄 append"가 아니라 **작은 한 턴의 재오케스트레이션**이 일어나야 한다.

## 5. action는 tool과 비슷하지만 별도 타입으로 다뤄야 한다

tool과 action의 공통점:

* 이름이 있다
* 입력이 있다
* 결과가 있다
* log가 남는다

하지만 action은:

* 상태 변경을 일으키고
* confirmation이 필요할 수 있으며
* optimistic/pending/error UI가 중요하다

따라서 phase4에서는 tool registry를 그대로 재사용하기보다 **action registry/dispatcher**를 별도로 두는 편이 안전하다.

## 6. 현재 `runPrimaryTemplateAction` 패턴은 legacy path로 격하한다

phase4에서는 아래를 목표로 해야 한다.

* 새 surface는 `runPrimaryTemplateAction("deploy")` 같은 generic page action에 의존하지 않는다
* 대신 action descriptor 기반 bridge를 사용한다
* 기존 generic action 함수는 migration 동안만 legacy adapter로 남긴다

## 7. action 가능 여부는 클릭 시점에 다시 검증해야 한다

binder가 surface를 만들 때 action을 enabled로 표시했더라도, 실제 클릭 시점에는 상태가 달라졌을 수 있다.

예:

* 이미 승인된 요청을 다시 approve하려는 경우
* 이미 실행 완료된 rollback confirm을 다시 누른 경우
* 다른 화면 조작으로 target entity가 바뀐 경우

따라서 bridge/dispatcher에서는 아래를 다시 확인해야 한다.

* action target이 아직 현재 entity와 일치하는지
* 현재 domain state에서 action이 여전히 허용되는지
* optimistic UI가 실제 허용 조건과 충돌하지 않는지

즉 action availability는 bind 시점 힌트일 뿐이고, **최종 판정은 execute 시점**에 해야 한다.

## 8. action는 idempotent/no-op 결과를 정상 결과로 다룰 수 있어야 한다

phase4에서는 같은 버튼이 중복 클릭되거나, 이미 반영된 상태에서 다시 실행될 수 있다.

예:

* 이미 approved인 요청에 `approval.approve`
* 이미 deploying 상태인 deploy에 또 `deploy.start`
* 이미 confirm_ready인 rollback에 다시 `rollback.complete_dry_run`

이 경우 무조건 실패로 치기보다 아래 중 하나로 처리하는 편이 맞다.

* no-op success
* rejected with actionable explanation
* idempotent success with unchanged state

이 정책이 없으면 action runtime이 brittle해진다.

---

## 권장 타입 확장

phase4에서 추천하는 runtime 타입은 아래와 같다.

```ts
type SurfaceAction = {
  actionId: string;
  label: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  pending?: boolean;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  targetRef?: {
    entityType: string;
    entityId: string;
    entityVersion?: string;
  };
  payload?: Record<string, unknown>;
};

type ActionExecutionResult = {
  ok: boolean;
  actionId: string;
  outcome?: "succeeded" | "failed" | "noop" | "rejected";
  summary: string;
  factsPatch?: Record<string, unknown>;
  userFacingMessage?: string;
  activityEvent?: {
    kind: "action";
    status: "started" | "succeeded" | "failed";
    title: string;
    detail?: string;
  };
};
```

`types/templates.ts`도 아래 방향으로 확장하는 편이 좋다.

```ts
type QuickDeployTemplateData = {
  templateId: "quick_deploy_launchpad";
  state: QuickDeployTemplateState;
  ...
  actions: SurfaceAction[];
};
```

즉 `primaryActionLabel`, `secondaryActionLabel`만으로는 phase4를 버티기 어렵다.

---

## 파일별 수정 계획

## 새로 만들 파일

* `src/devops-chat/actions/action-registry.ts`
* `src/devops-chat/actions/action-dispatcher.ts`
* `src/devops-chat/actions/action-types.ts`
* `src/devops-chat/actions/action-bridge.ts`
* `src/devops-chat/actions/post-action-refresh.ts`
* `src/devops-chat/actions/activity-log-builder.ts`
* `src/devops-chat/actions/domain/run-deploy-action.ts`
* `src/devops-chat/actions/domain/run-approval-action.ts`
* `src/devops-chat/actions/domain/run-rollback-action.ts`

## 확장 대상 파일

* `src/devops-chat/types/templates.ts`
* `src/devops-chat/types/conversation.ts`
* `src/devops-chat/store/conversation-store.ts`
* `src/devops-chat/store/app-store.ts`
* `src/devops-chat/server/orchestrate-chat-turn.ts`
* `src/devops-chat/server/orchestration/response-builder.ts`
* `src/devops-chat/templates/binders/*`
* `src/devops-chat/templates/template-renderer.tsx`
* `src/devops-console/assistant/template-surface.tsx`
* `src/devops-console/assistant/activity-log.tsx`
* `src/devops-console/shell/assistant-workspace.tsx`

## 역할을 재정의할 기존 파일

* [src/devops-chat/store/app-store.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/store/app-store.ts)
  page-scoped action 구현이 흩어져 있으므로, phase4에서는 domain command provider 또는 legacy adapter로 내려야 한다.

* [src/devops-chat/types/templates.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/templates.ts)
  action label 중심 구조에서 action descriptor 중심 구조로 전환이 필요하다.

* [src/devops-console/templates/*.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/templates)
  generic primary/secondary callback 대신 action descriptor 배열 또는 명시 action prop을 읽게 바뀌어야 한다.

---

## 상세 Todo List

## A. action runtime 타입 도입

* [ ] `action-types.ts`를 추가한다.
* [ ] `SurfaceAction` 타입을 정의한다.
* [ ] action variant, disabled, pending, confirmation metadata를 포함한다.
* [ ] action target ref와 entity version metadata를 포함할지 확정한다.
* [ ] action payload shape를 정의한다.
* [ ] `ActionExecutionResult` 타입을 정의한다.
* [ ] action result에 summary/factsPatch/activityEvent를 포함한다.
* [ ] action result에 `noop`/`rejected` outcome이 필요한지 확정한다.
* [ ] action result에 user-facing feedback 문자열을 둘지 결정한다.
* [ ] template payload 타입에서 `primaryActionLabel`/`secondaryActionLabel`를 action descriptor 기반으로 대체할지 migration 전략을 정한다.

## B. template payload에 action descriptor 추가

* [ ] deploy launchpad binder가 action descriptor 배열을 생성하도록 바꾼다.
* [ ] approval inbox binder도 action descriptor를 생성하도록 바꾼다.
* [ ] rollback summary/dry-run/confirm binder도 action descriptor를 생성하도록 바꾼다.
* [ ] 각 action에 stable `actionId`를 부여한다.
* [ ] action label은 display용, `actionId`는 실행용으로 분리한다.
* [ ] 같은 label이어도 상태에 따라 다른 actionId를 가질 수 있게 한다.
* [ ] action descriptor에 target entity key/version을 실어 stale entity guard에 활용할지 정한다.

## C. action id 체계 정의

* [ ] deploy 계열 action id를 정의한다.
* [ ] 권장 예:
  * [ ] `deploy.start`
  * [ ] `deploy.complete`
  * [ ] `deploy.refresh_draft`
* [ ] approval 계열 action id를 정의한다.
* [ ] 권장 예:
  * [ ] `approval.approve`
  * [ ] `approval.hold`
* [ ] rollback 계열 action id를 정의한다.
* [ ] 권장 예:
  * [ ] `rollback.start_dry_run`
  * [ ] `rollback.complete_dry_run`
  * [ ] `rollback.open_confirm`
  * [ ] `rollback.confirm`
  * [ ] `rollback.back_to_summary`
* [ ] 현재 template state에 따라 어떤 action id가 나와야 하는지 matrix를 만든다.

## D. action registry 도입

* [ ] `action-registry.ts`를 추가한다.
* [ ] action id -> handler definition 매핑을 만든다.
* [ ] 각 definition에 대상 domain, confirmation 필요 여부, optimistic 가능 여부를 기록한다.
* [ ] 각 definition에 execute-time availability validator를 둘지 정한다.
* [ ] handler는 typed payload를 받도록 한다.
* [ ] 같은 action id가 여러 template에서 재사용 가능하도록 한다.

## E. action bridge 설계

* [ ] `action-bridge.ts`를 추가한다.
* [ ] 입력은 `conversationId`, `surface`, `actionId`, `payload`가 되게 한다.
* [ ] bridge는 현재 active surface와 action descriptor를 검증한다.
* [ ] 사용자가 오래된 surface에서 누른 action이 현재 active surface와 맞지 않으면 stale action으로 거부한다.
* [ ] targetRef/entityVersion이 현재 domain snapshot과 맞지 않으면 stale entity action으로 거부한다.
* [ ] execute 직전 action availability를 다시 검증한다.
* [ ] bridge는 action registry를 조회해 dispatcher로 넘긴다.
* [ ] bridge 결과를 conversation update + activity log + surface refresh로 변환한다.

## F. domain command adapter 분리

* [ ] deploy 관련 액션은 `run-deploy-action.ts`로 모은다.
* [ ] approval 관련 액션은 `run-approval-action.ts`로 모은다.
* [ ] rollback 관련 액션은 `run-rollback-action.ts`로 모은다.
* [ ] 기존 `app-store.ts`의 mutation 코드를 단계적으로 이 adapter로 이동한다.
* [ ] adapter는 pageKey가 아니라 명시적 entity key/service/request id를 입력으로 받게 한다.
* [ ] domain command 결과를 structured result로 반환하게 한다.
* [ ] 이미 반영된 상태에 대한 idempotent/no-op 처리 정책을 adapter에 넣는다.
* [ ] rejected/no-op 결과가 failure와 다르게 구분되도록 한다.

## G. legacy `app-store.ts` action 마이그레이션

* [ ] `runPrimaryTemplateAction`와 `runSecondaryTemplateAction`를 더 이상 새 surface path에서 직접 쓰지 않게 한다.
* [ ] 기존 로직을 새 action bridge가 호출하는 legacy adapter로 한동안 감싼다.
* [ ] `quickRollback`, `startRollbackDryRun`, `confirmRollback` 같은 함수의 재사용 범위를 정리한다.
* [ ] `submitDeployRequest`, `startDeployRun`, `completeDeployRun`를 action dispatcher 경유로도 실행 가능하게 만든다.
* [ ] migration 동안 중복 실행 경로가 생기지 않도록 guard를 둔다.

## H. action pending / disable 정책

* [ ] 같은 action 중복 클릭을 막기 위한 pending state를 도입한다.
* [ ] conversation store에 `pendingAction` 또는 action execution map을 둔다.
* [ ] pending 중인 action은 해당 버튼만 disable할지 surface 전체를 lock할지 결정한다.
* [ ] action success/failure 후 pending 해제 규칙을 정한다.
* [ ] action 실패 시 retry 가능 여부를 정책화한다.
* [ ] no-op/rejected 결과일 때 pending 해제 후 surface를 어떻게 유지할지 정한다.

## I. confirmation / danger action 처리

* [ ] `confirmationRequired` action에 대한 UX를 정한다.
* [ ] confirm-action template의 primary action은 explicit confirmation을 요구할지 결정한다.
* [ ] approval/rollback 고위험 action에 confirmation message를 붙인다.
* [ ] confirmation을 template 내부에서 처리할지, bridge 앞단에서 modal/inline confirm으로 처리할지 결정한다.
* [ ] phase4에서는 최소 inline confirm 또는 2-click confirm 패턴을 구현 가능한 구조로 둔다.

## J. post-action refresh 파이프라인

* [ ] `post-action-refresh.ts`를 추가한다.
* [ ] action success 후 domain state snapshot을 다시 읽는다.
* [ ] action result의 `factsPatch`를 conversation facts에 merge한다.
* [ ] 필요한 경우 tool/context를 재조회할지 결정한다.
* [ ] decision engine을 다시 실행한다.
* [ ] selector/binder를 다시 실행해 active surface를 갱신한다.
* [ ] action 결과가 다른 template family로 이동해야 하면 surface replace를 수행한다.
* [ ] action 결과가 같은 family의 state 변화면 update-in-place를 수행한다.
* [ ] no-op 결과에서 surface refresh를 생략할지 최소 refresh만 할지 정책을 정한다.

## K. activity log 확장

* [ ] `activity-log-builder.ts`를 추가한다.
* [ ] action started/succeeded/failed 이벤트를 log entry로 변환한다.
* [ ] rejected/no-op 결과를 별도 status로 남길지 결정한다.
* [ ] assistant chat message와 action event를 같은 timeline에 섞을지, type을 구분해 보여줄지 결정한다.
* [ ] 권장안은 activity log item type을 `message | action`으로 분리하는 것이다.
* [ ] action log에는 최소 `title`, `status`, `target`, `timestamp`, `detail`을 담는다.
* [ ] action 결과 summary를 assistant 자연어 메시지로도 남길지 정책을 정한다.

## L. assistant activity log UI 개선

* [ ] `AssistantActivityLog`가 action event도 렌더할 수 있게 타입을 확장한다.
* [ ] action event의 `started/succeeded/failed`를 시각적으로 구분한다.
* [ ] user/assistant message와 action event가 섞여도 읽기 쉽게 레이아웃을 조정한다.
* [ ] surface action 실패가 로그에서 명확히 보이게 한다.
* [ ] phase4에서는 운영 로그와 채팅 로그를 완전히 분리하지 않더라도 event type은 분명히 남긴다.

## M. template component API 전환

* [ ] 각 template component가 `actions` 배열 또는 명시 action object를 받게 바꾼다.
* [ ] `onPrimaryAction`/`onSecondaryAction` 패턴을 단계적으로 제거한다.
* [ ] quick deploy template에서 action descriptor를 렌더하게 한다.
* [ ] approval inbox template도 action descriptor를 렌더하게 한다.
* [ ] rollback summary/dry-run/confirm template도 동일한 패턴으로 맞춘다.
* [ ] action별 pending/disabled/danger style을 표현하게 한다.

## N. renderer와 template-surface 연결

* [ ] `template-renderer.tsx`가 generic callback이 아니라 `onAction(actionId, payload)`를 받게 바꾼다.
* [ ] `template-surface.tsx`가 현재 active surface에서 action descriptor를 읽고 bridge를 호출하게 한다.
* [ ] stale active surface에서 온 action이 거부되면 user-facing feedback을 정한다.
* [ ] action 실행 후 same-turn surface refresh가 자연스럽게 보이도록 한다.

## O. conversation store와 action execution 연결

* [ ] `conversation-store.ts`에 `executeSurfaceAction` 또는 동등한 action entrypoint를 추가한다.
* [ ] `executeSurfaceAction`은 pending state, result 반영, activity event append까지 담당하게 한다.
* [ ] action 실행 결과가 새로운 assistant message를 생성할지 정책을 정한다.
* [ ] action 실패 시 error를 toast만 띄울지 log에도 남길지 결정한다.
* [ ] stale requestId와 별개로 stale surface action guard도 넣는다.
* [ ] rejected/no-op 결과의 사용자 피드백 정책을 store 레벨에서 통일한다.

## P. facts / surface 동기화

* [ ] action 결과가 facts를 바꾸면 active surface freshnessKey도 갱신한다.
* [ ] action 후 stale surface를 그대로 두지 않도록 invalidation 규칙을 둔다.
* [ ] surface refresh가 필요한데 binder 실패하면 fallback text + 기존 surface 유지 여부를 정한다.
* [ ] action이 실제로 아무 변화도 만들지 않은 경우 no-op 정책을 정한다.
* [ ] execute-time availability 재검증에서 거부된 경우 current surface를 유지하고 보조 안내만 붙일지 정한다.

## Q. 테스트 및 검증

* [ ] action registry lookup 테스트를 추가한다.
* [ ] action bridge stale surface guard 테스트를 추가한다.
* [ ] stale entity version guard 테스트를 추가한다.
* [ ] deploy action dispatcher 테스트를 추가한다.
* [ ] approval action dispatcher 테스트를 추가한다.
* [ ] rollback action dispatcher 테스트를 추가한다.
* [ ] execute-time availability revalidation 테스트를 추가한다.
* [ ] pending 중복 클릭 방지 테스트를 추가한다.
* [ ] confirmation-required action 테스트를 추가한다.
* [ ] idempotent/no-op action 테스트를 추가한다.
* [ ] post-action refresh 테스트를 추가한다.
* [ ] activity log builder 테스트를 추가한다.
* [ ] template component action rendering 테스트를 추가한다.
* [ ] 대표 통합 시나리오:
  * [ ] deploy launchpad에서 `deploy.start` 클릭 -> domain state 변경 -> activity log 기록 -> same family surface refresh
  * [ ] approval inbox에서 `approval.approve` 클릭 -> 상태 approved 반영 -> surface state 갱신
  * [ ] rollback summary에서 `rollback.start_dry_run` 클릭 -> dry-run stepper surface 전환
  * [ ] confirm surface에서 danger action confirm -> rollback executed -> log 기록 -> post-action surface refresh
  * [ ] 이미 승인된 approval에 다시 `approval.approve` -> no-op 또는 rejected 처리 + 안내 메시지 확인
  * [ ] action 실패 시 surface 유지 + 실패 로그 + user-facing feedback 확인

---

## 구현 순서 제안

1. action runtime 타입과 action id 체계 정의
2. binder에 action descriptor 추가
3. action registry + bridge 추가
4. legacy `app-store.ts` action adapter 연결
5. post-action refresh 파이프라인 추가
6. activity log 확장
7. template component API 전환
8. store/UI 연결
9. 테스트 및 통합 검증

이 순서를 권장하는 이유는, template component부터 바꾸면 아직 bridge가 없어서 UI가 비어버리기 쉽기 때문이다.  
먼저 runtime action path를 만든 뒤 component를 바꾸는 편이 안전하다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* surface 버튼이 stable action id를 가진다
* action bridge가 domain command를 실행할 수 있다
* action 결과가 domain state, conversation facts, activity log, active surface에 함께 반영된다
* deploy/approval/rollback 대표 흐름이 실제 실행형 assistant UI로 동작한다
* phase5에서 template registry와 admin tooling을 얹을 수 있는 runtime action path가 준비된다

---

## 다음 문서로 넘길 항목

이번 문서가 끝나면 다음 5차 기반 문서에서는 아래를 본격적으로 다뤄야 한다.

* template registry 도입
* contract / preview / decision simulator
* template metadata / selection policy / binding spec 관리 구조
* admin tab 기반 운영 UX

즉 4차 기반 문서는 "surface가 실제로 일을 하게 만드는 문서"이고, 다음 문서부터 "그 surface와 policy를 운영자가 관리할 수 있게 만드는 단계"로 들어간다.
