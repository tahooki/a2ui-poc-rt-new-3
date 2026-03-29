# 승인 A2UI 멀티 요청 Inbox 전환 계획

## 현재 상태 진단

현재 승인 A2UI는 **단일 요청 리뷰** 구조:

```
[사용자] "승인 요청 확인해줘"
    → getApprovalQueueSummary (9건 목록 조회)
    → ask_followup: "어떤 승인 요청을 검토할까요?" (옵션 칩)
    → [사용자] "apr-access-101"
    → render_surface: deployment_approval_inbox (1건만 표시)
    → [승인] or [보류] 버튼
```

**문제점:**
- 1건씩만 볼 수 있어서 여러 건을 검토하려면 반복 대화가 필요
- 실제 운영에서는 대기 중인 요청을 한눈에 보고 빠르게 처리해야 함
- tool이 이미 전체 큐 데이터를 가져오는데 1건만 보여주는 것은 비효율
- 승인/보류 후 다음 요청으로 넘어가는 흐름이 없음

## 목표 상태

```
[사용자] "승인 요청 확인해줘"
    → getApprovalQueueSummary (9건 목록 조회)
    → render_surface: approval_queue_inbox (전체 큐 표시)
        ┌─────────────────────────────────────────┐
        │ Approval Queue (5건 대기)                │
        │                                          │
        │ ┌── pending ─────────────────────────┐  │
        │ │ apr-access-101  Temp Access  ⚠ Med  │  │
        │ │ admin@corp → prod DB               │  │
        │ │                    [승인] [보류]     │  │
        │ ├────────────────────────────────────┤  │
        │ │ apr-config-201  Config Chg   🔴 Hi │  │
        │ │ rate-limit 1000→5000               │  │
        │ │                    [승인] [보류]     │  │
        │ ├────────────────────────────────────┤  │
        │ │ apr-data-301   Data Op      ⚠ Med  │  │
        │ │ DELETE stale sessions              │  │
        │ │                    [승인] [보류]     │  │
        │ └────────────────────────────────────┘  │
        │                                          │
        │ ── approved (2) ── held (1) ── 접기 ▾   │
        │                                          │
        │ [전체 승인] [고위험만 보기]               │
        └─────────────────────────────────────────┘
```

**핵심 변경:**
1. 큐에 대기 중인 요청을 **목록**으로 보여줌
2. 각 요청마다 **개별 승인/보류** 버튼
3. 상태별 그룹핑 (pending / approved / held)
4. 한 건 승인하면 목록에서 즉시 상태 반영
5. 상세 검토가 필요하면 **펼쳐서** 상세 보기

## 수정 범위

### 전체 아키텍처 변경 흐름

```
기존 단일건 흐름:
  requestId slot → 1건 바인딩 → 1건 렌더

변경 후 큐 흐름:
  "승인 확인" → tool로 큐 조회 → 큐 전체 바인딩 → 목록 렌더
  (requestId slot은 상세 보기/필터용으로 optional)
```

### 영향 받는 파일

| 파일 | 변경 내용 |
|------|-----------|
| `types/templates.ts` | `ApprovalQueueTemplateData` 새 타입 추가 |
| `templates/deployment-approval-inbox.tsx` | 큐 목록 UI로 전면 재작성 |
| `templates/binders/bind-approval-inbox.ts` | 큐 전체 데이터 바인딩으로 변경 |
| `server/decision/policies/approval.ts` | requestId 없어도 큐 데이터 있으면 render_surface |
| `server/orchestration/slot-definitions.ts` | approval.requestId required → optional |
| `templates/template-definitions.ts` | requiredFacts 변경 |
| `templates/validate-surface-envelope.ts` | 새 템플릿 validation 추가 |
| `actions/domain/run-approval-action.ts` | 개별 건 승인 + 큐 갱신 |
| `actions/action-types.ts` | APPROVE_ITEM / HOLD_ITEM 액션 추가 |
| `actions/action-registry.ts` | 새 액션 등록 |
| `server/tools/tool-result-adapter.ts` | 큐 데이터를 facts에 매핑 |
| `template-registry/definitions/deployment-approval-inbox.ts` | contract 업데이트 |

---

## Todo List

### A. 타입 정의

* [ ] `types/templates.ts`에 `ApprovalQueueTemplateData` 타입 추가
  * [ ] `templateId: "approval_queue_inbox"`
  * [ ] `items: ApprovalQueueItem[]` — 각 요청의 요약 정보
  * [ ] `summary: { pending: number; approved: number; held: number; highRisk: number }`
  * [ ] `groupBy: "status" | "type" | "risk"`
  * [ ] `expandedItemId: string | null`
* [ ] `ApprovalQueueItem` 타입 추가
  * [ ] `id, type, title, environment, requestedBy, riskSummary, riskTone, status`
  * [ ] `keyFacts: Array<{ label: string; value: string }>`
  * [ ] `actions: SurfaceActionDescriptor[]`
* [ ] 기존 `DeploymentApprovalTemplateData`는 상세 보기 전용으로 유지

### B. Decision policy 변경

* [ ] `approval.ts` policy에서 requestId 없이도 큐 데이터가 있으면 `render_surface` 판정
  * [ ] 새 조건: `facts.approval.queueItems`가 있으면 → `render_surface`
  * [ ] requestId가 있으면 → 기존처럼 단일건 surface (상세 보기)
  * [ ] 둘 다 없으면 → `ask_followup`
* [ ] `surfaceIntent.family`를 `"approval.queue"` (큐) vs `"approval.detail"` (단일건)으로 분리

### C. Slot definitions 변경

* [ ] `approval.requestId` slot을 `required: false`로 변경
* [ ] 큐 흐름에서는 requestId 없이도 진행 가능하게 수정

### D. Template definitions + selector 변경

* [ ] `template-definitions.ts`에 `approval_queue_inbox` 추가
  * [ ] `family: "approval.queue"`
  * [ ] `requiredFacts: ["approval.queueItems"]`
  * [ ] `intentKeys: ["approval.review"]`
* [ ] 기존 `deployment_approval_inbox`는 `family: "approval.detail"` 로 유지
* [ ] selector에서 큐 데이터 있으면 큐 템플릿 우선 선택

### E. Tool result adapter 변경

* [ ] `getApprovalQueueSummary` tool result → `facts.approval.queueItems` 배열로 매핑
* [ ] 각 item을 `ApprovalQueueItem` shape으로 변환
* [ ] slot patch에 `approval.queueItems` 추가

### F. Binder 변경

* [ ] `bind-approval-inbox.ts`를 큐 바인딩 로직으로 확장 또는 새 binder 작성
* [ ] 입력: `facts.approval.queueItems` 배열
* [ ] 각 item에 개별 `actions` (승인/보류) 생성
* [ ] `targetRef`에 각 item의 id를 개별 설정
* [ ] summary 계산 (pending/approved/held/highRisk 카운트)

### G. Template UI 재작성

* [ ] `deployment-approval-inbox.tsx`를 큐 목록 레이아웃으로 변경
  * [ ] pending 그룹: 카드 목록, 각 카드에 승인/보류 버튼
  * [ ] approved/held 그룹: 축소 가능한 완료 목록
  * [ ] 각 카드: type badge, title, environment, risk tone, requestedBy
  * [ ] 카드 클릭 시 상세 펼침 (expandedItemId)
  * [ ] 상단: 요약 카운터 (대기 N건, 고위험 N건)
* [ ] `onAction(actionId, payload)` 패턴으로 개별 건 처리
  * [ ] payload에 `{ requestId: item.id }` 전달

### H. Action 확장

* [ ] `action-types.ts`에 큐 전용 액션 추가
  * [ ] `APPROVE_ITEM: "approval.approve_item"` — 개별 건 승인
  * [ ] `HOLD_ITEM: "approval.hold_item"` — 개별 건 보류
  * [ ] `APPROVE_ALL: "approval.approve_all"` — 전체 일괄 승인 (고위험 제외)
* [ ] `run-approval-action.ts`에 개별 건 핸들러 추가
  * [ ] 승인 후 `queueItems`에서 해당 건 상태 업데이트
  * [ ] `factsPatch`로 갱신된 큐 반환
* [ ] `action-registry.ts`에 새 액션 등록

### I. Validation 추가

* [ ] `validate-surface-envelope.ts`에 `approval_queue_inbox` 필수 필드 추가
  * [ ] required: `items`, `summary`, `state`

### J. Registry 업데이트

* [ ] `deployment-approval-inbox.ts` registry definition 업데이트
* [ ] 또는 새 `approval-queue-inbox.ts` registry definition 추가
* [ ] preview case에 큐 데이터 예시 추가

### K. Post-action refresh

* [ ] 개별 건 승인 후 큐 surface 자동 갱신
  * [ ] action result의 factsPatch로 queueItems 업데이트
  * [ ] surface re-bind → 목록에서 승인된 건이 approved 그룹으로 이동
* [ ] 모든 pending 건 처리 완료 시 "모든 요청이 처리되었습니다" 상태 표시

### L. 테스트

* [ ] 큐 바인딩 테스트 (여러 건 → 목록 payload)
* [ ] 개별 건 승인 → 큐 상태 갱신 테스트
* [ ] decision policy 테스트 (큐 데이터만으로 render_surface)
* [ ] validation 테스트 (큐 템플릿 필수 필드)
* [ ] 통합 시나리오:
  * [ ] "승인 요청 확인" → 큐 조회 → 큐 surface 렌더
  * [ ] 개별 건 승인 → 목록 갱신
  * [ ] 전체 승인 → 모두 처리 완료 상태
  * [ ] 특정 건 상세 보기 전환
