# Deploy History Chatbot A2UI Plan

Date: 2026-05-12

## Implementation Status

Completed on 2026-05-12.

Verified:

- `npm test` passed: 37 files, 349 tests.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Browser verification passed on `/deploy/image`: chatbot prompt `배포 이력 보고싶어` rendered the `deploy_history_table` A2UI surface with summary and deployment rows.

## Background

사용자가 chatbot에서 "배포 이력 보고싶어", "지난 배포 이력 알려줘", "payments-api 마지막 배포 언제였어?"처럼 단순 조회성 질문을 했을 때, 현재 구현은 `deploy.history.lookup` intent를 잡고 `getPreviousDeployments` tool을 실행하지만 최종 응답은 text로만 내려간다.

이번 목표는 별도 story page, sidebar tab, admin-only preview를 추가하는 것이 아니라 기존 chatbot 대화 흐름 안에서 배포 이력을 A2UI table surface로 보여주는 것이다.

이미 유사한 선례는 있다.

- `approval.review`는 `approval_queue_inbox` surface를 chatbot에 렌더링한다.
- `deploy.start`는 `quick_deploy_launchpad` / `deploy_launchpad` surface를 렌더링한다.
- `TemplateSurface`는 `surfaceConfig`가 있는 envelope라면 등록된 template id 목록에 없어도 `A2UISurfaceHost`로 렌더링할 수 있다.

따라서 새 화면을 만드는 대신 `deploy.history.lookup` intent의 decision, data binding, template, admin catalog를 연결하면 된다.

## Goal

1. 사용자가 chatbot에서 배포 이력을 요청하면 같은 대화 흐름 안에 A2UI surface가 나온다.
2. surface는 최근 배포 이력을 table로 보여준다.
3. 전체 이력 조회와 특정 service 이력 조회를 모두 수용할 수 있는 payload 구조를 둔다.
4. runtime fallback binder와 Admin/MCP template catalog가 같은 의도를 표현한다.
5. 기존 A2UI part/component를 최대한 재사용한다.

## Non-Goals

- story page에 새 시나리오 tab을 추가하지 않는다.
- chatbot 옆에 별도 고정 tab을 만들지 않는다.
- 단순 table 조회를 위해 새 renderer 체계를 만들지 않는다.
- `@a2ui/ui` 내부에 app-specific deploy API 의존성을 넣지 않는다.

## Current Behavior

현재 흐름:

```text
user: 배포 이력 보고싶어
-> intent: deploy.history.lookup
-> tool: getPreviousDeployments
-> decision: text
-> assistant text summary
```

변경 후 목표 흐름:

```text
user: 배포 이력 보고싶어
-> intent: deploy.history.lookup
-> tool: getPreviousDeployments
-> facts/slots: deploy.previousDeployments or deploy.historyRows
-> decision: render_surface
-> template: deploy_history_table
-> chatbot active surface: A2UI table
```

## Relevant Existing Code

Chatbot surface rendering:

- `src/devops-console/assistant/chat-assistant-panel.tsx`
- `src/devops-console/assistant/template-surface.tsx`
- `packages/a2ui-chat/src/A2UISurfaceHost.tsx`
- `packages/a2ui-ui/src/renderer/SurfaceRenderer.tsx`
- `packages/a2ui-ui/src/dynamic/DynamicA2UICardRenderer.tsx`

Intent, tool, decision:

- `src/devops-chat/server/orchestration/intent-resolver.ts`
- `src/devops-chat/server/orchestration/tool-planner.ts`
- `src/devops-chat/server/tools/builtin/get-previous-deployments.ts`
- `src/devops-chat/server/tools/tool-result-adapter.ts`
- `src/devops-chat/server/decision/decision-engine.ts`
- `src/devops-chat/server/orchestrate-chat-turn.ts`

Template and binder:

- `src/devops-chat/templates/template-definitions.ts`
- `src/devops-chat/templates/template-selector.ts`
- `src/devops-chat/templates/binders/index.ts`
- `src/devops-chat/templates/validate-surface-envelope.ts`
- `src/devops-chat/types/templates.ts`

Admin/MCP runtime:

- `packages/a2ui-admin/data/template-catalog.json`
- `packages/a2ui-admin/src/mcp-server/catalog/template-catalog.ts`
- `packages/a2ui-admin/src/mcp-server/catalog/template-store.ts`
- `packages/a2ui-admin/src/mcp-server/binding/binding-engine.ts`
- `packages/a2ui-admin/src/mcp-server/validation/payload-validator.ts`
- `packages/demo-mock-api/src/fixtures/deployments.json`

## Proposed Template

Template id:

```text
deploy_history_table
```

Intent key:

```text
deploy.history.lookup
```

Template family:

```text
deploy.history
```

Required fact:

```text
deploy.previousDeployments
```

Suggested payload:

```ts
type DeployHistoryTablePayload = {
  templateId: "deploy_history_table";
  state: "ready" | "empty" | "error";
  title: string;
  summary: string;
  summaryItems: Array<{ label: string; value: string }>;
  rows: Array<{
    service: string;
    environment: string;
    version: string;
    status: string;
    deployedBy: string;
    deployedAt: string;
  }>;
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    format?: "status";
  }>;
  emptyMessage: string;
};
```

## UI Direction

이 surface는 운영자가 빠르게 훑는 조회 UI이므로 장식적인 구성이 아니라 밀도 있고 스캔하기 쉬운 table 중심으로 간다.

### Primary Parts

1. `KeyValueSummary`
   - 전체 row 수, 대상 service, environment, 최근 성공 배포 시각 등을 짧게 보여준다.
   - table 위에 두어 "무엇을 조회했는지"를 바로 확인하게 한다.

2. `DataTableBlock`
   - 전체 배포 이력 table의 기본 part로 사용한다.
   - `columns`를 payload 또는 static config로 내려서 service, environment, version, status, deployedBy, deployedAt을 표시한다.
   - 전체 이력 조회에는 service/environment 컬럼이 필요하므로 `DeploymentHistoryBlock`보다 적합하다.

3. `DeploymentHistoryBlock`
   - service가 확정된 상세 이력 조회에서 재사용 가능하다.
   - 현재 컬럼이 version, status, deployedBy, deployedAt 중심이라 특정 service 이력에는 간결하다.

### Surface Layout

권장 `surfaceConfig` 구조:

```ts
{
  kind: "a2ui_card",
  version: 1,
  card: {
    title: { type: "static", value: "Deployment history" },
    subtitle: { type: "binding", path: "payload.summary" },
    description: { type: "static", value: "최근 배포 이력을 조회했습니다." },
    tone: { type: "static", value: "info" }
  },
  parts: [
    {
      id: "deploy-history-summary",
      type: "KeyValueSummary",
      props: {
        title: { type: "static", value: "Summary" },
        items: { type: "binding", path: "payload.summaryItems", fallback: [] }
      }
    },
    {
      id: "deploy-history-table",
      type: "DataTableBlock",
      props: {
        title: { type: "static", value: "Recent deployments" },
        rows: { type: "binding", path: "payload.rows", fallback: [] },
        columns: { type: "binding", path: "payload.columns", fallback: [] }
      }
    }
  ]
}
```

### UI Requirements

- chatbot 안에서 바로 렌더링되어야 하며 story page나 sidebar tab에 의존하면 안 된다.
- table은 가로 스크롤을 허용하되 row 높이는 compact하게 유지한다.
- 컬럼 순서는 운영자가 스캔하는 순서로 둔다: service, environment, version, status, deployedBy, deployedAt.
- `status`는 badge로 표시한다.
- 성공/실패/진행/취소 상태를 색으로 구분하는 것이 좋다. 현재 `DataTableBlock`은 `format: "status"`일 때 `StatusBadge level="info"`로 고정되어 있으므로, 구현 시 status별 level mapping 개선을 검토한다.
- 전체 이력 조회에서 service가 여러 개 섞이면 service 컬럼을 유지한다.
- 특정 service 이력 조회라면 summary에 service를 노출하고 table에서는 service 컬럼을 생략하거나 뒤로 보낼 수 있다.
- 빈 결과는 text만으로 끝내지 말고 empty state surface를 내려도 된다. 단, table part 안의 빈 상태 문구는 짧게 유지한다.
- action button은 이번 범위에서는 필수 아님. 조회 surface는 읽기 중심으로 시작한다.

## Implementation Todo

### 1. Local Data And Tool

- [ ] `src/devops-chat/data/seed/deploy.json`에 실제 `history` 배열을 추가한다.
- [ ] `packages/demo-mock-api/src/fixtures/deployments.json`의 `history` shape와 local seed shape를 맞춘다.
- [ ] `getPreviousDeployments`가 `items`, `images`, `history`를 함께 반환하도록 정리한다.
- [ ] serviceName이 있는 경우 service 기준으로 history를 filter할 수 있게 한다.
- [ ] tool summary는 text fallback에도 쓸 수 있게 row count와 최신 배포 정보를 포함한다.

### 2. Tool Result Adapter

- [ ] `getPreviousDeployments` 결과를 `factsPatch.deploy.previousDeployments`에 넣는다.
- [ ] template required fact에서 읽기 쉽도록 `slotsPatch.deploy.previousDeployments` 또는 `slotsPatch.deploy.historyRows`를 추가한다.
- [ ] empty result와 error result의 shape를 분리한다.

### 3. Decision Engine

- [ ] `deploy.history.lookup`의 hard-coded text decision을 제거한다.
- [ ] previous deployment rows가 있으면 `render_surface`로 결정한다.
- [ ] rows가 없으면 `render_surface` empty state 또는 text fallback 중 하나로 정책을 명확히 한다.
- [ ] `surfaceIntent.family`는 `deploy.history`로 둔다.

### 4. Runtime Template And Binder

- [ ] `template-definitions.ts`에 `deploy_history_table`을 추가한다.
- [ ] `bindDeployHistoryTable` binder를 추가한다.
- [ ] binder registry에 `deploy_history_table`을 등록한다.
- [ ] `validate-surface-envelope.ts`에 필수 payload field를 추가한다.
- [ ] `types/templates.ts`에 `DeployHistoryTableTemplateData`를 추가한다.
- [ ] `surfaceConfig`는 `KeyValueSummary` + `DataTableBlock` 조합으로 생성한다.

### 5. Admin/MCP Template

- [ ] `template-catalog.json`에 published `deploy_history_table` template을 추가한다.
- [ ] intent는 `deploy.history.lookup`으로 등록한다.
- [ ] resolver는 `/api/deployments`를 사용해 `history`와 `images`를 가져온다.
- [ ] serviceName이 있으면 optional transform으로 service별 rows를 만든다.
- [ ] `binding-engine.ts`에 `DEPLOY_HISTORY_TABLE_RECIPE`를 추가한다.
- [ ] `template-catalog.ts`의 binding recipe map에 추가한다.
- [ ] `template-store.ts`의 known recipe/render required fields에 추가한다.
- [ ] `payload-validator.ts`에 `deploy_history_table` schema를 추가한다.

### 6. Chatbot Integration

- [ ] `TemplateSurface`에 별도 story/tab 추가 없이 active surface로 렌더링되는지 확인한다.
- [ ] `A2UISurfaceHost`가 `surfaceConfig`를 가진 `deploy_history_table` envelope를 정상 렌더링하는지 확인한다.
- [ ] streaming 중 `surface` event가 기존 deploy/approval과 같은 방식으로 내려오는지 확인한다.

### 7. UI Polish

- [ ] `DataTableBlock`의 status badge level이 status value에 따라 바뀌도록 개선할지 결정한다.
- [ ] 긴 service/version/deployedBy 텍스트가 table cell에서 깨지지 않는지 확인한다.
- [ ] mobile/narrow panel에서 horizontal scroll이 자연스럽게 동작하는지 확인한다.
- [ ] summary와 table 사이 spacing이 기존 A2UI card rhythm과 맞는지 확인한다.
- [ ] empty state 문구가 "No rows configured"처럼 config 문제로 보이지 않게 payload-aware message를 내려줄지 검토한다.

## Test Cases

### Unit And Orchestration Tests

대상 파일:

- `src/__tests__/deploy-conversation-cases.test.ts`
- `src/__tests__/orchestrator-phase2.test.ts`
- `src/__tests__/template-selector.test.ts`
- `src/__tests__/binders.test.ts`
- `src/__tests__/validate-surface-envelope.test.ts`
- `src/__tests__/template-registry.test.ts`

| # | 입력 | 기대 결과 |
|---|------|-----------|
| 1 | `배포 이력 보고싶어` | intent=`deploy.history.lookup`, tool=`getPreviousDeployments`, decision=`render_surface`, templateId=`deploy_history_table` |
| 2 | `지난 배포 이력 알려줘` | 기존 text 기대값을 surface 기대값으로 변경 |
| 3 | `최근 배포 보여줘` | 배포 history rows가 table payload로 내려감 |
| 4 | `payments-api 마지막 배포 언제였어?` | serviceName이 잡히면 payments-api rows만 표시 |
| 5 | `checkout 배포 이력 보여줘` | checkout rows만 표시 |
| 6 | 알 수 없는 service의 배포 이력 요청 | empty state 또는 text fallback 정책대로 응답 |
| 7 | history가 비어 있는 seed | surface payload state=`empty` 또는 text fallback |
| 8 | MCP/Admin runtime 사용 가능 | `tryRenderA2UISurface`가 `deploy_history_table` surfaceConfig를 반환 |
| 9 | MCP/Admin runtime unavailable | local binder fallback으로 동일 templateId surface 반환 |
| 10 | surface validation | `rows`, `columns`, `state`, `summaryItems`가 schema/validator를 통과 |

### UI Rendering Tests

대상 파일 후보:

- `src/__tests__/a2ui-chat-host.test.tsx`
- `src/__tests__/dynamic-surface-config.test.ts`
- 신규 `src/__tests__/deploy-history-surface.test.tsx`

| # | 조건 | 기대 결과 |
|---|------|-----------|
| 1 | `deploy_history_table` envelope에 `surfaceConfig` 포함 | `A2UISurfaceHost`가 dynamic renderer를 사용 |
| 2 | rows 3개, columns 6개 | table header와 body가 모두 렌더링 |
| 3 | status column `format: "status"` | status badge가 렌더링 |
| 4 | rows empty | empty state가 표시되고 crash 없음 |
| 5 | 긴 version/service 문자열 | cell 텍스트가 card 밖으로 구조적으로 튀지 않음 |

### Manual Verification

| # | 시나리오 | 확인할 것 |
|---|----------|-----------|
| 1 | chatbot에서 `배포 이력 보고싶어` 입력 | 채팅 응답 후 active surface에 배포 이력 table 표시 |
| 2 | chatbot에서 `payments-api 배포 이력 보여줘` 입력 | payments-api 중심의 이력만 표시 |
| 3 | admin/MCP 서버가 켜진 상태 | Admin-authored `surfaceConfig` 경로로 렌더링 |
| 4 | admin/MCP 서버가 꺼진 상태 | local binder fallback으로 렌더링 |
| 5 | narrow viewport | table horizontal scroll과 card width가 깨지지 않음 |

## Acceptance Criteria

- [ ] chatbot에서 배포 이력 요청 시 text-only 응답이 아니라 A2UI table surface가 나온다.
- [ ] `deploy.history.lookup`은 별도 tab/page 없이 기존 chatbot active surface 흐름을 사용한다.
- [ ] 전체 이력 조회는 service/environment/version/status/deployedBy/deployedAt 컬럼을 보여준다.
- [ ] 특정 service 이력 조회는 해당 service 중심으로 row가 filter된다.
- [ ] Admin/MCP template과 local binder fallback이 모두 동작한다.
- [ ] 기존 deploy start, approval queue, rollback surface 동작이 깨지지 않는다.
- [ ] unit/orchestration/rendering 테스트가 추가 또는 수정된다.

## Open Questions

- serviceName 추출은 AI resolver에만 맡길지, rule resolver에도 known service name 기반 추출을 추가할지 결정이 필요하다.
- empty history를 text fallback으로 처리할지, empty surface로 처리할지 정책을 정해야 한다.
- `DataTableBlock`의 status badge color mapping을 generic하게 개선할지, deploy history 전용 table part를 만들지 결정이 필요하다.
- Python backend(`ASSISTANT_BACKEND=python`)도 데모 대상이면 Python decision/tool/template path까지 같이 수정해야 한다.
