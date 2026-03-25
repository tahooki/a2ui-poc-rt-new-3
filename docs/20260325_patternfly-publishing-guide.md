# PatternFly 퍼블리싱 가이드

## 1. 문서 목적

이 문서는 현재 repo의 `PatternFly + repo custom theme` 방향을 기준으로, 실제 화면을 퍼블리싱할 때 필요한 구조와 우선순위를 정리한 실행 가이드다.

이 문서의 대상은 아래다.

- UI 퍼블리싱 담당자
- 프론트엔드 구현자
- shell 분해와 template card 구현을 이어받는 개발자

참조 문서:

- [20260324_json-devops-a2ui-poc-spec.md](./20260324_json-devops-a2ui-poc-spec.md)
- [20260324_json-devops-a2ui-poc-ux-ui-design.md](./20260324_json-devops-a2ui-poc-ux-ui-design.md)
- [20260324_patternfly-adoption-plan.md](./20260324_patternfly-adoption-plan.md)
- [20260324_patternfly-component-mapping.md](./20260324_patternfly-component-mapping.md)

## 2. 퍼블리싱 목표

이번 퍼블리싱의 핵심은 아래 한 줄이다.

`실제 DevOps admin처럼 보이는 메인 화면 위에, 우측 AI assistant drawer가 자연스럽게 결합된 운영 UI를 만든다.`

따라서 퍼블리싱 판단 기준은 아래로 고정한다.

- 메인 admin content가 항상 주인공이어야 한다
- assistant는 side workspace처럼 보여야 한다
- dense하지만 읽히는 화면이어야 한다
- 페이지마다 다르게 보여도 shell rhythm은 같아야 한다
- 카드보다 table, panel, status hierarchy가 우선이다

## 3. 현재 구현 기준

현재 repo에는 아래 스캐폴드가 이미 있다.

```txt
src/app/layout.tsx
src/app/globals.css
src/app/deploy/page.tsx
src/app/approve/page.tsx
src/app/rollback/page.tsx
src/devops-chat/content.ts
src/devops-chat/console-page.tsx
src/devops-chat/console-page.module.css
```

현재 퍼블리싱 상태:

- `/` -> `/deploy` redirect 존재
- `/deploy`, `/approve`, `/rollback` 정적 화면 존재
- 공통 shell 존재
- summary strip 존재
- filter/action bar 존재
- PatternFly table 존재
- detail panel 존재
- assistant drawer 존재
- template card shell 존재

아직 미구현:

- row selection interaction
- seed JSON 연동
- Zustand store
- typed template renderer
- 실제 액션 상태 전이

즉, 지금은 `레이아웃 퍼블리싱 + 시각 골격` 단계다.

## 4. 공통 퍼블리싱 원칙

### 4.1 shell 구조

모든 페이지는 아래 순서로 퍼블리싱한다.

1. global header
2. reset notice
3. page intro
4. summary strip
5. filter/action bar
6. main content area
7. right assistant drawer

이 순서를 바꾸지 않는다.

### 4.2 시각 우선순위

시각적 위계는 아래 순서로 잡는다.

1. page title / section title
2. table / selected detail panel
3. status / filter / action
4. assistant context / template card
5. 보조 설명 문구

assistant가 1~2순위를 가져가면 안 된다.

### 4.3 spacing rhythm

현재 repo 기준 rhythm은 아래 수준으로 맞춘다.

- page outer padding: 24px
- section gap: 20px
- card / panel inner gap: 12px ~ 16px
- summary strip card gap: 12px
- main content split gap: 16px
- drawer inner padding: 18px

### 4.4 typography

- page title: 24px / 700
- section title: 14px ~ 18px / 600
- body: 12px ~ 13px
- label / eyebrow: 11px
- mono info: version, id, timestamp, environment 값에 제한적으로 사용

### 4.5 color

글로벌 tone은 반드시 아래 product token을 우선한다.

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

PatternFly 기본 색이 보여도 되지만, 제품 화면의 기준색으로 보이면 안 된다.

## 5. 공통 페이지 퍼블리싱 순서

### 5.1 1단계: shell 먼저

먼저 아래만 만든다.

- header
- nav
- notice
- page intro
- summary strip
- toolbar
- content split
- drawer

이 단계에서는 실제 데이터 상태보다 `구조와 리듬`이 더 중요하다.

### 5.2 2단계: main content 고도화

그 다음 아래를 붙인다.

- table column density 조정
- detail panel section 분리
- status label tone 통일
- empty / loading / selected states

### 5.3 3단계: assistant drawer 고도화

- context summary
- suggested intents
- short activity log
- template card shell
- composer bar

### 5.4 4단계: template 분리

- `quick_deploy_launchpad`
- `deployment_approval_inbox`
- `rollback_summary`
- `dry_run_stepper`
- `confirm_action`

## 6. 페이지별 퍼블리싱 기준

## 6.1 `/deploy`

### 필수 블록

- summary strip
- filter/action bar
- deployment table
- selected deployment detail panel
- assistant drawer
- `quick_deploy_launchpad` shell

### table 컬럼 우선순위

1. Service
2. Environment
3. Target Version
4. Strategy
5. Requested By
6. Updated At
7. Status

### detail panel 필수 섹션

- 기본 정보
- 최근 성공 배포
- artifact 정보
- health check 정보
- activity log

### 퍼블리싱 포인트

- `Status`는 마지막 열에 두고 label로 처리한다
- version, artifact, deployment id는 mono 적용 가능
- 배포 페이지는 “실행 준비” 인상이 중요하므로 CTA가 너무 많아 보이면 안 된다

### 구현 체크리스트

- table row density가 과하게 넓지 않은가
- detail panel이 table보다 더 강하게 보이지 않는가
- assistant가 deploy action보다 더 화려하지 않은가

## 6.2 `/approve`

### 필수 블록

- summary strip
- filter/action bar
- approval request table
- approval detail panel
- assistant drawer
- `deployment_approval_inbox` shell

### table 컬럼 우선순위

1. Request ID
2. Service
3. Environment
4. Requested By
5. Risk
6. Verification
7. Status

### detail panel 필수 섹션

- 요청 개요
- 변경 요약
- 영향 범위
- 검증 체크
- 롤백 가능 여부
- 관련 메모

### 퍼블리싱 포인트

- 승인 페이지는 리스크와 검증 정보가 먼저 읽혀야 한다
- 빨간색은 실제 high risk일 때만 제한적으로 쓴다
- “승인” 버튼은 강하되, 전체 화면이 CTA처럼 보이면 안 된다

### 구현 체크리스트

- risk 정보가 단순 장식 label로 끝나지 않는가
- verification 정보가 별도 근거 없이 비어 보이지 않는가
- hold / approve 액션 구분이 충분히 명확한가

## 6.3 `/rollback`

### 필수 블록

- summary strip
- filter/action bar
- rollback candidate table
- rollback analysis detail panel
- assistant drawer
- `rollback_summary` shell

### table 컬럼 우선순위

1. Service
2. Incident
3. Current Version
4. Last Stable
5. Severity
6. Updated At
7. Status

### detail panel 필수 섹션

- 장애 요약
- 최근 배포 이력
- 후보 복귀 버전
- 영향 서비스
- operator note

### 퍼블리싱 포인트

- rollback 화면은 위험 작업이지만 panic UI처럼 보이면 안 된다
- current version과 rollback target은 명확히 대비돼야 한다
- dry run과 final confirm은 분리된 단계처럼 보여야 한다

### 구현 체크리스트

- 위험도를 색만으로 전달하고 있지 않은가
- stable version이 visually buried 되지 않았는가
- confirm 계층이 나중에 붙기 쉬운 구조인가

## 7. Assistant Drawer 퍼블리싱 기준

### 블록 순서

1. drawer header
2. context summary
3. suggested intents
4. message log
5. template card
6. composer

### 각 블록 규칙

drawer header:

- title + 짧은 설명
- page context를 다시 말할 필요는 없음

context summary:

- key/value 구조 유지
- compact하게 보여야 함

suggested intents:

- chat quick reply가 아니라 admin chip 톤
- 3개 전후 유지

message log:

- 최근 2~4개까지만
- 말풍선 UI 금지

template card:

- drawer 안의 주인공
- CTA 1개 + 보조 액션 1개 수준 유지

composer:

- input보다 command bar 인상
- placeholder는 작업 지시형 문장 사용

## 8. 반응형 기준

### desktop

- summary strip: 4열 유지
- main content: table + detail panel + drawer 구조 유지

### tablet

- summary strip: 2열
- main content: table/detail는 세로 적층 가능
- drawer는 아래로 내려가도 되지만 assistant 독립 섹션처럼 보여야 한다

### mobile

- summary strip: 1열
- nav는 wrap 허용
- table은 완전한 운영 화면이 아니라 “검토용 축약 버전”으로 보일 수 있어도 괜찮다
- drawer는 별도 page처럼 보이기보다 stacked panel처럼 보여야 한다

## 9. Do / Don't

### Do

- table first
- border hierarchy first
- assistant를 secondary workspace로 유지
- dark neutral base 위에 제한된 accent 사용
- card보다 section composition에 집중

### Don't

- bubble chat UI
- hero section
- glow / sparkles / AI mascot
- oversized rounded dashboard card
- row 전체를 상태 색으로 채우는 표현
- assistant가 메인 content보다 더 큰 시각적 존재감을 갖는 배치

## 10. 퍼블리싱 완료 기준

아래가 되면 “퍼블리싱 완료”로 본다.

- `/deploy`, `/approve`, `/rollback`가 같은 shell rhythm을 가진다
- 각 페이지의 table / detail / drawer 정보 구조가 명확하다
- PatternFly 기본 컴포넌트가 보여도 vendor 제품처럼 보이지 않는다
- assistant가 support layer로 읽힌다
- static content만으로도 실제 운영 툴 같은 인상을 준다
- 이후 store / template / action 로직이 붙기 쉬운 구조다

## 11. 다음 작업 연결

이 문서 다음 단계로 바로 이어질 작업은 아래다.

1. `console-page.tsx`를 shell 하위 컴포넌트로 분해
2. summary strip / toolbar / detail panel 공통 컴포넌트화
3. template card를 페이지별 개별 컴포넌트로 분리
4. seed JSON과 store 연결
5. row selection과 drawer context 연결
