# PatternFly 컴포넌트 매핑표

## 1. 목적

이 문서는 DevOps Chat Template POC에서 필요한 화면 요소를 `제품 요구 -> PatternFly primitive -> repo 구현 컴포넌트` 기준으로 매핑한 표다.

현재 구현 상태도 같이 적어 두어, 다음 작업에서 바로 분해/확장할 수 있게 한다.

## 2. 공통 Shell 매핑

| 제품 요구 | PatternFly 기준 | repo 구현 기준 | 상태 | 메모 |
|---|---|---|---|---|
| 글로벌 헤더 | Button, Label | `DevopsConsolePage` header | 구현됨 | nav와 assistant CTA 포함 |
| 상단 탭 네비게이션 | 기본 nav 패턴 참고 | `DevopsConsolePage` nav link | 구현됨 | 현재는 repo CSS로 커스텀 |
| reset notice strip | Inline alert/notice 패턴 참고 | notice block | 구현됨 | PatternFly alert로 교체 가능 |
| summary bar | Card + Label | metric cards | 구현됨 | KPI strip 역할 |
| filter/action bar | Toolbar 패턴 참고 + Label + Button | toolbar row | 구현됨 | 다음 단계에서 실제 filter control 분리 |
| 메인 작업 영역 | Drawer + Card + Table | content grid | 구현됨 | table + detail + assistant 조합 |
| 우측 assistant drawer | Drawer, DrawerPanelContent | assistant panel | 구현됨 | 현재 항상 열림 |

## 3. `/deploy` 매핑

| 제품 요구 | PatternFly 기준 | repo 구현 기준 | 상태 | 메모 |
|---|---|---|---|---|
| deployment request list | `Table` | deploy table | 구현됨 | compact variant 사용 |
| status badge | `Label` | table status label | 구현됨 | semantic tone 매핑만 적용 |
| selected deployment detail | `Card` | detail panel | 구현됨 | 이후 section component 분리 추천 |
| 최근 성공 배포 / artifact 정보 | `Card` 내부 section 패턴 | detail groups | 구현됨 | seed JSON 붙일 자리 |
| quick deploy 카드 | `Card` 기반 custom template | template card shell | 구현됨 | 현재는 정적 skeleton |
| primary deploy action | `Button` | 배포 시작 | 구현됨 | 액션 로직 미연결 |

## 4. `/approve` 매핑

| 제품 요구 | PatternFly 기준 | repo 구현 기준 | 상태 | 메모 |
|---|---|---|---|---|
| approval request list | `Table` | approval table | 구현됨 | risk/verification 요약 포함 |
| risk 표현 | `Label` | status/risk label | 구현됨 | 더 세밀한 위험도 scale 필요 |
| 요청 상세 패널 | `Card` | detail panel | 구현됨 | 변경 요약/영향 범위 표시 |
| approval inbox 카드 | `Card` 기반 custom template | template card shell | 구현됨 | 승인/보류 액션만 노출 |
| approve / hold CTA | `Button` | 승인 / 보류 버튼 | 구현됨 | 실제 상태 전이 미연결 |

## 5. `/rollback` 매핑

| 제품 요구 | PatternFly 기준 | repo 구현 기준 | 상태 | 메모 |
|---|---|---|---|---|
| incident / deployment history list | `Table` | rollback table | 구현됨 | 후보 버전 비교용 |
| rollback analysis detail | `Card` | detail panel | 구현됨 | 영향 범위, 안정 버전 포함 |
| rollback summary 카드 | `Card` 기반 custom template | template card shell | 구현됨 | dry run 진입 CTA 포함 |
| dry run stepper | Progress stepper 패턴 참고 | 미구현 | 다음 단계 | 별도 template component 추천 |
| confirm action 카드 | 위험 액션 confirm 패턴 참고 | 미구현 | 다음 단계 | destructive confirm 분리 필요 |

## 6. Assistant Drawer 매핑

| 제품 요구 | PatternFly 기준 | repo 구현 기준 | 상태 | 메모 |
|---|---|---|---|---|
| drawer header | Drawer panel content | assistant header | 구현됨 | title + description |
| current context summary | Card / compact description pattern | context card | 구현됨 | 현재 key-value block |
| suggested intents | `Label` 또는 chip 패턴 | intent label list | 구현됨 | admin action chip 톤 |
| conversation log | Card / message block custom | message list | 구현됨 | chat bubble 미사용 |
| template card region | `Card` | template card shell | 구현됨 | typed component로 교체 예정 |
| command composer | input + Button 패턴 | composer bar | 구현됨 | 실제 prompt state 미연결 |

## 7. 다음 단계에서 추가할 repo 컴포넌트

다음 분해 대상은 아래가 좋다.

| 새 repo 컴포넌트 | 역할 |
|---|---|
| `src/devops-chat/components/app-shell.tsx` | header, nav, page intro, notice 공통화 |
| `src/devops-chat/components/summary-strip.tsx` | KPI summary card 공통화 |
| `src/devops-chat/components/admin-table-card.tsx` | table shell 공통화 |
| `src/devops-chat/components/detail-panel-card.tsx` | detail section 공통화 |
| `src/devops-chat/components/assistant-drawer.tsx` | drawer header, context, intents, composer 분리 |
| `src/devops-chat/templates/quick-deploy-launchpad.tsx` | 배포 템플릿 전용 |
| `src/devops-chat/templates/deployment-approval-inbox.tsx` | 승인 템플릿 전용 |
| `src/devops-chat/templates/rollback-summary.tsx` | 롤백 요약 전용 |
| `src/devops-chat/templates/dry-run-stepper.tsx` | 검증 단계 표현 |
| `src/devops-chat/templates/confirm-action.tsx` | 최종 확인 카드 |

## 8. 상태 요약

현재 repo는 `PatternFly 설치 + shell/theme skeleton + 3개 라우트 기본 화면`까지 완료된 상태다.

즉 다음 작업은 새로운 라이브러리 검토가 아니라 아래 순서로 바로 들어가면 된다.

1. seed JSON 추가
2. Zustand store 추가
3. row selection + drawer context 연결
4. template component 분리
5. 액션 상태 전이 연결
