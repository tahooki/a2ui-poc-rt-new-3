# A2UI Platform Planning

## 1. 문서 목적

이 문서는 현재 논의 중인 A2UI 플랫폼의 큰 방향을 정리한 기획 초안이다.
이번 범위는 구현이 아니라 구조와 역할 정의에 집중한다.

핵심 목표는 다음과 같다.

- 챗봇 프론트에서 재사용 가능한 UI 템플릿 시스템을 만든다.
- 템플릿에 들어갈 데이터를 어드민에서 설계하고 관리할 수 있게 만든다.
- 기존 agent/workflow에 A2UI 기능을 쉽게 끼워 넣을 수 있는 agent용 라이브러리를 제공한다.
- 복잡한 로직을 각 agent에 흩뿌리지 않고, MCP 기반 toolkit과 공통 contract로 표준화한다.

---

## 2. 전체 제품 구성

A2UI 플랫폼은 크게 3가지 제품으로 본다.

### 2.1 A2UI Chatbot UI Library

챗봇 프론트에서 A2UI를 실제로 그리는 UI 라이브러리다.

- 개발자는 제공된 컴포넌트 프리미티브를 조합해서 `a2ui template`를 만든다.
- 프론트는 기본적으로 `templateId + payload`를 받아 렌더링한다.
- 여기서는 API 호출, 권한 체크, LLM 판단 같은 데이터 생성 로직을 최대한 모른 채 렌더링에 집중한다.
- 템플릿은 재사용 가능한 UI surface 단위로 관리한다.

예시:

- Approval Queue
- Confirm Action
- Deploy Launchpad
- Rollback Summary

### 2.2 A2UI Admin + MCP Server

템플릿과 데이터 공급 방식을 설계하고 운영하는 관리 제품이다.

- 어떤 템플릿이 존재하는지 관리한다.
- 각 템플릿이 어떤 입력 데이터를 필요로 하는지 관리한다.
- 데이터를 어떤 방식으로 만들지 설계한다.
- API 호출 기반인지, LLM 생성 기반인지, 둘을 조합한 하이브리드인지 설정할 수 있어야 한다.
- 권한 체크, 데이터 변환, 후처리 등도 이 레이어에서 정의한다.
- 최종 결과를 MCP 서버를 통해 외부 agent나 workflow가 호출할 수 있게 노출한다.

다만 실제 설계에서는 이 영역을 하나의 덩어리로 구현하지 않는 것이 좋다.

- `Admin`은 Control Plane이다.
- `MCP Runtime`은 Execution Plane이다.

둘은 사용자 관점에서는 하나의 제품군처럼 보일 수 있지만, 실제 책임과 보안 요구사항은 분리하는 편이 안전하다.

#### A2UI Admin의 역할

- 템플릿 등록/수정
- contract 관리
- resolver/tool 설계
- binding recipe 설계
- publish 승인 플로우
- 시뮬레이션과 미리보기

#### A2UI MCP Runtime의 역할

- published된 템플릿/recipe만 실행
- 실제 API/LLM/auth/transform resolver 수행
- 실행 시점 권한 체크
- audit/tracing/logging
- rate limit, timeout, retry, fallback 적용

즉, Admin은 설계와 승인에 집중하고, Runtime은 검증된 정의만 안전하게 실행하는 구조가 권장된다.

### 2.3 A2UI Agent Library

기존 agent에 A2UI 기능을 쉽게 붙이기 위한 SDK 성격의 라이브러리다.

- MCP 호출 wrapper를 제공한다.
- 하지만 단순 wrapper에 그치지 않고, agent가 바로 쓰기 좋은 orchestration 기능을 제공해야 한다.
- 기존 LangChain, LangGraph, custom workflow 등에 step처럼 끼워 넣을 수 있어야 한다.
- 텍스트 응답만 하던 agent가 필요할 때는 A2UI surface를 띄우고, UI 액션을 다시 workflow로 이어받을 수 있게 한다.

### 2.4 운영 레이어 관점

제품 관점에서는 3가지 축으로 볼 수 있지만, 실제 아키텍처를 설명할 때는 아래 레이어로 보는 편이 더 명확하다.

- `Presentation Plane`: a2ui chatbot UI library
- `Control Plane`: admin
- `Execution Plane`: MCP server + resolver runtime
- `Integration Plane`: agent library
- `Contract Plane`: template contract + resolver contract + binding recipe + execution context

이렇게 보면 관리와 실행이 분리되고, 각 레이어의 실패 범위와 보안 책임도 더 분명해진다.

---

## 3. 제품 외에 반드시 필요한 공통 기반

위 3개 제품과 별도로, 실제로는 공통 contract layer가 플랫폼의 핵심이 된다.

이 레이어가 없으면 프론트 템플릿, 어드민 설계, agent runtime이 서로 다른 규칙으로 움직여 쉽게 깨진다.

필수 공통 개념은 다음과 같다.

### 3.1 Template Contract

템플릿이 어떤 입력 값을 받아야 렌더링 가능한지 정의한다.

예시 필드:

- `templateId`
- `version`
- `rendererId`
- `inputSchema`
- `uiActions`

### 3.2 Resolver Contract

데이터를 만드는 모든 도구의 입력과 출력을 통일된 형식으로 정의한다.

중요한 원칙은 구현 방식이 아니라 인터페이스를 맞추는 것이다.

- API 호출도 resolver
- LLM 호출도 resolver
- 권한 체크도 resolver
- transform도 resolver

모든 resolver는 최소한 아래 정보를 가져야 한다.

- `resolverId`
- `type`
- `inputSchema`
- `outputSchema`
- `executionPolicy`

### 3.3 Binding Recipe

어떤 resolver 결과를 템플릿의 어떤 필드에 연결할지 정의한다.

예시:

- `header.title <- getProjectInfo.name`
- `summary <- llm_summarize(api_result)`
- `canEdit <- auth_check.allowed`

### 3.4 Execution Context

런타임 실행 시 필요한 공통 문맥이다.

예시:

- user
- org
- role
- conversationId
- sessionId
- selectedEntity
- environment
- model configuration

---

## 4. 핵심 설계 원칙

### 4.1 UI와 데이터 생성 로직은 분리한다

템플릿은 렌더링 구조에 집중한다.
데이터를 가져오는 방식은 admin에서 정의하고 runtime에서 실행한다.

### 4.2 API와 LLM을 같은 레벨의 도구로 본다

관리 포인트를 단순하게 만들기 위해 다음을 모두 같은 resolver 체계로 다룬다.

- API fetch
- DB query
- LLM generation
- Auth check
- Transform
- Post-process

### 4.3 Agent 통합은 저수준 MCP 함수 나열이 아니라 상위 orchestration이어야 한다

기존 agent 입장에서 `listTemplates()`, `getTemplateContract()`, `checkAccess()`, `resolveTemplateData()`를 매번 직접 호출하게 만들면 통합 비용이 커진다.

실제 public integration은 다음처럼 한 단계 높은 함수여야 한다.

- `maybeRenderA2UI(context)`
- `handleA2UIAction(event, context)`

내부적으로는 여러 MCP 함수를 순차 호출하더라도, 외부에서는 step 하나처럼 끼워 넣을 수 있어야 한다.

### 4.4 저장 시 검증 + 실행 시 검증을 둘 다 건다

템플릿과 데이터 구조가 어긋나는 문제를 막으려면 제약이 강해야 한다.

- admin 저장 시 스키마 호환성 검증
- runtime 실행 시 payload 검증
- LLM 결과도 반드시 schema validation 통과 후 사용

### 4.5 실패해도 기존 agent를 깨지 않게 설계한다

A2UI는 agent를 강화하는 기능이지, agent 전체를 의존성 지옥으로 만들면 안 된다.

- 템플릿 선택 실패 시 text fallback
- resolver 실패 시 graceful degrade
- 권한 부족 시 적절한 대체 응답

---

## 5. Admin에서 관리하는 Tool/Resolver 개념

Admin은 단순 템플릿 카탈로그가 아니라, 템플릿에 데이터를 공급하는 resolver 설계 도구여야 한다.

### 5.1 Resolver 유형

최소한 아래 유형을 생각할 수 있다.

- `api`
- `llm`
- `hybrid`
- `transform`
- `auth`

### 5.2 Resolver 예시

#### API Resolver

- 내부 API 호출
- 외부 SaaS API 호출
- 파라미터 매핑
- 응답 필드 추출

#### LLM Resolver

- 입력 데이터를 기반으로 설명 문구 생성
- 추천 사유 생성
- 요약문 생성
- 다만 UI 전체를 생성하게 하기보다 제한된 필드만 생성하게 하는 것이 안전하다

#### Auth Resolver

- 이 템플릿을 현재 유저가 볼 수 있는지 체크
- 특정 액션 버튼을 노출할 수 있는지 체크
- 필드별 마스킹 여부 결정

#### Transform Resolver

- 여러 데이터 소스 병합
- 필드 정규화
- enum 변환
- 템플릿 전용 payload shape로 변환

### 5.3 Admin에서 설계 가능한 것

- 템플릿이 필요로 하는 입력 정의
- resolver chain
- 조건부 실행 규칙
- 권한 정책
- LLM 사용 여부
- 어떤 필드는 API 우선, 어떤 필드는 LLM 우선인지
- 템플릿 액션 정의

### 5.4 Resolver 거버넌스

resolver를 자유롭게 만들 수 있게 두면 플랫폼 전체에서 가장 위험한 부분이 된다.
특히 API 호출, 권한 체크, LLM 판단을 어드민에서 조합할 수 있게 하는 순간, 사실상 내부 시스템에 접근 가능한 실행 규칙을 설계하는 셈이기 때문이다.

그래서 admin에는 단순 CRUD보다 더 강한 운영 제약이 필요하다.

#### 누가 만들 수 있는가

- resolver 생성 가능 역할
- resolver 수정 가능 역할
- publish 승인 가능 역할
- 운영 중지/비활성화 가능 역할

#### 어디까지 호출할 수 있는가

- 허용된 API domain allowlist
- 허용된 credential scope
- 허용된 model/provider
- 허용된 network/resource capability

#### 어떻게 배포되는가

- draft 상태에서 설계
- preview/simulation 수행
- approval 후 publish
- runtime은 published 버전만 사용

#### 무엇이 기록되어야 하는가

- 누가 resolver를 만들었는지
- 누가 publish했는지
- 언제 어떤 버전이 실행되었는지
- 어떤 input/output이 오갔는지
- 실패와 fallback이 왜 발생했는지

즉, resolver는 단순 설정값이 아니라 운영 가능한 실행 단위로 봐야 한다.

---

## 6. 템플릿과 데이터 매칭 방식

여기서 가장 중요한 제약은 "템플릿이 요구하는 구조"와 "admin/runtime이 만드는 구조"를 반드시 맞추는 것이다.

이 문제를 느슨하게 두면 결국 프론트와 백엔드가 서로 다른 계약으로 움직이게 된다.

### 6.1 권장 방식

플랫폼의 표준 스키마 원본은 `JSON Schema`를 사용한다.

이유:

- MCP와 잘 맞는다
- Node와 Python 양쪽에서 다루기 쉽다
- 프론트 타입 생성에도 활용 가능하다
- admin 저장 검증에 적합하다

### 6.2 각 레이어에서의 사용 방식

- Frontend: `zod` 또는 generated TypeScript types
- Node agent: typed interface 또는 schema validator
- Python agent: `Pydantic` 등으로 대응
- Admin: schema compatibility check 실행

### 6.3 검증 포인트

#### 저장 시

- 템플릿 필수 필드가 resolver chain으로 모두 채워지는지
- resolver output이 template input에 타입상 매핑 가능한지
- nullable, optional, enum 제약이 맞는지

#### 실행 시

- 각 resolver output validation
- binding 후 intermediate payload validation
- 최종 template payload validation

---

## 6.4 보안과 운영 제약

현재 구조에서 실제로 가장 민감한 부분은 "타입이 맞으면 실행 가능하다"는 오해가 생기지 않도록 하는 것이다.
schema validation은 매우 중요하지만, 그것만으로는 안전하지 않다.

### 6.4.1 Tenant Isolation

- 서로 다른 org/project/tenant의 데이터가 섞이지 않아야 한다
- execution context에 tenant boundary가 명시적으로 포함되어야 한다
- resolver는 tenant 범위를 벗어나는 조회를 기본적으로 금지해야 한다

### 6.4.2 Permission Scope

- 템플릿 접근 권한과 데이터 접근 권한은 분리해서 볼 수 있다
- 어떤 유저는 템플릿은 볼 수 있어도 특정 필드는 볼 수 없을 수 있다
- action 버튼 노출 여부와 실제 action 실행 가능 여부를 둘 다 검증해야 한다

### 6.4.3 Secret Handling

- API key, token, connection secret는 admin 화면에 평문으로 노출되면 안 된다
- resolver는 secret reference만 갖고 실제 secret은 runtime의 secure store에서 주입받는 구조가 좋다
- 로그와 에러 메시지에도 secret이 남지 않도록 해야 한다

### 6.4.4 Prompt Injection / LLM Safety

- LLM resolver는 외부 입력을 그대로 system-level instruction으로 승격시키면 안 된다
- API/문서/사용자 입력을 넣을 때 prompt boundary를 분명히 해야 한다
- 가능한 경우 structured output과 schema validation을 강제한다
- UI 전체 구조는 LLM이 만들지 않고, 제한된 필드만 생성하게 하는 것이 안전하다

### 6.4.5 PII / Sensitive Data Handling

- payload에 사용자 개인정보나 민감한 운영 정보가 포함될 수 있는지 정의해야 한다
- 필요 시 field-level masking, redaction, omission 규칙이 있어야 한다
- LLM으로 넘길 수 있는 데이터 범위를 별도로 제한해야 한다

### 6.4.6 Action Replay / Idempotency

- 승인, 배포, 삭제 같은 액션은 replay 방지가 필요하다
- action event에는 request id, nonce, expiry, actor context 같은 정보가 포함되는 것이 좋다
- 실행 side effect가 있는 action은 idempotency key 전략을 가져야 한다

### 6.4.7 Audit / Observability

- 어떤 template/version이 선택되었는지
- 어떤 resolver chain이 실행되었는지
- 어떤 fallback이 발생했는지
- 어떤 action이 누구에 의해 수행되었는지

이 정보가 남아야 장애 분석과 보안 사고 대응이 가능하다

---

## 7. Agent Library는 어떻게 작동해야 하는가

기존 agent 입장에서는 A2UI가 "여러 개의 MCP 함수를 직접 조립하는 기능"처럼 보이면 안 된다.
그보다는 "이번 턴을 A2UI로 보여줄지 판단하고 필요하면 surface를 만들어주는 한 개의 capability"처럼 보여야 한다.

### 7.1 Agent가 기대하는 사용감

기존 workflow:

`intent 판단 -> tool 실행 -> 응답 생성`

A2UI가 붙은 workflow:

`intent 판단 -> tool 실행 -> a2ui step 실행 -> 응답 생성`

즉 개발자는 기존 흐름에 A2UI step 하나를 끼워 넣는 느낌으로 써야 한다.

### 7.2 내부 동작

Agent library 내부에서는 다음이 순차적으로 실행될 수 있다.

1. 지금 턴이 A2UI 대상인지 판단
2. 템플릿 후보 탐색
3. 적절한 템플릿 선택
4. 접근 권한 체크
5. resolver chain 실행
6. payload 검증
7. 최종 surface envelope 생성

하지만 이 순서는 외부 개발자에게 노출되는 주 API가 아니라 내부 orchestration이어야 한다.

### 7.3 Public API 방향

저수준 API는 존재할 수 있다.

- `listTemplates()`
- `getTemplateContract()`
- `checkAccess()`
- `resolveTemplateData()`

하지만 실제 agent 통합의 중심 API는 고수준이어야 한다.

- `maybeRenderA2UI(context)`
- `handleA2UIAction(event, context)`
- `renderOrFallback(context)`

### 7.4 꼭 포함되면 좋은 기능

- template recommendation
- schema validation
- action routing
- retry
- caching
- tracing
- permission precheck
- text fallback
- workflow step helper
- framework adapter

---

## 8. 대표 런타임 시퀀스

### 8.1 최초 렌더링 시퀀스

1. 유저가 agent에게 요청한다.
2. agent는 기존 workflow를 수행한다.
3. workflow 중간 또는 응답 직전에 `maybeRenderA2UI(context)`를 호출한다.
4. agent library는 내부적으로 템플릿 탐색, 접근 체크, resolver 실행, 검증을 수행한다.
5. 성공하면 `templateId + payload + actions` 형태의 surface를 반환한다.
6. 프론트 A2UI library가 이를 받아 렌더링한다.
7. 실패하면 기존 text response로 fallback한다.

### 8.2 UI 액션 시퀀스

1. 유저가 A2UI surface에서 버튼 클릭, 선택 변경, submit 등을 수행한다.
2. 프론트는 action event를 agent 또는 runtime으로 전달한다.
3. agent library는 `handleA2UIAction(event, context)`를 통해 이를 해석한다.
4. 필요하면 MCP server의 resolver/action 경로를 호출한다.
5. 결과에 따라 다음 템플릿을 다시 렌더링하거나 텍스트 응답을 보낸다.

---

## 9. 권장 역할 분리

### 9.1 A2UI Chatbot UI Library의 책임

- 템플릿 렌더링
- UI 프리미티브 제공
- surface action event emit
- 렌더링 상태 관리

### 9.2 A2UI Admin의 책임

- 템플릿 메타데이터 관리
- resolver/tool 관리
- binding recipe 관리
- contract 검증
- draft/preview/publish 흐름 관리
- 시뮬레이션과 미리보기

### 9.3 A2UI MCP Runtime의 책임

- published 정의만 실행
- resolver runtime 제공
- 실행 시점 permission/tenant 검증
- secret 주입
- audit/tracing/logging
- rate limit, timeout, retry, fallback

### 9.4 A2UI Agent Library의 책임

- MCP client
- agent 친화적 orchestration
- A2UI 삽입 여부 판단 보조
- text fallback
- UI action bridge
- framework integration helper

### 9.5 각 레이어가 책임지지 말아야 할 것

- 프론트 라이브러리가 데이터 수집 로직을 직접 알면 안 된다
- agent가 템플릿 내부 필드 구조를 매번 직접 조립하면 안 된다
- admin이 프론트 렌더링 구현 세부사항까지 소유하면 안 된다

---

## 10. 현재 방향에서 가장 먼저 고정해야 할 것

초기 기획 단계에서 먼저 결정해야 하는 핵심 항목은 다음과 같다.

### 10.1 템플릿 ID 체계

- 템플릿을 식별하는 고유 ID 규칙
- 버전 전략
- deprecated 처리 정책

### 10.2 Template Input Contract

- 템플릿이 요구하는 payload shape
- 필수 필드와 optional 필드
- action schema

### 10.3 Resolver 표준 인터페이스

- resolver type
- input/output schema
- error handling 방식
- timeout/retry 정책

### 10.4 Binding Recipe 형식

- source-to-target mapping 방식
- 조건부 필드 주입 규칙
- 변환 함수 허용 범위

### 10.5 Agent Integration Shape

- 어떤 시점에 A2UI step을 실행할지
- 실패 시 fallback 정책
- UI action event의 재진입 방식

### 10.6 Runtime Governance

- draft/published/deprecated 상태 모델
- resolver publish 승인 절차
- secret 주입 방식
- tenant/permission boundary
- audit log 보존 정책

---

## 11. 한 문장 요약

이 플랫폼은 다음처럼 정리할 수 있다.

- `a2ui ui library`는 화면을 그린다.
- `a2ui admin + mcp server`는 템플릿과 데이터 조립 방식을 관리한다.
- `a2ui agent library`는 기존 agent/workflow에 A2UI를 한 step처럼 쉽게 끼워 넣게 해준다.
- 이 모든 것을 안정적으로 연결하는 핵심은 `template contract + resolver contract + binding recipe`다.

---

## 12. 다음 문서로 이어질 주제

이 문서를 바탕으로 후속 문서에서 구체화할 수 있는 항목은 다음과 같다.

- A2UI Template Contract 초안
- Resolver/Tool 스펙 초안
- MCP toolkit API 초안
- Agent library API 초안
- Admin IA와 화면 설계
- 대표 user flow와 sequence diagram
