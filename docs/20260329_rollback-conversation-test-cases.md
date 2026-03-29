# 롤백(Rollback) 대화 케이스 테스트 체크리스트

테스트 파일: `src/__tests__/rollback-conversation-cases.test.ts`

## 1. 텍스트로만 대답 (text) — general.qna

| # | 입력 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 1-1 | "롤백이 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-2 | "canary 롤백이랑 rolling 롤백 차이가 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-3 | "dry run이 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-4 | "롤백하면 데이터는 어떻게 돼?" | intent=general.qna, decision=text | [x] |
| 1-5 | "고마워" | intent=general.qna, decision=text | [x] |

## 2. 데이터 조회 → 텍스트 요약 (text + tool) — rollback.status.check

| # | 입력 | tool | 기대 결과 | 통과 |
|---|------|------|-----------|------|
| 2-1 | "지금 롤백 가능한 서비스 몇 개야?" | getRollbackCandidates | intent=rollback.status.check, decision=text, summary | [x] |
| 2-2 | "payments-api 롤백 상태 알려줘" | getRollbackCandidates | intent=rollback.status.check, decision=text | [x] |
| 2-3 | "critical 인시던트 있어?" | getRollbackCandidates | intent=rollback.status.check, decision=text | [x] |
| 2-4 | "롤백 후보 요약해줘" | getRollbackCandidates | intent=rollback.status.check, decision=text | [x] |

## 3. A2UI Surface 렌더링 (render_surface) — rollback.start

| # | 입력 | 흐름 | 기대 결과 | 통과 |
|---|------|------|-----------|------|
| 3-1 | "롤백하고 싶어" → "payments-api" | 서비스 선택 → target list | rollback_target_list surface | [x] |
| 3-2 | "payments-api 롤백해줘" | 바로 serviceName 채움 | rollback_target_list surface | [x] |
| 3-3 | "롤백 처리하자" | 서비스 목록 → 선택 | rollback_target_list surface | [x] |

## 4. Surface 검증

| # | 조건 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 4-1 | target list payload | targets 배열 + service + state 포함 | [x] |
| 4-2 | target list validation | validateSurfaceEnvelope 통과 | [x] |
| 4-3 | eligible target에 select_target 액션 | rollback.select_target 포함 | [x] |
| 4-4 | recommended target 표시 | isRecommended=true인 항목 존재 | [x] |

## 5. 흐름 전환

| # | 시나리오 | 기대 결과 | 통과 |
|---|---------|-----------|------|
| 5-1 | "롤백 후보 몇 개?" → "롤백하고 싶어" | status.check(text) → start(surface) 전환 | [x] |
| 5-2 | target list 중 "롤백 상태 요약해줘" | status.check(text) 전환 | [x] |
| 5-3 | "롤백하고 싶어" → "배포하고 싶어" | rollback → deploy 전환 | [x] |

## 구분 기준 (intent 분류)

| 패턴 | intent | 응답 |
|------|--------|------|
| "몇 개", "상태 알려줘", "후보 요약", "인시던트 있어?" | rollback.status.check | text + tool |
| "하고 싶어", "해줘", "시작", "처리하자" | rollback.start | render_surface |
| "롤백이 뭐야?", 설명 요청 | general.qna | text |
