# JSON 기반 DevOps Chat Template POC 통합 UX/UI 설계 문서

## 문서 목적

이 문서는 [20260324_json-devops-a2ui-poc-spec.md](/Users/tahooki/Documents/git/a2ui-poc-rt-new-3/docs/20260324_json-devops-a2ui-poc-spec.md)를 기반으로, 실제 구현자가 바로 참고할 수 있는 프론트엔드 중심 설계 문서다.

이번 버전의 핵심 방향은 기존 작업을 과장된 비교형 데모로 만드는 것이 아니라, `실제 DevOps admin처럼 보이는 메인 화면` 위에 `우측 AI assistant overlay/drawer`가 붙는 구조로 재정의하는 것이다.

사용자가 받아야 하는 인상은 아래와 같다.

`실제 운영 어드민처럼 보이는 화면이다.`

`이 화면에서 하던 배포/승인/롤백 작업을 AI assistant가 문맥 기반으로 더 짧고 명확하게 풀어준다.`

이 문서는 아래 4개 관점을 하나의 통합 문서로 정리한다.

1. UX Design Document
2. Visual Design Guide
3. UI Design Principles
4. Frontend Design Spec

---

# 1. UX Design Document

## 1.1 제품 경험 목표

이 POC의 UX 목표는 `기존 어드민을 대체하는 새 제품`을 보여주는 것이 아니라, `기존 admin workflow 위에 AI assistant가 자연스럽게 결합되는 운영 경험`을 보여주는 것이다.

핵심 목표:

- 메인 화면은 실제 B2B DevOps admin처럼 보여야 한다.
- 배포, 승인, 롤백은 각각 익숙한 운영 페이지 구조를 가져야 한다.
- AI assistant는 별도 메인 캔버스가 아니라 우측 drawer/overlay로 동작해야 한다.
- 복잡함은 UI 연출이 아니라 실제 업무 행동 구조에서 자연스럽게 드러나야 한다.
- assistant가 메신저 앱처럼 보이지 않고 admin assistant처럼 보여야 한다.

## 1.2 공통 사용자 시나리오

대상 사용자:

- DevOps 엔지니어
- 운영 승인자
- 장애 대응 담당자
- POC를 보는 제품/기술 의사결정자

공통 기대 행동:

- 메인 admin 화면에서 현재 상태를 파악한다.
- 리스트/테이블/상세 패널에서 특정 대상 작업을 선택한다.
- 우측 AI assistant를 열어 현재 문맥 기반으로 작업 초안을 받는다.
- assistant 안의 템플릿 카드에서 최종 확인 후 실행한다.
- 실행 결과가 다시 메인 admin 상태에 반영된다.

## 1.3 공통 정보 구조

모든 페이지는 아래 구조를 공유한다.

1. 글로벌 헤더
2. 페이지 헤더
3. reset 안내
4. 상단 summary bar
5. 필터 및 page action bar
6. 메인 admin content
7. 우측 AI assistant drawer

이때 메인 admin content는 페이지별로 다르지만 기본 패턴은 유지한다.

- 리스트 또는 테이블
- 선택 항목 상세 영역
- 상태 배지
- 검색/필터/범위 전환
- primary page action

## 1.4 글로벌 레이아웃

### 헤더

좌측:

- `DevOps Admin`
- 환경 또는 조직 라벨

우측:

- 탭 네비게이션
  - `배포`
  - `승인`
  - `롤백`
- 보조 액션
  - `AI Assistant`

### 페이지 헤더

포함 요소:

- 페이지 제목
- 한 줄 설명
- 현재 범위 표시
- 마지막 갱신 시각 또는 seed 기준 안내

예시:

- 제목: `Deployments`
- 설명: `서비스별 배포 요청, 진행 상태, 최근 이력을 관리합니다.`

### Reset 안내

권장 카피:

`이 데모 상태는 새로고침하면 seed 기준 초기 상태로 돌아갑니다.`

reset 안내는 배너형보다 `admin notice strip` 형태가 적절하다.

## 1.5 AI Assistant Drawer UX

assistant는 메인 화면을 대체하지 않는다. 사용자가 보고 있던 admin context를 유지한 상태에서 우측에서 열린다.

### 구조

1. drawer header
2. current context summary
3. suggested intents
4. conversation log
5. template card region
6. composer

### drawer header

포함 요소:

- 제목: `AI Deployment Assistant`
- 현재 페이지 라벨
- 닫기 버튼

### current context summary

현재 페이지와 선택 상태를 compact하게 보여준다.

예시:

- `Page: Deployments`
- `Service: payments-api`
- `Environment: production`
- `Selected item: deploy-req-103`

### suggested intents

메신저형 quick reply가 아니라 admin action chip처럼 보여야 한다.

예시:

- `배포 초안 생성`
- `승인 대기 요약`
- `안전한 롤백 버전 찾기`

### conversation log

원칙:

- 길게 누적하지 않는다.
- 질문-응답형 잡담을 피한다.
- 최근 2~4개의 작업 메시지만 유지한다.
- 카드가 렌더되면 카드가 주인공이고 대화 로그는 보조다.

### composer

메신저 입력창보다 admin command bar에 가깝게 설계한다.

placeholder 예시:

- `예: 현재 선택한 서비스의 운영 배포 초안을 만들어줘`

## 1.6 페이지별 UX 구조

## 1.6.1 `/deploy`

### 페이지 목적

서비스별 배포 요청 생성과 상태 확인을 담당하는 운영 admin 페이지다.

### 메인 화면 구조

상단 summary bar:

- `오늘 배포 예정`
- `진행 중 배포`
- `실패 배포`
- `승인 대기`

필터/action bar:

- Environment select
- Service search
- Status filter
- Strategy filter
- `새 배포` 버튼

메인 영역:

- 좌측 또는 메인: deployment table
- 우측: selected deployment detail panel

### deployment table 컬럼

- Service
- Environment
- Target Version
- Strategy
- Requested By
- Status
- Updated At

### detail panel 섹션

- 기본 정보
- 최근 성공 배포
- artifact 정보
- rollout 설정
- health check 정보
- activity log

### drawer에서 해야 하는 일

- 현재 선택한 서비스/환경 기준 배포 초안 생성
- 최근 성공 버전 또는 추천 버전 제안
- `quick_deploy_launchpad` 카드 렌더
- 배포 실행 후 상태 반영

### 추천 카피

- `현재 선택된 서비스 기준으로 배포 초안을 준비했습니다.`
- `최근 검증 이력을 기준으로 v2.3.18을 추천합니다.`
- `실행 전 확인이 필요한 핵심 항목만 남겼습니다.`

## 1.6.2 `/approve`

### 페이지 목적

운영 배포 승인 요청을 검토하고 승인/보류를 처리하는 admin 페이지다.

### 메인 화면 구조

상단 summary bar:

- `승인 대기`
- `오늘 승인 완료`
- `고위험 요청`
- `보류 건수`

필터/action bar:

- Environment filter
- Risk filter
- Team filter
- Status filter
- 검색

메인 영역:

- approval request table
- request detail panel

### approval table 컬럼

- Request ID
- Service
- Environment
- Requested By
- Risk
- Verification
- Status
- Requested At

### detail panel 섹션

- 요청 개요
- 변경 요약
- 영향 범위
- 검증 체크
- 롤백 가능 여부
- 관련 메모

### drawer에서 해야 하는 일

- 선택된 승인 요청 요약
- 핵심 리스크만 압축 정리
- `deployment_approval_inbox` 카드 렌더
- 승인 또는 보류 실행

### 추천 카피

- `승인 판단에 필요한 핵심 정보만 정리했습니다.`
- `DB 스키마 변경은 포함되지 않았습니다.`
- `이 요청은 즉시 롤백 가능한 배포입니다.`

## 1.6.3 `/rollback`

### 페이지 목적

문제 배포를 탐지하고 가장 안전한 복귀 버전을 기준으로 롤백을 준비/실행하는 admin 페이지다.

### 메인 화면 구조

상단 summary bar:

- `오픈 인시던트`
- `롤백 후보`
- `최근 실패 배포`
- `복구 완료`

필터/action bar:

- Service search
- Severity filter
- Environment filter
- Incident status filter
- `Rollback 준비` 버튼

메인 영역:

- incident / deployment history table
- rollback analysis detail panel

### rollback table 컬럼

- Service
- Incident
- Current Version
- Last Stable Version
- Severity
- Status
- Updated At

### detail panel 섹션

- 장애 요약
- 최근 배포 이력
- 후보 복귀 버전
- 영향 서비스
- operator note

### drawer에서 해야 하는 일

- 선택된 장애 문맥 기준 복귀 버전 제안
- `rollback_summary` 카드 렌더
- `dry_run_stepper` 후속 렌더
- `confirm_action` 카드 렌더
- 롤백 실행 상태 반영

### 추천 카피

- `최근 장애 이전의 마지막 안정 버전을 기준으로 롤백을 준비했습니다.`
- `영향 범위 점검을 먼저 수행한 뒤 확정할 수 있습니다.`
- `최종 롤백 전 확인이 필요한 항목만 남겼습니다.`

## 1.7 템플릿 카드 UX 정의

### `quick_deploy_launchpad`

역할:

- 현재 서비스와 환경 문맥을 기반으로 배포 실행 전 확인 화면 제공

필수 정보:

- 서비스명
- 대상 환경
- 추천 버전
- 전략
- 영향도
- 사전 확인 항목
- primary action

상태:

- `ready`
- `deploying`
- `done`

### `deployment_approval_inbox`

역할:

- 승인자가 긴 상세 화면을 다시 읽지 않고 최종 판단할 수 있게 핵심만 압축

필수 정보:

- 요청명
- 서비스 / 환경
- 리스크
- 영향 범위
- 검증 상태
- 롤백 가능 여부
- 승인/보류 액션

상태:

- `pending`
- `approved`
- `hold`

### `rollback_summary`

역할:

- 문제 배포와 추천 복귀 버전을 명확히 요약

필수 정보:

- 현재 문제 버전
- 추천 복귀 버전
- 근거
- 예상 영향
- next action

상태:

- `identified`
- `dry_run_ready`

### `dry_run_stepper`

역할:

- 롤백 전 검증 절차를 명확한 단계형으로 제공

상태:

- `not_started`
- `running`
- `completed`

### `confirm_action`

역할:

- 위험 액션의 최종 인간 확인

필수 정보:

- 작업 요약
- 대상 서비스
- 대상 환경
- 버전
- 영향 경고
- 체크 확인
- 최종 CTA

---

# 2. Visual Design Guide

## 2.1 전체 톤

시각 톤은 `enterprise DevOps admin`을 기준으로 한다.

지향점:

- 단정함
- 밀도 있는 정보 구조
- 높은 가독성
- 보수적인 신뢰감
- 과장되지 않은 상태 표현

지양점:

- consumer SaaS 스타일
- 과도한 gradient
- 과한 rounded card
- 대형 일러스트
- 메시지 앱 같은 말풍선 중심 UI

## 2.2 컬러 시스템

권장 팔레트:

- page background: `#0F1722`
- surface base: `#16202D`
- surface raised: `#1B2736`
- surface drawer: `#111A26`
- border subtle: `#253244`
- border strong: `#32465E`
- text primary: `#E8EEF7`
- text secondary: `#A7B4C5`
- text muted: `#7D8B9F`
- blue action: `#4C8DFF`
- green success: `#34C38F`
- amber warning: `#F0B35A`
- red danger: `#E46A6A`

컬러 사용 규칙:

- 큰 배경은 항상 저채도 dark neutral 기반
- 강조색은 상태 또는 primary action에만 제한적으로 사용
- 표 전체에 강한 색 면을 깔지 않는다
- status는 text + badge + icon 조합으로 표현하고, 배경색만으로 구분하지 않는다

## 2.3 타이포그래피

권장 서체:

- UI text: `Inter`, `Pretendard`, `system-ui`
- mono data: `JetBrains Mono`, `IBM Plex Mono`

타입 스케일:

- page title: 24px / 700
- section title: 18px / 600
- panel title: 14px / 600
- body: 13px / 400
- table text: 12px / 400
- label/caption: 11px / 500

타이포 원칙:

- B2B admin에서는 과도한 크기 차이를 쓰지 않는다
- 화면 대부분은 12px~14px 사이에서 안정적으로 운영
- 숫자, 버전, 상태코드, request id는 mono 사용 가능

## 2.4 Spacing

기본 spacing scale:

- 4
- 8
- 12
- 16
- 20
- 24
- 32

권장 규칙:

- 페이지 외곽 여백: 24px
- panel padding: 16px
- drawer padding: 20px
- table cell vertical padding: 10px~12px
- section gap: 16px 또는 24px

## 2.5 Radius

radius는 보수적으로 사용한다.

권장 규칙:

- page panel: 8px
- drawer: 10px
- button/input: 6px
- badge/tag: 999px 가능

금지:

- 16px 이상 large radius 남발
- soft blob 형태
- 카드마다 radius를 다르게 쓰는 것

## 2.6 Border

border는 admin visual language의 핵심이다.

권장 규칙:

- 기본 panel border: `1px solid #253244`
- 강조 panel border: `1px solid #32465E`
- table row divider 명시
- drawer left border 명시

원칙:

- shadow보다 border와 surface 구분으로 hierarchy를 만든다

## 2.7 Shadow

shadow는 최소화한다.

권장:

- panel: 거의 없음 또는 매우 약한 shadow
- drawer: 좌측으로만 약한 elevation shadow
- dropdown/popover: 소형 shadow 허용

금지:

- floating SaaS card처럼 강한 drop shadow
- glow 효과

## 2.8 Table 규칙

테이블은 admin의 핵심 구조다.

권장 규칙:

- 헤더는 sticky 가능
- row hover는 subtle background change만
- 선택 row는 border 또는 왼쪽 accent line으로 표시
- 컬럼 정렬은 data type에 맞게 유지
- action은 row 끝 kebab 또는 detail panel action으로 분리

테이블이 전달해야 하는 인상:

- 실제 업무 데이터를 관리하는 화면
- 많은 항목을 안정적으로 훑을 수 있는 구조

## 2.9 Panel 규칙

panel 유형:

- summary card
- filter bar panel
- table panel
- detail panel
- activity panel

권장 특징:

- 헤더와 바디 구분
- 제목과 보조 설명 최소화
- 섹션 간 divider 사용 가능
- panel마다 의미 없는 장식 금지

## 2.10 Drawer 규칙

AI assistant drawer는 메신저가 아니라 admin side workspace다.

권장 규칙:

- width: 440px~520px
- full height
- left border 명시
- header 고정
- footer composer 고정
- 내부 content는 scroll

drawer 안에서 사용 가능한 요소:

- compact context summary
- operational cards
- stepper
- state log
- form controls

drawer 안에서 지양할 요소:

- large avatar
- 말풍선형 bubble chat
- gradient hero
- reaction emoji

---

# 3. UI Design Principles

## 3.1 Admin First

메인 화면은 언제나 admin이 중심이다. assistant는 support layer다.

Do:

- 메인 화면만 봐도 실제 운영 페이지처럼 설계
- 리스트, 상세, 필터, 상태 구조를 먼저 완성

Don't:

- 메인 화면을 assistant 데모용 배경처럼 취급
- AI panel이 본체보다 더 시각적으로 크거나 화려하게 보이게 구성

## 3.2 Complexity Comes From Workflow, Not Decoration

복잡함은 실제 업무 판단 구조에서 나온다.

Do:

- 승인 판단에 필요한 데이터 포인트를 구조화
- 롤백 시 드라이런과 최종 확인을 단계로 표현

Don't:

- 일부러 어려워 보이게 필드를 과장
- 기술 용어를 불필요하게 남발

## 3.3 Assistant Is Operational, Not Conversational

assistant는 메신저가 아니라 작업 보조 도구다.

Do:

- 결론, 근거, action 중심 응답
- command-like composer
- template card 중심 UI

Don't:

- 말풍선 위주의 채팅앱 UI
- 이모지, 친근한 small talk, reaction UI
- "무엇을 도와드릴까요?" 중심의 generic chat pattern

## 3.4 Conservative Enterprise Styling

스타일은 보수적이어야 한다.

Do:

- border, spacing, alignment로 hierarchy 구성
- muted palette 위주 사용
- radius와 shadow 절제

Don't:

- consumer SaaS hero section 스타일
- neon accent
- decorative glassmorphism
- oversized cards and empty whitespace

## 3.5 One Primary Action Per Context

각 panel과 card는 하나의 주 액션만 강조한다.

Do:

- 배포 카드에서는 `배포 시작`
- 승인 카드에서는 `승인`
- 롤백 confirm에서는 `롤백 확정`

Don't:

- 같은 깊이에서 2개 이상의 primary CTA 사용
- destructive action을 primary와 같은 톤으로 병렬 배치

## 3.6 Stable Layout Under State Change

상태가 바뀌어도 레이아웃이 크게 흔들리면 안 된다.

Do:

- loading, success, in-progress 상태에서도 card shell 유지
- table/detail/drawer 골격 고정

Don't:

- 상태 변경마다 panel 높이와 위치가 크게 이동
- action 후 전체 페이지가 재배열되는 경험

## 3.7 Explicit Anti-Patterns

피해야 할 anti-pattern:

- 좌우 비교형 split demo를 메인 구조로 사용하는 것
- 일부러 불편한 legacy mock을 만드는 것
- AI chat을 consumer messenger처럼 보이게 하는 것
- 과한 rounded corner와 밝은 gradient를 쓰는 것
- dashboard처럼 KPI만 과다 노출하고 실제 운영 리스트가 없는 것
- 전체 화면을 카드 더미처럼 쪼개는 것
- table보다 marketing card가 더 눈에 띄는 것

---

# 4. Frontend Design Spec

## 4.1 라우트 구조

권장 라우트:

- `/deploy`
- `/approve`
- `/rollback`

공통 layout:

- `src/app/layout.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/deploy/page.tsx`
- `src/app/(admin)/approve/page.tsx`
- `src/app/(admin)/rollback/page.tsx`

실제 폴더명은 구현 상황에 맞게 조정 가능하지만, 공통 admin shell과 페이지별 content 분리는 유지한다.

## 4.2 컴포넌트 구조

공통 layout 계층:

- `AdminShell`
- `AdminHeader`
- `PageHeader`
- `ResetNoticeStrip`
- `SummaryBar`
- `FilterBar`
- `DataTablePanel`
- `DetailPanel`
- `AssistantDrawer`

assistant 계층:

- `AssistantHeader`
- `ContextSummary`
- `SuggestedIntents`
- `ConversationLog`
- `AssistantComposer`
- `TemplateRenderer`

template 계층:

- `QuickDeployLaunchpadCard`
- `DeploymentApprovalInboxCard`
- `RollbackSummaryCard`
- `DryRunStepperCard`
- `ConfirmActionCard`

## 4.3 상태 모델

store는 메모리 기반으로 운영한다.

권장 store slice:

- `ui`
- `deploy`
- `approve`
- `rollback`
- `assistant`

### `ui`

- active route
- selected table row
- drawer open/close
- active filters

### `assistant`

- current context
- messages
- suggested intents
- active template envelope
- pending action state

## 4.4 Context Binding 규칙

assistant는 항상 메인 화면의 선택 상태를 문맥으로 받아야 한다.

예시:

- deploy page에서 row 선택 -> assistant context에 service/environment/request id 반영
- approve page에서 request 선택 -> assistant context에 risk/verification/status 반영
- rollback page에서 incident 선택 -> assistant context에 current version/last stable version 반영

문맥이 없을 때:

- drawer는 generic chat이 아니라 `먼저 대상 항목을 선택하세요` 상태를 보여준다.

## 4.5 템플릿 렌더링 계약

권장 envelope:

```ts
type TemplateEnvelope =
  | { templateId: "quick_deploy_launchpad"; data: QuickDeployTemplateData }
  | { templateId: "deployment_approval_inbox"; data: DeploymentApprovalTemplateData }
  | { templateId: "rollback_summary"; data: RollbackSummaryTemplateData }
  | { templateId: "dry_run_stepper"; data: DryRunStepperData }
  | { templateId: "confirm_action"; data: ConfirmActionData };
```

원칙:

- templateId는 기존 사양의 naming 유지
- payload는 page context와 seed data 기반으로 생성
- renderer는 `switch(templateId)` 수준의 단순 구조 유지

## 4.6 페이지별 화면 스펙

## 4.6.1 Deploy Page

레이아웃:

- summary bar
- filter bar
- main table panel
- right detail panel
- assistant drawer

기본 state:

- table 첫 row 선택 상태 권장
- detail panel 기본 표시
- drawer는 닫힘 상태

주요 action:

- row select
- filter change
- `새 배포`
- `AI Assistant 열기`
- assistant 내 `배포 시작`

표현 규칙:

- status는 `Draft`, `Ready`, `Deploying`, `Succeeded`, `Failed`
- strategy는 badge 또는 plain text

## 4.6.2 Approve Page

레이아웃:

- summary bar
- filter bar
- approval table
- request detail panel
- assistant drawer

기본 state:

- `Pending` 요청 중 하나 선택

주요 action:

- request select
- risk filter
- status filter
- assistant 내 `승인`, `보류`

표현 규칙:

- risk는 `Low`, `Medium`, `High`
- verification은 compact checklist badge로 표현

## 4.6.3 Rollback Page

레이아웃:

- summary bar
- filter bar
- incident/history table
- rollback analysis panel
- assistant drawer

기본 state:

- rollback 후보 1개 선택

주요 action:

- service select
- severity filter
- assistant 내 `드라이런 시작`
- assistant 내 `롤백 확정`

표현 규칙:

- severity는 red/amber neutral hierarchy 유지
- rollback 가능 여부는 명확한 label 사용

## 4.7 Drawer 상태 스펙

open 상태:

- body scroll 유지 가능
- 메인 content를 가리지 않도록 z-index 정리
- backdrop는 아주 약하게 또는 생략 가능

empty 상태:

- context 없음
- 안내 문구
- 비활성 composer 또는 제한적 입력 허용

loading 상태:

- full-screen loader 금지
- drawer 내부 skeleton 또는 inline progress 사용

success 상태:

- 실행 결과 banner
- 관련 main page status 반영

## 4.8 입력 컴포넌트 스펙

input:

- height 36px
- padding 0 12px
- border 강조

button:

- primary height 36px 또는 40px
- icon button은 square 32px 또는 36px

select:

- admin filter bar와 동일한 density 유지

textarea/composer:

- single-line 또는 compact multi-line
- max height 제한

## 4.9 접근성 및 사용성

- 표 헤더와 정렬 기준 명확히 제공
- row selection은 keyboard focus 가능
- drawer open 시 focus trap 권장
- 상태는 색상만으로 전달하지 않음
- destructive action은 confirm 단계 분리

## 4.10 반응형 규칙

데스크톱:

- table + detail + drawer 구조 유지

태블릿:

- detail panel을 하단 탭 또는 stacked section으로 전환 가능
- drawer는 full-height side panel 유지

모바일:

- 이번 POC 우선순위는 낮음
- 필요 시 list -> detail drill-in 패턴 적용
- drawer는 full-screen sheet로 대체 가능

## 4.11 구현 우선순위

Phase 1:

- admin shell
- 각 페이지의 summary/filter/table/detail 구조

Phase 2:

- assistant drawer shell
- context binding
- suggested intents

Phase 3:

- template renderer
- 3개 핵심 template card 구현

Phase 4:

- rollback 후속 cards
- 상태 전이
- detail panel과 drawer 동기화

Phase 5:

- visual polish
- responsive refinement
- microcopy tuning

## 4.12 최종 확인 체크리스트

- 메인 화면만 봐도 실제 DevOps admin처럼 보이는가
- drawer가 메신저가 아니라 assistant workspace처럼 보이는가
- 배포/승인/롤백이 각각 실제 admin page 패턴을 따르는가
- table, panel, drawer 규칙이 일관되는가
- radius, border, shadow가 enterprise 톤에 맞는가
- do / don't / anti-pattern이 구현 판단 기준으로 충분한가
- assistant가 현재 페이지 문맥 없이 독립적으로 동작하지 않게 설계되었는가

