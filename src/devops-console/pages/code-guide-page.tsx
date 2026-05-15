"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import s from "./code-guide-page.module.css";

type CodeExample = {
  title: string;
  file: string;
  snippet: string;
};

type FeatureStory = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  codeExamples: CodeExample[];
};

const journeySteps = [
  {
    label: "1",
    title: "Agent가 intent와 facts를 만든다",
    body: "Python 또는 Next.js chat orchestration이 사용자 입력을 deploy.start 같은 intent와 serviceName 같은 facts로 정리합니다.",
    file: "packages/demo-agent-server/app/orchestrate.py",
  },
  {
    label: "2",
    title: "MCP에 어떤 UI가 필요한지 묻는다",
    body: "a2ui.recommendTemplate tool이 catalog의 intent rule을 보고 render_surface, ask_followup, text_only 중 하나를 결정합니다.",
    file: "packages/a2ui-admin/src/mcp-server/tools/register-tools.ts",
  },
  {
    label: "3",
    title: "Resolver chain이 payload를 조립한다",
    body: "Mock API, static defaults, transform, optional LLM summary를 순서대로 실행하고 binding recipe로 payload를 만듭니다.",
    file: "packages/a2ui-admin/src/mcp-server/runtime/resolve-template.ts",
  },
  {
    label: "4",
    title: "SurfaceEnvelope가 UI로 전달된다",
    body: "Next.js chat SSE 또는 직접 호출 결과가 SurfaceEnvelope로 내려가고, component UI는 envelope만 보고 화면을 렌더링합니다.",
    file: "packages/a2ui-ui/src/renderer/SurfaceRenderer.tsx",
  },
];

const featureStories: FeatureStory[] = [
  {
    eyebrow: "Python Agent Wrapper",
    title: "Python 쪽은 얇은 MCP client처럼 붙입니다",
    body: "현재 Python server는 mcp 패키지 API를 직접 쓰기보다 httpx로 Streamable HTTP JSON-RPC를 호출합니다. 라이브러리처럼 쓰는 표면은 render_or_fallback()이고, 내부에서 initialize, tools/call, SSE/JSON 응답 파싱을 처리합니다.",
    bullets: [
      "A2UIMcpClient.call_tool(): MCP initialize 후 tools/call 요청",
      "render_or_fallback(): recommendTemplate 후 resolveTemplateData 호출",
      "handle_action(): 버튼 action을 a2ui.executeAction으로 전달",
    ],
    codeExamples: [
      {
        title: "MCP wrapper",
        file: "packages/demo-agent-server/app/a2ui_agent.py",
        snippet: `async def render_or_fallback(
    intent_key: str,
    facts: dict,
    mcp_url: Optional[str] = None,
) -> A2UIResponse:
    try:
        client = A2UIMcpClient(server_url=mcp_url)

        decision = await client.call_tool(
            "a2ui.recommendTemplate",
            {"intentKey": intent_key, "facts": facts},
        )

        mode = decision.get("mode", "")
        if mode == "ask_followup":
            return A2UIResponse(
                type="followup",
                missing_facts=decision.get("missingFacts", []),
                reason=decision.get("reason", "추가 정보가 필요합니다."),
            )

        if mode != "render_surface" or not decision.get("templateId"):
            return A2UIResponse(
                type="text_fallback",
                text=decision.get("reason") or decision.get("error"),
            )

        envelope = await client.call_tool(
            "a2ui.resolveTemplateData",
            {
                "templateId": decision["templateId"],
                "context": {**facts, "intentKey": intent_key},
            },
        )

        if "error" in envelope:
            return A2UIResponse(
                type="text_fallback",
                text=f"템플릿 렌더링 실패: {envelope['error']}",
            )

        return A2UIResponse(type="surface", surface=envelope)
    except Exception as e:
        return A2UIResponse(
            type="text_fallback",
            text=f"A2UI 연결 실패. 텍스트로 응답합니다. ({e})",
        )`,
      },
      {
        title: "Orchestration hook",
        file: "packages/demo-agent-server/app/orchestrate.py",
        snippet: `decision = evaluate_decision(intent_result.intent_key, facts)
tool_summary = "\\n".join(t["summary"] for t in tool_results) if tool_results else None
text = ""

surface = None
if decision.mode == "render_surface":
    a2ui_result = await render_or_fallback(
        intent_key=intent_result.intent_key,
        facts=facts,
    )
    if a2ui_result.type == "surface":
        surface = a2ui_result.surface
        text = _surface_ready_text(intent_result.intent_key, facts)
    elif a2ui_result.type == "followup":
        text = a2ui_result.reason or "추가 정보가 필요합니다."
    else:
        text = a2ui_result.text or await generate_response(
            request.input,
            request.context,
            tool_summary,
        )`,
      },
      {
        title: "Runtime config",
        file: "packages/demo-agent-server/app/config.py",
        snippet: `class Settings(BaseModel):
    """Application settings."""

    host: str = "0.0.0.0"
    port: int = 8000
    mcp_server_url: str = "http://localhost:3100/mcp"
    mock_api_url: str = "http://localhost:3200"
    debug: bool = True
    openai_api_key: str = _env("OPENAI_API_KEY")
    openai_model: str = _env("OPENAI_MODEL", "gpt-4.1-mini")
    openai_base_url: str = _env("OPENAI_BASE_URL", "https://api.openai.com/v1")`,
      },
    ],
  },
  {
    eyebrow: "Component UI",
    title: "UI는 SurfaceEnvelope를 받아서 그리는 쪽에 집중합니다",
    body: "SurfaceRenderer는 surfaceConfig가 있으면 dynamic parts renderer를 쓰고, 없으면 templateId로 등록된 React template을 찾습니다. payload는 화면 데이터, actions는 버튼 계약입니다.",
    bullets: [
      "SurfaceRenderer: dynamic renderer와 template registry 중 하나를 선택",
      "DynamicA2UICardRenderer: parts 배열을 component registry로 변환",
      "A2UISurfaceHost: action 상태, surface/facts 갱신, read-only 처리를 담당",
    ],
    codeExamples: [
      {
        title: "Renderer switch",
        file: "packages/a2ui-ui/src/renderer/SurfaceRenderer.tsx",
        snippet: `export function SurfaceRenderer({ envelope, onAction }: SurfaceRendererProps) {
  if ((envelope as DynamicA2UIEnvelope).surfaceConfig) {
    const dynamicEnvelope = envelope as DynamicA2UIEnvelope;
    return (
      <DynamicA2UICardRenderer
        envelope={dynamicEnvelope}
        onAction={onAction}
        surfaceConfig={dynamicEnvelope.surfaceConfig!}
      />
    );
  }

  const def = getTemplate(envelope.templateId);
  if (!def) {
    return (
      <div style={{ padding: 16, background: "#1a1a2e" }}>
        <div>Template not found: {envelope.templateId}</div>
        <pre>{JSON.stringify(envelope.payload, null, 2)}</pre>
      </div>
    );
  }

  const Component = def.component;
  return (
    <Component
      payload={envelope.payload}
      actions={envelope.actions as TemplateAction[] | undefined}
      onAction={onAction}
    />
  );
}`,
      },
      {
        title: "Dynamic parts",
        file: "packages/a2ui-ui/src/dynamic/DynamicA2UICardRenderer.tsx",
        snippet: `export function DynamicA2UICardRenderer({
  envelope,
  surfaceConfig,
  onAction,
}: DynamicA2UICardRendererProps) {
  const payloadKey = \`\${envelope.templateId}:\${envelope.freshnessKey ?? envelope.updatedAt}\`;
  const [draftState, setDraftState] = useState({
    key: payloadKey,
    payload: envelope.payload,
  });
  const draftPayload = draftState.key === payloadKey ? draftState.payload : envelope.payload;

  const updateDraftPayload = useCallback((payload: Record<string, unknown>) => {
    setDraftState({ key: payloadKey, payload });
  }, [payloadKey]);

  const bindingContext: BindingContext = {
    payload: draftPayload,
    actions: envelope.actions,
    meta: envelope.meta,
  };

  const card = surfaceConfig.card ?? {};
  const title = card.title
    ? textValue(resolveBindingValue(card.title, bindingContext), envelope.templateId)
    : envelope.templateId;
  const actions = card.actions?.source === "templateActions"
    ? envelope.actions as TemplateAction[] | undefined
    : undefined;

  return (
    <A2UICardShell actions={actions} onAction={onAction} payload={draftPayload} title={title}>
      {surfaceConfig.parts.map((part) => {
        const Part = getA2UIPart(part.type);
        if (!Part) {
          return <UnknownPartFallback id={part.id} key={part.id} type={part.type} />;
        }
        const props = resolveProps(part.props, bindingContext);
        return (
          <Part
            key={part.id}
            {...props}
            __a2uiPayload={draftPayload}
            __a2uiSetPayload={updateDraftPayload}
          />
        );
      })}
    </A2UICardShell>
  );
}`,
      },
      {
        title: "Action bridge",
        file: "packages/a2ui-chat/src/A2UISurfaceHost.tsx",
        snippet: `const handleAction = useCallback(
  async (event: Parameters<NonNullable<ComponentProps<typeof SurfaceRenderer>["onAction"]>>[0]) => {
    if (!normalizedSurface || disabled || readOnly || !onAction) return;

    setStatus((current) => reduceA2UISurfaceStatus(current, {
      type: "start",
      actionId: event.actionId,
    }));

    try {
      const result = await onAction({
        actionId: event.actionId,
        kind: event.kind,
        params: event.params,
        payload: event.params,
        surface: normalizedSurface,
      });
      const nextSurface = normalizeA2UISurface(result.surface);
      if (nextSurface || result.surface === null) {
        onSurfaceChange?.(nextSurface);
      }
      if (result.facts) {
        onFactsChange?.(result.facts);
      }
      setStatus((current) => reduceA2UISurfaceStatus(current, {
        type: "done",
        actionId: event.actionId,
        message: result.message,
      }));
    } catch (error) {
      setStatus((current) => reduceA2UISurfaceStatus(current, {
        type: "error",
        actionId: event.actionId,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  },
  [disabled, normalizedSurface, onAction, onFactsChange, onSurfaceChange, readOnly],
);`,
      },
    ],
  },
  {
    eyebrow: "Admin MCP Server",
    title: "Admin은 catalog를 MCP tool로 노출합니다",
    body: "Express 서버 위에 MCP Streamable HTTP transport를 붙이고, template catalog CRUD와 MCP tool 호출을 함께 제공합니다. 핵심 tool은 recommendTemplate, resolveTemplateData, executeAction입니다.",
    bullets: [
      "server.ts: /mcp 세션 transport와 /admin REST API를 함께 운영",
      "register-tools.ts: 6개 MCP tool 등록",
      "resolve-template.ts: auth, resolver, binding, validation, envelope 생성",
    ],
    codeExamples: [
      {
        title: "MCP transport",
        file: "packages/a2ui-admin/src/mcp-server/server.ts",
        snippet: `function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "a2ui-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  return server;
}

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});`,
      },
      {
        title: "MCP tools",
        file: "packages/a2ui-admin/src/mcp-server/tools/register-tools.ts",
        snippet: `server.tool(
  "a2ui.recommendTemplate",
  "context 기반 템플릿 추천. intent와 facts로 적절한 템플릿을 판단합니다.",
  {
    intentKey: z.string().describe("Intent key (e.g. deploy.start)"),
    facts: z.record(z.string(), z.unknown()).describe("Collected facts from agent"),
  },
  async ({ intentKey, facts }) => {
    const decision = evaluateDecision(intentKey, facts as Record<string, unknown>);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(decision) }],
    };
  },
);

server.tool(
  "a2ui.resolveTemplateData",
  "resolver chain을 실행하여 template payload를 생성합니다. SurfaceEnvelope을 반환합니다.",
  { templateId: z.string(), context: z.record(z.string(), z.unknown()) },
  async ({ templateId, context }) => {
    const result = await resolveTemplateById(templateId, context, { checkAuth: true });
    if (result.error || !result.envelope) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: result.error }) }],
        isError: true,
      };
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(result.envelope) }] };
  },
);`,
      },
      {
        title: "Resolver pipeline",
        file: "packages/a2ui-admin/src/mcp-server/runtime/resolve-template.ts",
        snippet: `export async function resolveTemplateRegistration(
  registration: TemplateRegistration,
  context: Record<string, unknown>,
): Promise<ResolveTemplateResult> {
  const resolverData: Record<string, unknown> = { ...context };
  const trace: ResolverTrace[] = [];

  for (const resolver of registration.resolvers) {
    if (resolver.enabled === false) continue;
    const result = await runResolver(registration, resolver, resolverData);
    trace.push(result);
    if (result.status === "failed" && result.phase === "blocking") {
      return { trace, resolverData, error: result.error ?? \`Resolver failed: \${resolver.id}\` };
    }
  }

  applyBuiltInDerivedFields(registration, resolverData);

  const payload = applyBinding(registration.bindingRecipe, resolverData);
  const validation = validatePayload(registration.bindingRecipeId, payload, registration.generatedValidation);
  if (!validation.valid) {
    return { trace, resolverData, validation, error: "Payload validation failed" };
  }

  const actions = registration.actions.map((action) => actionAvailability(action, payload));
  const generatedAt = new Date().toISOString();
  return {
    trace,
    resolverData,
    validation,
    envelope: {
      templateId: registration.bindingRecipeId,
      version: registration.version,
      sourceIntent: (context.intentKey as string) ?? registration.templateId,
      updatedAt: generatedAt,
      payload,
      actions,
      surfaceConfig: registration.surfaceConfig,
      meta: { generatedAt, catalogTemplateId: registration.templateId, resolverTraceDetail: trace },
    },
  };
}`,
      },
    ],
  },
];

const mcpTools = [
  ["a2ui.recommendTemplate", "intent + facts로 렌더링할 template을 결정"],
  ["a2ui.listTemplates", "Admin catalog에 등록된 template 목록 반환"],
  ["a2ui.checkAccess", "template 접근 권한 확인"],
  ["a2ui.resolveTemplateData", "resolver chain을 실행하고 SurfaceEnvelope 생성"],
  ["a2ui.executeAction", "UI 버튼 action을 Mock API 또는 backend action으로 전달"],
  ["a2ui.getTemplateContract", "template 입력/필수 field 계약 조회"],
];

const envelopeFields = [
  ["templateId", "Renderer가 어떤 화면을 그릴지 고르는 key"],
  ["payload", "화면에 들어갈 실제 데이터"],
  ["actions", "버튼 label, actionId, enable 조건"],
  ["surfaceConfig", "동적 card/parts 구성. 있으면 dynamic renderer 사용"],
  ["meta.resolverTraceDetail", "Admin resolver 실행 흔적과 디버깅 정보"],
];

function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;

    import("mermaid")
      .then((mod) => {
        const mermaid = mod.default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#172335",
            primaryTextColor: "#e8eef7",
            primaryBorderColor: "#4c8dff",
            lineColor: "#7d8b9f",
            secondaryColor: "#16202d",
            tertiaryColor: "#111a26",
            fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
            fontSize: "13px",
          },
          flowchart: { curve: "basis", padding: 14 },
          sequence: {
            actorMargin: 48,
            boxMargin: 8,
            messageMargin: 36,
          },
        });
        const id = `code-guide-${Math.random().toString(36).slice(2, 9)}`;
        return mermaid.render(id, chart);
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return <div className={s.mermaidWrap} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className={s.codeBlock}>
      <code>{children}</code>
    </pre>
  );
}

function CodeView({
  children,
  file,
  title,
}: {
  children: string;
  file: string;
  title: string;
}) {
  const lines = children.trim().split("\n");

  return (
    <div className={s.codeView}>
      <div className={s.codeViewHeader}>
        <span className={s.codeViewTitle}>{title}</span>
        <code>{file}</code>
      </div>
      <div className={s.codeViewBody}>
        {lines.map((line, index) => (
          <div className={s.codeViewLine} key={`${index}-${line}`}>
            <span className={s.lineNumber}>{index + 1}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CodeGuidePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppFrame
      activePage="codeGuide"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated="2026-05-15"
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="A2UI Code Guide"
      pageTitle="기능별 코드 설명"
      sidebarOpen={sidebarOpen}
    >
      <div className={s.page}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <div className={s.eyebrow}>A2UI Code Story</div>
            <h1>기능별 코드 설명</h1>
            <p>
              이 페이지는 A2UI PoC가 어떻게 조립되어 동작하는지 코드 기준으로 따라갑니다.
              Agent wrapper, component UI, Admin MCP 서버가 각각 어디를 책임지는지 한 흐름으로 읽을 수 있게 묶었습니다.
            </p>
          </div>
          <div className={s.heroPanel} aria-label="runtime ports">
            <div>
              <span>Next.js</span>
              <strong>3000</strong>
            </div>
            <div>
              <span>MCP/Admin</span>
              <strong>3100</strong>
            </div>
            <div>
              <span>Mock API</span>
              <strong>3200</strong>
            </div>
            <div>
              <span>Python Agent</span>
              <strong>8000</strong>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.eyebrow}>End to End</div>
          <h2>사용자 한 문장이 UI가 되는 길</h2>
          <p className={s.sectionLead}>
            핵심은 SurfaceEnvelope입니다. MCP 서버가 운영 데이터와 template 계약을 합쳐 envelope를 만들고,
            UI package는 그 envelope를 읽어 React 화면으로 변환합니다.
          </p>
          <Mermaid chart={`flowchart LR
    U["사용자 입력\\npayments-api 배포해줘"] --> A["Agent\\nintent + facts"]
    A --> R["MCP recommendTemplate\\nrender_surface"]
    R --> D["MCP resolveTemplateData\\nresolver + binding"]
    D --> E["SurfaceEnvelope\\npayload + actions"]
    E --> UI["Component UI\\nSurfaceRenderer"]
    UI --> ACT["Action click\\na2ui.executeAction"]
    ACT --> API["Mock API\\n/api/actions/deploy"]`} />
          <div className={s.journeyGrid}>
            {journeySteps.map((step) => (
              <article className={s.journeyCard} key={step.label}>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <code>{step.file}</code>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.eyebrow}>Feature Chapters</div>
          <h2>기능별 코드 위치와 핵심 로직</h2>
          <p className={s.sectionLead}>
            각 기능은 서로 깊게 얽히지 않고 JSON 계약으로 만납니다. 아래 코드뷰는 실제 코드에서 따라봐야 하는 핵심 분기와 호출 순서만 추려 놓은 것입니다.
          </p>
          <div className={s.featureStack}>
            {featureStories.map((feature) => (
              <article className={s.featureChapter} key={feature.title}>
                <div className={s.chapterCopy}>
                  <span className={s.chapterEyebrow}>{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                  <ul>
                    {feature.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
                <div className={s.chapterAside}>
                  {feature.codeExamples.map((example) => (
                    <CodeView file={example.file} key={example.file} title={example.title}>
                      {example.snippet}
                    </CodeView>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.eyebrow}>Surface Contract</div>
          <h2>UI와 MCP가 만나는 JSON 계약</h2>
          <p className={s.sectionLead}>
            Component UI는 backend 세부 구현을 알지 않습니다. 아래 필드만 있으면 고정 template이든 dynamic parts든 같은 입구로 렌더링됩니다.
          </p>
          <div className={s.contractGrid}>
            <div className={s.envelopeCard}>
              {envelopeFields.map(([field, desc]) => (
                <div className={s.contractRow} key={field}>
                  <code>{field}</code>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
            <CodeBlock>{`{
  "templateId": "deploy_launchpad",
  "payload": { "service": "payments-api", "state": "ready" },
  "actions": [{ "actionId": "deploy.start", "label": "배포 시작" }],
  "surfaceConfig": { "kind": "a2ui_card", "parts": [] },
  "meta": { "resolverTraceDetail": [] }
}`}</CodeBlock>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.eyebrow}>MCP Tool Map</div>
          <h2>Admin 서버가 외부에 열어주는 기능</h2>
          <div className={s.toolGrid}>
            {mcpTools.map(([name, desc]) => (
              <article className={s.toolCard} key={name}>
                <code>{name}</code>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.eyebrow}>Action Roundtrip</div>
          <h2>버튼을 누른 뒤 다시 서버로 돌아가는 경로</h2>
          <p className={s.sectionLead}>
            화면의 버튼은 직접 배포를 실행하지 않습니다. actionId와 params를 host로 올리고, host가 MCP executeAction 또는 서비스 backend로 전달합니다.
          </p>
          <Mermaid chart={`sequenceDiagram
    participant User as User
    participant UI as A2UI UI
    participant Host as SurfaceHost
    participant MCP as Admin MCP
    participant API as Mock API
    User->>UI: 배포 시작 클릭
    UI->>Host: onAction({ actionId, params })
    Host->>MCP: a2ui.executeAction
    MCP->>API: POST /api/actions/deploy
    API-->>MCP: action result
    MCP-->>Host: result
    Host-->>UI: status done + optional next surface`} />
        </section>
      </div>
    </AppFrame>
  );
}
