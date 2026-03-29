# 롤백 A2UI 배포 인스턴스 목록 전환 계획

## 현재 상태 진단

현재 롤백 A2UI 흐름:

```
"롤백하고 싶어"
  → getRollbackCandidates (서비스 3개 + 배포 이력)
  → ask_followup: "어떤 서비스를 롤백할까요?" (서비스 이름 선택)
  → "payments-api"
  → rollback_summary (1건 요약 카드: 추천 버전만 표시)
  → [Dry run 시작] → dry_run_stepper → [확인] → confirm_action → [확정]
```

**문제점:**
- 서비스 선택 후 추천 버전 1개만 보여줌 — 다른 배포 인스턴스 선택 불가
- 실제로는 서비스당 여러 배포 이력(deploy-pay-316, deploy-pay-314 등)이 있음
- 운영자는 추천 외 다른 버전으로 롤백하고 싶을 수 있음
- 각 인스턴스의 상태(eligible/risk/evidence)를 비교해서 선택해야 함

## 목표 상태

```
"롤백하고 싶어"
  → getRollbackCandidates (서비스 3개)
  → ask_followup: "어떤 서비스를 롤백할까요?"
  → "payments-api"
  → render_surface: rollback_target_list (배포 인스턴스 목록)
      ┌──────────────────────────────────────────────┐
      │ payments-api 롤백 대상 (production)            │
      │ 현재: v2.3.18 · INC-842 card timeout          │
      │                                                │
      │ ┌── eligible ────────────────────────────────┐ │
      │ │ ⭐ v2.3.16 (추천)        dry_run_ready     │ │
      │ │ risk: low · strategy: canary               │ │
      │ │ "마지막 안정 릴리즈, 카드 결제 정상"          │ │
      │ │                         [이 버전으로 롤백]   │ │
      │ ├────────────────────────────────────────────┤ │
      │ │ v2.3.14                  identified         │ │
      │ │ risk: medium · strategy: rolling            │ │
      │ │ "2주 전 릴리즈, 일부 변경사항 포함"           │ │
      │ │                         [이 버전으로 롤백]   │ │
      │ └────────────────────────────────────────────┘ │
      │                                                │
      │ ── not eligible (1) ──── 접기 ▾               │
      │                                                │
      └──────────────────────────────────────────────┘

  → [v2.3.16으로 롤백] 클릭
  → rollback_summary (선택한 버전 기준 요약) → dry_run → confirm → 확정
```

## 수정 범위

### 핵심 변경

```
기존: serviceName 선택 → 바로 rollback_summary (추천 1건)
변경: serviceName 선택 → rollback_target_list (배포 인스턴스 목록) → 특정 인스턴스 선택 → rollback_summary
```

### 영향 받는 파일

| 파일 | 변경 |
|------|------|
| `types/templates.ts` | `RollbackTargetListTemplateData` 새 타입 |
| `templates/binders/bind-rollback-target-list.ts` | 새 binder |
| `templates/binders/index.ts` | 등록 |
| `templates/template-definitions.ts` | 새 template def |
| `templates/validate-surface-envelope.ts` | validation 추가 |
| `server/decision/policies/rollback.ts` | candidates 있으면 target_list 렌더 |
| `server/orchestration/slot-definitions.ts` | rollback.candidates slot 추가 |
| `server/tools/tool-result-adapter.ts` | candidates → slot 매핑 |
| `actions/action-types.ts` | SELECT_TARGET 액션 추가 |
| `actions/domain/run-rollback-action.ts` | 인스턴스 선택 핸들러 |
| `actions/action-registry.ts` | 새 액션 등록 |
| `devops-console/templates/rollback-target-list.tsx` | 새 UI 컴포넌트 |
| `templates/template-renderer.tsx` | 새 컴포넌트 연결 |
| `template-registry/definitions/rollback-target-list.ts` | registry def |
| `template-registry/template-registry.ts` | 등록 |

---

## Todo List

### A. 타입 정의

* [x] `types/templates.ts`에 `RollbackTargetListTemplateData` 타입 추가
  * [x] `templateId: "rollback_target_list"`
  * [x] `service: string` — 선택된 서비스명
  * [x] `environment: string`
  * [x] `currentVersion: string`
  * [x] `incidentSummary: string`
  * [x] `severity: string`
  * [x] `targets: RollbackTargetItem[]` — 배포 인스턴스 목록
  * [x] `recommendedTargetId: string | null` — 추천 인스턴스 ID
* [x] `RollbackTargetItem` 타입 추가
  * [x] `id, version, deployedAt, strategy, status`
  * [x] `rollbackRisk, rollbackEligible`
  * [x] `whyThisTarget, evidence[]`
  * [x] `isRecommended: boolean`
  * [x] `actions: SurfaceActionDescriptor[]`
* [x] `TemplateEnvelope` union에 추가

### B. Decision policy 변경

* [x] `rollback.ts`에서 serviceName + candidates 있으면 → `render_surface` (target_list)
* [x] surfaceIntent family를 `"rollback.target_list"` vs `"rollback.summary"` 분리
* [x] 기존 `rollback.summary`는 특정 인스턴스 선택 후 사용

### C. Slot definitions 변경

* [x] `rollback.candidates` slot 추가 (type: array, source: tool)
* [x] `rollback.selectedTargetId` slot 추가 (type: string, 인스턴스 선택 시 채움)
* [x] candidates가 있으면 서비스별 인스턴스 목록 사용 가능

### D. Tool result adapter 변경

* [x] `getRollbackCandidates` 결과에서 candidates를 slot으로 매핑
* [x] `rollback.candidates` slot patch 추가

### E. Template definition + selector

* [x] `template-definitions.ts`에 `rollback_target_list` 추가
  * [x] `family: "rollback.target_list"`
  * [x] `requiredFacts: ["rollback.serviceName", "rollback.candidates"]`
  * [x] `intentKeys: ["rollback.start"]`
* [x] 기존 rollback_summary는 `rollback.selectedTargetId` 필요하도록 조정

### F. Binder 작성

* [x] `bind-rollback-target-list.ts` 새 binder 작성
  * [x] 입력: serviceName + candidates 배열
  * [x] 해당 서비스의 배포 이력 필터링
  * [x] eligible / not-eligible 분리
  * [x] 추천 인스턴스 표시
  * [x] 각 eligible 인스턴스에 `rollback.select_target` 액션 부여
* [x] binders/index.ts에 등록

### G. Action 확장

* [x] `action-types.ts`에 `SELECT_TARGET: "rollback.select_target"` 추가
* [x] `run-rollback-action.ts`에 select_target 핸들러 추가
  * [x] 선택한 인스턴스 정보를 facts에 반영
  * [x] `rollback.selectedTargetId`, `rollback.context` slot 채움
  * [x] 이후 rollback_summary로 자연스럽게 전환
* [x] `action-registry.ts`에 등록

### H. Template UI 작성

* [x] `rollback-target-list.tsx` 새 컴포넌트
  * [x] 서비스 헤더: service, environment, currentVersion, incident
  * [x] eligible 인스턴스 카드 목록
    * [ ] version, deployedAt, strategy, status, risk
    * [ ] whyThisTarget 설명
    * [ ] evidence 목록
    * [ ] 추천 인스턴스 표시 (⭐)
    * [ ] [이 버전으로 롤백] 버튼
  * [x] not-eligible 인스턴스 접기 목록
* [x] `template-renderer.tsx`에 연결

### I. Validation

* [x] `validate-surface-envelope.ts`에 `rollback_target_list` 필수 필드 추가
  * [x] required: `service`, `targets`, `state`

### J. Registry

* [x] `rollback-target-list.ts` registry definition 추가
* [x] `template-registry.ts`에 등록
* [x] preview case 추가

### K. 테스트

* [x] target list binder 테스트 (서비스별 필터, eligible/not-eligible 분리)
* [x] decision policy 테스트 (candidates 있으면 target_list)
* [x] select_target 액션 테스트
* [x] validation 테스트
* [x] 통합 시나리오:
  * [x] "롤백하고 싶어" → 서비스 선택 → target list surface
  * [x] target list에서 인스턴스 선택 → rollback_summary 전환
  * [x] 추천 인스턴스 표시 확인
