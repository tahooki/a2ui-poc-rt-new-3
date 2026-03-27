# Approve 다중 승인 탭 개편 계획서

## 1. 목적

현재 `/approve` 페이지는 사실상 "배포 승인 요청" 한 종류만 검토하는 구조에 가깝다.

이번 개편의 목적은 `/approve`를 단일 deploy approval 화면이 아니라, 운영자가 반복적으로 승인하는 여러 종류의 요청을 한 곳에서 다루는 shared approval workspace로 바꾸는 것이다.

이번 수정의 목표는 다음과 같다.

- `/approve`를 `승인 대상 3종`을 가진 approval console로 확장한다
- 승인 대상은 탭으로 구분해서 보여준다
- 각 탭이 "왜 이 승인이 필요한지"가 바로 읽히도록 만든다
- 현재 deploy approval 중심 데이터 구조를 type-aware approval 구조로 바꾼다
- 기존 approve / hold 상태 전이는 유지하되, 각 승인 유형에 맞는 상세 정보와 액션 근거를 보여준다

## 2. 이번에 채택할 승인 유형 3개

이번 개편에서는 승인 대상을 아래 3개로 고정한다.

### 2.1 Temporary Access Approval

의미:
- 특정 principal에게 임시 권한을 부여하는 승인

예시:
- production read access 2시간
- 특정 bucket read-only access
- break-glass read access

왜 채택하는가:
- "왜 승인해야 하는가"가 직관적이다
- 범위, 기간, 사유, ticket 같은 입력이 자연스럽다
- deploy approval보다 승인 패킷 구조가 더 명확하다

### 2.2 Production Config Change Approval

의미:
- 코드 배포가 아니라 운영 설정 변경 자체를 승인하는 요청

예시:
- feature flag enable
- timeout / retry 변경
- autoscaling threshold 조정
- env var 변경

왜 채택하는가:
- 배포와 다른 결의 운영 승인으로 읽힌다
- 변경 전/후 값, 영향 범위, rollback 방법이 중요하다
- 페이지와 detail 구조가 deploy와 충분히 달라질 수 있다

### 2.3 Data Operation Approval

의미:
- 데이터나 배치/큐에 영향을 주는 운영 작업을 승인하는 요청

예시:
- queue replay
- backfill 실행
- cache purge
- batch rerun

왜 채택하는가:
- 운영에서 실제로 "무섭고 귀찮은 승인"으로 인식된다
- 영향 범위, 복구 가능성, 실행 윈도우 같은 근거가 중요하다
- deploy approval보다 별도의 승인 영역처럼 보이게 만들기 쉽다

## 3. 현재 구조에서 바꿔야 하는 점

현재 `/approve`는 아래 한계가 있다.

- `approve.json`이 deploy approval 한 종류만 가정한다
- `ApprovalItem` 타입이 승인 유형별 차이를 표현하지 못한다
- `ApproveWorkspace`가 단일 review queue + detail 구조만 가진다
- table / detail / assistant copy가 모두 deploy approval 맥락에 묶여 있다
- 승인 페이지 안에서 탭 전환이나 유형별 필터가 없다

즉 현재 구조는 "shared approvals page"가 아니라 "deploy approval queue"에 가깝다.

## 4. 핵심 수정 방향

`/approve`는 아래 의미로 재정의한다.

### `/approve`

의미:
- 운영자가 다양한 변경 요청을 한 곳에서 검토하고 approve / hold를 수행하는 approval control surface

사용자 행동:
- 승인 유형 탭 선택
- 해당 유형의 request queue 확인
- 선택한 요청의 핵심 리스크, 검증 근거, 영향 범위 읽기
- approve 또는 hold 수행

### 탭 구조

승인 페이지 상단에 다음 탭을 둔다.

- `Temporary Access`
- `Config Change`
- `Data Operation`

선택적으로 `All` 탭을 둘 수 있지만, 이번 계획에서는 우선 3개 탭만 필수로 본다.

## 5. 승인 유형별 화면 의미

### 5.1 Temporary Access

이 탭은 "누가 / 어디에 / 어떤 권한을 / 얼마나 오래"가 먼저 읽혀야 한다.

핵심 읽기 순서:
- principal
- resource
- access scope
- duration
- justification
- safeguards

페이지 상단 description 예시:
- `운영자가 임시 권한 요청의 범위와 만료 조건을 검토하는 승인 탭입니다.`
- `AWS/GCP의 IAM access request를 단순화한 approval workflow입니다.`

### 5.2 Config Change

이 탭은 "무엇이 어떻게 바뀌는가"가 먼저 읽혀야 한다.

핵심 읽기 순서:
- 대상 서비스
- 현재값 / 변경값
- 적용 환경
- 영향 범위
- rollback 방법

페이지 상단 description 예시:
- `운영 설정 변경 요청을 승인하는 탭입니다.`
- `배포와 별개로 runtime configuration 변경을 검토하는 workflow입니다.`

### 5.3 Data Operation

이 탭은 "무슨 데이터를 어떤 방식으로 건드리는가"가 먼저 읽혀야 한다.

핵심 읽기 순서:
- operation type
- target dataset / queue / cache
- 예상 영향
- 복구 가능 여부
- execution window

페이지 상단 description 예시:
- `데이터성 운영 작업을 승인하는 탭입니다.`
- `queue replay, backfill, cache purge 같은 영향성 높은 작업을 검토하는 workflow입니다.`

## 6. UI 구조 계획

## 6.1 상단

- 페이지 제목
- 제품 내 역할 설명
- approval 유형 탭 nav
- summary band

summary는 탭별로 아래 값을 공통적으로 보여준다.

- `Pending`
- `Approved today`
- `High risk`
- `Held`

## 6.2 메인 영역 공통 구조

탭마다 아래 뼈대는 동일하게 유지한다.

- selected request highlight
- approval request table
- detail panel

즉 구조는 공통으로 두고, 탭별 카드/필드의 읽기 순서를 바꾼다.

## 6.3 탭별 selected highlight 구성

### Temporary Access

- principal
- resource
- duration
- scope
- justification

### Config Change

- service
- environment
- config diff
- risk summary
- rollback availability

### Data Operation

- operation type
- target
- impact scope
- recovery / rollback
- execution window

## 6.4 table 구조

탭별로 서로 다른 컬럼 우선순위를 가져간다.

### Temporary Access table

- Request ID
- Principal
- Resource
- Scope
- Duration
- Requested By
- Status

### Config Change table

- Request ID
- Service
- Environment
- Change Type
- Risk
- Requested By
- Status

### Data Operation table

- Request ID
- Operation
- Target
- Environment
- Impact
- Requested By
- Status

## 6.5 detail panel 필수 섹션

### Temporary Access detail

- 요청 개요
- principal / resource mapping
- requested scope
- expiry / safeguards
- justification
- notes

### Config Change detail

- 요청 개요
- config diff
- 영향 범위
- 검증 체크
- rollback 방법
- notes

### Data Operation detail

- 요청 개요
- operation summary
- impact scope
- recovery / reversibility
- execution checklist
- notes

## 7. 데이터 구조 수정 계획

현재 `ApprovalItem`은 단일 구조라 승인 유형별 차이를 표현하기 어렵다.

아래 방식으로 확장한다.

### 7.1 공통 필드

모든 승인 유형이 공유하는 필드:

- `id`
- `type`
- `title`
- `environment`
- `requestedBy`
- `requestedAt`
- `riskSummary`
- `riskTone`
- `verificationSummary`
- `impactScope`
- `status`
- `assistantMessages`
- `notes`

### 7.2 type-aware detail payload

`ApprovalItem` 아래에 유형별 detail payload를 둔다.

#### access detail

- `principal`
- `resource`
- `scope`
- `duration`
- `justification`
- `safeguards`

#### config detail

- `service`
- `changeType`
- `currentValue`
- `proposedValue`
- `rollbackMethod`
- `verificationChecks`

#### data detail

- `operationType`
- `target`
- `executionWindow`
- `recoveryMethod`
- `blastRadius`
- `verificationChecks`

## 8. seed 데이터 계획

`src/devops-chat/data/seed/approve.json`은 아래처럼 개편한다.

- approval 요청 3종을 모두 포함
- 각 탭당 최소 2개 이상의 item
- status는 `pending`, `approved`, `held`를 섞어서 구성

추천 샘플 구성:

### Temporary Access seed

- `apr-access-101`
- `apr-access-102`

### Config Change seed

- `apr-config-201`
- `apr-config-202`

### Data Operation seed

- `apr-data-301`
- `apr-data-302`

## 9. 상태 및 view-model 수정 계획

## 9.1 store

`src/devops-chat/store/app-store.ts`에 아래를 추가한다.

- `activeApprovalTab`
- `setApprovalTab(tab)`

필요하면 `approve` 전용 필터 state를 둔다.

상태 전이는 기존 approve / hold 액션을 유지한다.

즉:
- pending -> approved
- pending -> held

이 상태 엔진은 재사용하고, 탭은 단지 queue / detail / copy를 바꾸는 역할만 하게 한다.

## 9.2 view-model

`src/devops-chat/view-models/build-console-view-model.ts`에서 approve view-model을 탭 인지형으로 바꾼다.

필요 수정:

- active tab 기준 table rows 필터링
- tab별 columns 변경
- tab별 selected highlight copy 변경
- tab별 detail sections builder 분리

즉 approve view-model은 아래처럼 쪼갠다.

- `buildAccessApprovalSections`
- `buildConfigApprovalSections`
- `buildDataApprovalSections`

## 10. 컴포넌트 수정 계획

## 10.1 `src/devops-console/pages/approve-workspace.tsx`

가장 큰 수정 대상이다.

추가할 것:

- approval tab nav
- 탭별 description
- 탭별 selected highlight
- 탭별 table rendering

유지할 것:

- 공통 workspace rhythm
- DataTable / DetailSidebar 사용 패턴
- 기존 approve / hold 액션 흐름

## 10.2 `src/devops-console/templates/deployment-approval-inbox.tsx`

이 컴포넌트는 deploy approval 전용 이름과 구조를 갖고 있다.

수정 방향:

- 이름을 더 generic한 approval packet shell로 바꾸거나
- type-aware template로 확장

추천:

- `approval-packet.tsx` 같은 generic component로 재구성

이유:
- Temporary Access / Config Change / Data Operation 모두를 담아야 하기 때문

## 10.3 `src/devops-console/console-page.module.css`

필요 스타일:

- approve tab nav
- type-specific summary card emphasis
- diff / scope / safeguard 같은 detail 표현

deploy에서 만든 workflow nav 스타일을 일부 재사용해도 된다.

## 11. 구현 순서

### 1단계

- `ApprovalItem` type을 type-aware 구조로 확장
- `approve.json` seed 개편

### 2단계

- store에 `activeApprovalTab` 추가
- approve tab 전환 state 구현

### 3단계

- approve view-model을 탭 인지형으로 수정
- 탭별 columns / sections 분리

### 4단계

- `ApproveWorkspace`에 tab nav 추가
- 탭별 selected highlight 및 detail UI 구현

### 5단계

- approval template를 generic approval packet 형태로 재구성
- assistant copy를 탭별로 조정

### 6단계

- lint / build 검증
- 승인 / 보류 상태 전이 검증

## 12. 성공 기준

이 수정이 완료되면 아래가 충족되어야 한다.

- `/approve`가 deploy approval 전용 페이지처럼 보이지 않는다
- approval 유형 3종이 탭으로 분리되어 읽힌다
- 각 탭이 왜 다른 승인인지 첫 화면에서 이해된다
- approve / hold 상태 전이는 계속 정상 동작한다
- 탭별로 table, detail, selected highlight의 강조점이 다르게 보인다

## 13. 한 줄 요약

이번 수정은 `/approve`를 단일 배포 승인 큐에서 `Temporary Access / Config Change / Data Operation` 3종 승인을 탭으로 검토하는 shared approval workspace로 확장하고, seed / 타입 / 상태 / UI를 모두 type-aware approval 구조로 재편하는 작업이다.

## 14. Todo List

### Phase 0. Baseline 확인

- [ ] 현재 `/approve`의 단일 deploy approval 가정 지점을 식별한다.
  - Summary: `approve.json`, `ApprovalItem`, `ApproveWorkspace`, approval template, store transition이 모두 deploy approval 중심으로 엮인 부분을 목록화한다.
  - Acceptance Criteria: 수정 대상 파일과 변경 이유가 구현 전에 정리되어 있다.
  - Blocker: None.

- [ ] 현재 approve / hold 상태 전이가 어떤 파일과 액션 경로를 타는지 고정한다.
  - Summary: assistant drawer action, template action, store mutation이 어떻게 연결되는지 확인한다.
  - Acceptance Criteria: 탭 확장 이후에도 유지해야 할 상태 엔진이 명확하다.
  - Blocker: None.

### Phase 1. 타입 및 seed 확장

- [ ] `ApprovalItem`을 type-aware approval 구조로 확장한다.
  - Summary: 공통 필드와 유형별 detail payload를 분리해 `Temporary Access`, `Config Change`, `Data Operation`을 모두 표현 가능하게 만든다.
  - Acceptance Criteria: 타입만으로 각 승인 유형의 상세 정보를 안전하게 표현할 수 있다.
  - Blocker: Baseline 확인 완료 필요.

- [ ] `approve.json`을 3종 승인 seed로 개편한다.
  - Summary: 각 탭당 최소 2개 이상의 item을 두고 `pending`, `approved`, `held` 상태를 섞어 넣는다.
  - Acceptance Criteria: seed만 읽어도 approval page가 shared approval workspace로 보인다.
  - Blocker: 타입 확장 필요.

### Phase 2. 상태 관리 및 탭 전환

- [ ] approve 전용 `activeApprovalTab` 상태를 store에 추가한다.
  - Summary: 현재 선택된 승인 유형 탭을 client state로 관리하고, 탭 전환 액션을 노출한다.
  - Acceptance Criteria: `/approve`에서 탭 전환 시 상태가 즉시 반영된다.
  - Blocker: seed 구조 확장 필요.

- [ ] 탭 전환 시 selected request와 detail 표시 규칙을 정한다.
  - Summary: 탭을 바꿨을 때 현재 탭에 속한 첫 pending item 또는 기존 selected item을 어떻게 유지할지 결정하고 구현한다.
  - Acceptance Criteria: 탭 변경 후 빈 detail 또는 잘못된 selection이 나오지 않는다.
  - Blocker: `activeApprovalTab` 구현 필요.

### Phase 3. view-model 분리

- [ ] approve view-model을 탭 인지형으로 개편한다.
  - Summary: active tab 기준으로 summary, filters, table rows, detail sections, selected highlight copy를 분기 처리한다.
  - Acceptance Criteria: 탭별 UI 강조점이 데이터 단계에서 분명히 갈라진다.
  - Blocker: 상태 및 seed 구조 개편 필요.

- [ ] 탭별 detail section builder를 분리한다.
  - Summary: `buildAccessApprovalSections`, `buildConfigApprovalSections`, `buildDataApprovalSections` 같은 함수로 역할을 나눈다.
  - Acceptance Criteria: detail panel이 탭별로 다른 읽기 순서를 가진다.
  - Blocker: type-aware `ApprovalItem` 구현 필요.

### Phase 4. `/approve` 메인 UI 개편

- [ ] `ApproveWorkspace`에 approval tab nav를 추가한다.
  - Summary: deploy workflow nav와 유사한 리듬을 재사용하되, `/approve` 전용 탭 네비게이션으로 구현한다.
  - Acceptance Criteria: 사용자가 현재 보고 있는 승인 유형을 즉시 이해하고 전환할 수 있다.
  - Blocker: store / view-model에서 active tab 지원 필요.

- [ ] 탭별 상단 description과 selected highlight를 구현한다.
  - Summary: 각 탭이 무엇을 승인하는지와, 무엇을 먼저 읽어야 하는지를 highlight 카드에서 보여준다.
  - Acceptance Criteria: 탭 전환 시 페이지 의미가 deploy approval 재탕처럼 보이지 않는다.
  - Blocker: 탭별 copy와 detail shape 정의 필요.

- [ ] 탭별 table 컬럼과 detail panel을 연결한다.
  - Summary: 같은 DataTable / DetailSidebar 구조를 유지하되 컬럼 구성과 detail 섹션은 탭별로 달라지게 한다.
  - Acceptance Criteria: `Temporary Access`, `Config Change`, `Data Operation`이 서로 다른 승인 페이지처럼 읽힌다.
  - Blocker: 탭 인지형 view-model 필요.

### Phase 5. approval packet / assistant 정리

- [ ] approval template를 generic approval packet 구조로 재구성한다.
  - Summary: 현재 `deployment_approval_inbox` 이름과 payload를 일반화하거나, type-aware template wrapper로 바꾼다.
  - Acceptance Criteria: assistant drawer에서도 세 승인 유형을 자연스럽게 렌더할 수 있다.
  - Blocker: 타입 및 view-model 구조 정리 필요.

- [ ] assistant copy와 intent를 탭별 의미에 맞게 조정한다.
  - Summary: deploy approval 전용 문구를 제거하고, access/config/data approval에 맞는 요약/리스크/hold 이유 문구를 제공한다.
  - Acceptance Criteria: assistant가 현재 탭과 맞지 않는 설명을 하지 않는다.
  - Blocker: generic approval packet 구조 필요.

### Phase 6. 상태 전이 검증

- [ ] approve / hold 상태 전이가 3개 탭 모두에서 유지되도록 보장한다.
  - Summary: 기존 `pending -> approved`, `pending -> held` 전이를 type-aware data에서도 그대로 작동하게 한다.
  - Acceptance Criteria: 어떤 탭에서든 승인과 보류가 UI, summary, assistant 상태에 즉시 반영된다.
  - Blocker: seed / store / view-model 변경 반영 필요.

- [ ] 탭 전환 이후에도 상태 변경이 올바른 queue에 반영되는지 검증한다.
  - Summary: 한 탭에서 승인한 후 다른 탭으로 이동해도 current tab 데이터와 summary 값이 정확해야 한다.
  - Acceptance Criteria: summary와 selected state가 꼬이지 않는다.
  - Blocker: approve state transition 유지 필요.

### Phase 7. 최종 검증

- [ ] `/approve`가 더 이상 deploy approval 전용 페이지처럼 보이지 않는지 최종 점검한다.
  - Summary: 첫 진입 화면, 각 탭 highlight, table, detail, assistant가 모두 shared approvals page로 읽히는지 확인한다.
  - Acceptance Criteria: 탭 3개가 각각 별도 승인 도메인처럼 보인다.
  - Blocker: 모든 UI 작업 완료 필요.

- [ ] `lint`와 `build`로 회귀를 검증한다.
  - Summary: 타입 확장과 template 일반화 과정에서 생긴 오류를 최종 점검한다.
  - Acceptance Criteria: `npm run lint`, `npm run build`가 통과한다.
  - Blocker: 구현 완료 필요.
