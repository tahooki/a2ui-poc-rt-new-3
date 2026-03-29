# 승인(Approval) 대화 케이스 테스트 체크리스트

테스트 파일: `src/__tests__/approval-conversation-cases.test.ts`

## 1. 텍스트로만 대답 (text) — general.qna

| # | 입력 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 1-1 | "승인이 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-2 | "temporary access랑 config change 차이가 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-3 | "고위험 요청은 어떻게 처리해?" | intent=general.qna, decision=text | [x] |
| 1-4 | "보류하면 어떻게 돼?" | intent=general.qna, decision=text | [x] |
| 1-5 | "고마워" | intent=general.qna, decision=text | [x] |

## 2. 데이터 조회 → 텍스트 요약 (text + tool) — approval.status.check

| # | 입력 | tool | 기대 결과 | 통과 |
|---|------|------|-----------|------|
| 2-1 | "지금 승인 대기 몇 건이야?" | getApprovalQueueSummary | intent=approval.status.check, decision=text, summary 포함 | [x] |
| 2-2 | "오늘 승인한 건수 알려줘" | getApprovalQueueSummary | intent=approval.status.check, decision=text | [x] |
| 2-3 | "config change 요청 있어?" | getApprovalQueueSummary | intent=approval.status.check, decision=text | [x] |
| 2-4 | "승인 현황 요약해줘" | getApprovalQueueSummary | intent=approval.status.check, decision=text | [x] |

## 3. A2UI Surface 렌더링 (render_surface) — approval.review

| # | 입력 | 흐름 | 기대 결과 | 통과 |
|---|------|------|-----------|------|
| 3-1 | "승인 요청 확인해줘" | 큐 조회 → 목록 surface | intent=approval.review, render_surface, approval_queue_inbox | [x] |
| 3-2 | "대기 중인 승인 보여줘" | 큐 조회 → 목록 surface | intent=approval.review, render_surface | [x] |
| 3-3 | "승인 처리하자" | 큐 조회 → 목록 surface | intent=approval.review, render_surface | [x] |
| 3-4 | "apr-access-101 검토해줘" | requestId 직접 지정 | intent=approval.review, render_surface, deployment_approval_inbox | [x] |

## 4. Surface 검증

| # | 조건 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 4-1 | 큐 surface payload | items 배열 + summary 카운트 포함 | [x] |
| 4-2 | 큐 surface validation | validateSurfaceEnvelope 통과 | [x] |
| 4-3 | pending item에 actions | approve_item + hold_item 액션 포함 | [x] |
| 4-4 | approved item에 actions 없음 | actions 빈 배열 | [x] |

## 5. 흐름 전환

| # | 시나리오 | 기대 결과 | 통과 |
|---|---------|-----------|------|
| 5-1 | "승인 몇 건?" → "확인해줘" | 2번(text) → 3번(surface) 전환 | [x] |
| 5-2 | 큐 surface 중 "대기 건수만 알려줘" | 3번(surface) 유지 or text 보충 | [x] |
| 5-3 | 큐 surface 중 "취소해줘" | intent 초기화 → text | [x] |
| 5-4 | "승인 확인" → "배포하고 싶어" | approval → deploy 전환 | [x] |

## 구분 기준 (intent 분류)

| 패턴 | intent | 응답 |
|------|--------|------|
| "몇 건", "건수", "현황 요약", "상태 알려줘" | approval.status.check | text + tool |
| "확인해줘", "보여줘", "검토", "처리하자" | approval.review | render_surface |
| "승인이 뭐야", 설명 요청 | general.qna | text |
