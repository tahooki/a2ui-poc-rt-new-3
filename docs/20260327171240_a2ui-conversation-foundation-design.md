# A2UI Conversation Foundation 개발 설계

## 목표

이 프로젝트는 바닥부터 새로 만드는 것이 아니라, 이미 존재하는 엔진 위에 대화 중심의 foundation을 다시 정리하고 그 위에 A2UI 렌더링, 액션 실행, 관리자용 템플릿 관리 기능을 한 층씩 올려가는 방향으로 진행한다.

기준점은 다음 세 가지다.

* `app-store.ts`
* `prompt-router.ts`
* `build-template-envelope.ts`

이 세 축을 중심으로 현재 deploy 화면에 따로 존재하는 `chat-assistant-store.ts`, `chat-assistant-panel.tsx` 계열 구현을 점진적으로 흡수한다.

중요한 방향은 하나다.

이제 assistant는 특정 페이지의 상태를 보조하는 부가 UI가 아니라,  
**일반 대화도 가능하고 필요할 때만 A2UI surface를 띄우는 conversation-first workspace**가 되어야 한다.

---

## 최종적으로 만들고 싶은 상태

assistant는 하나의 대화 인터페이스 안에서 두 가지를 모두 수행할 수 있어야 한다.

### 1. 일반 대화

예를 들어 사용자가 이전 배포 이력을 물어보면, 챗봇은 관련 조회 function을 호출해서 데이터를 가져오고, 그 결과를 텍스트로 요약해서 답한다.

이 경우에는 A2UI가 없어도 된다.

### 2. A2UI 기반 대화형 워크플로우

예를 들어 사용자가 "배포를 하고 싶어"라고 말하면, assistant는 서비스 목록을 조회하고, 어떤 서비스를 배포할지 다시 묻고, 사용자가 대상을 고르면 해당 서비스의 배포 관련 데이터를 수집한 뒤, 현재 대화가 A2UI surface로 보여줄 가치가 있는지 판단하고, 적절한 템플릿 ID를 선택하고, 그 템플릿에 맞는 payload를 구성해서, 최종적으로 React renderer가 A2UI surface를 렌더하게 만든다.

즉 대화는 항상 text로 시작할 수 있지만, 상황이 맞으면 구조화된 surface로 자연스럽게 전환될 수 있어야 한다.

---

## 전체 개발 방향

개발 순서는 다음과 같게 잡는다.

1. 대화의 기준 상태를 페이지가 아니라 conversation으로 바꾼다.
2. 대화가 tool을 실행할 수 있는 구조를 만든다.
3. 일반 텍스트 응답과 A2UI surface 응답을 동시에 표현할 수 있는 response protocol을 만든다.
4. A2UI surface 진입 조건과 템플릿 선택 기준을 정리한다.
5. 템플릿 데이터 정의와 관리자 편집 구조를 만든다.
6. 실제 액션과 연결해서 workspace처럼 동작하게 만든다.
7. 마지막에 예외 처리와 운영용 디버깅 도구를 붙인다.

중간에 LLM을 크게 똑똑하게 만드는 것보다, 먼저 구조를 안정적으로 만든 다음 LLM은 그 위에서 설명과 선택 보조를 하게 만드는 방식으로 간다.

---

# 1. Conversation Foundation 정리

## 왜 먼저 이걸 해야 하는가

지금 구조는 페이지가 먼저 있고 챗이 그 페이지를 보조하는 형태에 가깝다. 하지만 앞으로의 요구사항은 페이지와 무관하게 대화가 시작될 수 있어야 하고, 대화 중 일부만 A2UI로 전개될 수 있어야 한다.

따라서 가장 먼저 해야 할 일은 **assistant의 기준 상태를 page context에서 conversation context로 옮기는 것**이다.

## 이 단계에서 만들어야 하는 것

### Conversation State

대화 단위로 유지되는 상태가 필요하다. 이 상태는 최소한 아래 내용을 담아야 한다.

* 메시지 목록
* 현재 의도(intent)
* 현재 workflow 단계
* 수집된 엔티티(facts / slots)
* 현재 active surface
* surface가 없는 일반 대화 상태
* 사용자 선택을 기다리는 상태
* pending tool 실행 상태

예시 개념은 다음과 같다.

```ts
conversation = {
  id,
  messages,
  intent,
  workflow,
  facts,
  awaiting,
  activeSurface,
  pendingTool,
  lastDecision,
}
```

여기서 핵심은 `selectedRow` 같은 페이지 전용 상태가 아니라, `service.name`, `deploy.environment`, `deploy.targetVersion`처럼 대화 중 수집된 사실이 중심이 되어야 한다는 점이다.

### Conversation Store

현재 deploy 전용 `chat-assistant-store.ts`가 있다면, 그 역할을 점차 conversation-scoped assistant store로 재편해야 한다.

이 store는 다음 책임을 가진다.

* 메시지 추가
* 사용자 입력 turn 시작
* tool 실행 상태 반영
* A2UI surface 수신 및 갱신
* awaiting selection 상태 갱신
* workflow reset / resume

이 단계에서는 아직 A2UI를 복잡하게 만들 필요는 없다. 우선은 대화 상태를 한 곳에 모으는 것이 목적이다.

---

# 2. Tool Execution Foundation

## 왜 필요한가

이제 assistant는 단순히 프롬프트를 보내고 답변 문자열만 받는 구조로는 부족하다.

사용자가 묻는 내용에 따라 실제 데이터를 조회해야 하고, 다음 턴을 위해 필요한 옵션 목록을 가져와야 하며, A2UI 렌더링 전에 템플릿 payload의 재료가 되는 데이터를 구성해야 한다.

따라서 **tool registry / tool executor 계층**이 필요하다.

## 지원해야 하는 대표 흐름

### 일반 질의

* 사용자: 이전 배포 알려줘
* 오케스트레이터: 배포 이력 조회 tool 실행
* 응답: 텍스트 요약만 반환

### A2UI 진입 준비

* 사용자: 배포를 하고 싶어
* 오케스트레이터: 서비스 목록 조회 tool 실행
* 응답: 서비스 선택을 유도하는 메시지 반환

### A2UI 재료 수집

* 사용자: payments-api 배포하고 싶어
* 오케스트레이터: 해당 서비스 배포 관련 데이터 조회 tool 실행
* 응답: 이후 A2UI surface 생성 가능 여부 판단

## 이 단계에서 필요한 모듈

### Tool Registry

어떤 tool이 있는지 등록하는 레지스트리다. 예를 들면 아래와 같은 것들이 들어간다.

* `getPreviousDeployments`
* `getDeployableServices`
* `getServiceDeployContext`
* `startDeploy`
* `runRollbackDryRun`

### Tool Executor

레지스트리에서 선택된 tool을 실제로 실행하고 결과를 표준 형태로 반환한다.

실행 결과는 단순 raw data가 아니라, 오케스트레이터가 다음 동작을 이어갈 수 있도록 공통 포맷을 가져야 한다.

예시:

```ts
{
  ok: true,
  toolName: 'getDeployableServices',
  data: [...],
  summary: '배포 가능한 서비스 5건을 불러왔습니다.',
}
```

### Tool Result Adapter

툴 결과가 너무 제각각이면 이후 템플릿 바인딩과 요약 로직이 흔들린다. 그래서 raw tool result를 facts 중심 구조로 바꿔주는 adapter가 필요하다.

예를 들어 서비스 목록 tool은 다음처럼 conversation facts를 보강할 수 있어야 한다.

```ts
facts.deploy.availableServices = [...]
```

---

# 3. Chat Orchestrator 구축

## 이 단계의 역할

assistant의 핵심 엔진은 이제 단순 route handler가 아니라, **입력된 대화를 보고 어떤 모드로 처리할지 결정하는 orchestration layer**가 된다.

이 오케스트레이터는 최소한 다음 세 가지를 구분해야 한다.

* 일반 텍스트 답변
* 데이터 조회 기반 텍스트 답변
* A2UI surface 렌더링 흐름

## 오케스트레이터가 하는 일

1. 사용자 입력을 읽는다.
2. 현재 conversation state를 본다.
3. intent를 추정하거나 이전 intent를 이어받는다.
4. 필요한 tool이 있는지 결정한다.
5. tool을 실행한다.
6. facts를 보강한다.
7. 현재 턴이 text-only인지 render-surface인지 판단한다.
8. 필요하면 template를 선택하고 payload를 만든다.
9. 최종 응답을 text + optional surface 형태로 반환한다.

즉 이 계층이 생겨야 "그냥 대화도 되고 A2UI도 된다"가 성립한다.

## 이 단계에서 중요한 것

대화의 흐름이 turn-by-turn으로 끊기지 않아야 한다.

예를 들어,

* 사용자: 배포하고 싶어
* assistant: 어떤 서비스를 배포할까요?
* 사용자: payments-api

이 세 번째 입력은 단독으로 보면 의미가 빈약하지만, 직전 상태가 `awaiting = service-selection`이라면 충분히 해석 가능해야 한다.

따라서 오케스트레이터는 단순 자연어 해석이 아니라, **대화 메모리와 수집 상태를 이어받는 상태기계 역할**도 해야 한다.

---

# 4. Response Protocol 재설계

## 왜 바꿔야 하는가

현재 `/api/chat`이 텍스트 중심이라면, 앞으로는 하나의 응답 안에 아래 두 가지가 같이 들어갈 수 있어야 한다.

* 사용자에게 보여줄 설명 텍스트
* 선택적으로 렌더할 A2UI surface

즉 assistant response는 단순 문자열이 아니라 구조화된 메시지가 되어야 한다.

## 권장 응답 구조

```ts
{
  message: {
    role: 'assistant',
    text: 'payments-api 프로덕션 배포 준비 상태를 불러왔습니다.',
  },
  surface: {
    templateId: 'quick_deploy_launchpad',
    payload: { ... }
  },
  awaiting: null,
  decision: {
    mode: 'render_surface',
    reason: '배포 핵심 정보가 준비되어 있어 surface를 렌더합니다.'
  }
}
```

또는 text-only라면 다음처럼 갈 수 있다.

```ts
{
  message: {
    role: 'assistant',
    text: '최근 배포 3건은 모두 성공적으로 완료되었습니다.'
  },
  surface: null,
  awaiting: null,
  decision: {
    mode: 'text'
  }
}
```

## 프론트에서 필요한 처리

프론트는 이제 메시지 리스트만 렌더하면 안 된다. 다음 상태를 함께 처리해야 한다.

* text message
* active surface
* awaiting user input type
* tool loading state
* fallback / partial failure state

이 프로토콜이 정리되어야 template renderer도 안정적으로 붙는다.

---

# 5. A2UI 진입 판단 엔진

## 왜 별도 엔진이 필요한가

모든 대화가 A2UI가 되면 안 된다. 어떤 대화는 텍스트로 끝나는 것이 더 맞고, 어떤 대화는 아직 정보가 부족해서 추가 질문이 먼저여야 하며, 어떤 대화만 surface로 전환해야 한다.

그래서 **A2UI 진입 여부를 따로 판단하는 decision layer**가 필요하다.

## 판단 결과는 최소 3가지여야 한다

* `text`
* `ask_followup`
* `render_surface`

## 판단 기준 예시

### text

* 사용자가 과거 배포 내역을 물어봄
* 표면 UI보다 요약 답변이 적합함

### ask_followup

* 사용자가 배포하고 싶다고 했지만 서비스가 아직 선택되지 않음
* 필수 fact가 부족함

### render_surface

* 배포 의도가 명확함
* 서비스가 정해짐
* 배포 관련 주요 필드가 수집됨
* 구조화된 UI로 보여줄 가치가 있음

## 이 엔진이 남겨야 하는 것

운영과 디버깅을 위해 "왜 그렇게 판단했는지" 근거가 남아야 한다.

예시:

```ts
{
  mode: 'render_surface',
  score: 0.86,
  matched: ['intent=deploy.start', 'fact=service.name', 'fact=deploy.targetVersion'],
  missing: [],
  reason: '배포 launchpad 렌더에 필요한 핵심 정보가 모두 준비됨'
}
```

이 정보는 이후 관리자 화면의 decision simulator에서도 그대로 재사용할 수 있다.

---

# 6. Template Selection / Binding Foundation

## 여기서부터 A2UI-like 엔진을 재사용한다

기존의 `prompt-router.ts`와 `build-template-envelope.ts`는 버리지 않는다. 다만 입력 기준을 page selection에서 conversation facts로 바꾼다.

즉 앞으로 순서는 다음과 같아야 한다.

* prompt 입력
* 오케스트레이터 판단
* 필요한 tool 실행
* conversation facts 정리
* decision engine이 `render_surface` 결정
* template selector가 `templateId` 결정
* binding builder가 payload 구성
* renderer가 surface 렌더

## template 선택의 핵심 변화

이전에는 `selectedItem` 기반일 수 있지만, 이제는 아래 같은 대화형 facts 기반으로 골라야 한다.

* `intent.type = deploy.start`
* `service.name = payments-api`
* `deploy.environment = production`
* `deploy.targetVersion = v2.3.18-rc1`

즉 템플릿 선택은 더 이상 UI 선택 상태가 아니라, **대화 중 수집된 구조화 정보와 목적**에 의해 이루어진다.

---

# 7. A2UI Template Registry 데이터 설계

## 왜 별도 설계가 필요한가

런타임 payload 타입만으로는 부족하다. 어드민 탭에서는 다음을 관리할 수 있어야 한다.

* 템플릿 메타데이터
* 입력 데이터 구조
* 어떤 상황에서 이 템플릿을 선택하는지
* tool / facts에서 payload를 어떻게 조립하는지
* 샘플 데이터를 넣으면 어떻게 보이는지

즉 **렌더용 payload와 관리용 template definition은 분리되어야 한다.**

## 템플릿 정의에서 관리해야 하는 5가지 축

### 1. Definition

템플릿의 ID, 제목, 설명, renderer 연결, 버전, 상태

### 2. Contract

입력 payload가 어떤 구조를 가져야 하는지 정의하는 JSON schema

### 3. Selection Policy

어떤 intent / fact 조합에서 이 템플릿이 선택되는지에 대한 규칙

### 4. Binding Spec

conversation facts 또는 tool 결과를 template payload에 어떻게 매핑할지에 대한 규칙

### 5. Preview Cases

샘플 JSON을 넣었을 때 어떻게 렌더되는지 미리 볼 수 있는 예제

## 권장 개념 구조

```json
{
  "templateId": "quick_deploy_launchpad",
  "version": "1.0.0",
  "status": "active",
  "rendererKey": "quick_deploy_launchpad",
  "title": "Quick Deploy Launchpad",
  "description": "배포 시작 전 핵심 정보를 요약하는 템플릿",
  "inputSchema": {},
  "selectionPolicy": {},
  "bindings": {},
  "previewCases": []
}
```

이 설계의 핵심은 JSON으로 JSX를 저장하는 것이 아니라, **템플릿 계약과 선택 기준과 예시 데이터를 관리하는 것**이다.

---

# 8. 관리자 탭 설계

## 관리자 탭에서 해야 하는 일

운영자는 템플릿을 코드로 직접 고치지 않고, 정의된 계약과 정책을 보고 관리할 수 있어야 한다.

그래서 관리자 탭은 아래 구성이 적합하다.

## 1. Template List

* 템플릿 목록
* 버전
* 상태
* 마지막 수정 시각
* rendererKey

## 2. Contract Viewer

Swagger처럼 input schema를 보여준다.

* required
* field type
* enum
* description
* example

## 3. Example Payload Editor

JSON 입력기로 payload를 직접 넣을 수 있게 한다. 입력 즉시 schema validation을 수행한다.

## 4. Live Preview

현재 payload를 실제 renderer에 전달해서 바로 preview를 보여준다. 즉 데이터가 어떻게 보이는지 즉시 확인할 수 있어야 한다.

## 5. Selection Policy Editor

다음 요소를 편집한다.

* intent types
* required facts
* optional facts
* disqualifiers
* min confidence
* reason template

## 6. Decision Simulator

conversation facts JSON을 넣으면, 어떤 템플릿이 선택되는지와 왜 그런지 보여준다.

* eligible 여부
* score
* matched rules
* missing facts
* disqualified reason

이 시뮬레이터가 있어야 템플릿 정책을 운영자가 조정할 수 있다.

---

# 9. Assistant UI Foundation 통합

## 방향

현재 deploy 화면의 bubble chat 패널을 유지한 채로 기능만 계속 붙이면, 문서 방향과 구현이 계속 엇갈릴 가능성이 크다.

그래서 장기적으로는 deploy workflow 화면도 assistant workspace 구조로 정리하는 편이 낫다.

## 권장 workspace 구조

* context summary
* activity log
* template surface
* command composer

이렇게 되면 deploy, approval, rollback 같은 흐름이 전부 같은 foundation 위에서 움직일 수 있다.

중요한 점은 처음부터 전면 교체할 필요는 없다는 것이다. 처음에는 기존 채팅 UI 위에 response protocol과 active surface 상태를 붙이고, 이후 안정화되면 workspace 레이아웃으로 점진적으로 이동하면 된다.

---

# 10. Template Action Bridge

## 여기서 assistant가 진짜 실행형 UI가 된다

surface는 보기 좋은 카드로 끝나면 안 된다. 버튼과 액션이 실제 상태 변경을 일으켜야 한다.

예를 들어,

* deploy 시작
* dry run 시작
* rollback confirm
* request draft 생성
* request draft refresh

같은 동작이 템플릿 버튼을 통해 연결되어야 한다.

## 여기서 재사용할 것

이미 `app-store.ts`에 deploy 관련 액션이 있다면, 그 액션 자체를 모두 다시 만들 필요는 없다.

새로 필요한 것은, **assistant surface에서 그 액션에 도달하는 bridge layer**다.

즉,

* 템플릿 버튼 click
* action dispatcher 호출
* store 상태 갱신
* activity log 반영
* 필요하면 새 surface 재생성

의 흐름을 연결해야 한다.

---

# 11. LLM 역할 재정의

## LLM이 맡아야 할 것

구조를 결정하는 엔진 자체를 LLM에게 맡기면 흔들린다. 따라서 LLM은 foundation 위에서 보조 역할을 하도록 둔다.

LLM이 맡는 역할은 다음이 적합하다.

* 현재 상황을 자연어로 설명
* 왜 이 템플릿이 떴는지 요약
* 어떤 액션이 적절한지 근거 제공
* follow-up question 문구 생성
* tool 결과 요약

## LLM이 맡지 않아야 할 것

* templateId 최종 결정
* 필수 payload 구조 생성 규칙의 단독 책임
* 액션 가능 여부의 최종 판정

즉 구조는 로컬 엔진이 잡고, LLM은 그 구조를 사용자에게 친절하게 풀어주는 역할로 두는 것이 맞다.

---

# 12. 안정화와 운영 도구

## 마지막에 반드시 필요한 것

이 구조는 분기와 상태가 많기 때문에, 예외 처리와 검증 포인트가 없으면 금방 불안정해진다.

## 반드시 확인해야 하는 시나리오

* 일반 질의가 A2UI 없이 정상 답변되는가
* 서비스 목록 질문 후 다음 턴에서 선택이 이어지는가
* 필수 fact가 부족하면 follow-up으로 안정적으로 내려가는가
* template action 이후 테이블/디테일/로그 상태가 같이 갱신되는가
* streaming 실패 시 text fallback이 가능한가
* surface payload 생성 실패 시 현재 대화가 깨지지 않는가

## 운영용으로 있으면 좋은 것

* 최근 decision trace 보기
* 최근 tool execution log 보기
* 현재 conversation facts dump 보기
* template selection simulator
* payload validation error viewer

이런 도구가 있어야 운영 단계에서 문제를 추적할 수 있다.

---

## 권장 구현 순서

### 1차 기반

* conversation store 도입
* response protocol 정리
* text-only + tool-based answer 흐름 구축

### 2차 기반

* chat orchestrator 구축
* awaiting selection / slot memory 도입
* A2UI decision engine 도입

### 3차 기반

* template selector를 conversation facts 기반으로 변경
* binding builder 확장
* active surface 렌더 연결

### 4차 기반

* template action bridge 연결
* deploy/rollback/approval 액션 연동
* activity log 반영

### 5차 기반

* 관리자용 template registry 도입
* contract / preview / decision simulator 구축

### 6차 기반

* workspace UI 정리
* 예외 처리 및 운영 로그 강화

---

## 요약

이 프로젝트의 foundation은 페이지 컨텍스트 확장이 아니라, **conversation-first assistant foundation**으로 재정렬하는 데 있다.

여기서 핵심은 다음 다섯 가지다.

* 대화 상태를 단일한 conversation store로 모은다.
* tool 실행과 facts 수집이 가능한 오케스트레이터를 만든다.
* text와 A2UI surface를 함께 다룰 수 있는 response protocol을 만든다.
* 템플릿 선택과 payload 조립을 conversation facts 기반으로 바꾼다.
* 관리자 탭에서 template definition, selection policy, preview를 운영 가능하게 만든다.

이 순서대로 쌓으면, 지금 있는 엔진을 버리지 않고도 일반 챗과 A2UI workflow가 공존하는 구조로 자연스럽게 확장할 수 있다.
