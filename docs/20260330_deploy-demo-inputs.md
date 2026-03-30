# Deploy 시연 입력값 정리

이 문서는 `/deploy/image` 와 `/deploy/request` 시연 때 바로 넣을 값을 빠르게 참고하려고 만든 메모다.

값 기준:

- seed 이미지 데이터: `src/devops-chat/data/seed/deploy.json`
- 폼 옵션: `src/devops-console/deploy/deploy-workflow-page.tsx`
- request 기본값: `src/devops-chat/store/app-store.ts`

## 가장 안전한 시연 기준

가장 무난한 서비스는 `payments-api` 다.

이유:

- seed 첫 번째 이미지가 `payments-api:v2.3.18-rc1` 이다.
- request draft 기본값이 첫 번째 seed 이미지 기준으로 먼저 잡힌다.
- `service`, `environment`, `deployment strategy`, `rollback baseline` 흐름이 가장 자연스럽다.

주의:

- `/deploy/request` 에서는 `/deploy/image` 에서 선택한 이미지가 자동으로 넘어오지 않는다.
- request 화면의 `Image picker` 에서 이미지를 다시 선택해야 한다.
- request 생성 버튼이 활성화되려면 실질적으로 `이미지 선택 + CPU + Memory` 가 꼭 필요하다.

## 빠른 시연 경로

이미 등록된 seed 이미지를 그대로 쓰는 방법이다.

### Step 1. `/deploy/request`

`Image picker` 에서 아래 row를 선택:

- Repository: `payments-api`
- Image tag: `v2.3.18-rc1`
- Image URI: `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/payments-api:v2.3.18-rc1`

### Step 2. Request form

아래처럼 넣으면 된다.

| 필드 | 넣을 값 | 비고 |
| --- | --- | --- |
| Selected image | 자동 표시 | image picker에서 선택하면 채워짐 |
| Service | `payments-api` | 기본값으로 이미 들어가 있음 |
| Environment | `production` | 기본 선택값 |
| Deployment strategy | `rolling` | 기본 선택값 |
| CPU | `1024` | 드롭다운에서는 `1 vCPU` |
| Memory | `2048` | 드롭다운에서는 `2 GiB` |
| Container port | `8080` | 기본값 |
| Desired count | `4` | 기본값 |
| Minimum healthy percent | `100` | 기본값 |
| Maximum percent | `200` | 기본값 |
| Rollback baseline | `v2.3.18-rc1` | 현재 기본값과 맞춤 |
| Requested by | `operator.manual` | 기본값 |
| Execution profile | `standard` | 기본값 |
| Operator note | `payments-api production demo deploy` | 선택 입력 |

### 빠른 시연용 한 줄 요약

실제로 손으로 바꿔야 하는 값은 거의 아래 3개만 보면 된다.

- 이미지: `payments-api:v2.3.18-rc1`
- CPU: `1024`
- Memory: `2048`

## 등록까지 보여주는 전체 시연 경로

새 이미지를 등록한 뒤 request까지 만드는 흐름이다.

기존 seed 패턴을 그대로 따라가되, 목록 중복을 피하려고 tag만 하나 올린 버전이다.

### Step 1. `/deploy/image` > 등록 탭

| 필드 | 넣을 값 | 비고 |
| --- | --- | --- |
| Repository | `payments-api` | seed 패턴 유지 |
| Image tag | `v2.3.19-rc1` | 기존 `v2.3.18-rc1` 다음 버전 느낌 |
| Image URI | `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/payments-api:v2.3.19-rc1` | repository + tag 조합 |
| Git ref | `refs/heads/release/payments-2.3` | 기존 seed와 동일 패턴 |
| Commit SHA | 비워둠 | `gitRef` 를 넣었으므로 생략 가능 |
| Image digest | 비워둠 | 비우면 내부적으로 `sha256:pending` 처리 |
| Build status | `push_verified` | 데모상 가장 보기 좋음 |
| Pushed at | 비워둠 | 비우면 내부적으로 `just now` 처리 |

이 단계에서 꼭 필요한 값:

- `Repository`
- `Image tag`
- `Image URI`
- `Git ref` 또는 `Commit SHA`

### Step 2. `/deploy/request`

`Image picker` 에서 방금 등록한 row를 선택:

- Repository: `payments-api`
- Image tag: `v2.3.19-rc1`

그다음 request form은 아래 값으로 맞춘다.

| 필드 | 넣을 값 |
| --- | --- |
| Service | `payments-api` |
| Environment | `production` |
| Deployment strategy | `rolling` |
| CPU | `1024` |
| Memory | `2048` |
| Container port | `8080` |
| Desired count | `4` |
| Minimum healthy percent | `100` |
| Maximum percent | `200` |
| Rollback baseline | `v2.3.19-rc1` |
| Requested by | `operator.manual` |
| Execution profile | `standard` |
| Operator note | `new image registration demo for payments-api` |

## 드롭다운 / 버튼 선택값 메모

### Build status

- `registered`
- `push_verified`
- `build_failed`

### Environment

- `production`
- `staging`

### Deployment strategy

- `rolling`
- `canary_10_50_100`
- `blue_green`

### CPU

- `256` = `0.25 vCPU`
- `512` = `0.5 vCPU`
- `1024` = `1 vCPU`
- `2048` = `2 vCPU`

### Memory

- `512` = `512 MiB`
- `1024` = `1 GiB`
- `2048` = `2 GiB`
- `4096` = `4 GiB`

## 다른 seed 이미지 참고값

필요하면 아래 seed도 그대로 시연에 쓸 수 있다.

### checkout

- Repository: `checkout`
- Image tag: `v1.8.42`
- Image URI: `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/checkout:v1.8.42`
- Git ref: `refs/tags/checkout-1.8.42`
- Commit SHA: `4be78df1`
- Build status: `registered`

### catalog-api

- Repository: `catalog-api`
- Image tag: `v4.2.1`
- Image URI: `123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/catalog-api:v4.2.1`
- Git ref: `refs/heads/release/catalog-4.2`
- Commit SHA: `991d23ef`
- Build status: `registered`

## 시연 직전 체크

- 새 이미지를 등록해도 `/deploy/request` 에서 다시 선택해야 한다.
- `CPU` 와 `Memory` 는 기본값이 비어 있으니 꼭 골라야 한다.
- 빠르게 보여주려면 `payments-api` 기준으로 가는 것이 가장 안정적이다.
