# JSON 기반 DevOps Chat Template POC 설계 문서

## 문서 목적

이 문서는 새롭게 만드는 DevOps Chat Template POC의 구현 기준 문서다.

이번 POC는 기존 데모보다 범위를 좁히고 메시지를 더 분명하게 가져간다.
핵심은 아래 한 문장이다.

`복잡한 DevOps 작업을 Chatbot + 템플릿 UI가 이해하기 쉬운 작업 흐름으로 재구성해, 사용자는 적은 입력과 적은 판단으로 배포/승인/롤백을 수행할 수 있다.`

이번 버전은 실제 인프라 연동보다 UX 설득력을 우선한다.
저장소는 DB 대신 `JSON seed + 메모리 상태`를 사용하고, 브라우저 새로고침 시 초기 상태로 돌아간다.

---

## 핵심 설계 결정

1. POC 범위는 `배포하기`, `배포 승인`, `롤백하기` 3개 플로우로 한정한다.
2. 각 플로우는 `실제 DevOps admin 화면`을 기준으로 설계하고, 우측 `AI 챗봇 오버레이`에서 템플릿 UI를 여는 구조로 만든다.
3. admin 화면은 일부러 복잡하게 연출하지 않고, 실제 운영 도구처럼 자연스러운 정보 구조와 액션 구성을 가진다.
4. AI 챗봇 오버레이 안의 템플릿 UI는 실제로 동작해야 하며, 버튼 액션에 따라 메모리 상태가 바뀌어야 한다.
5. 데이터 저장은 정적 JSON을 읽어 메모리 store에 올리고, 이후 액션은 메모리만 변경한다.
6. 새로고침 시 상태는 seed JSON 기준으로 초기화된다. `localStorage`는 사용하지 않는다.
7. AI가 템플릿을 선택하고 템플릿용 typed data를 만드는 구조는 유지하되, 렌더링은 React 컴포넌트로 직접 구현한다.

---

## 제품 범위

### 포함

- `배포하기` 페이지
- `배포 승인` 페이지
- `롤백하기` 페이지
- 챗봇 입력창
- React 템플릿 컴포넌트 렌더링
- 메모리 기반 상태 전이
- JSON seed 로딩
- 리셋 안내 문구

### 제외

- 실제 AWS/ECR/ECS/EKS 연동
- 실제 Docker build
- 실제 배포 로그 수집
- 실제 인증/권한 체계
- 영구 저장
- 범용 운영 콘솔 기능 전체

---

## 성공 기준

- 사용자가 기존 방식이 번거롭다고 즉시 느낀다.
- 같은 작업이 AI 챗봇 오버레이 안에서 더 적은 입력과 판단으로 진행된다고 느껴진다.
- AI가 단순 챗봇이 아니라 `자동 구성 + 다음 액션 제안` 역할을 한다고 느껴진다.
- 세 플로우 모두 실제 버튼 클릭으로 상태가 변한다.
- 새로고침 시 초기화되어 데모 재현성이 높다.

---

## 정보 구조

새 POC는 별도 섹션으로 구성하는 것을 권장한다.

- `/deploy`
- `/approve`
- `/rollback`

공통 레이아웃은 아래를 가진다.

- 상단 헤더
- 현재 시나리오 설명
- `이 데모 상태는 새로고침하면 초기화됩니다` 안내
- 메인: DevOps admin 본 화면
- 우측 오버레이: Chatbot + AI 템플릿 UI

공통 상단 네비게이션은 아래 3개 탭만 두는 것이 적당하다.

- `배포하기`
- `배포 승인`
- `롤백하기`

---

## 템플릿 재사용 방향

새 POC는 기존 카드의 `템플릿 개념`과 `상태 흐름`을 재사용한다.

- 배포하기: `quick_deploy_launchpad`
- 배포 승인: `deployment_approval_inbox`
- 롤백하기: `rollback_summary`
- 롤백 후속 단계: `dry_run_stepper`, `confirm_action`

즉 새 POC는 템플릿 체계를 새로 버리는 것이 아니라,
기존 카드 유형을 `React 템플릿 컴포넌트`로 다시 구현하는 방향이다.

여기서 유지하는 것은 아래다.

- 템플릿 ID
- 템플릿별 역할
- 템플릿별 데이터 shape
- 템플릿별 액션 흐름

반대로 이번에 제거하는 것은 아래다.

- Google A2UI schema 강제
- A2UI renderer 의존성
- A2UI viewer를 위한 JSON component tree 생성

---

## UX 원칙

### DevOps admin 본 화면

admin 화면은 아래 인상을 줘야 한다.

- 실제 운영자가 쓸 법한 정보 구조를 가진다
- 리스트, 테이블, 상세 패널, 필터, 상태 배지가 자연스럽게 배치된다
- 배포/승인/롤백 각각의 작업 맥락이 실제 업무처럼 보인다
- 사용자가 현재 상태를 파악하고 다음 액션을 선택할 수 있다
- 일부러 복잡하게 보이게 연출하지 않아도 업무 특성상 필요한 판단 포인트가 드러난다

즉 이번 POC의 admin 화면은 `복잡하게 느껴지게 만든 비교용 화면`이 아니라
`실제 어드민다운 메인 작업 화면`이어야 한다.

### AI 챗봇 기반 템플릿 UI

AI 템플릿 UI는 아래 인상을 줘야 한다.

- 사용자의 의도를 바로 이해한다
- 과거 배포 문맥을 참고한다
- 필요한 값 대부분을 자동으로 채운다
- 사람이 직접 입력해야 하는 값은 최소다
- 위험한 작업은 확인 카드로 한 번 더 검증한다

단, 이 UI는 메인 화면을 대체하는 것이 아니라
`우측 오버레이/드로어` 안에서 열리는 assistant workflow여야 한다.

---

## 기술 구조

### 저장 방식

- 정적 JSON 파일을 seed DB처럼 사용한다
- 앱 진입 시 seed JSON을 깊은 복사해 메모리 store에 적재한다
- 모든 액션은 store만 변경한다
- 새로고침 시 다시 seed JSON에서 시작한다

### 상태 저장 위치

권장 구현은 클라이언트 전역 store다.

- Zustand 또는 React context 기반 store
- 서버 DB 없음
- 서버 API는 필수가 아니다

이번 POC에서는 `새로고침 시 초기화`가 의도이므로,
오히려 클라이언트 메모리 기반이 가장 단순하고 적절하다.

### 렌더링 방식

이번 POC는 A2UI renderer를 사용하지 않는다.

대신 아래 구조로 구현한다.

1. 챗봇이 사용자 의도를 해석한다
2. 현재 페이지 문맥과 seed 데이터를 바탕으로 템플릿을 선택한다
3. 선택된 템플릿에 맞는 typed payload를 만든다
4. React 템플릿 렌더러가 `templateId` 기준으로 컴포넌트를 선택한다
5. 해당 컴포넌트가 payload를 받아 UI를 렌더링한다

예시:

```ts
type TemplateEnvelope =
  | { templateId: "quick_deploy_launchpad"; data: QuickDeployTemplateData }
  | { templateId: "deployment_approval_inbox"; data: DeploymentApprovalTemplateData }
  | { templateId: "rollback_summary"; data: RollbackSummaryTemplateData };
```

즉 `AI가 템플릿을 고르고 데이터 형식을 맞춘다`는 핵심은 그대로 유지하고,
`렌더링만 React 컴포넌트로 직접 한다`고 보면 된다.

### 이 방향의 장단점

장점:

- Google A2UI 형식에 맞추느라 생기는 제약이 줄어든다
- 원하는 UI를 더 강한 템플릿 수준으로 직접 만들 수 있다
- 상태, 애니메이션, 인터랙션을 React 방식으로 더 쉽게 제어할 수 있다
- POC 속도와 커스터마이징 자유도가 올라간다

주의할 점:

- A2UI renderer가 주던 구조적 일관성과 범용성은 줄어든다
- 템플릿별 data contract를 직접 엄격하게 관리해야 한다
- 템플릿 컴포넌트와 데이터 shape가 강하게 결합될 수 있다

이번 POC에서는 위 단점이 큰 문제는 아니다.
대신 아래 기준만 지키면 충분하다.

- 템플릿별 TypeScript 타입을 분리한다
- 템플릿 렌더러는 `switch(templateId)` 수준으로 단순하게 유지한다
- 비즈니스 로직과 UI 컴포넌트를 분리한다
- payload 생성 함수를 템플릿별로 둔다

### 권장 파일 구조

```txt
src/devops-chat/
  data/
    seed/
      deploy.json
      approve.json
      rollback.json
  types/
    domain-types.ts
  store/
    app-store.ts
  actions/
    deploy-actions.ts
    approval-actions.ts
    rollback-actions.ts
  lib/
    ai-autofill.ts
    prompt-router.ts
  components/
    layout/
    legacy/
    chatbot/
    templates/
      quick-deploy/
      approval-inbox/
      rollback/
```

구조는 이 수준이면 충분하다.
기존 `src/lib/a2ui-bridge.ts`는 직접 재사용하지 않고,
필요하면 템플릿 구조 참고용으로만 본다.

추가로 아래 계층을 두는 것을 권장한다.

```txt
src/devops-chat/templates/
  types.ts
  build-template-envelope.ts
  template-renderer.tsx
```

여기서 역할은 아래처럼 나눈다.

- `build-template-envelope.ts`: 템플릿 선택 후 payload 생성
- `template-renderer.tsx`: `templateId`에 따라 React 컴포넌트 선택
- `components/templates/*`: 실제 화면 렌더링

---

## 데이터 모델

최소한 아래 엔티티만 있으면 된다.

### 1. Service

```ts
type Service = {
  id: string;
  name: string;
  environment: "production" | "staging";
  dockerfilePath: string;
  ecrRepository: string;
  healthCheckPath: string;
  defaultStrategy: "rolling" | "canary_10_50_100";
};
```

### 2. Deployment

```ts
type Deployment = {
  id: string;
  serviceId: string;
  version: string;
  previousVersion: string;
  status: "succeeded" | "running" | "failed" | "rolled_back";
  rolloutPercent: number;
  createdAt: string;
  isStable: boolean;
};
```

### 3. Artifact

```ts
type Artifact = {
  id: string;
  serviceId: string;
  sourceVersion: string;
  imageTag: string;
  imageUri: string;
  gitRef: string;
  status: "pending" | "building" | "ready" | "failed";
};
```

### 4. DeploymentRequest

```ts
type DeploymentRequest = {
  id: string;
  serviceId: string;
  environment: "production" | "staging";
  targetVersion: string;
  baselineDeploymentId: string;
  strategy: "rolling" | "canary_10_50_100";
  status: "draft" | "approval_pending" | "approved" | "held" | "started";
  requestedBy: string;
  riskSummary: {
    passCount: number;
    warnCount: number;
    failCount: number;
  };
};
```

### 5. DeploymentRun

```ts
type DeploymentRun = {
  id: string;
  serviceId: string;
  artifactId: string;
  requestId: string;
  status: "pending" | "deploying" | "verifying" | "succeeded" | "failed";
  progressPercent: number;
  currentStage: "pending" | "build_ready" | "canary_10" | "canary_50" | "verifying" | "completed";
  message: string;
};
```

### 6. RollbackPlan

```ts
type RollbackPlan = {
  id: string;
  deploymentId: string;
  targetVersion: string;
  status: "draft" | "dry_run_ready" | "approved" | "executed";
  riskSummary: {
    passCount: number;
    warnCount: number;
    failCount: number;
  };
};
```

### 7. Incident

```ts
type Incident = {
  id: string;
  serviceId: string;
  title: string;
  severity: "critical" | "high" | "medium";
  status: "open" | "investigating" | "mitigated";
  linkedDeploymentId: string;
};
```

---

## JSON seed 원칙

seed는 페이지별로 완전히 분리하지 말고,
최종적으로는 공통 shape로 관리하는 편이 낫다.

권장 shape:

```json
{
  "services": [],
  "deployments": [],
  "artifacts": [],
  "deploymentRequests": [],
  "deploymentRuns": [],
  "rollbackPlans": [],
  "incidents": [],
  "auditLogs": []
}
```

페이지별 seed 파일을 따로 두더라도 내부 shape는 통일한다.
그래야 action 함수 재사용이 쉽다.

---

## 상태 전이

### 배포하기

- artifact: `pending -> building -> ready`
- deploymentRequest: `draft -> approval_pending` 또는 `draft -> started`
- deploymentRun: `pending -> deploying -> verifying -> succeeded | failed`

### 배포 승인

- deploymentRequest: `approval_pending -> approved | held`
- approved 이후 필요 시 `started`

### 롤백하기

- rollbackPlan: `draft -> dry_run_ready -> approved -> executed`

상태 전이는 실제 백엔드 로직처럼 복잡하게 만들지 말고,
액션 1회당 한 단계씩 이동시키면 충분하다.

---

## AI 자동 구성 규칙

이번 POC에서 AI는 자유 생성보다 `문맥 기반 자동 채움`을 우선한다.

### 공통 규칙

- 사용자가 서비스명과 환경을 주면 해당 값을 우선 사용
- 명시하지 않으면 현재 페이지 기본 서비스와 환경을 사용
- 배포 관련 기본값은 `최근 성공 배포`를 기준으로 자동 채움
- 승인 관련 근거는 요청 객체의 `riskSummary`, 최근 인시던트, 최근 배포를 조합해 요약
- 롤백 관련 기본값은 `문제 배포 + 직전 안정 배포`를 기준으로 자동 구성

### 사용자가 입력하면 그대로 반영할 값

- serviceId
- environment
- gitRef 또는 version
- 배포 의도
- 승인 여부
- 롤백 실행 의도

### 자동 채울 값

- Dockerfile path
- ECR repository
- image tag 규칙
- deployment strategy
- health check path
- baseline deployment
- rollback target version

---

## 페이지별 상세 설계

## 1. 배포하기 페이지

### 목적

배포 admin 화면에서 현재 배포 상태와 대상 서비스를 확인하고,
AI 챗봇 오버레이가 배포 준비 과정을 얼마나 압축할 수 있는지 보여준다.

### 메인: 배포 admin 화면

메인 화면은 배포 관리용 admin 구조를 가진다.

상단 summary:

- 오늘 배포 예정 수
- 진행 중 배포 수
- 실패 배포 수

필터 / action bar:

- Environment
- Service search
- Status
- Strategy
- `새 배포`

메인 콘텐츠:

- 배포 요청 또는 배포 실행 목록 테이블
- 선택 항목 상세 패널

상세 패널에서 보여줄 정보:

- 서비스 기본 정보
- 최근 성공 배포
- artifact 정보
- rollout 설정
- health check 정보
- activity log

이 화면은 실제 배포 관리 어드민처럼 보여야 한다.

### 우측 오버레이: AI 템플릿 UI + 챗봇

사용 템플릿:

- `quick_deploy_launchpad`

대표 입력:

- `checkout 서비스 production 배포 준비해줘`

AI 동작:

- 현재 선택한 서비스와 환경을 우선 사용
- 최근 성공 배포 기준으로 기본 설정 로드
- image tag 초안 자동 생성
- strategy, health check, repository 자동 채움
- 사용자가 직접 준 gitRef가 있으면 우선 반영

실제 동작 액션:

- `이미지 생성`
- `배포 시작`
- `상태 갱신`

### 배포 페이지에서 보여줘야 할 메시지

- admin 화면: `운영자는 이 화면에서 배포 상태와 대상 서비스를 관리한다`
- AI 챗봇 오버레이: `AI가 현재 문맥을 바탕으로 배포 초안을 구성하고 사용자는 확인 후 실행한다`

---

## 2. 배포 승인 페이지

### 목적

승인 admin 화면에서 요청과 리스크를 검토하고,
AI 챗봇 오버레이가 승인 판단 준비를 얼마나 줄여주는지 보여준다.

### 메인: 승인 admin 화면

구성:

- 요청 목록 테이블
- 선택한 요청 상세 패널
- 리스크 요약 영역
- 정책 체크 항목

표시 정보:

- 서비스
- 대상 버전
- 요청자
- 요청 시각
- 변경 규모
- 최근 실패 여부
- 현재 활성 인시던트 여부

버튼:

- `Approve`
- `Hold`

이 화면은 실제 승인 어드민처럼 보여야 한다.

### 우측 오버레이: AI 템플릿 UI + 챗봇

사용 템플릿:

- `deployment_approval_inbox`

대표 입력:

- `지금 바로 승인 가능한 배포만 보여줘`

AI 동작:

- 요청 목록을 위험도 기준으로 정렬
- 최근 인시던트와 리스크 요약
- 바로 승인 가능한 요청과 상세 검토가 필요한 요청을 구분

실제 동작 액션:

- `승인`
- `상세 보기`
- `보류`

### 승인 페이지에서 보여줘야 할 메시지

- admin 화면: `운영자는 이 화면에서 승인 요청과 리스크를 검토한다`
- AI 챗봇 오버레이: `AI가 판단 근거를 먼저 모아 승인 여부 결정만 남긴다`

---

## 3. 롤백하기 페이지

### 목적

장애 대응 admin 화면에서 인시던트와 배포 이력을 확인하고,
AI 챗봇 오버레이가 롤백 판단과 실행 준비를 빠르게 연결한다는 메시지를 전달한다.

### 메인: 롤백 admin 화면

구성은 3블록이면 충분하다.

#### Block 1. Incident / Metrics

- 현재 장애 요약
- 에러율
- 최근 경고
- 연결된 배포

#### Block 2. Rollback Candidate Lookup

- 최근 배포 목록
- 이전 안정 버전
- 변경 규모

#### Block 3. Rollback Execution

- target version
- dry-run 여부
- 승인 여부

버튼:

- `Run Dry-Run`
- `Request Approval`
- `Execute Rollback`

이 화면은 실제 장애 대응/롤백 admin처럼 보여야 한다.

### 우측 오버레이: AI 템플릿 UI + 챗봇

사용 템플릿:

- `rollback_summary`
- 후속 액션 시 `dry_run_stepper`
- 최종 확인 시 `confirm_action`

대표 입력:

- `checkout 지금 롤백 준비해줘`

AI 동작:

- 문제 배포와 연결된 인시던트 자동 연결
- 직전 안정 버전 자동 추천
- 실패 체크, 승인 상태, 최근 감사 이력 요약

실제 동작 액션:

- `Dry-Run 실행`
- `승인 요청`
- `롤백 실행`

### 롤백 페이지에서 보여줘야 할 메시지

- admin 화면: `운영자는 이 화면에서 장애 상황과 복귀 후보를 판단한다`
- AI 챗봇 오버레이: `현재 장애 문맥 안에서 안전한 다음 액션을 바로 제안한다`

---

## 템플릿 컴포넌트 설계 원칙

템플릿은 범용 위젯 조합이 아니라 `강한 목적형 UI`로 간다.

즉 아래처럼 설계한다.

- `QuickDeployLaunchpadTemplate`
- `DeploymentApprovalInboxTemplate`
- `RollbackSummaryTemplate`
- `DryRunStepperTemplate`
- `ConfirmActionTemplate`

각 템플릿은 자신에게 필요한 데이터만 받는다.
공통 범용 schema를 억지로 맞추지 않는다.

예:

```ts
type QuickDeployTemplateData = {
  serviceName: string;
  environment: "production" | "staging";
  baselineVersion: string;
  imageTag: string;
  strategy: string;
  artifactStatus: "pending" | "building" | "ready" | "failed";
  runStatus: "pending" | "deploying" | "verifying" | "succeeded" | "failed";
  progressPercent: number;
  suggestedFields: Array<{ label: string; value: string; source: "user" | "ai" | "history" }>;
};
```

핵심은 `구글 형식에 맞는 범용 component tree`가 아니라,
`선택된 템플릿이 필요로 하는 명확한 data contract`다.

---

## 챗봇 동작 방식

초기 버전은 과한 자연어 이해가 필요 없다.

권장 방식:

- 사전 정의된 추천 프롬프트 버튼 제공
- 간단한 키워드 라우팅
- 페이지별 기본 intent 우선 처리

예:

- 배포 페이지: `배포`, `다시 배포`, `이미지`, `시작`
- 승인 페이지: `승인`, `보류`, `대기`, `inbox`
- 롤백 페이지: `롤백`, `복구`, `dry-run`, `되돌려`

즉, 이번 POC에서 챗봇은 완전한 범용 비서가 아니라
`현재 admin 화면 문맥 안에서 의도를 빠르게 라우팅하는 우측 assistant 인터페이스`면 충분하다.

---

## 실제 동작 설계

### 배포하기

- `이미지 생성` 클릭 시 artifact 생성 또는 상태 변경
- `배포 시작` 클릭 시 deploy run 생성
- `상태 갱신` 클릭 시 progress 증가
- 마지막에는 `succeeded` 또는 `failed`

### 배포 승인

- `승인` 클릭 시 request 상태를 `approved`
- `보류` 클릭 시 request 상태를 `held`
- `상세 보기` 클릭 시 선택 요청을 확장 표시

### 롤백하기

- `Dry-Run 실행` 클릭 시 rollback plan을 `dry_run_ready`
- `승인 요청` 클릭 시 승인 상태 표시 변경
- `롤백 실행` 클릭 시 deployment 상태를 `rolled_back`로 변경

---

## 지연 연출

현실감을 위해 짧은 지연 연출은 넣는 것이 좋다.

- 이미지 생성: 800ms ~ 1500ms
- 배포 상태 갱신: 클릭 시 1단계씩 진행
- 롤백 dry-run: 500ms ~ 1200ms

실제 비동기 작업이 없어도 된다.
사용자에게 `작업이 진행 중이다`라는 인상만 주면 충분하다.

---

## 구현 우선순위

### 1단계

- 공통 레이아웃
- JSON seed 로더
- 메모리 store
- 배포 페이지 구현

### 2단계

- 배포 승인 페이지 구현
- 승인 상태 전이 구현

### 3단계

- 롤백 페이지 구현
- dry-run / 승인 / 실행 연결

### 4단계

- 챗봇 추천 프롬프트
- AI 자동 채움 문구 polish
- 상태 배지, 안내 문구, admin shell / assistant overlay polish

---

## 최종 합의안

이번 새 POC는 `AWS를 실제로 흉내 내는 제품`이 아니라,
`기존 DevOps admin 작업이 어떤 흐름으로 이뤄지는지`와 `AI 템플릿 UI가 그 작업을 어떻게 줄이는지`를
짧은 시간 안에 설득력 있게 보여주는 데 집중한다.

따라서 아래 기준을 유지한다.

- 메인 화면은 실제 DevOps admin처럼 자연스럽게 구현하게
- AI는 템플릿을 선택하고 typed payload를 만들게
- AI 챗봇은 우측 오버레이에서 현재 문맥을 바탕으로 동작하게
- 렌더링은 React 템플릿 컴포넌트로 직접 구현하게
- 데이터는 JSON seed + 메모리
- 새로고침 시 초기화
- 세 플로우만 확실하게 완성

이 정도면 범위가 과하지 않으면서도,
실제로 구현 가능한 수준의 설계 문서로 충분하다.
