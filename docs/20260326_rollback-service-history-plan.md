# Rollback 서비스 이력 기반 개편 계획서

## 1. 목적

현재 `/rollback`은 incident 중심의 rollback 후보를 바로 선택하는 구조에 가깝다.

하지만 실제 운영에서 rollback은 "incident 하나를 고른다"기보다, 이미 운영 중인 서비스 목록에서 들어가 그 서비스의 배포 이력 중 어느 지점으로 되돌릴지를 선택하는 흐름에 더 가깝다.

이번 개편의 목적은 다음과 같다.

- `/rollback`을 incident 후보 리스트가 아니라 `서비스 큐`로 재정의한다
- 서비스 상세에서 해당 서비스의 배포 이력을 보고 rollback target을 선택하게 만든다
- 빠른 rollback 경로와 신중한 rollback 경로를 모두 제공한다
- rollback을 deploy의 결과를 되돌리는 흐름으로 재배치한다
- rollback assistant 성격의 요소는 `/assistant`로 분리하고, rollback page는 pure admin workflow로 만든다

## 2. 핵심 수정 방향

rollback workflow는 아래 단계로 고정한다.

### 1. 서비스 선택

운영자는 먼저 rollback이 필요한 서비스 후보를 본다.

### 2. 서비스 상세

운영자는 특정 서비스의 현재 상태, 최근 incident, 추천 rollback target, blast radius를 본다.

### 3. 배포 이력 선택

운영자는 해당 서비스의 deployment history에서 되돌릴 배포 버전을 선택한다.

### 4. rollback 실행 방식 선택

운영자는 두 가지 경로 중 하나를 선택한다.

- 빠른 rollback:
  - 배포 이력 row에서 바로 `Rollback to this`
- 상세 rollback:
  - 특정 과거 배포 상세로 들어가 dry run과 confirm을 거쳐 최종 실행

## 3. 페이지 구조 재정의

## 3.1 `/rollback`

### 의미

- rollback 가능한 서비스들을 먼저 보여주는 서비스 큐

### 사용자 행동

- 문제 있거나 되돌릴 가치가 있는 서비스를 고른다
- 특정 서비스 상세로 이동한다

### 보여줄 것

- `Service`
- `Environment`
- `Current version`
- `Latest deployment ID`
- `Current status`
- `Open incident summary`
- `Blast radius`
- `Last updated`

### 기대 효과

rollback이 incident row를 바로 고르는 화면처럼 보이지 않고, 운영 중인 서비스 단위 복귀 workflow처럼 읽혀야 한다.

## 3.2 `/rollback/[serviceId]`

### 의미

- 특정 서비스의 rollback 맥락과 deployment history를 보는 상세 페이지

### 사용자 행동

- 현재 버전과 추천 rollback target을 확인한다
- 배포 이력을 읽고 어느 버전으로 되돌릴지 결정한다
- 빠른 rollback 또는 상세 rollback 경로를 선택한다

### 상단 요약

- `Service`
- `Current version`
- `Current status`
- `Recent incident`
- `Recommended rollback target`
- `Blast radius`

### 메인 영역

- `Deployment history`
  - `Deployment ID`
  - `Version`
  - `Deployed at`
  - `Strategy`
  - `Health summary`
  - `Verification`
  - `Rollback eligible`
  - `Release summary`

### 행동

- row에서 `Rollback to this`
- row 클릭 시 `/rollback/[serviceId]/[deploymentId]` 이동

### 기대 효과

운영자는 "이 서비스에서 어디로 되돌릴지"를 버전 이력 기준으로 자연스럽게 선택할 수 있어야 한다.

## 3.3 `/rollback/[serviceId]/[deploymentId]`

### 의미

- 특정 과거 배포를 rollback target으로 놓고 최종 검토하는 상세 페이지

### 사용자 행동

- 현재 버전과 rollback target을 최종 대비한다
- dry run을 수행한다
- confirm checklist를 확인한다
- 최종 rollback을 확정한다

### 보여줄 것

- `Current version`
- `Target version`
- `Target deployment ID`
- `Target deployed at`
- `Release summary`
- `Why this target`
- `Recent health / incident relation`
- `Blast radius`
- `Dry run checks`
- `Confirm checklist`
- `Recovery window`

### 액션

- `Dry run 시작`
- `Rollback 확정`

### 기대 효과

이 페이지는 "정말 이 버전으로 가는 게 맞는가"를 확인하는 고위험 작업 페이지처럼 보여야 한다.

## 4. 두 가지 rollback 경로

## 4.1 빠른 rollback 경로

- 위치:
  - `/rollback/[serviceId]`의 deployment history row
- 사용 상황:
  - rollback target이 명확할 때
  - 이전 안정 버전으로 빠르게 되돌릴 때

### 장점

- 클릭 수가 적다
- 운영자가 빠르게 복귀할 수 있다

## 4.2 상세 rollback 경로

- 위치:
  - `/rollback/[serviceId]/[deploymentId]`
- 사용 상황:
  - 영향 범위를 더 확인하고 싶을 때
  - dry run과 confirm을 거치고 싶을 때

### 장점

- 더 안전하다
- 왜 이 버전으로 롤백하는지 근거를 읽을 수 있다

## 5. 현재 구현에서 바꿔야 하는 점

현재 `/rollback`에는 아래 한계가 있다.

- 서비스 큐가 아니라 incident-like candidate list에 가깝다
- 배포 이력보다 incident/evidence 중심으로 읽힌다
- row에서 즉시 rollback target을 선택하는 흐름이 없다
- 상세 라우트가 없어서 신중한 rollback 경로를 분리하기 어렵다
- 현재 page 안에 assistant/state/template 구조가 남아 있어 pure admin workflow처럼 읽히지 않는다

## 6. 데이터 구조 계획

rollback은 incident 중심보다 배포 이력 중심으로 바뀌어야 한다.

## 6.1 서비스 목록 데이터

필수 필드:

- `serviceId`
- `service`
- `environment`
- `currentVersion`
- `latestDeploymentId`
- `latestStatus`
- `incidentSummary`
- `blastRadius`
- `lastUpdated`

## 6.2 서비스 상세 데이터

각 서비스 아래에 `deploymentHistory[]`를 둔다.

### deploymentHistory item

- `deploymentId`
- `version`
- `deployedAt`
- `strategy`
- `healthSummary`
- `verification`
- `rollbackEligible`
- `releaseSummary`
- `rollbackRisk`

## 6.3 rollback target detail

- `currentVersion`
- `targetVersion`
- `targetDeploymentId`
- `targetDeployedAt`
- `whyThisTarget`
- `dryRunChecks[]`
- `confirmChecklist[]`
- `recoveryWindow`
- `blastRadius`

## 7. UI 구조 계획

## 7.1 `/rollback` 서비스 큐

- summary band
- filter/action bar
- service table
- optional selected service summary

### table 우선 컬럼

- `Service`
- `Environment`
- `Current Version`
- `Incident`
- `Blast Radius`
- `Updated At`
- `Status`

## 7.2 `/rollback/[serviceId]` 서비스 상세

- 상단 service summary
- deployment history table
- recommended rollback target card
- quick rollback CTA

### deployment history table 우선 컬럼

- `Deployment ID`
- `Version`
- `Deployed At`
- `Strategy`
- `Health`
- `Verification`
- `Rollback Eligible`

## 7.3 `/rollback/[serviceId]/[deploymentId]` target 상세

- current vs target compare band
- release summary / evidence
- dry run panel
- final confirm panel

## 8. 상태 전이 계획

현재 rollback 상태 전이는 dry run / confirm / executed 중심으로 구현되어 있다.

이번 개편에서는 이 전이를 유지하되, 진입 지점을 바꾼다.

### 유지할 상태

- `identified`
- `dry_run_ready`
- `dry_run_running`
- `dry_run_completed`
- `confirm_ready`
- `executed`

### 바뀌는 점

- `/rollback`에서는 상태 전이를 직접 하지 않는다
- `/rollback/[serviceId]`에서 quick rollback 또는 상세 진입만 한다
- `/rollback/[serviceId]/[deploymentId]`에서 dry run / confirm / executed를 처리한다

## 9. 컴포넌트 수정 계획

## 9.1 `src/devops-console/pages/rollback-workspace.tsx`

역할:

- 서비스 큐 페이지로 단순화
- 서비스 선택 중심으로 재구성

필요 수정:

- service-centric selected highlight
- service table로 개편
- detail panel 축소 또는 제거

## 9.2 신규 상세 컴포넌트

추가 대상:

- `src/devops-console/pages/rollback-service-detail-page.tsx`
- `src/devops-console/pages/rollback-target-detail-page.tsx`

## 9.3 신규 App Router route

추가 대상:

- `src/app/rollback/[serviceId]/page.tsx`
- `src/app/rollback/[serviceId]/[deploymentId]/page.tsx`

## 9.4 view-model / store

수정 대상:

- `src/devops-chat/view-models/build-console-view-model.ts`
- `src/devops-chat/store/app-store.ts`
- `src/devops-chat/data/seed/rollback.json`
- `src/devops-chat/types/domain.ts`

필요 수정:

- service-level data 구조
- deploymentHistory 구조
- target detail 구조
- route 진입 시 selection sync

## 10. `/assistant`와의 역할 분리

rollback 관련 assistant 성격의 template이나 prompt 흐름은 `/assistant` 탭에서만 보여준다.

즉 rollback admin page는 아래 역할만 수행한다.

- 후보 선택
- 버전 이력 검토
- dry run
- confirm
- rollback 실행

## 11. 구현 순서

### 1단계

- rollback 데이터 구조를 service-centric 형태로 재설계
- `rollback.json` seed 개편

### 2단계

- `/rollback` 서비스 큐 UI 수정
- row 클릭 시 `/rollback/[serviceId]` 이동

### 3단계

- 서비스 상세 페이지 구현
- deployment history table 구현
- quick rollback CTA 추가

### 4단계

- target 상세 페이지 구현
- dry run / confirm flow 이식

### 5단계

- 기존 rollback template / action state를 새 라우트 구조에 맞게 연결

### 6단계

- lint / build 검증
- quick rollback path와 detailed rollback path 둘 다 검증

## 12. 성공 기준

이 수정이 완료되면 아래가 충족되어야 한다.

- `/rollback`이 incident 후보 리스트가 아니라 서비스 큐처럼 보인다
- 특정 서비스 상세에서 배포 이력을 기준으로 rollback target을 고를 수 있다
- 리스트에서 바로 rollback하는 빠른 경로가 있다
- 상세 페이지에서 dry run / confirm을 거치는 신중한 경로가 있다
- deploy와 rollback이 "배포된 결과를 되돌리는 흐름"으로 연결되어 읽힌다

## 13. 한 줄 요약

이번 수정은 `/rollback`을 incident 중심 후보 리스트에서 `서비스 리스트 -> 배포 이력 -> 특정 배포로 되돌리기` 구조로 재편하고, quick rollback과 detailed rollback 두 경로를 모두 제공하는 service-history 기반 rollback workflow로 바꾸는 작업이다.

## 14. Todo List

### Phase 0. Baseline 확인

- [ ] 현재 `/rollback`이 incident 중심으로 읽히는 지점을 목록화한다.
  - Summary: service queue가 아니라 candidate list처럼 보이게 만드는 현재 table/detail/highlight 구성을 정리한다.
  - Acceptance Criteria: 변경 대상 파일과 이유가 구현 전에 명확해진다.
  - Blocker: None.

- [ ] rollback assistant/state/template가 어디에 남아 있는지 확인한다.
  - Summary: queue page에 남아 있는 assistant성 요소와 dry run/confirm 상태 전이 경로를 고정한다.
  - Acceptance Criteria: 유지할 상태 엔진과 제거할 assistant coupling이 구분된다.
  - Blocker: None.

### Phase 1. 데이터 구조 재설계

- [ ] rollback 도메인을 service-centric 구조로 확장한다.
  - Summary: 서비스 목록, deployment history, target detail을 표현할 수 있게 타입을 재설계한다.
  - Acceptance Criteria: 하나의 서비스 아래 여러 배포 이력을 둘 수 있다.
  - Blocker: Baseline 확인 완료 필요.

- [ ] `rollback.json` seed를 서비스 / 배포 이력 중심으로 개편한다.
  - Summary: 서비스별 current version과 deployment history를 모두 가진 seed로 전환한다.
  - Acceptance Criteria: rollback queue가 서비스 기준으로 보이고, service detail과 target detail에 필요한 이력이 충분하다.
  - Blocker: 타입 재설계 필요.

### Phase 2. 큐 페이지 개편

- [ ] `/rollback`을 서비스 큐 화면으로 재구성한다.
  - Summary: 현재 incident-focused selected highlight와 table을 서비스 중심 정보로 바꾼다.
  - Acceptance Criteria: 첫 화면이 "무슨 서비스를 되돌릴지 고르는 곳"으로 읽힌다.
  - Blocker: seed 구조 개편 필요.

- [ ] row 클릭 시 `/rollback/[serviceId]` 상세로 이동하게 연결한다.
  - Summary: 큐 페이지에서는 실행이 아니라 서비스 선택만 담당하게 한다.
  - Acceptance Criteria: queue page에서 바로 detailed service context로 진입할 수 있다.
  - Blocker: App Router 동적 route 필요.

### Phase 3. 서비스 상세 페이지

- [ ] `/rollback/[serviceId]` 페이지를 구현한다.
  - Summary: current version, recent incident, recommended target, blast radius를 서비스 단위로 보여준다.
  - Acceptance Criteria: 운영자가 이 서비스에서 어떤 버전으로 되돌릴지 판단할 수 있다.
  - Blocker: service-level seed / route 필요.

- [ ] deployment history table과 quick rollback CTA를 구현한다.
  - Summary: 각 배포 row에서 바로 rollback할 수 있는 빠른 경로를 제공한다.
  - Acceptance Criteria: 이전 안정 버전이 명확할 때 서비스 상세에서 빠르게 되돌릴 수 있다.
  - Blocker: deployment history data 필요.

### Phase 4. target 상세 페이지

- [ ] `/rollback/[serviceId]/[deploymentId]` 페이지를 구현한다.
  - Summary: current version과 target version을 최종 비교하는 상세 화면을 만든다.
  - Acceptance Criteria: 운영자가 특정 과거 배포를 target으로 최종 검토할 수 있다.
  - Blocker: target detail data 필요.

- [ ] dry run / confirm / executed 상태 전이를 이 페이지에 연결한다.
  - Summary: 기존 rollback state machine을 target 상세 페이지 하단의 action 영역으로 옮긴다.
  - Acceptance Criteria: detailed rollback path가 summary -> dry run -> confirm -> executed로 이어진다.
  - Blocker: 기존 rollback state 전이 재사용 필요.

### Phase 5. `/assistant`와 역할 분리

- [ ] rollback admin page에서 assistant coupling이 남아 있지 않은지 확인한다.
  - Summary: rollback 관련 assistant UI와 prompt 진입이 `/assistant`로만 남도록 정리한다.
  - Acceptance Criteria: `/rollback` 계열 페이지는 pure admin workflow로 읽힌다.
  - Blocker: queue/detail 구조 구현 필요.

- [ ] `/assistant`에서 rollback template 관리 흐름이 유지되는지 확인한다.
  - Summary: rollback summary / dry run / confirm template는 assistant page에서만 관리한다.
  - Acceptance Criteria: admin page와 assistant page의 역할이 겹치지 않는다.
  - Blocker: rollback template registry 유지 필요.

### Phase 6. 검증

- [ ] quick rollback과 detailed rollback 경로를 모두 검증한다.
  - Summary: 서비스 상세에서 바로 되돌리는 경로와 target detail에서 신중하게 확정하는 경로를 둘 다 점검한다.
  - Acceptance Criteria: 두 경로 모두 상태가 정상적으로 반영된다.
  - Blocker: 전체 구현 완료 필요.

- [ ] `lint`와 `build`를 통과시킨다.
  - Summary: route 추가와 data model 확장에 따른 타입/컴파일 문제를 최종 점검한다.
  - Acceptance Criteria: `npm run lint`, `npm run build`가 모두 통과한다.
  - Blocker: 구현 완료 필요.
