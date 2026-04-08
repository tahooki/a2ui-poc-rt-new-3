# A2UI PoC 구현 계획서

## 1. 문서 목적

이 문서는 A2UI 플랫폼의 3가지 핵심 제품을 **실제 코드로 구현**하여, 기존 챗봇 서비스에 적용하는 PoC 구현 계획을 정리한다.

기존 기획 문서:
- `20260406_a2ui-platform-planning.md` — 전체 구조, 역할 분리, contract 설계
- `20260406_a2ui-agent-integration-cases.md` — 기존 agent에 A2UI를 붙이는 통합 케이스

이 문서는 위 기획을 바탕으로, **실제로 무엇을 만들고, 어떻게 연결하고, 어떤 순서로 진행할지** 구현 수준에서 정리한다.

---

## 2. PoC 전체 구성도

```
┌──────────────────────────────────────────────────────────────────┐
│                        기존 챗봇 서비스                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Chatbot UI  │    │  Chat API    │    │  Python Agent    │   │
│  │  (Next.js)   │◄──►│  (Node)      │◄──►│  (FastAPI)       │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  A2UI Front  │    │  A2UI Admin      │    │  A2UI Agent      │
│  UI Library  │    │  + MCP Server    │    │  Library         │
│  (npm pkg)   │    │  (웹 + 서버)     │    │  (Node + Python) │
└──────────────┘    └──────────────────┘    └──────────────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  공통 Contract    │
                    │  (JSON Schema)   │
                    └──────────────────┘
```

---

## 3. 만들어야 할 것 — 4가지 패키지 + 데모 서버

| # | 패키지 | 역할 | 언어 |
|---|--------|------|------|
| 1 | `@a2ui/ui` | 프론트 UI 라이브러리 | TypeScript / React |
| 2 | `@a2ui/admin` | Admin + MCP Server | TypeScript / Node |
| 3 | `@a2ui/agent-node` | Node Agent Library | TypeScript |
| 4 | `a2ui-agent-python` | Python Agent Library | Python |
| 5 | `@a2ui/contracts` | 공통 Contract (JSON Schema) + 타입 생성 | JSON Schema |
| 6 | `demo-agent-server` | PoC 데모용 Python Agent 서버 | Python / FastAPI |
| 7 | `demo-mock-api` | PoC 데모용 Mock 내부 API | Node / Express |

---

## 4. 공통 기반 — Contract + Execution Context

### 4.1 공통 Contract (JSON Schema)

3가지 제품을 안정적으로 연결하는 핵심 레이어. JSON Schema를 단일 원본(single source of truth)으로 사용한다.

```
packages/a2ui-contracts/
├── schemas/
│   ├── surface-envelope.schema.json
│   ├── action-event.schema.json
│   ├── execution-context.schema.json
│   ├── template-contract.schema.json
│   ├── resolver-contract.schema.json
│   └── binding-recipe.schema.json
├── templates/                           # 도메인별 템플릿 contract
│   ├── deploy-launchpad.schema.json
│   ├── approval-queue-inbox.schema.json
│   └── rollback-summary.schema.json
├── generated/
│   ├── typescript/                      # JSON Schema → TS 타입 자동 생성
│   └── python/                          # JSON Schema → Pydantic 모델 자동 생성
├── scripts/
│   ├── generate-ts.sh                   # json-schema-to-typescript
│   └── generate-py.sh                   # datamodel-code-generator
└── package.json
```

### 4.2 Execution Context

기획 문서 3.4절에 정의된 런타임 실행 시 필요한 공통 문맥이다. 모든 resolver와 MCP tool 호출에 포함된다.

```typescript
interface ExecutionContext {
  // 유저 정보
  user: {
    id: string;
    name: string;
    roles: string[];          // ["deployer", "approver", "admin"]
  };

  // 조직/테넌트 경계
  org: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };

  // 세션 정보
  conversationId: string;
  sessionId: string;
  requestId: string;           // 매 요청마다 고유 ID (action replay 방지)

  // 도메인 컨텍스트
  selectedEntity?: {
    type: string;              // "service" | "approval" | "incident"
    id: string;
    name: string;
  };

  // 환경
  environment: "production" | "staging" | "development";

  // 모델 설정 (LLM resolver용)
  modelConfig?: {
    provider: string;
    model: string;
    maxTokens?: number;
  };
}
```

```python
# Python 대응 (Pydantic)
class UserInfo(BaseModel):
    id: str
    name: str
    roles: list[str]

class OrgInfo(BaseModel):
    id: str
    name: str

class SelectedEntity(BaseModel):
    type: str
    id: str
    name: str

class ExecutionContext(BaseModel):
    user: UserInfo
    org: OrgInfo
    project: dict | None = None
    conversation_id: str
    session_id: str
    request_id: str
    selected_entity: SelectedEntity | None = None
    environment: str = "production"
    model_config_override: dict | None = None
```

### 4.3 Template Version 전략

PoC에서는 단순한 semver 문자열을 사용한다.

| 규칙 | 설명 |
|------|------|
| 형식 | `MAJOR.MINOR.PATCH` (semver) |
| 활성 버전 | 동시에 1개만 published 상태. 이전 버전은 자동으로 `deprecated` |
| 하위 호환 | MINOR/PATCH 변경은 기존 payload와 호환. MAJOR 변경은 breaking |
| deprecated 처리 | deprecated 버전은 30일간 fallback 사용 가능, 이후 제거 |
| PoC 범위 | 버전은 `1.0.0` 고정. 버전 관리 로직은 인터페이스만 정의하고 구현은 Phase 6에서 |

---

## 5. 제품 1 — A2UI Front UI Library (`@a2ui/ui`)

챗봇 프론트에서 A2UI Surface를 렌더링하는 React 컴포넌트 라이브러리.

### 5.1 제공하는 것

| 구분 | 내용 |
|------|------|
| **프리미티브 컴포넌트** | `SurfaceCard`, `DataTable`, `ActionButton`, `StatusBadge`, `FormField`, `MetricBar`, `Timeline` |
| **Surface Renderer** | `templateId + payload`를 받아 등록된 템플릿으로 렌더링하는 핵심 컴포넌트 |
| **Template Registry** | 템플릿을 등록하고 ID로 조회하는 클라이언트 사이드 레지스트리 |
| **Action Emitter** | UI 액션(버튼 클릭, 선택 변경 등)을 표준 이벤트로 emit |
| **Surface Envelope 타입** | `SurfaceEnvelope` 타입 정의 + 검증 유틸리티 |

### 5.2 디렉토리 구조

```
packages/a2ui-ui/
├── src/
│   ├── primitives/           # 기본 빌딩 블록
│   │   ├── SurfaceCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── ActionButton.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── FormField.tsx
│   │   ├── MetricBar.tsx
│   │   ├── Timeline.tsx
│   │   └── index.ts
│   ├── renderer/
│   │   ├── SurfaceRenderer.tsx      # templateId + payload → 렌더링
│   │   ├── TemplateRegistry.ts      # 템플릿 등록/조회
│   │   └── ActionEmitter.ts         # 액션 이벤트 emit
│   ├── types/
│   │   ├── surface-envelope.ts      # SurfaceEnvelope 타입
│   │   ├── template-contract.ts     # Template Input Contract 타입
│   │   └── action-event.ts          # ActionEvent 타입
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 5.3 핵심 인터페이스

```typescript
// Surface Envelope — 프론트가 받는 최종 데이터
interface SurfaceEnvelope {
  templateId: string;
  version: string;
  payload: Record<string, unknown>;
  actions?: SurfaceAction[];
  meta?: {
    generatedAt: string;
    resolverTrace?: string[];
  };
}

// Surface Action — UI에서 가능한 액션 정의
interface SurfaceAction {
  id: string;
  label: string;
  kind: "submit" | "select" | "refresh" | "navigate";
  params?: Record<string, unknown>;
  confirm?: { title: string; message: string };
}

// Template 등록
interface TemplateDefinition {
  templateId: string;
  version: string;
  component: React.ComponentType<{ payload: any; onAction: (action: ActionEvent) => void }>;
  inputSchema: JSONSchema;          // 이 템플릿이 요구하는 payload shape
  actions?: SurfaceAction[];
}

// Action Event — 프론트에서 서버로 보내는 이벤트
interface ActionEvent {
  actionId: string;
  templateId: string;
  kind: SurfaceAction["kind"];
  params?: Record<string, unknown>;
  sessionContext: {
    conversationId: string;
    userId: string;
    requestId: string;                // action replay 방지용 고유 ID
  };
}
```

### 5.4 사용 예시 — 개발자가 템플릿을 만드는 방법

```tsx
// 1. 프리미티브를 조합해서 템플릿 컴포넌트 만들기
import { SurfaceCard, DataTable, ActionButton, StatusBadge } from "@a2ui/ui";

function ApprovalQueueTemplate({ payload, onAction }) {
  return (
    <SurfaceCard title="Approval Queue" subtitle={`${payload.totalPending}건 대기`}>
      <DataTable
        columns={[
          { key: "risk", render: (v) => <StatusBadge level={v} /> },
          { key: "title" },
          { key: "requester" },
          { key: "requestedAt" },
        ]}
        rows={payload.items}
      />
      <ActionButton
        label="선택 항목 승인"
        kind="submit"
        onClick={() => onAction({ actionId: "approve-selected", kind: "submit" })}
      />
    </SurfaceCard>
  );
}

// 2. 템플릿 등록
import { registerTemplate } from "@a2ui/ui";

registerTemplate({
  templateId: "approval_queue_inbox",
  version: "1.0.0",
  component: ApprovalQueueTemplate,
  inputSchema: approvalQueueSchema,  // JSON Schema
});

// 3. 챗봇에서 렌더링
import { SurfaceRenderer } from "@a2ui/ui";

function ChatMessage({ message }) {
  return (
    <div>
      <p>{message.text}</p>
      {message.surface && (
        <SurfaceRenderer
          envelope={message.surface}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
```

---

## 6. 제품 2 — Admin + MCP Server (`@a2ui/admin`)

템플릿과 resolver를 설계/관리하는 Admin(Control Plane)과, 검증된 정의를 실행하는 MCP Server(Execution Plane).

### 6.1 Admin (Control Plane)

| 화면 | 기능 |
|------|------|
| **Template Registry** | 등록된 템플릿 목록, templateId, version, inputSchema 확인 |
| **Resolver Designer** | 각 필드별 resolver 유형(API/LLM/Auth/Transform) 설정 |
| **Binding Recipe Editor** | resolver 결과 → 템플릿 필드 매핑 규칙 작성 |
| **Simulation & Preview** | 테스트 context로 resolver chain 실행 + 결과 미리보기 |
| **Publish Flow** | Draft → Preview → Publish 상태 관리 |

### 6.2 MCP Server (Execution Plane)

Agent Library가 MCP 프로토콜로 호출하는 서버. Published된 정의만 실행한다.

#### MCP Transport

Python Agent와 MCP Server가 별도 프로세스이므로, **Streamable HTTP (SSE)** transport를 사용한다.

| 항목 | 선택 |
|------|------|
| Transport | Streamable HTTP (SSE) — `@modelcontextprotocol/sdk`의 `SSEServerTransport` |
| 서버 포트 | `:3100` |
| 이유 | stdio는 같은 프로세스 내에서만 가능. 별도 서버이므로 HTTP 기반이 적합 |
| Python 클라이언트 | `mcp` Python SDK의 `SSEClientTransport` |

#### MCP Tools 목록

```
a2ui.listTemplates        — 사용 가능한 템플릿 목록 반환
a2ui.getTemplateContract  — 특정 템플릿의 inputSchema 반환
a2ui.checkAccess          — 현재 유저의 템플릿 접근 권한 확인
a2ui.resolveTemplateData  — resolver chain 실행 → payload 생성
a2ui.executeAction        — UI 액션 실행 (승인, 배포, 롤백 등)
a2ui.recommendTemplate    — context 기반 템플릿 추천
```

### 6.3 Decision Engine

Story 페이지의 아키텍처에서 정의된 **규칙 기반 판단 엔진**이다. AI(LLM)과는 별도로, 수집된 facts를 평가하여 다음 행동을 결정한다.

| 판단 결과 | 의미 |
|-----------|------|
| `render_surface` | facts가 충분함. 템플릿을 선택하고 surface를 생성 |
| `ask_followup` | facts가 부족함. 사용자에게 추가 질문 |
| `text_only` | A2UI 대상이 아님. 기존 텍스트 응답으로 처리 |

```typescript
interface DecisionResult {
  action: "render_surface" | "ask_followup" | "text_only";
  templateId?: string;          // render_surface일 때
  followupQuestion?: string;    // ask_followup일 때
  reason: string;               // 판단 근거 (audit용)
}

// Decision Engine은 MCP Server 내부에 위치
// a2ui.recommendTemplate tool이 이 엔진을 호출
function evaluate(facts: Record<string, unknown>, rules: DecisionRule[]): DecisionResult {
  // 1. intent에 매칭되는 템플릿 후보 탐색
  // 2. 각 후보의 필수 facts가 모두 있는지 체크
  // 3. 부족하면 ask_followup, 충분하면 render_surface
  // 4. 후보가 없으면 text_only
}
```

Decision Engine은 LLM이 아닌 **규칙 기반**이다. intent → 템플릿 매핑 규칙, 필수 facts 체크 리스트 등을 Admin에서 설정한다.

### 6.4 디렉토리 구조

```
packages/a2ui-admin/
├── src/
│   ├── admin/                    # Admin 웹 UI (Control Plane)
│   │   ├── pages/
│   │   │   ├── template-list.tsx
│   │   │   ├── template-detail.tsx
│   │   │   ├── resolver-designer.tsx
│   │   │   ├── binding-editor.tsx
│   │   │   └── simulation.tsx
│   │   ├── components/
│   │   └── api/                  # Admin API routes
│   │       ├── templates.ts
│   │       ├── resolvers.ts
│   │       └── publish.ts
│   │
│   ├── mcp-server/               # MCP Server (Execution Plane)
│   │   ├── server.ts             # MCP server entry (SSE transport)
│   │   ├── tools/
│   │   │   ├── list-templates.ts
│   │   │   ├── get-template-contract.ts
│   │   │   ├── check-access.ts
│   │   │   ├── resolve-template-data.ts
│   │   │   ├── execute-action.ts
│   │   │   └── recommend-template.ts
│   │   ├── decision/
│   │   │   ├── decision-engine.ts     # 규칙 기반 판단 엔진
│   │   │   └── decision-rules.ts      # intent → 템플릿 매핑 규칙
│   │   ├── resolvers/
│   │   │   ├── api-resolver.ts
│   │   │   ├── llm-resolver.ts
│   │   │   ├── auth-resolver.ts
│   │   │   └── transform-resolver.ts
│   │   ├── binding/
│   │   │   └── binding-engine.ts
│   │   ├── validation/
│   │   │   └── payload-validator.ts
│   │   └── audit/
│   │       └── audit-logger.ts        # resolver chain 실행 기록
│   │
│   └── store/                    # 데이터 저장
│       ├── template-store.ts
│       ├── resolver-store.ts
│       └── recipe-store.ts
│
├── package.json
└── tsconfig.json
```

### 6.5 MCP Server 핵심 흐름

```
Agent가 a2ui.resolveTemplateData 호출
  │
  ├── 1. ExecutionContext에서 tenant boundary 검증 (org.id 기준)
  ├── 2. templateId로 published 정의 조회
  ├── 3. Auth resolver — 현재 유저의 접근 권한 확인
  ├── 4. resolver chain 순차 실행
  │     ├── API resolver → 내부 API 호출 → 팩트 데이터
  │     ├── LLM resolver → 요약/추천/설명 생성 (prompt boundary 적용)
  │     ├── Auth resolver → 버튼 노출 여부 결정
  │     └── Transform resolver → 데이터 병합/정규화
  ├── 5. binding recipe 적용 → payload shape 조립
  ├── 6. payload를 template inputSchema로 검증
  ├── 7. audit log 기록 (resolver trace, 소요시간, 성공/실패)
  └── 8. SurfaceEnvelope 반환
```

### 6.6 Resolver Contract — 전체 타입 정의

```typescript
interface ResolverDefinition {
  resolverId: string;
  type: "api" | "llm" | "auth" | "transform";
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  config: ApiResolverConfig | LlmResolverConfig | AuthResolverConfig | TransformResolverConfig;
  executionPolicy: {
    timeout: number;
    retryCount: number;
    fallback?: "skip" | "default_value" | "error";
    fallbackValue?: unknown;         // fallback이 default_value일 때 사용할 값
  };
}

// API Resolver 설정
interface ApiResolverConfig {
  endpoint: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  paramMapping: Record<string, string>;   // context field → API param
  responseMapping: Record<string, string>; // API response → output field
  secretRef?: string;                      // secret store의 참조 키 (API key 등)
}

// LLM Resolver 설정
interface LlmResolverConfig {
  model: string;
  systemPrompt: string;                    // 시스템 프롬프트 (고정)
  userPromptTemplate: string;              // 유저 프롬프트 템플릿 (변수 주입)
  inputFields: string[];                   // context에서 prompt에 주입할 필드
  outputSchema: JSONSchema;                // structured output 강제
  maxTokens: number;
  // prompt injection 방어
  inputSanitization: boolean;              // 외부 입력 이스케이프 여부
  piiFields?: string[];                    // LLM에 넘기면 안 되는 민감 필드 목록
}

// Auth Resolver 설정
interface AuthResolverConfig {
  permissionType: "template_access" | "action_execute" | "field_visibility";
  requiredRoles?: string[];                // 필요한 역할 목록
  fieldLevelRules?: Array<{
    field: string;
    requiredRole: string;
    maskIfDenied: boolean;                 // 권한 없으면 마스킹할지 숨길지
  }>;
}

// Transform Resolver 설정
interface TransformResolverConfig {
  operations: Array<{
    type: "merge" | "pick" | "rename" | "compute" | "filter";
    source: string | string[];             // 입력 필드(들)
    target: string;                        // 출력 필드
    expression?: string;                   // compute일 때 변환 표현식
  }>;
}

// Binding Recipe
interface BindingRecipe {
  recipeId: string;
  templateId: string;
  bindings: Array<{
    targetField: string;              // 템플릿 payload 필드
    sourceResolver: string;           // resolverId
    sourceField: string;              // resolver output 필드
    transform?: string;               // 선택적 변환 표현식
    required: boolean;                // 필수 여부 — 실패 시 전체 실패 vs skip
  }>;
}
```

### 6.7 보안/운영 제약 (PoC 수준)

기획 문서 6.4절의 보안 요구사항을 PoC에서 최소한으로 반영한다.

| 항목 | PoC 구현 수준 | 프로덕션 필요 수준 |
|------|---------------|-------------------|
| **Tenant Isolation** | ExecutionContext.org.id로 resolver 조회 범위 제한 | DB/API 레벨 row-level security |
| **Secret Handling** | 환경변수에서 주입. resolver config에는 `secretRef` 키만 저장 | Vault/Secret Manager 연동 |
| **Prompt Injection** | LLM resolver에 `inputSanitization: true` 적용. system/user prompt 분리 | 전용 sanitizer + output validation |
| **PII Handling** | LlmResolverConfig.piiFields로 LLM 전달 차단 | field-level redaction engine |
| **Action Replay** | ActionEvent.sessionContext.requestId로 중복 실행 방지 | idempotency key + TTL store |
| **Audit** | audit-logger가 resolver chain 실행 결과를 JSON 파일로 기록 | 전용 audit DB + alerting |

---

## 7. 제품 3 — Agent Library (Node + Python)

기존 agent에 A2UI를 한 step처럼 끼워 넣는 SDK. Node와 Python 양쪽 모두 제공한다.

### 7.1 패키지 구성

기획 문서(integration-cases 14절)의 "core + framework adapter" 구조를 따른다.

#### Node 패키지

```
packages/a2ui-agent-node/
├── src/
│   ├── core/
│   │   ├── a2ui-agent.ts          # 고수준 API (renderOrFallback 등)
│   │   ├── mcp-client.ts          # MCP SSE 클라이언트
│   │   ├── schema-validator.ts    # payload 검증 (Zod/Ajv)
│   │   ├── fallback-policy.ts     # fallback 전략
│   │   └── types.ts               # 공통 타입 (contracts에서 import)
│   ├── adapters/
│   │   ├── express.ts             # Express middleware adapter
│   │   ├── nextjs.ts              # Next.js handler adapter
│   │   └── langchain.ts           # LangChain Runnable adapter
│   └── index.ts
├── package.json
└── tsconfig.json
```

#### Python 패키지

```
packages/a2ui-agent-python/
├── a2ui_agent/
│   ├── __init__.py
│   ├── client.py              # MCP SSE 클라이언트
│   ├── agent.py               # 고수준 API (render_or_fallback 등)
│   ├── types.py               # Pydantic 모델
│   ├── validator.py           # schema validation 유틸
│   ├── fallback.py            # fallback 정책
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── fastapi.py         # FastAPI response adapter
│   │   └── langgraph.py       # LangGraph node adapter
│   └── mcp/
│       ├── __init__.py
│       ├── session.py         # async MCP SSE session wrapper
│       └── tools.py           # MCP tool 호출 래퍼
├── pyproject.toml
└── README.md
```

### 7.2 고수준 API — 3개 함수

Node와 Python에서 동일한 인터페이스를 제공한다.

#### `renderOrFallback(context)` / `render_or_fallback(context)`

A2UI surface 생성을 시도하고, 실패하면 기존 텍스트 응답을 유지한다.

```typescript
// Node
class A2UIAgent {
  constructor(options: { mcpServerUrl: string; apiKey?: string });

  async renderOrFallback(context: A2UIContext): Promise<A2UIResponse> {
    try {
      const recommendation = await this.client.recommendTemplate(context);
      if (!recommendation) return { text: context.text };

      const access = await this.client.checkAccess(recommendation.templateId, context.executionContext);
      if (!access.allowed) return { text: context.text };

      const envelope = await this.client.resolveTemplateData(recommendation.templateId, context);

      return { text: context.text, surface: envelope };
    } catch {
      return { text: context.text };  // fallback
    }
  }
}
```

```python
# Python
class A2UIAgent:
    def __init__(self, mcp_server_url: str, api_key: str | None = None):
        self._client = A2UIMCPClient(mcp_server_url, api_key)

    async def render_or_fallback(self, context: A2UIContext) -> A2UIResponse:
        try:
            recommendation = await self._client.recommend_template(context)
            if not recommendation:
                return A2UIResponse(text=context.text)

            access = await self._client.check_access(
                template_id=recommendation.template_id,
                execution_context=context.execution_context,
            )
            if not access.allowed:
                return A2UIResponse(text=context.text)

            envelope = await self._client.resolve_template_data(
                template_id=recommendation.template_id,
                context=context,
            )
            return A2UIResponse(text=context.text, surface=envelope)

        except Exception:
            return A2UIResponse(text=context.text)
```

#### `maybeRenderA2UI(context)` / `maybe_render_a2ui(context)`

이번 턴이 A2UI 대상인지 판단하고, 대상이면 surface만 반환.

#### `handleA2UIAction(event, context)` / `handle_action(event, context)`

UI 액션을 받아 MCP Server의 `executeAction`을 호출하고 다음 흐름으로 연결.

### 7.3 A2UIContext 타입 (Execution Context 포함)

```typescript
// Node
interface A2UIContext {
  userInput: string;
  workflowState?: Record<string, unknown>;
  toolResult?: Record<string, unknown>;
  text?: string;
  executionContext: ExecutionContext;     // 4.2절에서 정의한 공통 문맥
}

interface A2UIResponse {
  text?: string;
  surface?: SurfaceEnvelope;
  meta?: Record<string, unknown>;
}
```

```python
# Python
class A2UIContext(BaseModel):
    user_input: str
    workflow_state: dict | None = None
    tool_result: dict | None = None
    text: str | None = None
    execution_context: ExecutionContext    # 4.2절에서 정의한 공통 문맥

class A2UIResponse(BaseModel):
    text: str | None = None
    surface: SurfaceEnvelope | None = None
    meta: dict | None = None
```

### 7.4 기존 Agent에 적용하는 방법

#### Python Agent (Before / After)

```python
# ── Before ──
async def run_agent_turn(user_input: str, state: dict) -> dict:
    plan = planner.plan(user_input, state)
    tool_result = await executor.run(plan)
    text = await narrator.generate(user_input=user_input, tool_result=tool_result)
    return {"text": text}


# ── After ──
from a2ui_agent import A2UIAgent, A2UIContext

a2ui = A2UIAgent(mcp_server_url="http://localhost:3100/mcp")

async def run_agent_turn(user_input: str, state: dict, exec_ctx: ExecutionContext) -> dict:
    plan = planner.plan(user_input, state)
    tool_result = await executor.run(plan)
    text = await narrator.generate(user_input=user_input, tool_result=tool_result)

    response = await a2ui.render_or_fallback(
        A2UIContext(
            user_input=user_input,
            workflow_state=state,
            tool_result=tool_result,
            text=text,
            execution_context=exec_ctx,
        )
    )
    return response.model_dump(exclude_none=True)
```

#### Node Agent (Before / After)

```typescript
// ── Before ──
async function runAgentTurn(input: AgentInput): Promise<AgentResponse> {
  const state = await planner.plan(input);
  const toolResult = await executor.run(state, tools);
  const answer = await narrator.generate({ input, toolResult });
  return { text: answer };
}

// ── After ──
import { A2UIAgent } from "@a2ui/agent-node";

const a2ui = new A2UIAgent({ mcpServerUrl: "http://localhost:3100/mcp" });

async function runAgentTurn(input: AgentInput): Promise<AgentResponse> {
  const state = await planner.plan(input);
  const toolResult = await executor.run(state, tools);
  const answer = await narrator.generate({ input, toolResult });

  return a2ui.renderOrFallback({
    userInput: input.message,
    workflowState: state,
    toolResult,
    text: answer,
    executionContext: input.executionContext,
  });
}
```

#### LangGraph Adapter

```python
from a2ui_agent.adapters.langgraph import a2ui_node

graph = StateGraph(State)
graph.add_node("plan", plan_node)
graph.add_node("tools", tool_node)
graph.add_node("a2ui", a2ui_node)       # A2UI node 추가
graph.add_node("respond", respond_node)

graph.add_edge("plan", "tools")
graph.add_edge("tools", "a2ui")
graph.add_edge("a2ui", "respond")
```

#### LangChain Adapter

```typescript
import { A2UIRunnable } from "@a2ui/agent-node/adapters/langchain";

const chain = prompt.pipe(model).pipe(outputParser).pipe(new A2UIRunnable(a2ui));
```

---

## 8. 기존 Node 오케스트레이션 → Python Agent 이전

### 8.1 현재 상태 — Node에 모든 AI 로직이 있음

현재 챗봇의 AI 파이프라인은 `src/devops-chat/server/orchestrate-chat-turn.ts`에 **전부** 들어있다.

```
orchestrate-chat-turn.ts (현재 Node)
  │
  ├── resolveIntentWithAi()       — LLM으로 intent 해석 + slot 추출
  ├── resolveAwaiting()           — 슬롯 응답 처리 (AI + 규칙 기반)
  ├── planTools() + executeTool() — tool 계획 + 실행
  ├── evaluateDecision()          — Decision Engine (규칙 기반)
  ├── callLlmOrFallback()         — LLM으로 최종 텍스트 응답 생성
  └── buildTurnResponse()         — surface envelope 포함 응답 조립
```

관련 모듈:
- `server/ai/` — LLM 클라이언트, intent 해석, mock 응답, 스트리밍 시뮬레이션
- `server/orchestration/` — intent/slot/workflow 관리, response builder
- `server/decision/` — Decision Engine
- `server/tools/` — tool registry, executor, adapter

### 8.2 목표 상태 — Python Agent가 오케스트레이션을 소유

PoC에서는 이 오케스트레이션 로직을 **Python Agent 서버**로 이전한다. Chat API(Node)는 **SSE 프록시**로 역할이 축소된다.

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 (As-Is)                              │
│                                                             │
│  Chat API (Node) ─ 모든 AI 로직 소유                        │
│    ├── intent 해석 (LLM)                                    │
│    ├── slot filling                                         │
│    ├── tool 실행                                            │
│    ├── decision engine                                      │
│    ├── LLM 텍스트 생성                                      │
│    └── surface envelope 조립                                │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    목표 (To-Be)                              │
│                                                             │
│  Chat API (Node) ─ SSE 프록시 + 세션 관리                   │
│    ├── SSE 연결 관리                                        │
│    ├── Python Agent에 HTTP 요청 위임                        │
│    ├── 응답을 SSE text/surface/done 이벤트로 변환            │
│    └── Action 이벤트 라우팅                                  │
│                                                             │
│  Python Agent ─ 오케스트레이션 소유                          │
│    ├── intent 해석 (LLM)                                    │
│    ├── slot filling + awaiting 관리                         │
│    ├── tool 실행 (내부 tool + Mock API 호출)                 │
│    ├── decision engine (규칙 기반)                           │
│    ├── LLM 텍스트 생성                                      │
│    ├── a2ui_agent SDK로 surface 생성                        │
│    └── A2UIResponse (text + surface) 반환                   │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 이전 매핑 — Node 모듈 → Python 모듈

| 현재 Node 모듈 | 역할 | Python 이전 대상 |
|----------------|------|-------------------|
| `server/ai/ai-intent-resolver.ts` | LLM intent 해석 | `app/orchestration/intent_resolver.py` |
| `server/ai/ai-awaiting-resolver.ts` | LLM slot 응답 처리 | `app/orchestration/awaiting_resolver.py` |
| `server/ai/llm-client.ts` | OpenAI API 호출 | `app/ai/llm_client.py` (Python LLM SDK) |
| `server/ai/tool-narrator.ts` | tool 결과 → 자연어 변환 | `app/ai/narrator.py` |
| `server/orchestration/intent-resolver.ts` | 규칙 기반 intent 해석 | `app/orchestration/intent_resolver.py` (규칙 기반 fallback) |
| `server/orchestration/slot-memory.ts` | slot 상태 관리 | `app/orchestration/slot_memory.py` |
| `server/orchestration/slot-definitions.ts` | slot 스키마 정의 | `app/orchestration/slot_definitions.py` |
| `server/orchestration/tool-planner.ts` | tool 계획 | `app/orchestration/tool_planner.py` |
| `server/orchestration/workflow-definitions.ts` | workflow 정의 | `app/orchestration/workflow_definitions.py` |
| `server/decision/decision-engine.ts` | Decision Engine | `app/decision/decision_engine.py` |
| `server/tools/tool-registry.ts` | tool 등록/조회 | `app/tools/registry.py` |
| `server/tools/tool-executor.ts` | tool 실행 | `app/tools/executor.py` |
| `server/orchestrate-chat-turn.ts` | 전체 파이프라인 | `app/orchestrate.py` |

### 8.4 Python Agent 서버 — 전체 구조

```
packages/demo-agent-server/
├── app/
│   ├── main.py                    # FastAPI entry
│   ├── orchestrate.py             # 전체 파이프라인 (orchestrate-chat-turn.ts 대응)
│   │
│   ├── ai/
│   │   ├── llm_client.py          # LLM API 호출 (OpenAI/Claude)
│   │   ├── narrator.py            # tool 결과 → 자연어 변환
│   │   └── mock_responses.py      # LLM 없을 때 mock 응답
│   │
│   ├── orchestration/
│   │   ├── intent_resolver.py     # intent 해석 (AI + 규칙 기반)
│   │   ├── awaiting_resolver.py   # slot 응답 처리
│   │   ├── slot_memory.py         # slot 상태 관리
│   │   ├── slot_definitions.py    # slot 스키마 정의
│   │   ├── tool_planner.py        # tool 계획
│   │   └── workflow_definitions.py # workflow 정의
│   │
│   ├── decision/
│   │   ├── decision_engine.py     # 규칙 기반 Decision Engine
│   │   └── policies/              # intent별 판단 정책
│   │
│   ├── tools/
│   │   ├── registry.py            # tool 등록/조회
│   │   ├── executor.py            # tool 실행
│   │   ├── deploy_tool.py         # 배포 관련 tool
│   │   ├── approval_tool.py       # 승인 관련 tool
│   │   └── incident_tool.py       # 인시던트/롤백 관련 tool
│   │
│   ├── types/
│   │   ├── conversation.py        # ConversationFacts, IntentState 등
│   │   └── response.py            # AgentResponse
│   │
│   └── config.py
├── requirements.txt
└── Dockerfile
```

### 8.5 핵심 파이프라인 — Python orchestrate.py

기존 `orchestrate-chat-turn.ts`의 8단계 파이프라인을 Python으로 이전한다.

```python
# app/orchestrate.py

from a2ui_agent import A2UIAgent, A2UIContext

a2ui = A2UIAgent(mcp_server_url="http://localhost:3100/mcp")

async def orchestrate_chat_turn(turn_input: OrchestrateTurnInput) -> AgentResponse:
    """
    전체 오케스트레이션 파이프라인 (Node orchestrate-chat-turn.ts → Python 이전)

    1. awaiting 응답 처리 (slot filling)
    2. intent 해석 (LLM + 규칙 기반 fallback)
    3. workflow 상태 업데이트
    4. tool 계획 + 실행 루프 (max 3회)
    5. facts 병합
    6. Decision Engine 평가
    7. 텍스트 응답 생성 (LLM)
    8. A2UI surface 생성 (a2ui_agent SDK)
    """
    facts = turn_input.facts.copy()
    current_intent = turn_input.intent
    current_workflow = turn_input.workflow
    current_awaiting = turn_input.awaiting

    # Step 1: Awaiting 응답 처리
    if current_awaiting:
        result = await resolve_awaiting(turn_input.input, current_awaiting, facts)
        facts = result.facts
        current_awaiting = result.awaiting

    # Step 2: Intent 해석 (AI-first, rule-based fallback)
    intent_result = await resolve_intent(
        turn_input.input, current_intent, turn_input.history
    )
    current_intent = intent_result.intent
    facts = merge_ai_slots(facts, intent_result.slots)

    # Step 3: Workflow 업데이트
    current_workflow = update_workflow(current_intent, current_workflow)

    # Step 4-5: Tool 실행 루프
    tool_results = []
    for _ in range(MAX_ITERATIONS):
        planned = plan_tools(current_intent.intent_key, facts)
        if not planned:
            break
        result = await execute_tool(planned[0], facts)
        facts = {**facts, **result.facts_patch}
        tool_results.append(result)

    # Step 6: Decision Engine 평가
    decision = evaluate_decision(current_intent.intent_key, facts, current_workflow)

    # Step 7: 텍스트 응답 생성
    text = await generate_response(decision, tool_results, turn_input)

    # Step 8: A2UI surface 생성 (decision이 render_surface일 때)
    if decision.mode == "render_surface":
        response = await a2ui.render_or_fallback(
            A2UIContext(
                user_input=turn_input.input,
                workflow_state={"intent": current_intent, "workflow": current_workflow},
                tool_result={"results": [r.summary for r in tool_results]},
                text=text,
                execution_context=turn_input.execution_context,
            )
        )
        return AgentResponse(
            text=response.text,
            surface=response.surface,
            intent=current_intent,
            workflow=current_workflow,
            facts=facts,
            awaiting=current_awaiting,
        )

    # ask_followup 또는 text_only
    return AgentResponse(
        text=text,
        intent=current_intent,
        workflow=current_workflow,
        facts=facts,
        awaiting=build_awaiting(decision, current_intent, facts) if decision.mode == "ask_followup" else None,
    )
```

### 8.6 Chat API(Node) 변경사항

Chat API는 오케스트레이션을 Python Agent에 위임하고, SSE 프록시 역할만 한다.

```typescript
// src/devops-chat/lib/chat-api.ts (변경 후)

export async function handleChatMessage(req, res) {
  const { message, conversationId, history, facts, intent, workflow, awaiting } = req.body;

  // SSE 헤더 설정
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Python Agent에 위임
  const agentResponse = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: message,
      conversation_id: conversationId,
      history,
      facts,
      intent,
      workflow,
      awaiting,
      execution_context: buildExecutionContext(req),
    }),
  });

  const result = await agentResponse.json();

  // 텍스트 스트리밍
  if (result.text) {
    // 텍스트를 청크로 나눠서 SSE로 전송 (타이핑 효과)
    for (const chunk of splitIntoChunks(result.text)) {
      res.write(`event: text\ndata: ${JSON.stringify({ chunk })}\n\n`);
    }
  }

  // Surface 전송
  if (result.surface) {
    res.write(`event: surface\ndata: ${JSON.stringify(result.surface)}\n\n`);
  }

  // 상태 업데이트 (intent, workflow, facts, awaiting)
  res.write(`event: state\ndata: ${JSON.stringify({
    intent: result.intent,
    workflow: result.workflow,
    facts: result.facts,
    awaiting: result.awaiting,
  })}\n\n`);

  res.write(`event: done\ndata: {}\n\n`);
  res.end();
}
```

### 8.7 이전 전략

전체를 한 번에 이전하지 않고, 단계적으로 진행한다.

| 단계 | 내용 | Node Chat API | Python Agent |
|------|------|---------------|-------------|
| **Step 0** | 현재 상태 | 모든 로직 소유 | 없음 |
| **Step 1** | Python Agent 서버 생성 + 프록시 모드 | Python에 메시지 전달, 응답 릴레이 | 메시지 받아서 그대로 반환 (echo) |
| **Step 2** | Intent 해석 이전 | intent 결과를 Python에서 수신 | LLM intent 해석 + 규칙 기반 fallback |
| **Step 3** | Tool 실행 이전 | tool 결과를 Python에서 수신 | tool 계획 + 실행 + facts 병합 |
| **Step 4** | Decision + 응답 생성 이전 | SSE 프록시만 담당 | Decision Engine + LLM 텍스트 생성 |
| **Step 5** | A2UI SDK 연동 | surface를 SSE로 전달 | `a2ui_agent.render_or_fallback()` 호출 |
| **Step 6** | Node 레거시 코드 정리 | 프록시 + SSE만 남김 | 전체 파이프라인 소유 |

### 8.8 데모용 Mock API 서버

Resolver가 호출할 내부 API가 실제로는 없으므로, mock 데이터를 반환하는 서버를 둔다.

```
packages/demo-mock-api/
├── src/
│   ├── server.ts
│   ├── routes/
│   │   ├── services.ts        # GET /services/:name — 서비스 정보
│   │   ├── deployments.ts     # GET /deployments — 배포 이력
│   │   ├── images.ts          # GET /images — 도커 이미지 목록
│   │   ├── approvals.ts       # GET /approvals — 승인 대기 목록
│   │   ├── incidents.ts       # GET /incidents — 인시던트 목록
│   │   └── actions.ts         # POST /actions/deploy, /actions/approve, /actions/rollback
│   └── fixtures/
│       ├── services.json
│       ├── deployments.json
│       ├── approvals.json
│       └── incidents.json
├── package.json
└── tsconfig.json
```

---

## 9. 통신 구조

```
┌───────────┐     SSE      ┌───────────┐     HTTP      ┌──────────────────────┐
│  Chatbot  │◄────────────►│  Chat API │◄─────────────►│  Python Agent        │
│  UI       │              │  (Node)   │               │  :8000               │
│           │              │  SSE 프록시│               │  오케스트레이션 주체   │
└───────────┘              └───────────┘               │                      │
                                                       │  ├── intent 해석     │
                                                       │  ├── slot filling    │
                                                       │  ├── tool 실행       │
                                                       │  ├── decision engine │
                                                       │  ├── LLM 텍스트 생성 │
                                                       │  └── a2ui SDK 호출   │
                                                       └──────────┬───────────┘
                                                                  │
                                                       ┌──────────┼───────────┐
                                                       │          │           │
                                                       ▼          ▼           ▼
                                                 ┌──────────┐ ┌────────┐ ┌────────┐
                                                 │ A2UI MCP │ │Mock API│ │ LLM    │
                                                 │ Server   │ │ :3200  │ │ API    │
                                                 │ :3100    │ └────────┘ └────────┘
                                                 └──────────┘
```

### 9.1 통신 프로토콜

| 구간 | 프로토콜 | 데이터 | 비고 |
|------|----------|--------|------|
| UI ↔ Chat API | SSE (Server-Sent Events) | text/surface/state/done 이벤트 | Node는 SSE 프록시만 담당 |
| Chat API → Python Agent | HTTP POST `/chat` | 메시지 + 대화 상태 + ExecutionContext | Node가 Python에 전체 위임 |
| Python Agent → Chat API | HTTP Response | AgentResponse (text + surface + 상태) | Python이 오케스트레이션 결과 반환 |
| Python Agent → MCP Server | MCP over SSE (Streamable HTTP) | MCP tool calls (JSON-RPC) | a2ui_agent SDK가 호출 |
| Python Agent → Mock API | HTTP REST | 도메인 데이터 조회/액션 실행 | tool 실행 시 직접 호출 |
| Python Agent → LLM API | HTTP REST | intent 해석, 텍스트 생성 | OpenAI/Claude API |
| MCP Server → Mock API | HTTP REST | resolver chain 실행 시 데이터 조회 | API resolver가 호출 |
| UI → Chat API (Action) | HTTP POST `/action` | ActionEvent JSON | Chat API가 Python에 라우팅 |

### 9.2 SSE 스트리밍에서 Surface 전달 방식

Chat API가 프론트에 응답을 보낼 때, SSE event type을 분리한다.

```
event: text
data: {"chunk": "payments-api 배포를 준비했습니다."}

event: text
data: {"chunk": " 아래에서 확인해주세요."}

event: surface
data: {"templateId": "deploy_launchpad", "version": "1.0.0", "payload": {...}, "actions": [...]}

event: done
data: {}
```

| SSE event type | 용도 |
|----------------|------|
| `text` | 텍스트 스트리밍 청크 |
| `surface` | SurfaceEnvelope JSON (텍스트 스트림 완료 후 전송) |
| `done` | 응답 완료 시그널 |

프론트는 `text` 이벤트로 타이핑 효과를 보여주고, `surface` 이벤트를 받으면 `SurfaceRenderer`로 UI를 렌더링한다.

---

## 10. PoC 시나리오 — 3가지 사례에 적용

기존 Story에서 정의한 3가지 DevOps 사례에 실제 구현을 매핑한다.

### 10.1 배포 (Deploy Launchpad)

| 구간 | 동작 |
|------|------|
| **Python Agent** | 유저가 "payments-api 배포해줘" 입력 → agent가 기존 tool로 서비스 정보 조회 → `a2ui.render_or_fallback()` 호출 |
| **Decision Engine** | intent: `deploy` + entity: `payments-api` → facts 충분 → `render_surface` + `deploy_launchpad` |
| **MCP Server** | API resolver로 서비스/이미지/이전배포 데이터 수집 (Mock API) → Transform resolver로 payload 조립 |
| **Front UI** | `SurfaceRenderer`가 `deploy_launchpad` 템플릿 렌더링 → 유저가 "배포 시작" 클릭 → ActionEvent 전송 |
| **Action 처리** | `handleA2UIAction()` → MCP Server의 `executeAction` → Mock API의 배포 API 호출 |

#### Deploy Launchpad Template Contract (실제 schema 예시)

```json
{
  "$id": "deploy-launchpad",
  "type": "object",
  "required": ["service", "image", "deployConfig", "recentDeploys"],
  "properties": {
    "service": {
      "type": "object",
      "required": ["name", "environment", "currentVersion"],
      "properties": {
        "name": { "type": "string" },
        "environment": { "enum": ["production", "staging", "development"] },
        "currentVersion": { "type": "string" },
        "healthStatus": { "enum": ["healthy", "degraded", "down"] }
      }
    },
    "image": {
      "type": "object",
      "required": ["registry", "repository", "tag"],
      "properties": {
        "registry": { "type": "string" },
        "repository": { "type": "string" },
        "tag": { "type": "string" },
        "digest": { "type": "string" },
        "builtAt": { "type": "string", "format": "date-time" }
      }
    },
    "deployConfig": {
      "type": "object",
      "required": ["strategy", "cpu", "memory", "replicas"],
      "properties": {
        "strategy": { "enum": ["rolling", "bluegreen", "canary"] },
        "cpu": { "type": "string" },
        "memory": { "type": "string" },
        "replicas": { "type": "integer", "minimum": 1 },
        "autoRecommended": { "type": "boolean" }
      }
    },
    "recentDeploys": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "version": { "type": "string" },
          "deployedAt": { "type": "string", "format": "date-time" },
          "deployedBy": { "type": "string" },
          "status": { "enum": ["success", "failed", "rolled_back"] }
        }
      }
    },
    "riskSummary": {
      "type": "string",
      "description": "LLM resolver가 생성하는 배포 리스크 요약"
    }
  }
}
```

### 10.2 승인 (Approval Queue Inbox)

| 구간 | 동작 |
|------|------|
| **Python Agent** | "승인 요청 확인해줘" → agent가 승인 목록 조회 → `a2ui.render_or_fallback()` |
| **Decision Engine** | intent: `approval_check` → facts 충분 → `render_surface` + `approval_queue_inbox` |
| **MCP Server** | API resolver로 pending 목록 수집 → LLM resolver로 리스크 요약 생성 → Auth resolver로 승인 권한 체크 |
| **Front UI** | 큐 테이블 렌더링, 리스크 뱃지, 승인/보류 버튼 |
| **Action 처리** | 승인 클릭 → `handleA2UIAction()` → Mock API의 승인 API 호출 → 업데이트된 큐 재렌더링 |

### 10.3 롤백 (Rollback Summary)

| 구간 | 동작 |
|------|------|
| **Python Agent** | "payments-api 인시던트 떴는데 원인이 뭐야?" → agent가 인시던트/배포이력 조회 → `a2ui.render_or_fallback()` |
| **Decision Engine** | intent: `incident_investigate` + entity: `payments-api` → facts 충분 → `render_surface` + `rollback_summary` |
| **MCP Server** | API resolver로 인시던트 + 배포이력 수집 → LLM resolver로 원인 분석 + 롤백 버전 추천 생성 → Auth resolver로 롤백 실행 권한 체크 |
| **Front UI** | 인시던트 상태, 원인 분석, 추천 버전 목록, 롤백 실행 버튼 |
| **Action 처리** | 롤백 클릭 → confirm 모달 → `handleA2UIAction()` → Mock API의 롤백 API 호출 → 결과 확인 surface |

---

## 11. 에러/Fallback 시나리오 매트릭스

기획 문서 4.5절의 "실패해도 기존 agent를 깨지 않게 설계한다" 원칙을 구체적으로 매핑한다.

| 실패 지점 | 증상 | Fallback 동작 | 사용자가 보는 것 |
|-----------|------|---------------|-----------------|
| MCP Server 연결 실패 | `render_or_fallback`에서 connection error | 기존 텍스트 응답 유지 | 일반 텍스트 답변 |
| 템플릿 추천 실패 | `recommendTemplate`이 null 반환 | 텍스트 응답 유지 | 일반 텍스트 답변 |
| 권한 체크 실패 | `checkAccess`가 denied 반환 | 텍스트 응답 + 권한 부족 안내 | "이 작업을 수행할 권한이 없습니다" |
| API Resolver timeout | 내부 API 응답 지연 | `executionPolicy.fallback` 에 따라 skip 또는 default | partial payload로 렌더링 또는 텍스트 |
| LLM Resolver 실패 | LLM API 에러 또는 schema validation 실패 | 해당 필드 skip (riskSummary 등은 optional) | surface는 표시되되, 요약 필드 비어있음 |
| Payload 검증 실패 | binding 결과가 template inputSchema 불일치 | 전체 surface 포기, 텍스트 fallback | 일반 텍스트 답변 |
| Action 실행 실패 | 배포/승인/롤백 API 에러 | 에러 메시지 surface 또는 텍스트로 반환 | "배포 실행에 실패했습니다: {reason}" |
| Action Replay 감지 | 같은 requestId로 중복 요청 | 409 Conflict 반환, 재실행 차단 | "이미 처리된 요청입니다" |

---

## 12. Chat API — SSE 프록시 레이어

오케스트레이션이 Python Agent로 이전된 후, Chat API(Node)는 **SSE 프록시 + 세션 관리**만 담당한다.

### 12.1 Chat API의 역할 (이전 후)

```
유저 메시지 수신
  │
  ├── 1. 세션/인증 정보에서 ExecutionContext 조립
  │
  ├── 2. Python Agent (POST /chat)에 전체 위임
  │     input, history, facts, intent, workflow, awaiting, execution_context
  │
  ├── 3. Python Agent 응답 수신
  │     { text, surface, intent, workflow, facts, awaiting }
  │
  ├── 4. SSE 이벤트로 변환해서 프론트에 전달
  │     event: text → 텍스트 청크 스트리밍
  │     event: surface → SurfaceEnvelope 전달
  │     event: state → 대화 상태 업데이트
  │     event: done → 응답 완료
  │
  └── 5. 대화 상태(facts, intent, workflow, awaiting) 서버 사이드 저장
```

### 12.2 역할 분리 — 이전 전/후 비교

| 책임 | 현재 (Node) | 이전 후 (Node) | 이전 후 (Python) |
|------|-------------|---------------|-----------------|
| SSE 연결 관리 | Node | Node | - |
| 세션/인증 관리 | Node | Node | - |
| intent 해석 (LLM) | Node | - | **Python** |
| slot filling / awaiting | Node | - | **Python** |
| tool 계획 + 실행 | Node | - | **Python** |
| Decision Engine | Node | - | **Python** |
| LLM 텍스트 생성 | Node | - | **Python** |
| A2UI surface 생성 | Node (부분) | - | **Python** (a2ui-agent SDK) |
| Resolver chain 실행 | - | - | MCP Server (Python이 호출) |
| Action 이벤트 라우팅 | Node | Node (프록시) | **Python** (처리) |
| 대화 상태 저장 | Node | Node | - |

---

## 13. 구현 순서

PoC 특성상 전체를 완벽하게 만드는 것이 아니라, **E2E 동작하는 최소 경로**를 먼저 관통시키는 것이 중요하다.

### Phase 1: Contract + 기본 골격 (기반 작업)

1. **Monorepo 구조 세팅**
   - `packages/` 디렉토리 생성, pnpm workspace 설정
   - 기존 `src/`와 병행 가능하도록 구성
   - 공통 tsconfig, eslint 설정

2. **공통 Contract JSON Schema 정의**
   - `surface-envelope.schema.json`
   - `action-event.schema.json`
   - `execution-context.schema.json`
   - 도메인 템플릿 1개 (`deploy_launchpad`) contract

3. **타입 생성 파이프라인**
   - JSON Schema → TypeScript 타입 (`json-schema-to-typescript`)
   - JSON Schema → Pydantic 모델 (`datamodel-code-generator`)

### Phase 2: Mock API + A2UI Front UI Library

4. **데모용 Mock API 서버** (`demo-mock-api`)
   - fixture 데이터 기반 REST API
   - 서비스 정보, 배포 이력, 승인 목록, 인시던트 데이터

5. **프리미티브 컴포넌트 구현** (`@a2ui/ui`)
   - `SurfaceCard`, `DataTable`, `ActionButton`, `StatusBadge`, `FormField`

6. **SurfaceRenderer + TemplateRegistry**
   - templateId로 등록된 컴포넌트를 찾아 렌더링

7. **Deploy Launchpad 템플릿 작성**
   - 프리미티브 조합으로 첫 번째 도메인 템플릿 완성

### Phase 3: MCP Server (Execution)

8. **MCP Server 기본 구조** (`@a2ui/admin`)
   - `@modelcontextprotocol/sdk` + SSE transport 서버 세팅
   - `a2ui.resolveTemplateData`, `a2ui.recommendTemplate` tool 구현

9. **Decision Engine**
   - intent → 템플릿 매핑 규칙
   - 필수 facts 충족 체크

10. **Resolver 엔진**
    - API resolver (Mock API 호출)
    - Transform resolver
    - Auth resolver (기본 role 체크)
    - LLM resolver (요약 생성)

11. **Binding Engine + Payload Validation**
    - resolver 결과 → payload 필드 매핑
    - JSON Schema 기반 payload 검증

12. **Audit Logger**
    - resolver chain 실행 결과 JSON 파일 기록

### Phase 4: Node → Python 오케스트레이션 이전

13. **Python Agent 서버 생성 + 프록시 모드** (`demo-agent-server`)
    - FastAPI 서버 세팅, `/chat` 엔드포인트
    - Chat API(Node)에서 Python Agent로 HTTP 위임 연결
    - 처음에는 echo 모드 (받은 메시지 그대로 반환)로 E2E 연결 확인

14. **Intent 해석 이전**
    - `ai-intent-resolver.ts` → `intent_resolver.py`
    - `intent-resolver.ts` (규칙 기반) → 규칙 기반 fallback 포함
    - LLM 클라이언트 Python 구현 (`llm_client.py`)

15. **Slot/Awaiting + Tool 실행 이전**
    - `slot-memory.ts`, `slot-definitions.ts` → Python slot 관리
    - `tool-planner.ts`, `tool-executor.ts` → Python tool 파이프라인
    - Mock API 호출하는 tool 구현 (deploy, approval, incident)

16. **Decision Engine + 응답 생성 이전**
    - `decision-engine.ts` → `decision_engine.py`
    - `tool-narrator.ts`, `callLlmOrFallback` → `narrator.py`
    - 전체 `orchestrate-chat-turn.ts` → `orchestrate.py` 완성

17. **Chat API를 SSE 프록시로 전환**
    - 기존 orchestration 코드 제거
    - Python Agent에 HTTP 위임 + SSE 변환만 남김

### Phase 5: A2UI Agent Library 연동

18. **Node Agent Library** (`@a2ui/agent-node`)
    - MCP SSE 클라이언트
    - `renderOrFallback()`, `handleA2UIAction()`
    - Express adapter

19. **Python Agent Library** (`a2ui-agent-python`)
    - MCP SSE 클라이언트
    - `render_or_fallback()`, `handle_action()`
    - FastAPI adapter

20. **Python Agent 서버에 A2UI SDK 연동**
    - `orchestrate.py`의 Step 8에서 `a2ui.render_or_fallback()` 호출
    - Decision Engine이 `render_surface`일 때 MCP Server 통해 surface 생성

### Phase 6: E2E 연결 + 나머지 템플릿

21. **E2E 흐름 관통 테스트** (Deploy 시나리오)
    - 유저 입력 → Chat API(SSE 프록시) → Python Agent → MCP Server → Mock API → payload → SSE → Front 렌더링 → Action → 결과

22. **SSE 스트리밍 연동**
    - Chat API에서 text/surface/state/done 이벤트 타입 분리
    - 프론트에서 EventSource 처리

23. **Approval Queue Inbox 템플릿** + resolver 추가

24. **Rollback Summary 템플릿** + resolver 추가

25. **Fallback 시나리오 검증**
    - MCP Server 다운, resolver timeout, payload 검증 실패 등

### Phase 7: Admin UI (선택적 — PoC 범위 조정 가능)

26. **Admin 기본 화면**
    - Template 목록 / Contract 뷰어 / Simulation / Decision Rule 편집

---

## 14. Monorepo 구조

기존 `src/` 프로젝트와 새 `packages/`가 공존하는 구조.

```
a2ui-poc-rt-new-3/
├── src/                          # 기존 PoC 코드 (유지)
│   ├── devops-chat/
│   ├── devops-console/
│   └── app/
├── packages/                     # 새 A2UI 라이브러리 코드
│   ├── a2ui-contracts/           # 공통 Contract (JSON Schema + 타입 생성)
│   ├── a2ui-ui/                  # Front UI Library
│   ├── a2ui-admin/               # Admin + MCP Server
│   ├── a2ui-agent-node/          # Node Agent Library
│   ├── a2ui-agent-python/        # Python Agent Library
│   ├── demo-agent-server/        # PoC 데모용 Python Agent 서버
│   └── demo-mock-api/            # PoC 데모용 Mock API 서버
├── pnpm-workspace.yaml           # Monorepo workspace 설정
├── package.json
└── ...
```

기존 `src/` 코드는 그대로 유지한다. 새 라이브러리는 `packages/`에 독립적으로 개발하고, 기존 코드를 참고하되 직접 import하지 않는다.

---

## 15. 기존 프로젝트와의 관계

| 기존 코드 | 역할 | 새 코드와의 관계 |
|------------|------|-------------------|
| `src/devops-chat/templates/` | 템플릿 정의 + 렌더링 | → `@a2ui/ui` 라이브러리로 추출/재구성 |
| `src/devops-chat/server/` | Chat orchestration + AI/decision | → Chat API(오케스트레이션) + Python Agent + MCP Server로 역할 분리 |
| `src/devops-console/template-admin/` | Admin 시뮬레이터 | → `@a2ui/admin` 으로 확장 |
| `src/devops-chat/lib/chat-api.ts` | Chat API | → SSE 스트리밍 + Python Agent 연동 레이어 추가 |
| `src/devops-chat/server/decision/` | Decision Engine | → MCP Server 내 decision-engine으로 이동 |

---

## 16. 기술 스택

| 영역 | 기술 |
|------|------|
| Front UI Library | React, TypeScript, Zod (schema validation) |
| Admin | Next.js (기존 프로젝트와 통합 또는 별도), React |
| MCP Server | Node.js, `@modelcontextprotocol/sdk` (SSE transport), Ajv (JSON Schema validation) |
| Node Agent Library | TypeScript, `@modelcontextprotocol/sdk` (SSE client) |
| Python Agent Library | Python 3.11+, Pydantic, `mcp` (Python MCP SDK, SSE client), httpx |
| Demo Agent Server | Python 3.11+, FastAPI, uvicorn |
| Demo Mock API | Node.js, Express |
| 공통 Contract | JSON Schema (draft 2020-12) |
| 타입 생성 | `json-schema-to-typescript`, `datamodel-code-generator` |
| Monorepo | pnpm workspaces |

---

## 17. 성공 기준

기획 문서의 최소 성공 기준을 코드 수준으로 재정의한다.

| # | 기준 | 검증 방법 |
|---|------|-----------|
| 1 | 기존 agent에 `renderOrFallback()` / `render_or_fallback()` 한 줄로 A2UI가 붙는다 | Before/After 코드 diff가 1-5줄 이내 (Node, Python 양쪽) |
| 2 | A2UI 실패 시 기존 텍스트 응답이 그대로 유지된다 | MCP Server 다운 상태에서 agent 응답 정상 확인 |
| 3 | Deploy 시나리오 E2E 동작 | 자연어 → SSE stream → surface 렌더링 → 배포 액션 실행 |
| 4 | Surface payload가 contract validation 통과 | JSON Schema 검증 자동화 테스트 |
| 5 | 버튼 클릭 액션이 agent 흐름으로 연결 | Approve/Deploy/Rollback 버튼 → Mock API 호출 확인 |
| 6 | Decision Engine이 intent 기반으로 올바른 템플릿을 선택한다 | deploy/approval/rollback intent → 각각 매칭되는 템플릿 반환 |
| 7 | 3가지 시나리오 모두 E2E 동작 | Deploy + Approval + Rollback 시나리오 관통 |

---

## 18. 기술 검증 — 핵심 연결부가 실제로 동작하는가

PoC에서 가장 불확실한 두 지점을 기술적으로 검증한다.

### 18.1 검증 대상 1: UI ↔ Admin 스키마 호환성 검증

**질문:** 프론트 템플릿이 선언한 `inputSchema`와, Admin에서 resolver + binding으로 만들어낸 payload가 맞는지 프로그래밍적으로 검증할 수 있는가?

**결론: 가능하다.**

JSON Schema는 필드명, 타입, required 여부가 모두 기계적으로 읽을 수 있으므로, 아래 두 시점에서 검증이 가능하다.

#### Admin 저장 시 (정적 검증)

```
Template inputSchema (프론트가 선언)
  ├── service.name: string (required)
  ├── service.environment: enum (required)
  ├── image.tag: string (required)
  └── riskSummary: string (optional)

                     ↕ 호환성 검증

Binding Recipe가 생성할 payload shape
  ├── service.name      ← API resolver outputSchema: serviceName (string) ✅
  ├── service.environment ← API resolver outputSchema: env (string)       ✅
  ├── image.tag         ← API resolver outputSchema: latestTag (string)   ✅
  └── riskSummary       ← LLM resolver outputSchema: summary (string)    ✅
```

검증 로직:

```typescript
function validateBindingCompatibility(
  templateSchema: JSONSchema,       // 템플릿이 요구하는 것
  bindings: BindingRecipe,          // resolver → 필드 매핑
  resolvers: ResolverDefinition[],  // 각 resolver의 outputSchema
): ValidationResult {
  const errors: string[] = [];

  // 1. 템플릿의 required 필드가 모두 binding에 존재하는지
  for (const field of templateSchema.required ?? []) {
    if (!bindings.bindings.find(b => b.targetField === field)) {
      errors.push(`필수 필드 '${field}'에 대한 binding이 없습니다`);
    }
  }

  // 2. 각 binding의 source resolver가 해당 필드를 실제로 출력하는지 + 타입 호환
  for (const binding of bindings.bindings) {
    const resolver = resolvers.find(r => r.resolverId === binding.sourceResolver);
    if (!resolver) {
      errors.push(`Resolver '${binding.sourceResolver}'가 존재하지 않습니다`);
      continue;
    }
    const sourceType = getFieldType(resolver.outputSchema, binding.sourceField);
    const targetType = getFieldType(templateSchema, binding.targetField);
    if (!isTypeCompatible(sourceType, targetType)) {
      errors.push(`타입 불일치: ${binding.sourceField}(${sourceType}) → ${binding.targetField}(${targetType})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

이 검증은 Ajv 같은 JSON Schema 라이브러리로 구현 가능하다. 복잡한 스키마 기능(oneOf, conditional)은 PoC에서 사용하지 않으므로, 단순한 object/array/string/number/boolean 수준이면 충분하다.

#### Runtime 실행 시 (동적 검증)

MCP Server가 resolver chain을 실행한 뒤, 조립된 payload를 템플릿의 `inputSchema`로 검증한다.

```typescript
import Ajv from "ajv";
const ajv = new Ajv();

function validatePayload(payload: unknown, templateSchema: JSONSchema): boolean {
  const validate = ajv.compile(templateSchema);
  return validate(payload);  // true/false + validate.errors로 상세 에러
}
```

이 검증이 실패하면 surface 생성을 포기하고 텍스트 fallback으로 넘어간다.

#### 진짜 리스크와 대응

| 리스크 | 설명 | 대응 |
|--------|------|------|
| LLM resolver output 비결정성 | structured output을 써도 LLM이 가끔 스키마를 벗어날 수 있음 | runtime에서 Ajv 검증 + 실패 시 해당 필드 skip (optional 필드만 LLM에 맡기는 것이 안전) |
| 중첩 object 타입 비교 복잡성 | `service.name` 같은 중첩 경로의 타입 호환 판단 | PoC에서는 flat한 필드 위주로 설계, 중첩은 transform resolver에서 정리 |

### 18.2 검증 대상 2: Python Agent → MCP Server 통신

**질문:** Python에서 MCP 프로토콜로 Node MCP Server의 tool을 호출해서 데이터를 받아올 수 있는가?

**결론: 가능하다. 공식 Python MCP SDK가 SSE transport를 지원한다.**

#### Python 클라이언트 (공식 `mcp` 패키지)

```python
from mcp import ClientSession
from mcp.client.sse import sse_client
import json

async def resolve_template_data(template_id: str, context: dict) -> dict:
    """MCP Server의 a2ui.resolveTemplateData tool을 호출"""

    async with sse_client("http://localhost:3100/sse") as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            result = await session.call_tool(
                "a2ui.resolveTemplateData",
                arguments={
                    "templateId": template_id,
                    "context": context,
                },
            )

            # result.content[0].text → SurfaceEnvelope JSON 문자열
            return json.loads(result.content[0].text)
```

#### Node MCP Server (공식 `@modelcontextprotocol/sdk`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const server = new McpServer({ name: "a2ui-mcp-server", version: "1.0.0" });

// Tool 등록
server.tool(
  "a2ui.resolveTemplateData",
  {
    templateId: { type: "string", description: "템플릿 ID" },
    context: { type: "object", description: "실행 컨텍스트" },
  },
  async ({ templateId, context }) => {
    const envelope = await resolveAndBuild(templateId, context);
    return {
      content: [{ type: "text", text: JSON.stringify(envelope) }],
    };
  },
);

// SSE endpoint 연결
const app = express();
app.get("/sse", (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});
app.post("/messages", (req, res) => {
  // SSE transport가 처리
});
app.listen(3100);
```

#### 통신 흐름

```
Python Agent                          Node MCP Server
    │                                       │
    │  GET /sse (SSE 연결 수립)              │
    │──────────────────────────────────────►│
    │◄─────── endpoint: /messages ──────────│
    │                                       │
    │  POST /messages (initialize)          │
    │──────────────────────────────────────►│
    │◄─────── serverInfo, capabilities ─────│
    │                                       │
    │  POST /messages (call_tool)           │
    │  { "a2ui.resolveTemplateData", ... }  │
    │──────────────────────────────────────►│
    │                                       │  ← resolver chain 실행
    │                                       │  ← payload 검증
    │◄─────── SurfaceEnvelope JSON ─────────│
    │                                       │
```

이것은 MCP 프로토콜의 표준 동작이다. Python/Node 양쪽 모두 Anthropic 공식 SDK를 사용하므로 호환성 문제가 없다.

#### 진짜 리스크와 대응

| 리스크 | 심각도 | 설명 | 대응 |
|--------|--------|------|------|
| SSE 연결 끊김 | 중 | 네트워크 불안정 시 long-lived SSE 연결이 끊길 수 있음 | 재연결 로직 구현. PoC에서는 요청마다 새 연결도 허용 |
| Resolver chain latency | 중 | LLM resolver 포함 시 2-5초 소요 가능 | timeout 설정 필수 (10초). LLM 필드는 optional로 설계 |
| 동시 요청 시 SSE 성능 | 낮음 | 여러 agent가 동시 호출 시 연결 관리 필요 | PoC는 단일 사용자. connection pool은 프로덕션 과제 |
| MCP SDK 버전 호환 | 낮음 | Node/Python SDK 버전이 다르면 프로토콜 불일치 가능 | 양쪽 SDK 버전을 고정 (package.json, requirements.txt) |
| 에러 전파 | 낮음 | resolver 내부 에러가 Python까지 올바르게 전달되는지 | MCP SDK가 에러를 구조화해서 반환함. `isError` 체크 |

### 18.3 종합 기술 판단

| 검증 항목 | 기술적 가능성 | PoC 난이도 | 핵심 걱정 포인트 |
|-----------|-------------|-----------|----------------|
| UI ↔ Admin 스키마 검증 (정적) | 완전히 가능 | 낮음 | 없음 — JSON Schema 비교는 확립된 기술 |
| UI ↔ Admin 스키마 검증 (동적) | 완전히 가능 | 낮음 | LLM resolver output의 비결정성 |
| Python → MCP 통신 | 완전히 가능 | 낮음 | 없음 — 공식 SDK, 표준 프로토콜 |
| MCP SDK 안정성 | 공식 SDK, 안정 | 낮음 | 버전 고정하면 문제 없음 |
| Resolver chain 전체 latency | 동작은 가능 | 중간 | LLM 포함 시 2-5초. UX 설계로 커버 (로딩 표시) |

**두 연결부 모두 구조적으로 문제 없고, 개발 가능하다.** 불확실성이 있는 부분은 MCP나 스키마 검증 자체가 아니라 LLM resolver의 출력 품질인데, 이는 optional 필드 설계 + runtime schema validation + fallback 정책으로 방어한다.

### 18.4 PoC 초기에 반드시 먼저 검증할 것

Phase 1~2에서 아래 두 가지를 빠르게 spike 테스트하는 것을 권장한다.

**Spike 1: MCP 연결 E2E** (1-2시간)
```
1. Node MCP Server에 hello world tool 하나 등록
2. Python에서 mcp SDK로 호출
3. 결과 JSON 받아오기 확인
→ 이것만 되면 MCP 통신 리스크는 0
```

**Spike 2: Schema 검증 E2E** (1-2시간)
```
1. deploy_launchpad.schema.json 작성
2. mock payload 하나 만들어서 Ajv로 검증
3. 일부러 필드 누락시켜서 에러 확인
→ 이것만 되면 스키마 검증 리스크는 0
```

이 두 spike가 통과하면, 나머지는 구현량의 문제일 뿐 기술적 불확실성은 사실상 없다.

---

## 19. 한 줄 요약

`@a2ui/ui`로 템플릿을 만들고, Admin + MCP Server(Decision Engine 포함)로 데이터를 채우고, Agent Library(Node + Python) 한 줄로 기존 agent에 붙인다 — 이 3개를 SSE 스트리밍으로 연결해 E2E로 관통시키는 것이 이번 PoC의 목표다.
