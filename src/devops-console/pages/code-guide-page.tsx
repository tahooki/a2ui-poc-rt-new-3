"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import s from "./code-guide-page.module.css";

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

const featureStories = [
  {
    eyebrow: "Python Agent Wrapper",
    title: "Python 쪽은 얇은 MCP client처럼 붙입니다",
    body: "현재 Python server는 mcp 패키지 API를 직접 쓰기보다 httpx로 Streamable HTTP JSON-RPC를 호출합니다. 라이브러리처럼 쓰는 표면은 render_or_fallback()이고, 내부에서 initialize, tools/call, SSE/JSON 응답 파싱을 처리합니다.",
    bullets: [
      "A2UIMcpClient.call_tool(): MCP initialize 후 tools/call 요청",
      "render_or_fallback(): recommendTemplate 후 resolveTemplateData 호출",
      "handle_action(): 버튼 action을 a2ui.executeAction으로 전달",
    ],
    files: [
      "packages/demo-agent-server/app/a2ui_agent.py",
      "packages/demo-agent-server/app/orchestrate.py",
      "packages/demo-agent-server/app/config.py",
    ],
    snippet: `async def render_or_fallback(intent_key: str, facts: dict, mcp_url: str | None = None):
    client = A2UIMcpClient(server_url=mcp_url)

    decision = await client.call_tool(
        "a2ui.recommendTemplate",
        {"intentKey": intent_key, "facts": facts},
    )

    if decision.get("mode") == "ask_followup":
        return A2UIResponse(
            type="followup",
            missing_facts=decision.get("missingFacts", []),
            reason=decision.get("reason"),
        )

    if decision.get("mode") != "render_surface":
        return A2UIResponse(type="text_fallback", text=decision.get("reason"))

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

    return A2UIResponse(type="surface", surface=envelope)`,
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
    files: [
      "packages/a2ui-ui/src/renderer/SurfaceRenderer.tsx",
      "packages/a2ui-ui/src/dynamic/DynamicA2UICardRenderer.tsx",
      "packages/a2ui-chat/src/A2UISurfaceHost.tsx",
    ],
    snippet: `export function SurfaceRenderer({ envelope, onAction }: SurfaceRendererProps) {
  if ((envelope as DynamicA2UIEnvelope).surfaceConfig) {
    const dynamicEnvelope = envelope as DynamicA2UIEnvelope;
    return (
      <DynamicA2UICardRenderer
        envelope={dynamicEnvelope}
        surfaceConfig={dynamicEnvelope.surfaceConfig!}
        onAction={onAction}
      />
    );
  }

  const def = getTemplate(envelope.templateId);
  if (!def) {
    return (
      <div>
        <strong>Template not found: {envelope.templateId}</strong>
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
}

export function DynamicA2UICardRenderer({ envelope, surfaceConfig, onAction }) {
  const draftPayload = envelope.payload;
  const bindingContext = {
    payload: draftPayload,
    actions: envelope.actions,
    meta: envelope.meta,
  };
  const title = resolveBindingValue(surfaceConfig.card.title, bindingContext);
  const actions = surfaceConfig.card.actions?.source === "templateActions"
    ? envelope.actions
    : undefined;

  return (
    <A2UICardShell title={title} actions={actions} payload={draftPayload} onAction={onAction}>
      {surfaceConfig.parts.map((part) => {
        const Part = getA2UIPart(part.type);
        const props = resolveProps(part.props, bindingContext);
        return Part ? <Part key={part.id} {...props} /> : <UnknownPartFallback id={part.id} type={part.type} />;
      })}
    </A2UICardShell>
  );
}`,
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
    files: [
      "packages/a2ui-admin/src/mcp-server/server.ts",
      "packages/a2ui-admin/src/mcp-server/tools/register-tools.ts",
      "packages/a2ui-admin/src/mcp-server/runtime/resolve-template.ts",
    ],
    snippet: `server.tool(
  "a2ui.resolveTemplateData",
  "resolver chain을 실행하여 SurfaceEnvelope을 반환합니다.",
  { templateId: z.string(), context: z.record(z.string(), z.unknown()) },
  async ({ templateId, context }) => {
    const result = await resolveTemplateById(templateId, context, { checkAuth: true });

    if (result.error || !result.envelope) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: result.error }) }],
        isError: true,
      };
    }

    return { content: [{ type: "text", text: JSON.stringify(result.envelope) }] };
  },
);

export async function resolveTemplateRegistration(registration, context) {
  const resolverData = { ...context };
  const trace = [];

  for (const resolver of registration.resolvers) {
    const result = await runResolver(registration, resolver, resolverData);
    trace.push(result);
    if (result.status === "failed" && result.phase === "blocking") {
      return { trace, resolverData, error: result.error };
    }
  }

  applyBuiltInDerivedFields(registration, resolverData);
  const payload = applyBinding(registration.bindingRecipe, resolverData);
  const validation = validatePayload(
    registration.bindingRecipeId,
    payload,
    registration.generatedValidation,
  );
  const actions = registration.actions.map((action) => actionAvailability(action, payload));

  return {
    envelope: {
      templateId: registration.bindingRecipeId,
      payload,
      actions,
      surfaceConfig: registration.surfaceConfig,
      meta: { resolverTraceDetail: trace },
    },
  };
}`,
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
      lastUpdated="2026-05-14"
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
                  <CodeView file={feature.files[0]} title="핵심 로직 코드뷰">
                    {feature.snippet}
                  </CodeView>
                  <div className={s.fileList}>
                    {feature.files.map((file) => (
                      <code key={file}>{file}</code>
                    ))}
                  </div>
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
