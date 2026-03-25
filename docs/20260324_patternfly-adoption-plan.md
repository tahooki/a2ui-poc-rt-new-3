# PatternFly 도입안

## 1. 문서 목적

이 문서는 `/Users/tahooki/Documents/git/a2ui-poc-rt-new-3` 저장소에서 DevOps Chat Template POC를 구현하기 위해 `PatternFly`를 어떤 범위와 원칙으로 도입할지 정리한 실행 문서다.

이번 도입의 목표는 PatternFly의 외형을 그대로 복제하는 것이 아니라, 다음을 빠르게 확보하는 것이다.

- enterprise DevOps admin에 맞는 정보 구조
- table + detail panel + drawer 중심 작업 화면
- 우측 AI assistant overlay/drawer 패턴
- React/Next 기준의 안정적인 조립 속도

시각 언어의 최종 소유권은 PatternFly가 아니라 이 repo의 제품 문서가 가진다.

- 기준 문서: [20260324_json-devops-a2ui-poc-spec.md](./20260324_json-devops-a2ui-poc-spec.md)
- 기준 문서: [20260324_json-devops-a2ui-poc-ux-ui-design.md](./20260324_json-devops-a2ui-poc-ux-ui-design.md)

## 2. 왜 PatternFly인가

이 POC가 요구하는 화면은 일반 consumer SaaS dashboard가 아니다. 문서상 핵심 요구는 아래와 같다.

- 실제 운영자가 쓰는 것처럼 보이는 admin 본 화면
- dense table, filter bar, status badge, detail panel
- 메인 화면을 대체하지 않는 우측 assistant drawer
- chat UI보다 작업 카드와 상태 흐름이 중심인 assistant 경험

PatternFly는 이 조건에 가장 잘 맞는다.

- app shell, toolbar, table, drawer, label, empty state 같은 enterprise admin 문법이 강하다
- side workspace나 in-context detail 구조를 만들기 쉽다
- React 컴포넌트와 토큰 체계가 성숙해 있어 Next 기반 POC에 붙이기 쉽다
- 지나치게 consumer SaaS 느낌으로 흐를 가능성이 낮다

반면 주의할 점도 분명하다.

- 기본 외형을 그대로 쓰면 Red Hat 계열 제품처럼 보일 수 있다
- vendor 색상과 spacing을 무비판적으로 쓰면 POC의 독자성이 약해진다

따라서 이번 repo의 채택 원칙은 아래로 고정한다.

`PatternFly는 구조용 시스템으로 채택하고, 시각 톤과 템플릿 카드 경험은 repo 전용 토큰과 컴포넌트로 재정의한다.`

## 3. 도입 범위

### 3.1 그대로 활용할 영역

- Button
- Card
- Label
- Drawer
- Table
- 기본 spacing / focus / a11y 동작

### 3.2 repo 전용으로 덮어쓸 영역

- 글로벌 배경과 surface 톤
- typography 스케일
- table density와 상태 표현 톤
- assistant drawer 내부 위계
- template card shell
- page shell의 리듬과 강조 규칙

### 3.3 이번 단계에서 하지 않는 것

- PatternFly 기본 page demo를 그대로 복제
- PatternFly visual identity를 제품 identity처럼 사용
- A2UI renderer 재도입
- 실제 데이터 연동

## 4. 패키지 구성

현재 repo에는 아래 패키지를 추가했다.

```txt
@patternfly/react-core
@patternfly/react-table
@patternfly/react-icons
@patternfly/react-tokens
```

의도는 간단하다.

- `react-core`: 버튼, 카드, 라벨, 드로어 등 기본 UI primitive
- `react-table`: admin 중심 테이블 조립
- `react-icons`: 운영 상태 표현용 아이콘 확장 여지
- `react-tokens`: 이후 semantic token 매핑 시 활용

## 5. 테마 전략

이번 POC의 시각 기준은 UX/UI 문서의 다크 뉴트럴 팔레트다.

### 5.1 제품 토큰

```txt
background      #0F1722
surface base    #16202D
surface raised  #1B2736
surface drawer  #111A26
border subtle   #253244
border strong   #32465E
text primary    #E8EEF7
text secondary  #A7B4C5
text muted      #7D8B9F
action blue     #4C8DFF
success green   #34C38F
warning amber   #F0B35A
danger red      #E46A6A
```

### 5.2 적용 원칙

- PatternFly base CSS는 불러오되, 글로벌 CSS에서 surface / border / text / button / table tone을 override 한다
- 테이블은 `compact` 밀도를 기본으로 유지한다
- 카드보다 border hierarchy를 우선한다
- assistant drawer는 별도 제품처럼 보이지 않고 메인 admin의 side workspace처럼 보여야 한다

## 6. 구현 구조

현재 스캐폴드 기준 구조는 아래다.

```txt
src/app/
  layout.tsx
  page.tsx
  deploy/page.tsx
  approve/page.tsx
  rollback/page.tsx

src/devops-chat/
  content.ts
  console-page.tsx
  console-page.module.css
```

역할은 아래와 같다.

- `layout.tsx`: PatternFly base CSS와 폰트, 메타데이터 적용
- `globals.css`: repo 전용 dark theme token과 PatternFly override
- `content.ts`: `/deploy`, `/approve`, `/rollback`별 seed 성격의 화면 데이터
- `console-page.tsx`: header, summary, toolbar, table, detail, drawer를 한 번에 렌더하는 공통 shell
- route page들: 페이지별 content를 바인딩

## 7. 현재 구현된 뼈대

이번 작업으로 아래가 반영되었다.

- `/` 진입 시 `/deploy`로 이동
- `/deploy`, `/approve`, `/rollback` 기본 화면 생성
- 상단 header + tab navigation
- reset notice strip
- summary metric card
- filter/action toolbar
- PatternFly `Table` 기반 admin list
- selection detail panel
- PatternFly `Drawer` 기반 AI assistant panel
- template card 영역과 command bar 스캐폴드

아직 이번 단계에서 의도적으로 남겨둔 것은 아래다.

- 실제 in-memory store
- seed JSON 로딩
- 템플릿 상태 전이 액션
- prompt routing / autofill 로직
- 진짜 selectable row state

## 8. 다음 구현 단계

### 8.1 foundation 정리

- `src/devops-chat/foundation/` 계층 분리
- semantic status token 정식화
- 공통 badge / panel / section header wrapper 작성

### 8.2 shell 분해

- app shell
- admin table shell
- detail panel shell
- assistant drawer shell

현재는 빠른 검증을 위해 한 컴포넌트에 묶어뒀고, 다음 단계에서 분리하는 것이 좋다.

### 8.3 state 붙이기

- seed JSON 추가
- Zustand store 구성
- deploy / approve / rollback action 추가
- template envelope builder 추가

### 8.4 template 컴포넌트 붙이기

- `quick_deploy_launchpad`
- `deployment_approval_inbox`
- `rollback_summary`
- `dry_run_stepper`
- `confirm_action`

## 9. 구현 가드레일

반드시 지킬 것:

- chat bubble UI로 회귀하지 않기
- 화려한 gradient hero 섹션 넣지 않기
- 둥근 consumer card 중심 대시보드로 변형하지 않기
- 상태를 row 전체 배경색으로 칠하지 않기
- drawer가 메인 content를 대체하지 않게 유지하기

가급적 피할 것:

- 기본 PatternFly 색을 그대로 노출하는 버튼/배지 조합
- 지나치게 vendor-like한 icon 과다 사용
- template card를 generic card grid처럼 보이게 만드는 배치

## 10. 결론

이 repo에서의 PatternFly 채택은 `완제품 디자인 시스템 도입`이라기보다 `enterprise admin 구조를 빠르게 확보하는 구조 채택`에 가깝다.

즉 앞으로의 방향은 아래 한 줄로 요약된다.

`PatternFly로 정보 구조와 interaction primitive를 잡고, 이 repo의 문서가 정의한 DevOps admin 톤으로 시각 체계를 고정한다.`
