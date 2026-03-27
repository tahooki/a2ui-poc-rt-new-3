# Deploy 구조 및 필드 수정계획서

## 1. 목적

현재 deploy workflow는 `/deploy/image`, `/deploy/request`, `/deploy/run` 으로 분리되는 방향은 맞지만, 각 페이지의 의미와 연결 방식이 아직 실제 AWS/ECR/ECS workflow에 충분히 맞춰져 있지 않다.

이번 수정의 목적은 다음과 같다.

- `/deploy/image`를 이미지 생성/등록 단계로 수정한다
- `/deploy/request`를 등록된 이미지를 선택해 배포 요청을 만드는 단계로 수정한다
- `/deploy/run`을 요청 기반 실행/추적 단계로 수정한다
- 각 페이지 상단에 AWS 기준 의미와 역할을 설명하는 description 영역을 둔다
- 현재 구현된 deploy workflow를 "실제 운영자가 거치는 단계"에 더 가깝게 수정한다

## 2. 핵심 수정 방향

deploy workflow는 아래 의미로 고정한다.

### `/deploy/image`

의미:
- AWS ECR 또는 registry에 push된 이미지 정보를 등록/관리하는 단계

사용자 행동:
- 로컬 build/push 결과를 기준으로 image metadata를 등록
- 등록된 이미지 목록을 관리

### `/deploy/request`

의미:
- 등록된 이미지를 기반으로 ECS-style deploy request 또는 deployment definition을 만드는 단계

사용자 행동:
- 등록된 이미지 중 하나를 선택
- 서비스/환경/deploy config를 설정
- request 생성

### `/deploy/run`

의미:
- 생성된 request를 기반으로 ECS service update / deployment execution을 추적하는 단계

사용자 행동:
- 실행할 request 확인
- 배포 시작
- rollout / health / verify 추적

## 3. 현재 구현에서 수정이 필요한 점

현재 image/request/run 구조는 분리되었지만, 아래 문제가 있다.

- image 단계가 "이미지 생성/등록"보다 "후보 이미지 보기"에 가깝다
- image 단계에서 request로 바로 이어지는 CTA가 있었다
- request 단계가 "등록된 image 선택 후 요청 생성"보다 handoff 느낌에 가까울 수 있다
- run 단계는 request 기반 실행으로 더 명확히 읽혀야 한다
- 각 페이지가 AWS workflow 상 어떤 의미인지 설명이 부족하다

## 4. 페이지별 수정 계획

## 4.1 `/deploy/image`

### 목표 역할

이미지를 생성/등록하는 단계로 수정

### 반영할 의미 설명

페이지 상단 description에 아래 성격을 반영한다.

- 이 단계는 AWS에서 ECR에 push된 이미지 또는 registry artifact를 관리하는 흐름을 단순화한 것이다
- 운영자는 먼저 어떤 이미지가 배포 가능한지 등록/확인해야 한다

### UI 수정 방향

현재 "artifact candidate / request handoff" 느낌을 제거하고, 아래 구조로 수정한다.

#### 상단
- 페이지 제목
- AWS 의미 설명 description
- 현재 단계 안내

#### 메인
- 이미지 등록 form
- 등록된 이미지 목록 table
- 선택된 이미지 detail

### 이미지 등록 form 필드

필수:
- `Repository`
- `Image tag`
- `Image URI`
- `Git ref` 또는 `Commit SHA`

보조:
- `Image digest`
- `Build status`
- `Pushed at`

### 제거할 것

- request로 바로 넘기는 CTA
- `선택 이미지로 요청 작성` 강조 흐름
- AI로 이어지는 버튼

### 기대 효과

이 페이지는 "배포 전에 먼저 이미지를 registry에 등록하는 단계"처럼 보여야 한다.

## 4.2 `/deploy/request`

### 목표 역할

등록된 이미지를 선택해서 deploy request를 생성하는 단계로 수정

### 반영할 의미 설명

페이지 상단 description에 아래 성격을 반영한다.

- 이 단계는 AWS ECS task definition / service deployment config를 단순화한 request 작성 단계다
- 운영자는 등록된 이미지 중 하나를 선택하고, 어떤 방식으로 배포할지 정의한다

### UI 수정 방향

현재 "선택된 이미지가 자동 handoff된 상태"를 약화하고, "사용자가 request 페이지에서 직접 등록된 image를 고른다"는 장면을 만든다.

#### 상단
- 페이지 제목
- AWS 의미 설명 description
- 현재 단계 안내

#### 메인
- registered image select list 또는 image picker table
- request form
- preflight / request summary

### 필수 필드

#### image 선택
- `Selected image`
  - source: `/deploy/image`에서 등록된 이미지 목록

#### request 필드
- `Service`
- `Environment`
- `CPU`
- `Memory`
- `Container port`
- `Desired count`
- `Deployment strategy`
- `Minimum healthy percent`
- `Maximum percent`
- `Health check path`
- `Health check grace period`
- `Rollback baseline`
- `Requested by`

선택:
- `Execution profile`
- `Operator note`

### validation / gating

- 등록된 image가 없으면 request 생성 불가
- image를 선택하지 않으면 request form 비활성
- 필수 필드 누락 시 request 생성 버튼 비활성

### 제거할 것

- image 단계에서 이미 handoff되었다는 과도한 전제
- AI shortcut 버튼

### 기대 효과

이 페이지는 "등록된 image를 선택하고 배포 정의를 만드는 실제 운영 단계"처럼 보여야 한다.

## 4.3 `/deploy/run`

### 목표 역할

request 기반 실행/추적 단계로 수정

### 반영할 의미 설명

페이지 상단 description에 아래 성격을 반영한다.

- 이 단계는 AWS ECS service deployment / rollout monitoring을 단순화한 실행 추적 단계다
- 운영자는 생성된 request를 기준으로 배포를 시작하고 상태를 확인한다

### UI 수정 방향

현재 run 페이지를 "실행 상태 보기"에서 더 나아가, "어떤 request를 실행하는지"가 먼저 보이도록 수정한다.

#### 상단
- 페이지 제목
- AWS 의미 설명 description
- 현재 단계 안내

#### 메인
- selected request summary
- selected image summary
- rollout / verify panel
- health / event log
- run timeline

### 필수 표시 값

- `Request ID`
- `Selected image`
- `Service`
- `Environment`
- `CPU`
- `Memory`
- `Desired count`
- `Deployment strategy`
- `Current stage`
- `Rollout progress`
- `Health status`
- `Verification status`

보조:
- `Task definition revision` 느낌의 identifier
- `Running count`
- `Events`

### validation / gating

- request가 없으면 run 시작 불가
- 실행 전에는 empty state 표시
- request 기반 context가 없으면 run detail 렌더 최소화

### 기대 효과

이 페이지는 "요청으로 만들어진 배포를 실행하고 추적하는 단계"처럼 보여야 한다.

## 5. 페이지 상단 description 규칙

세 페이지 모두 상단에 아래 2가지를 반드시 넣는다.

### 1. 제품 내 역할 설명

- 이 페이지에서 사용자가 무엇을 하는지

### 2. AWS 의미 설명

- AWS/ECR/ECS의 어떤 단계/개념을 단순화해서 보여주는지

예시 톤:
- `/deploy/image`
  - `Registry에 push된 이미지를 등록하고 배포 가능한 artifact로 관리하는 단계입니다.`
- `/deploy/request`
  - `등록된 이미지를 기준으로 ECS-style deploy request를 구성하는 단계입니다.`
- `/deploy/run`
  - `생성된 request를 실행하고 rollout 및 verification 상태를 추적하는 단계입니다.`

## 6. 데이터 연결 수정

### image -> request

- request는 image registry 목록을 참조
- 자동 handoff가 아니라 사용자가 request에서 선택
- `selectedImageId`를 request draft에 저장

### request -> run

- run은 request를 기준으로 생성
- `requestId`를 중심으로 실행 상태 추적
- run 페이지에서 image와 request context를 동시에 표시

## 7. 제거 대상

이번 수정에서 제거하거나 약화할 요소:

- image 단계에서 request로 바로 보내는 CTA
- deploy 내부 AI shortcut 버튼
- "이미 선택된 이미지가 자동으로 handoff되었다"는 과도한 연출
- AWS 의미와 맞지 않는 decorative summary

## 8. 구현 우선순위

### 1단계

- `/deploy/image`를 등록 중심 화면으로 수정
- request direct CTA 제거
- 등록 form + registered image list 정리

### 2단계

- `/deploy/request`에 registered image select list 추가
- request form 필드 AWS 기준으로 확장
- image 미선택 시 gating 추가

### 3단계

- `/deploy/run`에서 request 기반 summary 강화
- 실행 context 구조 보강

### 4단계

- 세 페이지 상단 description 공통 규칙 적용
- AWS 의미 설명 반영

## 9. 성공 기준

이 수정이 완료되면 아래가 충족되어야 한다.

- `/deploy/image`는 "이미지 생성/등록 단계"처럼 보인다
- `/deploy/request`는 "등록된 이미지를 선택해 request를 만드는 단계"처럼 보인다
- `/deploy/run`은 "request를 실행/추적하는 단계"처럼 보인다
- 각 페이지 상단에서 AWS 의미가 이해된다
- deploy workflow의 연결 구조가 더 자연스러워진다

## 10. 한 줄 요약

이번 수정은 deploy workflow를 `이미지 생성/등록 -> 등록된 이미지를 선택 후 request 생성 -> request 실행/추적` 구조로 바로잡고, 각 페이지가 AWS ECR/ECS에서 어떤 작업을 단순화한 것인지 상단 description으로 설명되도록 만드는 작업이다.
