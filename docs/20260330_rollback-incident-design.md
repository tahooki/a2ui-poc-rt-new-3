# 서비스 인시던트 현황 + 롤백 흐름 설계

## 스토리 흐름

```
새벽 2시, PagerDuty 알림
  ↓
[서비스 현황 페이지] ← 새로 만들 페이지
  payments-api에 뭔가 문제가 있어 보인다
  ↓
[롤백 페이지]
  이전 안정 버전으로 롤백
```

## 1. 서비스 현황 페이지 설계

**위치**: 롤백 탭 내 서브탭 "현황" / "롤백 실행"

**보여줄 정보** (서비스별 카드 형태):

| 항목 | 예시 | 설명 |
|------|------|------|
| 서비스명 | payments-api | |
| 현재 버전 | v2.3.18 | |
| 상태 | CRITICAL / WARNING / HEALTHY | 한눈에 빨간색/노란색/초록색 |
| 에러율 | 12.4% (평소 0.3%) | 평소 대비 급등 |
| 응답 시간 | p99: 4,200ms (평소 320ms) | |
| 활성 인시던트 | INC-842: card timeout spike | 있으면 표시 |
| 마지막 배포 | 2시간 전 (v2.3.18) | 최근 배포가 원인일 수 있음 |
| 인스턴스 | 4/4 running (1 unhealthy) | |

**레이아웃**:
- 서비스 3개(payments-api, checkout, catalog-api)가 카드 리스트로 나열
- payments-api는 빨간색(CRITICAL), 나머지는 초록/노란색
- payments-api 카드를 클릭하면 상세 + "롤백 필요" 판단 가능

## 2. 롤백 페이지 연결

서비스 현황에서 문제를 확인한 후:
- "롤백" 버튼 또는 롤백 서브탭으로 이동
- 기존 롤백 흐름 (Target List → 실행)

## 3. A2UI Surface 수정

현재 RollbackTargetList는 롤백 후보만 보여주는데, **상단에 인시던트 현황 요약**을 추가:

```
┌────────────────────────────────────────┐
│  INCIDENT ALERT                        │
│  payments-api · CRITICAL               │
│  INC-842: card timeout spike           │
│  에러율 12.4% (평소 0.3%)              │
│  p99 응답시간 4,200ms (평소 320ms)     │
│  마지막 배포: 2시간 전 (v2.3.18)       │
├────────────────────────────────────────┤
│  Rollback Target List                  │
│  ✅ v2.3.16 (추천) — 24h stable       │
│     v2.3.14 — stable                  │
│  [ 이 버전으로 롤백 ]                  │
└────────────────────────────────────────┘
```

A2UI에서 **"왜 롤백하는지"(인시던트) + "뭘로 롤백하는지"(타겟)**가 한 Surface에 다 보임.

## 4. Seed 데이터 추가

rollback.json에 서비스별 health 데이터 추가:

```json
{
  "serviceHealth": [
    {
      "service": "payments-api",
      "version": "v2.3.18",
      "status": "critical",
      "errorRate": "12.4%",
      "normalErrorRate": "0.3%",
      "p99Latency": "4,200ms",
      "normalP99Latency": "320ms",
      "instances": { "total": 4, "healthy": 3, "unhealthy": 1 },
      "lastDeployedAt": "2시간 전",
      "activeIncident": {
        "id": "INC-842",
        "title": "card timeout spike",
        "severity": "HIGH",
        "startedAt": "2026-03-30 02:10 KST"
      }
    },
    {
      "service": "checkout",
      "version": "v1.8.42",
      "status": "warning",
      "errorRate": "2.1%",
      "normalErrorRate": "0.8%",
      "p99Latency": "890ms",
      "normalP99Latency": "450ms",
      "instances": { "total": 3, "healthy": 3, "unhealthy": 0 },
      "lastDeployedAt": "6시간 전",
      "activeIncident": {
        "id": "INC-835",
        "title": "auth retries",
        "severity": "MEDIUM",
        "startedAt": "2026-03-30 01:45 KST"
      }
    },
    {
      "service": "catalog-api",
      "version": "v4.2.1",
      "status": "healthy",
      "errorRate": "0.1%",
      "normalErrorRate": "0.2%",
      "p99Latency": "210ms",
      "normalP99Latency": "200ms",
      "instances": { "total": 2, "healthy": 2, "unhealthy": 0 },
      "lastDeployedAt": "12시간 전",
      "activeIncident": null
    }
  ]
}
```

## 5. 작업 목록

- [x] rollback.json seed에 serviceHealth 데이터 추가
- [x] 도메인 타입에 ServiceHealth 타입 정의
- [x] 롤백 페이지에 서브탭 추가 ("현황" / "롤백 실행")
- [x] 서비스 현황 컴포넌트 구현 (카드 리스트, 상태별 색상)
- [x] A2UI RollbackTargetList Surface 상단에 인시던트 요약 영역 추가
- [x] RollbackTargetList 템플릿 타입/정의에 incident 필드 추가
- [x] Binder에서 incident 데이터를 payload에 포함하도록 수정
- [x] Story 페이지 롤백 파트 업데이트 (현황 페이지 시연 + A2UI 채팅 모의 수정)
