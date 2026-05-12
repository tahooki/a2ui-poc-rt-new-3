# 새 템플릿 추가 테스트 플로우

기준일: 2026-04-13

## 현재 상태

현재 저장소 기준으로 아래 테스트는 모두 통과했다.

- `npm test` → `33`개 파일, `311`개 테스트 통과
- `npx vitest run packages/a2ui-admin/__tests__/*.test.ts` → `8`개 파일, `46`개 테스트 통과
- `python3 -m pytest packages/demo-agent-server/tests` → `15`개 테스트 통과

즉, 기존 `deploy_launchpad`, `approval_queue_inbox`, `rollback_summary` 파이프라인은 지금 기준으로는 깨져 있지 않다.

## 먼저 알아둘 점

새 템플릿을 추가할 때는 파이프라인이 한 군데에만 있지 않다.

1. `packages/a2ui-ui`
UI 컴포넌트와 `SurfaceRenderer` 등록 지점이다.

2. `packages/a2ui-admin`
MCP 서버, decision rule, binding, payload validation, action 구성이 여기에 있다.

3. `src/app/a2ui-test` 와 `src/app/a2ui-test/admin`
이 두 페이지는 실제 MCP 응답이 아니라 정적 fixture와 정적 표를 써서 데모한다. 새 템플릿이 자동으로 나타나지 않는다.

4. `src/devops-chat/*`
메인 assistant 쪽은 별도 템플릿 레지스트리와 binder 체계를 사용한다. `packages/a2ui-admin`에만 추가해도 메인 채팅 UI가 자동으로 그 템플릿을 쓰지는 않는다.

## 예시 템플릿

테스트 플로우 예시는 `service_health_summary`라는 새 템플릿을 추가한다고 가정한다.

- intent: `service.health`
- required fact: `serviceName`
- 목적: 서비스 헬스, 에러율, 최근 incident, 권장 액션 표시

## 구현 체크리스트

### 1. UI 라이브러리 등록

아래 지점을 수정한다.

- `packages/a2ui-ui/src/templates/ServiceHealthSummary.tsx`
- `packages/a2ui-ui/src/templates/register-all.ts`

여기서 확인할 것:

- `SurfaceRenderer`가 `templateId: "service_health_summary"`를 찾을 수 있어야 한다.
- payload shape가 컴포넌트가 기대하는 필드와 맞아야 한다.

### 2. MCP 서버 경로 연결

아래 지점을 수정한다.

- `packages/a2ui-admin/src/mcp-server/decision/decision-engine.ts`
- `packages/a2ui-admin/src/mcp-server/binding/binding-engine.ts`
- `packages/a2ui-admin/src/mcp-server/validation/payload-validator.ts`
- `packages/a2ui-admin/src/mcp-server/tools/register-tools.ts`

필요하면 추가로 수정한다.

- `packages/demo-mock-api/src/server.ts`
- fixture JSON 파일들

여기서 확인할 것:

- `a2ui.recommendTemplate`가 `service.health`를 `service_health_summary`로 매핑하는지
- `a2ui.resolveTemplateData`가 resolver data를 payload로 바인딩하는지
- validator가 새 payload를 통과시키는지
- `a2ui.listTemplates`, `a2ui.getTemplateContract`에도 새 템플릿이 노출되는지

### 3. 데모 페이지 반영

새 템플릿을 눈으로 확인하려면 아래도 같이 수정해야 한다.

- `src/app/a2ui-test/page.tsx`
- `src/app/a2ui-test/admin/page.tsx`

이유:

- `/a2ui-test`는 정적 envelope 탭을 렌더링한다.
- `/a2ui-test/admin`은 정적 template 목록, 정적 decision rule, 정적 simulation envelope을 보여준다.

즉, 이 두 페이지는 새 템플릿을 MCP 서버에서 자동 조회하지 않는다.

### 4. 메인 assistant까지 연결할 경우

메인 채팅 플로우에서 새 템플릿이 자동 렌더링되게 하려면 아래 체계도 별도로 반영해야 한다.

- `src/devops-chat/template-registry/definitions/*`
- `src/devops-chat/templates/template-definitions.ts`
- `src/devops-chat/templates/template-selector.ts`
- `src/devops-chat/templates/binders/*`
- 필요 시 `src/devops-chat/server/tools/*`

현재 구조상 `packages/a2ui-admin`과 `src/devops-chat`은 템플릿 소스가 분리되어 있다.

## 실행 순서

### Step 1. 서버 기동

각각 다른 터미널에서 실행한다.

```bash
npm run dev
```

```bash
npm run dev -w @a2ui/admin
```

```bash
npm run dev -w @a2ui/demo-mock-api
```

선택적으로 Python agent도 켠다.

```bash
cd packages/demo-agent-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Step 2. UI 라이브러리 단독 확인

브라우저에서 아래 페이지를 연다.

- `http://localhost:3000/a2ui-test`

검증 포인트:

- 새 탭 또는 새 섹션에 `service_health_summary`가 보인다.
- 렌더링 오류 없이 카드, 표, 상태 뱃지, 액션 버튼이 나온다.
- 액션 버튼 클릭 시 Action Log에 이벤트가 남는다.

이 단계에서 실패하면 MCP 이전에 UI 등록 문제다.

### Step 3. Admin 데모 페이지 확인

브라우저에서 아래 페이지를 연다.

- `http://localhost:3000/a2ui-test/admin`

검증 포인트:

- Template Registry 표에 `service_health_summary`가 보인다.
- Decision Rules 표에 `service.health -> service_health_summary`가 보인다.
- Simulation에서 `intent=service.health`, `facts=serviceName=payments-api` 입력 시 `render_surface`
- `facts`를 비우면 `ask_followup`
- preview envelope이 새 템플릿으로 렌더링된다.

이 단계는 여전히 정적 페이지라, 목록과 simulation 데이터를 직접 추가했는지 확인하는 성격이다.

### Step 4. Unit test 추가 및 실행

최소한 아래 테스트를 추가한다.

- `packages/a2ui-admin/__tests__/binding-engine.test.ts`
- `packages/a2ui-admin/__tests__/decision-engine.test.ts`
- `packages/a2ui-admin/__tests__/payload-validator.test.ts`
- 필요 시 `packages/a2ui-admin/__tests__/integration.test.ts`

실행:

```bash
npx vitest run packages/a2ui-admin/__tests__/*.test.ts
```

검증 포인트:

- `service.health + serviceName`이면 `render_surface`
- `serviceName`이 없으면 `ask_followup`
- binding 결과 payload가 예상 필드를 모두 가진다
- validation이 새 schema를 통과한다

### Step 5. MCP 직접 호출

결정 엔진 확인:

```bash
curl -X POST http://localhost:3100/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"a2ui.recommendTemplate","arguments":{"intentKey":"service.health","facts":{"serviceName":"payments-api"}}}}'
```

기대 결과:

- `mode: "render_surface"`
- `templateId: "service_health_summary"`

데이터 resolve 확인:

```bash
curl -X POST http://localhost:3100/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"a2ui.resolveTemplateData","arguments":{"templateId":"service_health_summary","context":{"intentKey":"service.health","serviceName":"payments-api"}}}}'
```

기대 결과:

- `templateId: "service_health_summary"`
- `payload.templateId: "service_health_summary"`
- `meta.resolverTrace` 존재

목록과 계약 확인:

```bash
curl -X POST http://localhost:3100/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"a2ui.listTemplates","arguments":{}}}'
```

```bash
curl -X POST http://localhost:3100/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"a2ui.getTemplateContract","arguments":{"templateId":"service_health_summary"}}}'
```

### Step 6. Agent SDK 경유 호출

```bash
npx tsx -e "
import { A2UIMcpClient, renderOrFallback } from './packages/a2ui-agent-node/src/index.js';
async function main() {
  const client = new A2UIMcpClient();
  await client.connect();
  const result = await renderOrFallback(client, {
    intentKey: 'service.health',
    facts: { serviceName: 'payments-api' }
  });
  console.log(JSON.stringify(result, null, 2));
  await client.disconnect();
}
main();"
```

기대 결과:

- `type: "surface"`
- `envelope.templateId: "service_health_summary"`

추가 확인:

- `facts: {}` 로 실행하면 `type: "followup"`
- MCP 서버를 끄고 실행하면 `type: "text_fallback"`

### Step 7. Python agent 경유 호출

Python도 새 intent를 이해하도록 연결했다면 확인한다.

```bash
curl -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"input":"payments-api 상태 보여줘","conversation_id":"service-health-1"}'
```

기대 결과:

- Python decision/orchestration이 새 intent를 매핑하면 `surface`
- 아직 Python intent 해석을 안 붙였다면 이 단계는 실패할 수 있다

## 합격 기준

아래가 모두 만족되면 "새 템플릿이 UI 라이브러리부터 MCP 호출까지 연결됐다"고 볼 수 있다.

1. `/a2ui-test`에서 컴포넌트가 렌더링된다.
2. `/a2ui-test/admin`에서 템플릿/룰/시뮬레이션이 보인다.
3. MCP `recommendTemplate`가 새 템플릿을 반환한다.
4. MCP `resolveTemplateData`가 유효한 envelope를 반환한다.
5. `renderOrFallback()`가 `surface`를 반환한다.
6. 관련 unit test가 모두 통과한다.

## 현재 구조에서 가장 흔한 누락 포인트

1. `register-all.ts`에 등록하지 않아서 `Template not found`가 뜬다.
2. decision rule은 추가했는데 `resolveTemplateData` 분기나 binding recipe를 안 넣어서 payload가 빈다.
3. validator schema를 안 넣어서 잘못된 payload가 그대로 통과하거나 반대로 항상 실패한다.
4. `/a2ui-test/admin`이 정적이라 MCP에는 추가됐는데 화면에는 안 보인다.
5. 메인 assistant는 별도 레지스트리를 써서 `packages/a2ui-admin`만 수정하고 끝냈다고 착각한다.

## 권장 순서

작업 순서는 아래가 가장 안전하다.

1. UI 컴포넌트와 static envelope부터 만든다.
2. decision/binding/validation을 붙인다.
3. MCP curl로 응답을 확인한다.
4. Agent SDK `renderOrFallback()`로 확인한다.
5. 마지막에 메인 assistant 쪽 레지스트리를 붙인다.
