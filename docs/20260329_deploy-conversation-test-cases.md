# Deploy 대화 케이스 테스트 체크리스트

테스트 파일: `src/__tests__/deploy-conversation-cases.test.ts`
실행 결과: **18/18 통과** (2026-03-29)

## 1. 텍스트로만 대답 (text)

| # | 입력 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 1-1 | "배포가 뭐야?" | intent=general.qna, decision=text, 설명 텍스트 반환 | [x] |
| 1-2 | "rolling 배포랑 blue-green 차이가 뭐야?" | intent=general.qna, decision=text | [x] |
| 1-3 | "production 배포할 때 주의사항 알려줘" | intent=general.qna, decision=text | [x] |
| 1-4 | "지금 배포 가능해?" (컨텍스트 없이) | intent=deploy.start, serviceName 없어서 ask_followup | [x] |
| 1-5 | "고마워" | intent=general.qna, decision=text | [x] |

## 2. 데이터 조회 → 텍스트 요약 (text + tool)

| # | 입력 | tool 호출 | 기대 결과 | 통과 |
|---|------|-----------|-----------|------|
| 2-1 | "지난 배포 이력 알려줘" | getPreviousDeployments | intent=deploy.history.lookup, decision=text, tool summary 포함 | [x] |
| 2-2 | "payments-api 마지막 배포 언제였어?" | getPreviousDeployments | intent=deploy.history.lookup, decision=text | [x] |
| 2-3 | "지금 어떤 서비스 배포할 수 있어?" | getDeployableServices | intent=deploy.start, ask_followup (서비스 목록 제시) | [x] |
| 2-4 | "payments-api 버전 알려줘" | — | 의미 있는 응답 반환 | [x] |

## 3. A2UI Surface 렌더링 (render_surface)

| # | 입력 시퀀스 | 기대 결과 | 통과 |
|---|------------|-----------|------|
| 3-1 | "배포하고 싶어" → "payments-api" | 1턴: ask_followup(serviceName), 2턴: render_surface + launchpad surface | [x] |
| 3-2 | "payments-api 배포해줘" (한 번에) | serviceName 채움 → tool 호출 | [x] |
| 3-3 | 서비스 선택 후 "아니 orders-api" | correction → serviceName 교체 | [x] |
| 3-4 | awaiting 중 "취소해줘" | cancel → intent 초기화 → text "취소" 응답 | [x] |
| 3-5 | awaiting 중 "이전 배포 알려줘" | interrupt → deploy.history.lookup 전환 → tool + text | [x] |

## 4. Surface 생성 검증

| # | 조건 | 기대 결과 | 통과 |
|---|------|-----------|------|
| 4-1 | render_surface + deploy facts 완비 | surface.templateId = quick_deploy_launchpad | [x] |
| 4-2 | render_surface surface에 actions 포함 | payload.actions에 deploy.start action 존재 | [x] |
| 4-3 | surface payload validation 통과 | validateSurfaceEnvelope = valid | [x] |
| 4-4 | surface freshnessKey 포함 | freshnessKey = deploy:serviceName:... | [x] |

## 5. 멀티턴 시나리오

| # | 시나리오 | 기대 결과 | 통과 |
|---|---------|-----------|------|
| 5-1 | 배포 → 서비스 선택 → render_surface까지 전체 흐름 | 3단계 일관 동작, workflow collecting→ready | [x] |
| 5-2 | 배포 → correction → 서비스 교체 후 재처리 | slot 교체 + intent 유지 | [x] |
| 5-3 | 배포 → 취소 → 이전 배포 조회 → 다시 배포 | intent 전환이 깔끔하게 동작 | [x] |

---

## 수정 사항

테스트 과정에서 intent-resolver에 아래 패턴을 추가함:
- `deploy.start`: `/배포할\s*수\s*있/` (배포할 수 있어?)
- `deploy.history.lookup`: `/마지막\s*배포/`, `/배포\s*언제/` (마지막 배포 언제였어?)
