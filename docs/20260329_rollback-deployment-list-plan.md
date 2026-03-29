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

* [ ] `types/templates.ts`에 `RollbackTargetListTemplateData` 타입 추가
  * [ ] `templateId: "rollback_target_list"`
  * [ ] `service: string` — 선택된 서비스명
  * [ ] `environment: string`
  * [ ] `currentVersion: string`
  * [ ] `incidentSummary: string`
  * [ ] `severity: string`
  * [ ] `targets: RollbackTargetItem[]` — 배포 인스턴스 목록
  * [ ] `recommendedTargetId: string | null` — 추천 인스턴스 ID
* [ ] `RollbackTargetItem` 타입 추가
  * [ ] `id, version, deployedAt, strategy, status`
  * [ ] `rollbackRisk, rollbackEligible`
  * [ ] `whyThisTarget, evidence[]`
  * [ ] `isRecommended: boolean`
  * [ ] `actions: SurfaceActionDescriptor[]`
* [ ] `TemplateEnvelope` union에 추가

### B. Decision policy 변경

* [ ] `rollback.ts`에서 serviceName + candidates 있으면 → `render_surface` (target_list)
* [ ] surfaceIntent family를 `"rollback.target_list"` vs `"rollback.summary"` 분리
* [ ] 기존 `rollback.summary`는 특정 인스턴스 선택 후 사용

### C. Slot definitions 변경

* [ ] `rollback.candidates` slot 추가 (type: array, source: tool)
* [ ] `rollback.selectedTargetId` slot 추가 (type: string, 인스턴스 선택 시 채움)
* [ ] candidates가 있으면 서비스별 인스턴스 목록 사용 가능

### D. Tool result adapter 변경

* [ ] `getRollbackCandidates` 결과에서 candidates를 slot으로 매핑
* [ ] `rollback.candidates` slot patch 추가

### E. Template definition + selector

* [ ] `template-definitions.ts`에 `rollback_target_list` 추가
  * [ ] `family: "rollback.target_list"`
  * [ ] `requiredFacts: ["rollback.serviceName", "rollback.candidates"]`
  * [ ] `intentKeys: ["rollback.start"]`
* [ ] 기존 rollback_summary는 `rollback.selectedTargetId` 필요하도록 조정

### F. Binder 작성

* [ ] `bind-rollback-target-list.ts` 새 binder 작성
  * [ ] 입력: serviceName + candidates 배열
  * [ ] 해당 서비스의 배포 이력 필터링
  * [ ] eligible / not-eligible 분리
  * [ ] 추천 인스턴스 표시
  * [ ] 각 eligible 인스턴스에 `rollback.select_target` 액션 부여
* [ ] binders/index.ts에 등록

### G. Action 확장

* [ ] `action-types.ts`에 `SELECT_TARGET: "rollback.select_target"` 추가
* [ ] `run-rollback-action.ts`에 select_target 핸들러 추가
  * [ ] 선택한 인스턴스 정보를 facts에 반영
  * [ ] `rollback.selectedTargetId`, `rollback.context` slot 채움
  * [ ] 이후 rollback_summary로 자연스럽게 전환
* [ ] `action-registry.ts`에 등록

### H. Template UI 작성

* [ ] `rollback-target-list.tsx` 새 컴포넌트
  * [ ] 서비스 헤더: service, environment, currentVersion, incident
  * [ ] eligible 인스턴스 카드 목록
    * [ ] version, deployedAt, strategy, status, risk
    * [ ] whyThisTarget 설명
    * [ ] evidence 목록
    * [ ] 추천 인스턴스 표시 (⭐)
    * [ ] [이 버전으로 롤백] 버튼
  * [ ] not-eligible 인스턴스 접기 목록
* [ ] `template-renderer.tsx`에 연결

### I. Validation

* [ ] `validate-surface-envelope.ts`에 `rollback_target_list` 필수 필드 추가
  * [ ] required: `service`, `targets`, `state`

### J. Registry

* [ ] `rollback-target-list.ts` registry definition 추가
* [ ] `template-registry.ts`에 등록
* [ ] preview case 추가

### K. 테스트

* [ ] target list binder 테스트 (서비스별 필터, eligible/not-eligible 분리)
* [ ] decision policy 테스트 (candidates 있으면 target_list)
* [ ] select_target 액션 테스트
* [ ] validation 테스트
* [ ] 통합 시나리오:
  * [ ] "롤백하고 싶어" → 서비스 선택 → target list surface
  * [ ] target list에서 인스턴스 선택 → rollback_summary 전환
  * [ ] 추천 인스턴스 표시 확인
