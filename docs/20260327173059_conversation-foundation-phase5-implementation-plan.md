# Conversation Foundation 5차 기반 수정/개발 계획서

## 문서 목적

이 문서는 [A2UI Conversation Foundation 개발 설계](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327171240_a2ui-conversation-foundation-design.md)의 **권장 구현 순서 중 5차 기반**에 해당하는 실제 프로젝트 수정 계획서다.

이번 문서의 범위는 아래 3가지다.

* 관리자용 template registry 도입
* contract / preview 구축
* decision simulator 구축

이 문서는 [4차 기반 계획서](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260327172806_conversation-foundation-phase4-implementation-plan.md)를 전제로 한다.  
즉 phase4에서 runtime surface selection, binding, action bridge, activity log 경로까지 동작하고 있다는 가정 위에서 작성한다.

---

## 이번 단계가 필요한 이유

phase4까지 끝나면 assistant runtime은 꽤 강해진다.

* conversation facts로 template를 고른다
* payload를 만든다
* surface를 렌더한다
* button action도 실행된다

하지만 운영 관점에서는 아직 큰 문제가 남아 있다.

* 어떤 template가 왜 선택되는지 운영자가 볼 수 없다
* payload contract를 코드 밖에서 이해하기 어렵다
* 샘플 payload를 넣어 surface를 미리 검증하기 어렵다
* selection policy를 비교/디버깅하기 어렵다
* decision trace를 실제 운영 UX로 연결할 수 없다

즉 phase5의 핵심은 **runtime template system을 운영 가능한 관리 시스템으로 끌어올리는 것**이다.

---

## 5차 기반 완료 기준

이번 단계가 끝나면 최소 아래가 가능해야 한다.

1. template 목록, 상태, 버전, renderer key를 한 화면에서 볼 수 있다.
2. 각 template의 입력 contract를 문서형으로 확인할 수 있다.
3. example payload를 넣고 즉시 validation + live preview를 볼 수 있다.
4. selection policy를 규칙 단위로 볼 수 있다.
5. conversation facts JSON을 넣어 어떤 template가 선택되는지 decision simulator로 확인할 수 있다.

중요한 경계:

* phase5는 **운영/관리 계층**이다.
* 실제 workspace UI 전면 정리와 운영용 디버그 도구 고도화는 **6차 기반**으로 넘긴다.

---

## 이번 단계의 비목표

이번 문서 범위에서 하지 않는 것:

* template registry의 서버 저장소/DB 설계 확정
* 멀티 유저 권한 시스템
* runtime hot publish workflow
* production-grade audit trail 시스템
* full CMS 수준의 no-code template builder

이번 단계는 "운영자가 읽고 검증하고 시뮬레이션할 수 있는 관리 UI"까지다.

---

## 현재 코드 기준 문제 정리

### 1. registry가 없다

현재 template 관련 코드는:

* [src/devops-chat/types/templates.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/templates.ts)
* [src/devops-chat/templates/template-renderer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/template-renderer.tsx)
* [src/devops-chat/templates/build-template-envelope.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/build-template-envelope.ts)

위주로 퍼져 있다.

문제는:

* template definition metadata가 한곳에 없고
* runtime payload 타입과 운영 메타데이터가 분리되지 않았으며
* template별 contract/selection policy/preview case를 추적하기 어렵다

즉 phase5에서는 먼저 **registry model**을 세워야 한다.

### 2. assistant page가 관리 화면 역할을 아직 못 한다

[src/devops-console/assistant-page.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant-page.tsx)는 현재:

* cross-workflow chat 전용 페이지에 가깝고
* 실제 template manager 기능은 없다

UI copy에 `template manager` 성격이 일부 보이지만, 실제로는:

* list
* contract viewer
* payload editor
* preview panel
* simulator

가 없다.

phase5에서는 이 페이지를 재구성하거나 별도 admin surface를 추가해야 한다.

### 3. `types/templates.ts`는 runtime payload 타입이지 contract 문서가 아니다

현재 타입은 renderer prop으로는 충분하지만, 운영 UI 입장에서는 부족하다.

운영자는 아래를 원한다.

* 필수 필드
* field type
* enum
* 설명
* example
* nested object 구조

즉 phase5에서는 runtime type과 별도로 **contract document model**이 필요하다.

### 4. preview와 runtime render 경로가 분리되어 있지 않다

현재 preview를 만들려면 사실상 runtime path를 직접 건드려야 한다.

하지만 운영 관점에서는:

* 등록된 example payload
* 수동 입력 payload
* simulator에서 선택된 payload

를 모두 같은 renderer로 미리 볼 수 있어야 한다.

즉 phase5에서는 `preview input -> validate -> render` 경로를 **runtime과 동일한 renderer를 재사용하는 별도 관리 경로**로 만들어야 한다.

### 5. decision trace는 있지만 simulator UX가 없다

phase2/phase3에서 decision trace와 selection trace를 남겼더라도, 운영자가 그것을 직접 조작하면서 볼 수 있는 화면이 없다.

phase5의 simulator는 최소 아래를 보여줘야 한다.

* eligible 여부
* candidate score
* matched rules
* missing facts
* disqualified reasons
* 최종 선택 template

즉 trace를 저장하는 것만으로는 부족하고, **입력 가능한 simulator UI**가 필요하다.

---

## 핵심 설계 원칙

## 1. runtime payload와 registry definition은 분리한다

phase5에서는 아래 둘을 절대 섞지 않는 것이 중요하다.

* runtime payload
* registry definition

예:

* runtime payload: `QuickDeployTemplateData`
* registry definition: `quick_deploy_launchpad`의 title/description/version/status/inputSchema/selectionPolicy/previewCases

runtime은 assistant가 surface를 띄우기 위해 쓰고, registry는 운영자가 이해/검증/관리하기 위해 쓴다.

## 2. registry는 코드에서 시작하되, 구조는 저장소 친화적으로 만든다

phase5에서 바로 DB나 CMS를 만들 필요는 없다.

대신 다음이 가능해야 한다.

* 코드에 선언
* list 화면에 표시
* simulator/preview가 읽기
* 나중에 JSON/DB로 이동 가능

즉 registry definition은 저장소 중립적이어야 한다.

추가로 phase5에서는 registry definition의 source-of-truth를 명확히 해야 한다.

권장 원칙:

* runtime selector/binder/validator가 실제 동작의 source of truth다
* registry 문서는 운영용 설명 계층이다
* phase5에서는 registry 편집이 runtime을 직접 바꾸지 않게 한다

즉 contract/selectionPolicyDoc은 우선 **read-mostly 문서 모델**로 두고, runtime과 drift를 검출하는 것이 편집보다 우선이다.

## 3. contract viewer는 타입 문서가 아니라 운영 문서여야 한다

단순 TypeScript 타입 출력으로는 부족하다.

contract 항목에는 최소 아래가 필요하다.

* field path
* type
* required 여부
* description
* example
* enum/options

운영자는 TS generic이 아니라 **입력 명세서**를 보고 싶어한다.

## 4. live preview는 반드시 실제 renderer를 재사용해야 한다

preview 전용 mock renderer를 따로 만들면 runtime과 어긋난다.

권장 흐름:

1. example payload 또는 수동 JSON 입력
2. contract validation
3. runtime `TemplateRenderer` 재사용
4. 동일 CSS/component로 preview

즉 preview는 "비슷한 화면"이 아니라 실제 surface 렌더여야 한다.

## 5. simulator는 decision engine과 selector를 재사용해야 한다

simulator를 별도 구현으로 만들면 운영 결과와 runtime 결과가 달라진다.

권장 흐름:

1. conversation facts JSON 입력
2. phase2 decision engine 실행
3. phase3 template selector 실행
4. selection trace 반환
5. 필요 시 binder/preview까지 연결

즉 simulator는 runtime을 흉내 내는 도구가 아니라 **runtime evaluation을 호출하는 관리 도구**여야 한다.

## 6. admin UI는 편집보다 먼저 읽기/검증에 최적화한다

phase5의 우선순위:

1. 목록 보기
2. contract 보기
3. example payload 보기
4. preview 보기
5. simulator 보기
6. 나중에 편집

즉 phase5에서는 full CRUD보다 **inspection + validation + experimentation**이 더 중요하다.

즉 phase5의 편집기는 "운영 샌드박스 입력기"에 가깝고, runtime registry 자체를 인라인 편집하는 UI는 다음 단계 이후로 미루는 편이 안전하다.

---

## 권장 데이터 모델

phase5에서 추천하는 registry definition 구조는 아래와 같다.

```ts
type TemplateRegistryDefinition = {
  templateId: string;
  version: string;
  status: "active" | "draft" | "deprecated";
  rendererKey: string;
  sourcePath?: string;
  owner?: string;
  updatedAt?: string;
  title: string;
  description: string;
  inputContract: TemplateInputContract;
  selectionPolicyDoc: TemplateSelectionPolicyDoc;
  previewCases: TemplatePreviewCase[];
};
```

권장 contract 구조:

```ts
type TemplateInputContract = {
  schemaVersion: string;
  fields: Array<{
    path: string;
    type: string;
    required: boolean;
    description?: string;
    example?: unknown;
    enumValues?: string[];
  }>;
};
```

권장 selection policy 문서 구조:

```ts
type TemplateSelectionPolicyDoc = {
  intentKeys: string[];
  requiredFacts: string[];
  optionalFacts?: string[];
  disqualifiers?: string[];
  minScore?: number;
  reasonTemplate?: string;
};
```

권장 preview case 구조:

```ts
type TemplatePreviewCase = {
  id: string;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
};
```

이 구조는 phase3 runtime selector/binder와 직접 연결되지는 않지만, 운영자가 그것을 이해하는 문서 모델로 충분히 동작해야 한다.

---

## 파일별 수정 계획

## 새로 만들 파일

* `src/devops-chat/template-registry/registry-types.ts`
* `src/devops-chat/template-registry/template-registry.ts`
* `src/devops-chat/template-registry/definitions/quick-deploy-launchpad.ts`
* `src/devops-chat/template-registry/definitions/deployment-approval-inbox.ts`
* `src/devops-chat/template-registry/definitions/rollback-summary.ts`
* `src/devops-chat/template-registry/definitions/dry-run-stepper.ts`
* `src/devops-chat/template-registry/definitions/confirm-action.ts`
* `src/devops-chat/template-registry/build-contract-view-model.ts`
* `src/devops-chat/template-registry/build-template-list-view-model.ts`
* `src/devops-chat/template-registry/run-template-simulator.ts`
* `src/devops-chat/template-registry/run-template-preview.ts`
* `src/devops-console/template-admin/template-list-panel.tsx`
* `src/devops-console/template-admin/template-contract-viewer.tsx`
* `src/devops-console/template-admin/example-payload-editor.tsx`
* `src/devops-console/template-admin/template-live-preview.tsx`
* `src/devops-console/template-admin/selection-policy-viewer.tsx`
* `src/devops-console/template-admin/decision-simulator.tsx`
* `src/devops-console/template-admin/template-manager-page.tsx`

## 확장 대상 파일

* `src/devops-chat/types/templates.ts`
* `src/devops-chat/templates/template-renderer.tsx`
* `src/devops-chat/templates/validate-surface-envelope.ts`
* `src/devops-chat/server/decision/decision-engine.ts`
* `src/devops-chat/templates/template-selector.ts`
* `src/devops-console/assistant-page.tsx`
* `src/devops-console/shell/assistant-workspace.tsx`

## 역할을 재정의할 기존 파일

* [src/devops-console/assistant-page.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-console/assistant-page.tsx)
  phase5에서는 단순 chat-only page가 아니라 template manager/workbench의 entrypoint 또는 탭 host가 되어야 한다.

* [src/devops-chat/types/templates.ts](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/types/templates.ts)
  runtime payload 타입은 유지하되 contract/document metadata는 template registry 쪽으로 분리해야 한다.

* [src/devops-chat/templates/template-renderer.tsx](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/src/devops-chat/templates/template-renderer.tsx)
  preview에서도 재사용되는 공용 renderer라는 경계를 분명히 해야 한다.

---

## 상세 Todo List

## A. registry 타입 도입

* [ ] `registry-types.ts`를 추가한다.
* [ ] `TemplateRegistryDefinition` 타입을 정의한다.
* [ ] `TemplateInputContract` 타입을 정의한다.
* [ ] `TemplateSelectionPolicyDoc` 타입을 정의한다.
* [ ] `TemplatePreviewCase` 타입을 정의한다.
* [ ] runtime payload와 registry definition이 다른 타입 계층임을 코드로 분리한다.
* [ ] registry definition에 provenance 메타데이터(`sourcePath`, `owner`, `updatedAt`)를 둘지 확정한다.

## B. template registry 구현

* [ ] `template-registry.ts`를 추가한다.
* [ ] 모든 template definition을 한곳에서 export한다.
* [ ] templateId 기준 lookup API를 만든다.
* [ ] rendererKey 기준 lookup이 필요한지 검토한다.
* [ ] status/version/title/description을 모든 template에 채운다.
* [ ] registry가 phase3 runtime selector와 naming이 어긋나지 않게 맞춘다.
* [ ] runtime source-of-truth와 registry 문서 모델의 관계를 코드 주석/문서로 명시한다.

## C. template별 definition 문서화

* [ ] `quick-deploy-launchpad` definition 문서를 만든다.
* [ ] `deployment-approval-inbox` definition 문서를 만든다.
* [ ] `rollback-summary` definition 문서를 만든다.
* [ ] `dry-run-stepper` definition 문서를 만든다.
* [ ] `confirm-action` definition 문서를 만든다.
* [ ] 각 definition에 contract/selectionPolicyDoc/previewCases를 채운다.
* [ ] previewCases는 phase3 binder가 실제로 만들 수 있는 payload shape와 맞게 유지한다.
* [ ] manual 작성 필드와 runtime-derived 필드를 구분할지 결정한다.

## D. contract 문서 모델 구성

* [ ] 각 template payload 타입을 contract field 문서로 풀어내는 기준을 만든다.
* [ ] 필드 path, type, required, description, example, enumValues를 일관되게 기록한다.
* [ ] nested field 표기 규칙을 정한다.
* [ ] array/object 필드 문서화 규칙을 정한다.
* [ ] example 값이 runtime payload와 어긋나지 않도록 검증 경로를 둔다.
* [ ] contract 문서가 runtime type에서 유도된 항목인지 수동 설명 항목인지 구분할지 결정한다.

## E. contract viewer 구현

* [ ] `template-contract-viewer.tsx`를 추가한다.
* [ ] contract field 목록을 문서형 테이블로 렌더한다.
* [ ] required/type/description/example을 보기 쉽게 표시한다.
* [ ] 필드가 많아져도 읽기 가능한 density를 설계한다.
* [ ] Swagger-like 읽기 경험을 목표로 한다.

## F. template list 구현

* [ ] `template-list-panel.tsx`를 추가한다.
* [ ] templateId, title, version, status, rendererKey를 목록으로 보여준다.
* [ ] 선택된 template를 우측 detail/workbench에 연결한다.
* [ ] status badge와 last updated 정보를 둘지 검토한다.
* [ ] draft/deprecated 상태를 시각적으로 구분한다.

## G. example payload editor 구현

* [ ] `example-payload-editor.tsx`를 추가한다.
* [ ] preview case 선택과 수동 JSON 입력을 모두 지원한다.
* [ ] JSON parse error를 즉시 보여준다.
* [ ] contract validation error를 즉시 보여준다.
* [ ] 마지막 편집 payload를 template 단위로 유지할지 검토한다.

## H. live preview 구현

* [ ] `template-live-preview.tsx`를 추가한다.
* [ ] contract validation을 통과한 payload만 `TemplateRenderer`로 넘긴다.
* [ ] preview가 runtime renderer를 그대로 재사용하도록 한다.
* [ ] preview 전용 mock action handler를 둘지 결정한다.
* [ ] action 버튼이 preview에서 눌렸을 때 no-op로 둘지, 설명용 feedback만 줄지 정한다.

## I. selection policy viewer 구현

* [ ] `selection-policy-viewer.tsx`를 추가한다.
* [ ] intentKeys, requiredFacts, optionalFacts, disqualifiers, minScore를 표시한다.
* [ ] 지금은 편집보다 읽기 전용으로 시작한다.
* [ ] phase3 selector rule과 policy doc가 어긋나지 않도록 확인 경로를 둔다.

## J. decision simulator 구현

* [ ] `decision-simulator.tsx`를 추가한다.
* [ ] conversation facts JSON 입력기를 만든다.
* [ ] phase2 decision engine을 직접 호출해 `text | ask_followup | render_surface`를 확인한다.
* [ ] phase3 template selector를 직접 호출해 candidate 결과를 본다.
* [ ] final chosen template와 trace를 함께 보여준다.
* [ ] 최종 선택뿐 아니라 전체 candidate 목록과 score를 함께 보여준다.
* [ ] matched/missing/disqualified/reason/score를 표시한다.
* [ ] 필요하면 binder 실행 후 preview까지 이어지는 옵션을 추가한다.

## K. simulator 실행 경로 구현

* [ ] `run-template-simulator.ts`를 추가한다.
* [ ] 입력은 conversation facts, intentKey, workflow state 정도로 받는다.
* [ ] decision engine과 selector를 runtime과 동일 경로로 재사용한다.
* [ ] simulator용 fake conversation wrapper를 만들지 결정한다.
* [ ] 결과를 UI 친화적인 trace 모델로 변환한다.

## L. preview 실행 경로 구현

* [ ] `run-template-preview.ts`를 추가한다.
* [ ] payload JSON -> validation -> runtime renderer props 흐름을 캡슐화한다.
* [ ] preview payload가 invalid면 render 대신 error view model을 반환한다.
* [ ] preview case 선택 시 registry 정의에서 바로 payload를 읽는다.

## M. assistant page / manager page 재구성

* [ ] `template-manager-page.tsx`를 추가한다.
* [ ] list / contract / editor / preview / simulator를 한 화면 워크벤치로 배치한다.
* [ ] 기존 `assistant-page.tsx`를 template manager host로 바꿀지 별도 route 성격으로 둘지 결정한다.
* [ ] 권장안은 assistant page 내 탭 또는 mode switch로 통합하는 것이다.
* [ ] chat-only 화면과 manager workbench가 분리된 mental model을 가지게 한다.

## N. runtime과 registry 연결 확인

* [ ] phase3 binder/selector/runtime template id가 registry definition과 정확히 일치하는지 검증한다.
* [ ] definition 문서가 runtime payload와 drift하지 않도록 비교 함수를 둘지 검토한다.
* [ ] preview case payload가 runtime validator를 통과하는지 자동 체크한다.
* [ ] selection policy doc와 selector rule이 어긋나면 경고를 낼지 검토한다.
* [ ] contract/selectionPolicyDoc drift가 있으면 관리자 화면에서 어떤 수준으로 경고할지 정한다.

## O. editor/preview 상태 관리

* [ ] 선택 template, 선택 preview case, 현재 JSON 입력, validation result를 관리하는 store 또는 local state 구조를 정한다.
* [ ] template를 바꿀 때 편집 payload를 초기화할지 유지할지 정책을 정한다.
* [ ] parse error와 validation error를 구분한다.
* [ ] simulator facts 입력과 preview payload 입력을 섞지 않게 상태를 분리한다.
* [ ] 수동 편집 payload를 preview case 기준값으로 reset하는 UX를 넣을지 결정한다.

## P. validation 및 오류 표시

* [ ] contract validation error viewer를 추가한다.
* [ ] payload parse error, validation error, simulator error, runtime preview error를 구분 표시한다.
* [ ] 운영자가 어느 필드가 문제인지 바로 찾을 수 있게 field path를 보여준다.
* [ ] binding/selection mismatch가 있으면 설명 가능한 에러 메시지를 만든다.

## Q. action preview 정책

* [ ] preview surface의 action 버튼을 disabled로 둘지 검토한다.
* [ ] 또는 no-op mock handler를 붙여 클릭 설명만 보여줄지 결정한다.
* [ ] preview 환경에서 실제 domain action이 절대 실행되지 않도록 guard를 둔다.

## R. 테스트 및 검증

* [ ] registry definition shape 테스트를 추가한다.
* [ ] contract field 문서화 테스트를 추가한다.
* [ ] preview case가 validator를 통과하는지 테스트한다.
* [ ] contract viewer view model 테스트를 추가한다.
* [ ] list view model 테스트를 추가한다.
* [ ] decision simulator trace 테스트를 추가한다.
* [ ] simulator가 runtime selector/decision engine과 같은 결과를 내는지 비교 테스트를 추가한다.
* [ ] live preview가 `TemplateRenderer`를 재사용하는 경로 테스트를 추가한다.
* [ ] parse error / validation error / simulator error UI 테스트를 추가한다.
* [ ] 대표 통합 시나리오:
  * [ ] registry 목록에서 template 선택
  * [ ] contract 확인
  * [ ] example payload 선택 -> live preview 성공
  * [ ] 수동 JSON 수정 -> validation error 확인
  * [ ] facts JSON 입력 -> decision simulator 실행 -> chosen template와 trace 확인

---

## 구현 순서 제안

1. registry 타입과 definition 구조 도입
2. template별 definition 작성
3. contract/list view model 구성
4. example payload editor + validation 경로 구성
5. live preview 연결
6. decision simulator 연결
7. manager page/workbench 조립
8. runtime-registry drift 검증 추가
9. 테스트 및 통합 검증

이 순서를 권장하는 이유는, UI를 먼저 만들면 definition 모델이 계속 바뀌어서 화면이 함께 흔들리기 때문이다.  
먼저 registry/contract 모델을 고정한 뒤 workbench를 올리는 편이 안전하다.

---

## 완료 기준

이번 문서는 아래 상태가 되면 완료로 본다.

* template registry가 목록/상세/contract/preview case 단위로 관리된다
* example payload editor와 live preview가 실제 renderer를 재사용한다
* decision simulator가 runtime decision engine + selector 결과를 보여준다
* 운영자가 코드 없이도 template contract와 선택 규칙을 읽고 검증할 수 있다
* phase6에서 workspace UI 정리와 운영 도구 확장을 붙일 수 있는 관리 기반이 준비된다

---

## 다음 문서로 넘길 항목

이번 문서가 끝나면 다음 6차 기반 문서에서는 아래를 본격적으로 다뤄야 한다.

* workspace UI 정리
* 기존 bubble chat 패널과 assistant workspace 통합
* 예외 처리 / fallback / debug panel 강화
* 최근 decision trace / tool execution / facts dump viewer
* 운영용 문제 추적 UX

즉 5차 기반 문서는 "운영자가 template system을 읽고 검증하는 문서"이고, 다음 문서부터 "전체 assistant workspace를 운영 가능한 제품 UI로 정리하는 단계"로 들어간다.
