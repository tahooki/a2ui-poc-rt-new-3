# Conversation Foundation 6차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 6차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지다.

* workspace UI 정리
* 예외 처리 / fallback 강화
* 운영 로그 / debug panel 강화

이 문서는 [5차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327173059_conversation-foundation-phase5-implementation-plan.md)를 전제로 한다.  
즉 phase5에서 runtime surface/action path와 template manager/workbench가 모두 갖춰졌다는 가정 위에서 작성한다.

---

## 이번 단계가 필요한 이유

phase5까지 끝나면 구조적으로 필요한 엔진은 대부분 갖춰진다.

* conversation store
* tool/executor/orchestrator
* decision engine
* template selector/binder/renderer
* action bridge
* template registry / preview / simulator

하지만 제품 UI 관점에서는 여전히 미완성일 가능성이 높다.

* workflow 화면은 아직 bubble chat 패널과 workspace UI가 공존할 수 있다
* 오류가 나면 어디서 실패했는지 사용자와 운영자가 구분하기 어렵다
* decision trace / tool log / facts dump가 내부 상태로만 남고 UI에서 보기 어렵다
* fallback 경로가 분산돼 있으면 안정성이 체감되지 않는다

즉 phase6의 핵심은 **assistant를 운영 가능한 제품 UI로 정리하는 것**이다.

---

## 6차 기반 완료 기준

이번 단계가 끝나면 최소 아래가 가능해야 한다.

1. workflow 화면과 `/assistant` 화면이 같은 workspace foundation을 사용한다.
2. bubble chat 패널 중심 경로가 점진적으로 제거되거나 legacy로 격하된다.
3. 오류가 발생해도 text fallback, surface fallback, action fallback이 명확히 동작한다.
4. 최근 decision trace, tool execution log, conversation facts, payload validation error를 UI에서 볼 수 있다.
5. 운영자가 실제 문제를 UI 안에서 재현하고 추적할 수 있다.

중요한 경계:

* phase6은 제품 정리 단계다.
* 새로운 core engine을 대폭 추가하는 단계가 아니다.
* 지금까지 만든 엔진을 **보이게 하고, 안전하게 하고, 다루기 쉽게 만드는 단계**다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* 새로운 intent/workflow 대규모 추가
* 새로운 template family 대량 도입
* registry 저장소/배포 시스템 고도화
* full observability backend 구축
* production-grade RBAC/tenant isolation

이번 단계는 주로 UI, fallback, debug/ops ergonomics에 집중한다.

---

## 현재 코드 기준 문제 정리

### 1. `ChatAssistantPanel`과 `AssistantWorkspace`가 이중화되어 있다

[src/devops-console/assistant/chat-assistant-panel.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/chat-assistant-panel.tsx)는 여전히 bubble thread 중심 UI다.

반면 [src/devops-console/shell/assistant-workspace.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/assistant-workspace.tsx)는:

* context summary
* activity log
* template surface
* command composer

구조를 이미 갖고 있다.

즉 현재는 foundation 방향이 문서와 어긋나 있고, 두 UI 경로가 병존할 가능성이 크다.

### 2. workflow 화면에서 assistant가 아직 page별 부가 UI로 남아 있다

[src/devops-console/console-page.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/console-page.tsx)를 보면:

* deploy만 assistant가 열리고
* approve/rollback는 여전히 제한적일 수 있으며
* assistant는 `AppFrame` 우측 aside로만 붙는다

즉 "conversation-first workspace"라는 방향과는 아직 거리가 있다.

### 3. `AssistantActivityLog`는 운영 디버그 정보를 보여주지 못한다

[src/devops-console/assistant/activity-log.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/activity-log.tsx)는 아직 message log 중심이다.

phase6에서 운영자가 실제로 보고 싶은 것은 아래다.

* 최근 decision trace
* 최근 tool execution
* 현재 facts dump
* active surface metadata
* validation/binding error

즉 activity log만으로는 운영 추적이 부족하다.

### 4. fallback 경로가 화면에서 구분되지 않을 수 있다

phase1~phase5를 거치며 생기는 대표 오류 종류:

* transport/stream error
* tool execution error
* decision mismatch
* binder/validation error
* action failure
* stale request / stale surface guard

이것들이 모두 같은 `error` 문자열 한 줄로 보이면 운영 난이도가 급격히 올라간다.

### 5. `AppFrame` / `WorkspaceLayout`는 레이아웃 그릇이고 운영 패널 개념이 없다

[src/devops-console/shell/app-frame.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/app-frame.tsx)와 [src/devops-console/shell/workspace-layout.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/workspace-layout.tsx)는 레이아웃은 제공하지만:

* debug drawer
* ops rail
* trace inspector
* facts viewer

같은 운영용 보조 패널은 아직 없다.

phase6에서는 workspace 내부에 이 도구들을 어떻게 붙일지 정해야 한다.

---

## 핵심 설계 원칙

## 1. bubble panel이 아니라 workspace를 주 경로로 삼는다

phase6의 가장 큰 방향은 명확하다.

* `ChatAssistantPanel`은 legacy path로 내린다
* `AssistantWorkspace`를 주 경로로 올린다
* `/assistant`와 workflow page가 같은 foundation을 사용하게 한다

이렇게 해야 conversation-first workspace라는 제품 방향과 구현이 맞아진다.

## 2. 오류는 "무슨 계층에서 실패했는지" 드러나야 한다

권장 분류:

* transport error
* tool error
* decision error
* binding/validation error
* action error
* stale guard rejection

사용자-facing copy와 운영자-facing detail을 분리해야 한다.

예:

* 사용자에게는 "표면 UI를 갱신하지 못해 텍스트로 계속 진행합니다."
* 운영 패널에는 `binding_error: missing deploy.selectedServiceContext`

## 3. fallback은 제품 동작의 일부여야 한다

phase6에서는 fallback을 단순 예외 처리로 보지 않고, 정상 제품 동작으로 다뤄야 한다.

권장 우선순위:

1. action 실패 -> 이전 surface 유지 + 실패 안내
2. binder/validation 실패 -> text fallback + error viewer 기록
3. transport 실패 -> 재시도 가능 상태 + 최근 컨텍스트 유지
4. stale guard -> no-op + 안내

즉 실패해도 대화와 상태가 유지되는 것이 중요하다.

## 4. debug panel은 runtime을 재사용하는 read-only 창이어야 한다

운영 패널은 별도 추정 정보를 보여주면 안 된다.

권장 원칙:

* decision panel은 실제 lastDecisionTrace를 보여준다
* tool panel은 실제 tool execution event를 보여준다
* facts panel은 실제 conversation facts snapshot을 보여준다
* validation panel은 실제 binder/validator error를 보여준다

즉 debug UI는 runtime state의 read-only projection이어야 한다.

## 5. 운영 도구는 기본적으로 감추고 필요할 때 열리게 한다

phase6의 workspace는 일반 사용자와 운영자가 동시에 쓸 수 있어야 한다.

권장 구조:

* 기본 workspace: context + activity + surface + composer
* debug drawer: trace/log/facts/error
* 필요 시만 펼침

이렇게 해야 제품 UI가 debug UI에 먹히지 않는다.

## 6. `/assistant` 화면은 최종적으로 workbench이자 진단 허브가 된다

phase6에서는 `/assistant`가 단순 standalone chat이 아니라:

* cross-workflow workspace
* template manager 진입점
* debug/ops workbench

역할을 동시에 가질 수 있어야 한다.

즉 chat-only 페이지로 남겨두지 않는 방향이 맞다.

## 7. workspace 전환은 단계적 롤아웃이 가능해야 한다

phase6는 주 경로 UI를 바꾸는 단계라서, 한 번에 교체하면 회귀 추적이 어려워질 수 있다.

권장 원칙:

* workflow page별로 단계적 전환 가능
* 필요하면 feature flag 또는 config switch로 legacy path 복귀 가능
* `/assistant` 허브와 workflow page 전환을 독립적으로 rollout 가능

즉 phase6의 UI 통합은 "한 번에 뒤집기"보다 **되돌릴 수 있는 전환 전략**이 중요하다.

## 8. responsive와 accessibility는 마감 단계에서 반드시 같이 본다

phase6는 제품 UI 정리 단계이므로 다음을 같이 봐야 한다.

* 좁은 화면에서 workspace와 debug drawer가 어떻게 접히는지
* keyboard-only 사용 시 focus 이동이 자연스러운지
* drawer/modal/tabs에 접근성 속성이 충분한지
* error/fallback 상태가 screen reader에도 의미 있게 전달되는지

debug/ops 도구도 제품 UI의 일부이므로, accessibility와 responsive를 마지막에 따로 빼지 않는 편이 맞다.

---

## 권장 상태/데이터 확장

phase6에서는 conversation runtime에 아래 읽기용 상태를 노출하는 편이 좋다.

```ts
type ConversationDiagnostics = {
  lastDecisionTrace?: unknown;
  recentToolEvents?: unknown[];
  factsSnapshot?: Record<string, unknown>;
  activeSurfaceMeta?: {
    templateId: string;
    updatedAt: string;
    freshnessKey?: string;
  };
  lastValidationError?: {
    message: string;
    fieldPaths?: string[];
  } | null;
  lastActionError?: {
    actionId: string;
    message: string;
  } | null;
};
```

핵심은 debug UI를 위해 새로운 계산을 만드는 것이 아니라, 이미 runtime에 있는 진단 가능 상태를 정리해서 노출하는 것이다.

---

## 파일별 수정 계획

## 새로 만들 파일

* [x] `src/devops-console/assistant/debug-drawer.tsx`
* [x] `src/devops-console/assistant/decision-trace-panel.tsx`
* [x] `src/devops-console/assistant/tool-execution-panel.tsx`
* [x] `src/devops-console/assistant/facts-dump-panel.tsx`
* [x] `src/devops-console/assistant/validation-error-panel.tsx`
* [x] `src/devops-console/assistant/assistant-status-banner.tsx`
* [x] `src/devops-console/assistant/workspace-shell.tsx`

## 확장 대상 파일

* `src/devops-console/shell/assistant-workspace.tsx`
* `src/devops-console/assistant/activity-log.tsx`
* `src/devops-console/assistant/context-summary.tsx`
* `src/devops-console/assistant/command-composer.tsx`
* `src/devops-console/assistant/template-surface.tsx`
* `src/devops-console/assistant-page.tsx`
* `src/devops-console/console-page.tsx`
* `src/devops-console/shell/app-frame.tsx`
* `src/devops-console/shell/workspace-layout.tsx`
* `src/devops-chat/store/conversation-store.ts`

## 역할을 재정의할 기존 파일

* [src/devops-console/assistant/chat-assistant-panel.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant/chat-assistant-panel.tsx)
  phase6에서는 legacy bubble panel로 격하하거나 제거 대상으로 둔다.

* [src/devops-console/shell/assistant-workspace.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/shell/assistant-workspace.tsx)
  phase6에서는 주 경로 workspace shell로 승격해야 한다.

* [src/devops-console/assistant-page.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant-page.tsx)
  template manager, chat workspace, debug workbench를 통합하는 진입점으로 재정의해야 한다.

---

## 상세 Todo List

## A. workspace 주 경로 통합

* [x] workflow page에서 `ChatAssistantPanel` 대신 `AssistantWorkspace` 기반 경로를 쓰도록 바꾼다.
* [x] `/assistant`도 동일한 workspace foundation을 쓰도록 맞춘다.
* [x] deploy만 assistant 활성인 제한을 풀지 검토한다.
* [x] approve/rollback도 conversation-first workspace를 사용할 수 있게 연다.
* [x] `assistantEnabled` 같은 임시 분기를 줄인다.

## B. `ChatAssistantPanel` legacy 정리

* [x] `chat-assistant-panel.tsx`를 즉시 제거할지, migration 동안만 남길지 결정한다.
* [x] 남긴다면 deprecate 주석과 사용 범위를 최소화한다.
* [x] 새 기능은 더 이상 bubble panel에 추가하지 않는 규칙을 문서화한다.

## B-2. 전환 전략 / feature flag

* [x] workspace 통합을 feature flag 또는 config switch 뒤에서 rollout할지 결정한다.
* [x] deploy/approve/rollback 화면별로 개별 전환 가능성을 검토한다.
* [x] 문제가 생기면 legacy bubble path로 되돌릴 수 있는 fallback 경로를 남길지 정한다.
* [x] `/assistant` 허브와 workflow page 전환을 독립적으로 rollout할지 결정한다.

## C. assistant workspace API 정리

* [x] `assistant-workspace.tsx`가 action descriptor 기반 surface를 받도록 업데이트한다.
* [x] messages 외에 diagnostics/debug state를 받을 수 있게 props를 확장한다.
* [x] layout section 순서를 현재 제품 흐름에 맞게 재검토한다.
* [x] context / activity / surface / composer / debug drawer의 책임을 명확히 나눈다.

## D. status banner / fallback UX 추가

* [x] `assistant-status-banner.tsx`를 추가한다.
* [x] transport/tool/binding/action/stale guard 에러를 유형별로 다르게 안내한다.
* [x] 사용자-facing copy는 짧고 회복 지향적으로 쓴다.
* [x] retry 가능 여부와 fallback 상태를 함께 보여준다.
* [x] "텍스트로 계속 진행 중", "이전 surface 유지 중" 같은 상태를 표시한다.

## E. debug drawer 도입

* [x] `debug-drawer.tsx`를 추가한다.
* [x] 기본적으로 닫혀 있고 필요 시 펼칠 수 있게 한다.
* [x] workflow 화면과 `/assistant` 화면 모두에서 같은 debug drawer를 재사용한다.
* [x] drawer 안에 trace/log/facts/error panel을 탭 또는 섹션으로 배치한다.
* [x] 일반 사용자에게는 과하지 않도록 가시성 전략을 정한다.

## F. decision trace panel 구현

* [x] `decision-trace-panel.tsx`를 추가한다.
* [x] `mode`, `reason`, `matched`, `missing`, `disqualified`, `score`를 표시한다.
* [x] 마지막 trace뿐 아니라 최근 몇 개를 보여줄지 결정한다.
* [x] trace가 없을 때 empty state를 제공한다.

## G. tool execution panel 구현

* [x] `tool-execution-panel.tsx`를 추가한다.
* [x] 최근 tool 실행 이름, 상태, 요약, 시각을 보여준다.
* [x] 성공/실패를 구분한다.
* [x] tool chain이 길 경우 최신순으로 정리한다.
* [x] tool log가 너무 많으면 trim 정책을 만든다.

## H. facts dump panel 구현

* [x] `facts-dump-panel.tsx`를 추가한다.
* [x] 현재 conversation facts를 read-only JSON 또는 key-value tree로 보여준다.
* [x] canonical value와 source/provenance를 같이 보여줄지 검토한다.
* [x] 운영자가 빠르게 복사할 수 있는 UX를 넣을지 결정한다.
* [x] 민감한 값 마스킹 정책이 필요한지 검토한다.

## I. validation/error panel 구현

* [x] `validation-error-panel.tsx`를 추가한다.
* [x] 최근 binding/validation/action error를 분리 표시한다.
* [x] field path 기반 에러를 바로 볼 수 있게 한다.
* [x] fallback이 이미 적용된 경우 그 사실도 함께 보여준다.
* [x] stale guard rejection도 에러인지 안내인지 구분해 표시한다.

## J. activity log 확장 정리

* [x] `AssistantActivityLog`가 message/action/tool/fallback 이벤트를 함께 다룰 수 있게 확장한다.
* [x] event type별 시각적 계층을 다시 잡는다.
* [x] 너무 많은 이벤트가 쌓일 때 trim/collapse 정책을 둔다.
* [x] debug drawer의 tool panel과 중복되는 정보는 역할을 구분한다.

## K. exception handling 정책 정리

* [x] transport error 시 conversation state와 composer input을 어떻게 유지할지 정한다.
* [x] tool failure 시 text fallback과 debug log 기록을 함께 남긴다.
* [x] binder/validation failure 시 active surface 유지/해제 정책을 통일한다.
* [x] action failure 시 이전 surface 유지 여부를 통일한다.
* [x] stale request/surface/action guard rejection의 user-facing 처리 규칙을 정한다.

## L. recovery UX 정리

* [x] retry 버튼이 필요한 에러 유형을 분류한다.
* [x] "다시 시도", "텍스트로 계속", "surface 닫기" 같은 회복 액션을 검토한다.
* [x] error 후에도 composer가 바로 다시 쓸 수 있게 한다.
* [x] debug drawer를 열어 추가 정보 확인 흐름을 자연스럽게 만든다.

## M. `/assistant` 페이지 재구성

* [x] `/assistant`를 cross-workflow workspace + manager + debug workbench 허브로 재구성한다.
* [x] 탭 또는 모드 전환 구조를 검토한다.
* [x] 최소 모드 예:
  * [x] `Workspace`
  * [x] `Template Manager`
  * [x] `Debug`
* [x] 현재 pageKey 탭 구조와 새로운 workbench 모드 구조가 충돌하지 않게 정리한다.

## N. workflow 화면 통합

* [x] deploy/approve/rollback 화면이 공통 workspace foundation을 쓰도록 통일한다.
* [x] 우측 aside만 쓸지, full workspace mode도 지원할지 검토한다.
* [x] `AppFrame`와 `WorkspaceLayout`이 workspace 모드와 debug mode를 수용하게 확장한다.
* [x] 작은 화면/좁은 aside에서의 degrade 전략을 정한다.

## N-2. responsive / accessibility 정리

* [x] 좁은 화면에서 workspace 섹션 우선순위와 접힘 규칙을 정한다.
* [x] debug drawer가 모바일/좁은 화면에서 full-height panel로 바뀔지 검토한다.
* [x] keyboard-only 사용 시 focus 이동과 escape/close 동작을 정리한다.
* [x] tabs, drawer, banner, error state에 접근성 속성을 보강한다.
* [x] screen reader에서 fallback/error/debug 상태가 의미 있게 읽히는지 확인한다.

## O. diagnostics 상태 노출 정리

* [x] `conversation-store.ts`에 debug UI가 읽을 수 있는 diagnostics selector를 제공한다.
* [x] lastDecisionTrace, recentToolEvents, factsSnapshot, lastValidationError, lastActionError를 노출한다.
* [x] debug용 읽기 상태와 runtime source-of-truth가 어긋나지 않게 한다.
* [x] diagnostics trim 정책을 만든다.

## P. copy / export / inspect UX 검토

* [x] facts/trace/tool log를 복사할 수 있게 할지 검토한다.
* [x] 운영자용 inspect JSON 뷰를 제공할지 검토한다.
* [x] 최소한 debug panel에서 복사 가능한 텍스트 뷰를 둘지 결정한다.
* [x] debug drawer의 열린 탭/선택 상태를 URL 또는 local state로 복원할지 검토한다.
* [x] 문제 재현을 위해 diagnostics snapshot export/share를 지원할지 검토한다.

## Q. 테스트 및 검증

* [x] workspace 통합 렌더 테스트를 추가한다.
* [x] bubble panel legacy path 축소 테스트를 추가한다.
* [x] status banner 에러 분기 테스트를 추가한다.
* [x] debug drawer open/close 테스트를 추가한다.
* [x] feature flag 기반 전환 테스트를 추가한다.
* [x] decision trace panel 렌더 테스트를 추가한다.
* [x] tool execution panel 렌더 테스트를 추가한다.
* [x] facts dump panel 렌더 테스트를 추가한다.
* [x] validation/error panel 렌더 테스트를 추가한다.
* [x] keyboard/focus 이동 테스트를 추가한다.
* [x] 좁은 화면 responsive degrade 테스트를 추가한다.
* [x] fallback 정책 통합 테스트를 추가한다.
* [x] 대표 통합 시나리오:
  * [x] tool failure -> text fallback + debug drawer에 tool error 노출
  * [x] binding failure -> surface fallback + validation panel 표시
  * [x] action failure -> 기존 surface 유지 + activity log 기록
  * [x] `/assistant`에서 workspace/debug/manager 흐름 전환
  * [x] workflow 화면에서 same conversation state가 workspace UI로 보이는지 확인

---

## 구현 순서 제안

1. diagnostics 상태 정리
2. status banner + debug drawer 도입
3. trace/tool/facts/error 패널 구현
4. assistant workspace props 확장
5. workflow 화면을 workspace foundation으로 전환
6. `/assistant` 허브 재구성
7. bubble panel legacy 축소
8. fallback 통합 테스트 및 UX 조정

이 순서를 권장하는 이유는, UI를 먼저 갈아엎으면 디버깅 수단이 없어서 전환 과정이 더 불안정해지기 때문이다.  
먼저 diagnostics와 fallback UI를 붙이고 나서 workspace 경로를 통합하는 편이 안전하다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* assistant가 모든 주요 화면에서 workspace foundation으로 일관되게 보인다
* 오류가 나도 사용자와 운영자가 같은 화면 안에서 원인과 fallback 상태를 이해할 수 있다
* decision/tool/facts/validation 정보가 debug drawer에서 추적 가능하다
* 기존 bubble panel 중심 구조가 더 이상 주 경로가 아니다
* conversation-first assistant foundation이 제품 UI와 운영 UX까지 포함해 마무리된다

---

## 마무리

이 문서까지 완료되면 문서상 권장 구현 순서 1차부터 6차까지 모두 닫힌다.

즉 이후 작업은 새로운 기반을 만드는 단계라기보다:

* 실제 API 연동
* 운영 안정성 개선
* 성능 최적화
* 세부 UX polish

같은 제품 완성도 작업으로 넘어가게 된다.
