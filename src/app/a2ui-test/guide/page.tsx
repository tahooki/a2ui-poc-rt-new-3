"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    primaryColor: "#1a2744",
    primaryTextColor: "#e4e8ef",
    primaryBorderColor: "#5b8dee",
    lineColor: "#5b8dee",
    secondaryColor: "#0d1520",
    tertiaryColor: "#162033",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "13px",
  },
});

const FLOW_DIAGRAM = `flowchart TD
    U["사용자 입력"] --> ORC["orchestrate-chat-turn"]
    ORC --> INT["Intent 분석"]
    INT --> TOOL["Tool 실행 (Mock API)"]
    TOOL --> DEC["Decision Engine 평가"]
    DEC --> BRIDGE["a2ui-bridge.ts"]

    BRIDGE -->|MCP 서버 실행 중| AGENT["@a2ui/agent-node SDK"]
    BRIDGE -->|MCP 서버 없음| FALLBACK["기존 Binder Fallback"]

    AGENT --> MCP["MCP Server :3100"]

    MCP --> REC["a2ui.recommendTemplate"]
    REC -->|render_surface| RESOLVE["a2ui.resolveTemplateData"]
    REC -->|ask_followup| FOLLOWUP["추가 정보 요청"]
    REC -->|text_only| TEXT["텍스트 응답"]

    RESOLVE --> AUTH["Auth Resolver<br/>역할 기반 권한 체크"]
    AUTH --> API["API Resolver<br/>Mock API :3200 호출"]
    API --> LLM["LLM Resolver<br/>Canned 텍스트"]
    LLM --> BIND["Binding Engine<br/>Recipe 적용"]
    BIND --> VALID["Payload Validator<br/>Ajv JSON Schema"]
    VALID --> ENV["SurfaceEnvelope 반환"]

    ENV --> SSE["SSE: event: surface"]
    FALLBACK --> SSE2["SSE: event: result"]
    SSE --> RENDER["SurfaceRenderer"]
    SSE2 --> RENDER
    RENDER --> TPL["템플릿 렌더링<br/>Deploy / Approval / Rollback"]

    style U fill:#5b8dee,stroke:#5b8dee,color:#fff
    style MCP fill:#1a3a5c,stroke:#5b8dee
    style RENDER fill:#1a3a5c,stroke:#34c38f
    style TPL fill:#162033,stroke:#34c38f,color:#34c38f
    style FOLLOWUP fill:#162033,stroke:#f7c948,color:#f7c948
    style TEXT fill:#162033,stroke:#8b9ab5,color:#8b9ab5
    style FALLBACK fill:#162033,stroke:#f7c948,color:#f7c948
`;

const SEQUENCE_DIAGRAM = `sequenceDiagram
    participant User as 사용자
    participant Next as Next.js :3000
    participant ORC as Orchestrator
    participant Bridge as A2UI Bridge
    participant Agent as Agent Node SDK
    participant MCP as MCP Server :3100
    participant Mock as Mock API :3200

    User->>Next: POST /api/chat<br/>"payments-api 배포해줘"
    Next->>ORC: orchestrateChatTurn()

    Note over ORC: Step 1-3: Intent 분석
    ORC->>ORC: resolveIntent → deploy.start
    ORC->>ORC: extractSlots → serviceName=payments-api

    Note over ORC: Step 4-5: Tool 실행
    ORC->>Mock: GET /api/services/payments-api
    Mock-->>ORC: { recommendedVersion, availableImages... }

    Note over ORC: Step 6: Decision
    ORC->>ORC: evaluateDecision → render_surface

    Note over ORC: Step 7-8: Response + A2UI
    ORC->>Bridge: tryRenderA2UISurface()
    Bridge->>MCP: health check
    MCP-->>Bridge: ok
    Bridge->>Agent: renderOrFallback()
    Agent->>MCP: a2ui.recommendTemplate
    MCP-->>Agent: { mode: render_surface, templateId: deploy_launchpad }
    Agent->>MCP: a2ui.resolveTemplateData

    Note over MCP: Auth → API → LLM → Binding → Validation
    MCP->>Mock: GET /api/services/payments-api
    Mock-->>MCP: service data
    MCP-->>Agent: SurfaceEnvelope
    Agent-->>Bridge: { type: surface, envelope }
    Bridge-->>ORC: SurfaceEnvelope

    ORC-->>Next: AssistantTurnResponse
    Next-->>User: SSE: event: surface
    Note over User: SurfaceRenderer → Deploy Launchpad 렌더링
`;

const ARCH_DIAGRAM = `graph LR
    subgraph Frontend["프론트엔드 (Next.js :3000)"]
        UI["@a2ui/ui<br/>5 Primitives + 3 Templates"]
        SR["SurfaceRenderer"]
        TR["TemplateRegistry"]
        TEST["E2E Test Page<br/>/a2ui-test"]
        ADMIN["Admin Console<br/>/a2ui-test/admin"]
    end

    subgraph Backend["백엔드"]
        CHAT["Chat API<br/>SSE Streaming"]
        ORC2["Orchestrator"]
        BRG["A2UI Bridge"]
    end

    subgraph A2UI["A2UI Platform"]
        AN["@a2ui/agent-node<br/>renderOrFallback()"]
        MCP2["MCP Server :3100<br/>6 Tools"]
        DE["Decision Engine"]
        RE["4 Resolvers"]
        BE["Binding Engine"]
        PV["Payload Validator"]
    end

    subgraph Data["데이터"]
        MOCK2["Mock API :3200"]
        FIX["Fixture JSON"]
        CONT["@a2ui/contracts<br/>JSON Schema"]
    end

    subgraph Python["Python Agent :8000"]
        PY["FastAPI Server"]
        PO["8-Step Pipeline"]
        PA["render_or_fallback()"]
    end

    UI --> SR --> TR
    CHAT --> ORC2 --> BRG --> AN --> MCP2
    MCP2 --> DE
    MCP2 --> RE --> MOCK2
    MCP2 --> BE
    MCP2 --> PV --> CONT
    MOCK2 --> FIX
    PY --> PO --> PA --> MCP2

    style Frontend fill:#0d1520,stroke:#5b8dee
    style A2UI fill:#0d1520,stroke:#34c38f
    style Data fill:#0d1520,stroke:#f7c948
    style Python fill:#0d1520,stroke:#a78bfa
    style Backend fill:#0d1520,stroke:#5b8dee
`;

function MermaidChart({ id, chart }: { id: string; chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    mermaid.render(id, chart).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [id, chart]);

  return <div ref={ref} style={{ width: "100%", overflow: "auto", marginBottom: 8 }} />;
}

const STEPS = [
  {
    num: "Step 1",
    title: "서버 기동",
    desc: "3개 서버를 각각 다른 터미널에서 실행합니다.",
    commands: [
      { label: "터미널 1 — Mock API (port 3200)", cmd: "npm run dev -w @a2ui/demo-mock-api" },
      { label: "터미널 2 — MCP Server (port 3100)", cmd: "npm run dev -w @a2ui/admin" },
      { label: "터미널 3 — Next.js (port 3000)", cmd: "npm run dev" },
    ],
  },
  {
    num: "Step 2",
    title: "프론트 UI 라이브러리 확인",
    desc: "브라우저에서 3개 템플릿이 정상 렌더링되는지 확인합니다.",
    commands: [
      { label: "테스트 페이지", cmd: "open http://localhost:3000/a2ui-test" },
    ],
    checks: [
      "Deploy / Approval / Rollback 3개 탭 전환",
      "각 템플릿의 데이터 테이블, 상태 뱃지, 액션 버튼 확인",
      "버튼 클릭 → Action Log에 이벤트 기록",
    ],
  },
  {
    num: "Step 3",
    title: "Admin UI에서 등록 확인 + 시뮬레이션",
    desc: "템플릿 레지스트리, Decision Rules을 확인하고 시뮬레이션합니다.",
    commands: [
      { label: "Admin 페이지", cmd: "open http://localhost:3000/a2ui-test/admin" },
    ],
    checks: [
      "Template Registry — 3개 템플릿 목록",
      "Decision Rules — intent→template 매핑 3건",
      "Simulation: intent=deploy.start, facts=serviceName=payments-api → render_surface + Preview",
      "Simulation: intent=deploy.start, facts=(비움) → ask_followup",
      "Simulation: intent=unknown.intent → text_only",
    ],
  },
  {
    num: "Step 4",
    title: "Mock API 데이터 확인",
    desc: "MCP Resolver가 호출하는 Mock API 엔드포인트를 직접 확인합니다.",
    commands: [
      { label: "서비스 상세", cmd: "curl http://localhost:3200/api/services/payments-api" },
      { label: "승인 목록", cmd: "curl http://localhost:3200/api/approvals" },
      { label: "인시던트 목록", cmd: "curl http://localhost:3200/api/incidents" },
      { label: "액션 실행", cmd: "curl -X POST http://localhost:3200/api/actions/deploy -H 'Content-Type: application/json' -d '{}'" },
    ],
  },
  {
    num: "Step 5",
    title: "MCP Server 직접 호출",
    desc: "MCP 서버의 6개 Tool을 JSON-RPC로 직접 호출하여 파이프라인을 검증합니다.",
    commands: [
      {
        label: "템플릿 추천 (Decision Engine)",
        cmd: `curl -X POST http://localhost:3100/mcp \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"a2ui.recommendTemplate","arguments":{"intentKey":"deploy.start","facts":{"serviceName":"payments-api"}}}}'`,
      },
      {
        label: "기존 test-client 실행 (전체 파이프라인)",
        cmd: "npx tsx packages/a2ui-admin/test-client.ts",
      },
    ],
    checks: [
      "recommendTemplate → mode: render_surface, templateId: deploy_launchpad",
      "resolveTemplateData → SurfaceEnvelope (payload, actions, meta.resolverTrace)",
    ],
  },
  {
    num: "Step 6",
    title: "Agent Node Library로 호출",
    desc: "renderOrFallback() 고수준 API를 통해 MCP 서버와 통합 테스트합니다.",
    commands: [
      {
        label: "Agent SDK 테스트 스크립트",
        cmd: `npx tsx -e "
import { A2UIMcpClient, renderOrFallback } from './packages/a2ui-agent-node/src/index.js';
async function main() {
  const client = new A2UIMcpClient();
  await client.connect();

  const r = await renderOrFallback(client, {
    intentKey: 'deploy.start',
    facts: { serviceName: 'payments-api' }
  });
  console.log(JSON.stringify(r, null, 2));

  await client.disconnect();
}
main();"`,
      },
    ],
    checks: [
      "type: surface → envelope에 templateId, payload, actions 포함",
      "facts 비우면 → type: followup, missingFacts: [serviceName]",
      "MCP 서버 끄고 실행 → type: text_fallback (graceful degradation)",
    ],
  },
  {
    num: "Step 7",
    title: "Python Agent Server (선택)",
    desc: "FastAPI 기반 Python 오케스트레이션 서버를 테스트합니다.",
    commands: [
      { label: "서버 기동", cmd: "cd packages/demo-agent-server && pip3 install -r requirements.txt && python3 -m uvicorn app.main:app --port 8000" },
      {
        label: "채팅 호출",
        cmd: `curl -X POST http://localhost:8000/chat \\
  -H 'Content-Type: application/json' \\
  -d '{"input":"payments-api 배포해줘","conversation_id":"test-1"}'`,
      },
      {
        label: "SSE 스트리밍",
        cmd: `curl -N -X POST http://localhost:8000/chat/stream \\
  -H 'Content-Type: application/json' \\
  -d '{"input":"승인 목록 보여줘","conversation_id":"test-2"}'`,
      },
    ],
  },
  {
    num: "Step 8",
    title: "기존 챗봇 E2E 검증",
    desc: "기존 Chat API에서 A2UI surface가 자동 생성되는지 확인합니다.",
    commands: [
      {
        label: "챗봇 SSE 호출",
        cmd: `curl -N -X POST http://localhost:3000/api/chat \\
  -H 'Content-Type: application/json' \\
  -d '{"conversationId":"test","input":"payments-api 배포해줘","contextSnapshot":{"pageKey":"deploy","selectedEntity":null},"history":[],"facts":{}}'`,
      },
    ],
    checks: [
      "SSE 이벤트 중 event: surface 포함 → A2UI MCP 연동 성공",
      "MCP 서버 끄면 → event: surface 없이 기존 binder fallback 동작",
    ],
  },
];

export default function GuidePage() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "40px 24px 80px",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        color: "#e4e8ef",
        background: "#0a0f1a",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
          A2UI PoC — E2E 테스트 가이드
        </h1>
        <p style={{ fontSize: 15, color: "#8b9ab5", lineHeight: 1.6 }}>
          프론트 UI 라이브러리 → Admin 등록 → Mock API 데이터 → MCP Server → Agent Library → 챗봇 연동까지 전체 흐름을 직접 테스트하는 가이드입니다.
        </p>
      </div>

      {/* Architecture Diagram */}
      <Section title="아키텍처 개요">
        <MermaidChart id="arch" chart={ARCH_DIAGRAM} />
      </Section>

      {/* Flow Diagram */}
      <Section title="요청 처리 흐름도">
        <MermaidChart id="flow" chart={FLOW_DIAGRAM} />
      </Section>

      {/* Sequence Diagram */}
      <Section title="시퀀스 다이어그램 — Deploy 시나리오">
        <MermaidChart id="seq" chart={SEQUENCE_DIAGRAM} />
      </Section>

      {/* Steps */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
          테스트 순서
        </h2>
        {STEPS.map((step) => (
          <StepCard key={step.num} step={step} />
        ))}
      </div>

      {/* Port Summary */}
      <Section title="포트 요약">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              {["서버", "포트", "역할", "기동 명령"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid rgba(37,50,68,.76)", color: "#8b9ab5", fontSize: 12, textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Next.js", "3000", "프론트엔드 + Chat API", "npm run dev"],
              ["MCP Server", "3100", "A2UI 실행 엔진 (6 Tools)", "npm run dev -w @a2ui/admin"],
              ["Mock API", "3200", "Fixture 데이터 API", "npm run dev -w @a2ui/demo-mock-api"],
              ["Python Agent", "8000", "Python 오케스트레이션 (선택)", "uvicorn app.main:app --port 8000"],
            ].map(([name, port, role, cmd]) => (
              <tr key={port} style={{ borderBottom: "1px solid rgba(37,50,68,.4)" }}>
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>{name}</td>
                <td style={{ padding: "10px 14px" }}>
                  <code style={{ background: "rgba(91,141,238,.15)", padding: "2px 6px", borderRadius: 3, color: "#5b8dee" }}>{port}</code>
                </td>
                <td style={{ padding: "10px 14px", color: "#b0c4ef" }}>{role}</td>
                <td style={{ padding: "10px 14px" }}>
                  <code style={{ fontSize: 12, color: "#8b9ab5" }}>{cmd}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#e4e8ef" }}>
        {title}
      </h2>
      <div
        style={{
          padding: 20,
          background: "rgba(13,21,32,.7)",
          border: "1px solid rgba(37,50,68,.76)",
          borderRadius: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StepCard({ step }: { step: typeof STEPS[number] }) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: 20,
        background: "rgba(13,21,32,.6)",
        border: "1px solid rgba(37,50,68,.76)",
        borderRadius: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            background: "rgba(91,141,238,.2)",
            color: "#5b8dee",
          }}
        >
          {step.num.replace("Step ", "")}
        </span>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{step.title}</h3>
      </div>
      <p style={{ fontSize: 14, color: "#b0c4ef", marginBottom: 14, lineHeight: 1.5 }}>
        {step.desc}
      </p>

      {step.commands.map((c, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
            {c.label}
          </div>
          <pre
            style={{
              padding: "10px 14px",
              background: "#080c14",
              border: "1px solid rgba(37,50,68,.5)",
              borderRadius: 6,
              fontSize: 12,
              color: "#34c38f",
              fontFamily: "'SF Mono', Menlo, monospace",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
            }}
          >
            {c.cmd}
          </pre>
        </div>
      ))}

      {step.checks && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>
            확인 항목
          </div>
          {step.checks.map((check, i) => (
            <div key={i} style={{ fontSize: 13, color: "#e4e8ef", marginBottom: 3, paddingLeft: 16, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: "#5b8dee" }}>-</span>
              {check}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
