"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import s from "./story-page.module.css";

function openDemo(path: string) {
  window.open(`${window.location.origin}${path}`, "_blank", "noopener");
}

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#1e3a5f",
          primaryTextColor: "#e4e8ef",
          primaryBorderColor: "#5b8dee",
          lineColor: "#5b8dee",
          secondaryColor: "#1a2236",
          tertiaryColor: "#111827",
          fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
          fontSize: "13px",
        },
        flowchart: { curve: "basis", padding: 16 },
        sequence: { mirrorActors: false, messageMargin: 40, actorMargin: 60, boxMargin: 8 },
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, chart).then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      });
    });
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div ref={ref} className={s.mermaidWrap} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

export function StoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppFrame
      activePage="story"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated="2026-03-30"
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      pageScope="DevOps A2UI Chatbot PoC"
      pageTitle="Story"
      sidebarOpen={sidebarOpen}
    >
      <div className={s.storyContainer}>

        {/* HERO */}
        <section className={s.hero}>
          <div className={s.heroLabel}>DevOps A2UI Chatbot PoC</div>
          <h1 className={s.heroTitle}>DevOps 운영을<br/>A2UI로 보다 쉽게</h1>
          <p className={s.heroSub}>
            DevOps 3가지 핵심 사례 &mdash; 배포, 승인, 롤백 &mdash; 을 A2UI(Adaptive Agentic UI)로 풀어,
            복잡한 콘솔 조작을 AI가 맥락을 이해하고 필요한 화면을 직접 구성해주는 PoC를 소개합니다.
          </p>
          <Image
            src="/images/story-title.jpg"
            alt="DevOps A2UI 소개"
            width={1376}
            height={768}
            className={s.heroImage}
          />
        </section>

        {/* OVERVIEW */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Overview</div>
          <h2 className={s.sectionTitle}>A2UI PoC 발표 흐름</h2>
          <p className={s.sectionDesc}>DevOps 운영에서 반복되는 복잡한 콘솔 조작을, AI가 맥락을 파악해 필요한 화면을 직접 구성해주는 A2UI(Adaptive Agentic UI)의 컨셉, 작동 원리, 그리고 설계 배경을 소개합니다.</p>
          <Image
            src="/images/story-000.jpg"
            alt="A2UI 발표 흐름 — 사례 소개, 로직 설명, 개발 이유"
            width={1376}
            height={768}
            className={s.sectionImage}
          />
        </section>

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>A2UI 사례 소개</h2></div>


        {/* ============================================================
            PART 1 — DEPLOY
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#5b8dee" }}>Deploy</div>
          <h2 className={s.sectionTitle}>김배포 선임의 배포 일지</h2>
          <p className={s.sectionDesc}>Platform Engineer. 도커 이미지 기반 배포 파이프라인을 운영하며, 매번 여러 단계를 거쳐야 하는 배포 프로세스를 담당합니다.</p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>배포 한 번이 이렇게 복잡합니다</h3>
              <p>배포를 하려면 먼저 도커 이미지를 빌드하고, 레지스트리에 push한 뒤, 콘솔에서 이미지를 등록해야 합니다. 그 다음 배포 요청(Request)을 만들기 위해 서비스, 환경, CPU, 메모리, 전략 등을 하나하나 입력합니다.</p>
              <blockquote>이미지 등록하고, 리퀘스트 만들고, 실행까지... 3단계를 각각 다른 탭에서 해야 해. 입력할 게 너무 많아.</blockquote>
            </div>
            <div className={s.storyVisual}><div style={{ fontSize: 48, marginBottom: 12 }}>🐳</div><div>도커 이미지 기반 3단계 배포<br/>Image 등록 &rarr; Request 생성 &rarr; Deploy 실행</div></div>
          </div>

          <h3 className={s.flowTitle}>이런 일이 있을 수 있습니다.</h3>
          <div className={s.grid2}>
            <div className={s.painCard}><h4>3단계를 각각 따로</h4><p>이미지 등록, 배포 요청 생성, 실행이 별도의 탭과 폼으로 분리되어 있습니다.</p></div>
            <div className={s.painCard}><h4>총 21개의 입력 필드</h4><p>이미지 등록 8개 + 배포 요청 13개. 매번 수동으로 채워야 합니다.</p></div>
            <div className={s.painCard}><h4>이전 배포 참고가 번거로움</h4><p>같은 서비스를 배포했던 설정을 보려면 이력 페이지로 이동해서 하나하나 찾아야 합니다.</p></div>
            <div className={s.painCard}><h4>실수하면 처음부터</h4><p>서비스나 환경을 잘못 선택하면 뒤로 가기 후 다시 입력해야 합니다.</p></div>
          </div>

          <h3 className={s.flowTitle}>기존 배포 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 도커 이미지\\n빌드 + Push"] --> B["2. 이미지 탭\\n8개 필드 입력"]
    B --> C["3. 이미지\\n등록"]
    C --> D["4. Request 탭\\n이미지 선택"]
    D --> E["5. 배포 설정\\n13개 필드 입력"]
    E --> F["6. Request\\n생성"]
    F --> G["7. Run 탭\\n배포 실행"]
    style G stroke:#5b8dee,stroke-width:2px`} />

          <button className={s.demoButton} onClick={() => openDemo("/deploy/image")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel}>기존 Deploy Admin 시연</div><div className={s.demoDesc}>3단계 탭 전환, 21개 필드 입력의 기존 배포 과정</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>

          {/* A2UI Solution */}
          <div className={s.a2uiSolutionBlock}>
            <div className={s.chatMock}>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>김</div><div className={`${s.chatBubble} ${s.chatBubbleUser}`}>payments-api 배포해줘</div></div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  payments-api 배포를 준비했습니다.
                  <div className={s.surfacePreview}>
                    <div className={s.surfaceTitle}>Deploy Launchpad</div>
                    payments-api &middot; production &middot; v2.3.18-rc1 &middot; rolling<br/>
                    <span style={{ opacity: 0.6 }}>▶ Image 정보 &nbsp;&middot;&nbsp; ▶ Request 설정</span><br/>
                    <span className={s.surfaceBtn}>배포 시작</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.solutionText}>
              <span className={`${s.badge} ${s.badgeBlue}`}>A2UI Solution</span>
              <h3 className={s.solutionTitle}>AI가 맥락을 파악해 배포를 준비합니다</h3>
              <p className={s.solutionDesc}>서비스명을 말하면 AI가 이전 배포 데이터를 기반으로 이미지 정보와 배포 설정을 자동으로 채워, Deploy Launchpad를 렌더링합니다. 수십 개의 필드를 직접 채울 필요가 없습니다.</p>
              <p className={s.solutionHighlight}><strong>여러 페이지, 여러 입력을</strong> AI가 정리해서 한 화면에.</p>
            </div>
          </div>

          <h3 className={s.flowTitle}>A2UI 배포 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 자연어 입력\\n배포해줘"] --> B["2. AI 컨텍스트\\n자동 조회"]
    B --> C["3. Launchpad\\n렌더링 + 배포"]
    style A stroke:#5b8dee,stroke-width:2px
    style B stroke:#34c38f,stroke-width:2px
    style C stroke:#34c38f,stroke-width:2px`} />

          <button className={`${s.demoButton} ${s.demoButtonAccent}`} onClick={() => openDemo("/deploy/image")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel} style={{ color: "#93b4ff" }}>A2UI Deploy 시연</div><div className={s.demoDesc}>흩어진 정보를 한 화면에서 배포</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>
        </section>

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>A2UI 작동 흐름</h2></div>

        {/* ============================================================
            ARCHITECTURE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Architecture</div>
          <h2 className={s.sectionTitle}>A2UI는 어떻게 작동하나요?</h2>
          <p className={s.sectionDesc}>사용자의 자연어 입력이 AI 판단, 데이터 수집, 템플릿 선택을 거쳐 A2UI Surface로 렌더링되기까지의 흐름입니다.</p>

          <h3 className={s.flowTitle}>AI Chatbot 작동 흐름</h3>
          <Mermaid chart={`sequenceDiagram
    actor User as User
    participant Orch as Chat API
    participant LLM as AI (LLM)
    participant Dec as Decision Engine
    participant Tpl as Template System
    User->>Orch: "배포해줘"
    rect rgba(91,141,238,0.08)
    Note over Orch,LLM: 1. 사용자 질문 A2UI 판단
    Orch->>LLM: resolveIntentWithAi(input, history)<br/>사용자 입력과 대화 이력을 AI에게 전달
    LLM-->>Orch: intent: deploy, slots: {serviceName}<br/>의도는 배포, 서비스명 추출
    end
    rect rgba(91,141,238,0.08)
    Note over Orch: 2. Tool 실행 루프
    Note over Orch: planTools → executeTool
    Note over Orch: getServiceDeployContext → facts 병합
    end
    Orch->>Dec: evaluate(facts)<br/>수집된 정보로 판단 요청
    Dec-->>Orch: render_surface<br/>A2UI 화면을 그려라
    Orch->>Tpl: select + bind(facts)<br/>템플릿 선택 + 데이터 바인딩
    Tpl-->>Orch: SurfaceEnvelope<br/>A2UI 렌더링에 필요한 데이터 전달
    rect rgba(91,141,238,0.08)
    Note over Orch,LLM: 3. 응답 생성
    Orch->>LLM: Tool 결과 + context → 자연어 응답
    LLM-->>Orch: 스트리밍 응답
    end
    Orch-->>User: SSE stream (Surface 렌더링)`} />

          <div className={s.grid3} style={{ marginTop: '2rem' }}>
            <div className={s.valueCard}>
              <h4>AI (LLM)</h4>
              <p>사용자가 무엇을 원하는지 파악하고, A2UI 화면을 그려야 하는지 판단합니다. 최종 결과도 자연어로 정리해줍니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Decision Engine</h4>
              <p>AI가 아닌 규칙 기반 로직으로, 필요한 정보가 다 모였는지 체크합니다. 부족하면 되묻고, 충분하면 화면을 그립니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Template System</h4>
              <p>상황에 맞는 A2UI 화면 템플릿을 골라서, 수집된 데이터를 채워 넣어 사용자에게 보여줄 최종 화면을 만듭니다.</p>
            </div>
          </div>

          <ol style={{ marginTop: '2rem', lineHeight: '2', color: 'var(--text-secondary, #b0b0b0)', paddingLeft: '1.2rem' }}>
            <li>사용자가 <strong>&ldquo;배포해줘&rdquo;</strong>라고 입력하면, Chat API가 <strong>AI(LLM)</strong>에게 의도 해석을 요청합니다.</li>
            <li>AI가 사용자의 입력을 <strong>A2UI로 그려야 하는지 판단</strong>합니다. 예를 들어 &ldquo;배포해줘&rdquo;는 배포 A2UI를, &ldquo;승인 현황 보여줘&rdquo;는 승인 큐 A2UI를 그려야 한다고 판단합니다.</li>
            <li>Chat API는 판단 결과를 바탕으로 <strong>Tool을 실행</strong>하여 실제 데이터(facts)를 수집합니다. 예를 들어 배포라면 <code>getServiceDeployContext</code>를 호출해 서비스 목록, 추천 버전, 최근 배포 이력 등을 가져옵니다.</li>
            <li><strong>Decision Engine</strong>이 facts를 평가하여, A2UI 화면을 그릴지(<code>render_surface</code>) 추가 질문이 필요한지(<code>ask_followup</code>) 판단합니다. 예를 들어 서비스명이 아직 없으면 &ldquo;어떤 서비스를 배포할까요?&rdquo;라고 되묻습니다.</li>
            <li><strong>Template System</strong>이 워크플로에 맞는 UI 템플릿을 선택하고, facts 데이터를 바인딩합니다. 예를 들어 배포라면 <code>quick_deploy_launchpad</code> 템플릿에 서비스명, 버전, 리스크 정보를 채워 넣습니다.</li>
            <li>AI(LLM)가 결과를 자연어로 정리한 응답과 함께, <strong>완성된 A2UI 화면이 사용자에게 전달</strong>됩니다. 사용자는 이 화면에서 바로 확인하고 실행할 수 있습니다.</li>
          </ol>
        </section>

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>A2UI 개발 구성</h2></div>

        {/* ============================================================
            PLATFORM
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#a78bfa" }}>Platform</div>
          <h2 className={s.sectionTitle}>A2UI 플랫폼 구성</h2>
          <p className={s.sectionDesc}>A2UI는 3가지 제품과 공통 Contract 레이어로 구성됩니다. 각 제품은 독립적으로 발전하되, Contract를 통해 안정적으로 연결됩니다.</p>

          <div className={s.storyImageFrame}>
            <Image
              src="/images/story-003.jpg"
              alt="A2UI 플랫폼의 세 가지 제품 구성"
              width={1376}
              height={768}
              className={s.storySectionImage}
            />
          </div>

          {/* ============ Product 1: UI Library ============ */}
          <div className={s.sectionLabel} style={{ color: "#5b8dee", marginTop: 48 }}>Product 1</div>
          <h3 className={s.flowTitle} style={{ fontSize: 22 }}>A2UI Chatbot UI Library</h3>
          <p className={s.sectionDesc}>Material UI나 Ant Design처럼, 챗봇 안에서 A2UI 화면을 구성하기 위한 전용 컴포넌트 라이브러리입니다.</p>

          <div style={{ margin: '2rem 0', borderRadius: 16, overflow: 'hidden' }}>
            <img src="/images/story-004.jpg" alt="UI Library → templateId → Admin 데이터 연결 흐름" style={{ width: '100%', display: 'block' }} />
          </div>

          <div className={s.grid3}>
            <div className={`${s.archBox} ${s.productDetailCard}`} style={{ borderTop: '3px solid #5b8dee' }}>
              <h4 className={s.productDetailTitle}>라이브러리가 제공하는 것</h4>
              <p>카드, 테이블, 액션 버튼, 상태 배지, 폼 필드 같은 A2UI 전용 빌딩 블록. 이 라이브러리 자체는 데이터를 가져오지 않습니다. 순수하게 화면을 그리는 도구만 제공합니다.</p>
            </div>
            <div className={`${s.archBox} ${s.productDetailCard}`} style={{ borderTop: '3px solid #a78bfa' }}>
              <h4 className={s.productDetailTitle}>사용자(개발자)가 하는 일</h4>
              <p>컴포넌트를 조합해서 자기 도메인에 맞는 A2UI 템플릿을 직접 만듭니다. 템플릿은 어떤 데이터가 들어와야 렌더링 가능한지 Input Contract를 선언합니다.</p>
            </div>
            <div className={`${s.archBox} ${s.productDetailCard}`} style={{ borderTop: '3px solid #fb923c' }}>
              <h4 className={s.productDetailTitle}>Admin과의 연동</h4>
              <p>완성된 템플릿에 <code>templateId</code>를 부여하면 Admin에 등록됩니다. Admin이 데이터 공급 방식을 설정하면, 런타임에서 payload가 자동으로 채워져 렌더링됩니다.</p>
            </div>
          </div>

          {/* ============ Product 2: Admin + MCP Server ============ */}
          <div className={s.sectionLabel} style={{ color: "#fb923c", marginTop: 48 }}>Product 2</div>
          <h3 className={s.flowTitle} style={{ fontSize: 22 }}>Admin + MCP Server</h3>
          <p className={s.sectionDesc}>템플릿에 어떤 데이터를 어떻게 채울지 설계하고, 검증된 정의만 안전하게 실행하는 관리 + 실행 제품입니다.</p>

          <div style={{ margin: '2rem 0', borderRadius: 16, overflow: 'hidden' }}>
            <img src="/images/story-005.jpg" alt="Admin + MCP Server 흐름" style={{ width: '100%', display: 'block' }} />
          </div>

          <div className={s.grid2}>
            <div className={s.archBox} style={{ borderTop: '3px solid #fb923c', textAlign: 'left' }}>
              <h4 style={{ textAlign: 'center' }}>Admin <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--console-text-secondary)' }}>(Control Plane)</span></h4>
              <p>등록된 templateId별로 필요한 입력 필드를 확인하고, 각 필드를 채울 resolver를 연결합니다. 예를 들어 <code>serviceName</code>은 API resolver로, <code>riskSummary</code>는 LLM resolver로 채우도록 설계합니다.</p>
              <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>1.</strong> 템플릿 등록 + Input Contract 확인</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>2.</strong> Resolver / Tool 설계 (API, LLM, Auth, Transform)</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>3.</strong> Binding Recipe 작성 (resolver 결과 &rarr; 템플릿 필드 매핑)</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>4.</strong> Draft &rarr; Preview &rarr; Publish 승인</div>
              </div>
            </div>
            <div className={s.archBox} style={{ borderTop: '3px solid #34c38f', textAlign: 'left' }}>
              <h4 style={{ textAlign: 'center' }}>MCP Server <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--console-text-secondary)' }}>(Execution Plane)</span></h4>
              <p>Admin에서 publish된 정의만 안전하게 실행합니다. Agent가 A2UI를 요청하면, resolver chain을 실행해서 검증된 payload를 돌려줍니다.</p>
              <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>1.</strong> Published 정의 기반으로 resolver chain 실행</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>2.</strong> 실행 시점 권한 체크 + secret 주입</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>3.</strong> Payload 검증 후 Agent에 반환</div>
                <div style={{ fontSize: 13, color: 'var(--console-text-secondary)' }}><strong style={{ color: 'var(--console-text)' }}>4.</strong> Audit / tracing / retry / fallback</div>
              </div>
            </div>
          </div>

          <h3 className={s.flowTitle}>Resolver가 프론트에 값을 채우는 방법</h3>
          <p style={{ fontSize: 14, color: 'var(--console-text-secondary)', marginBottom: 20, maxWidth: 680 }}>
            Resolver는 유형이 달라도 모두 같은 인터페이스를 따릅니다. Admin에서 설계한 resolver chain이 실행되면, 각 결과가 Binding Recipe에 따라 템플릿 필드에 매핑되어 최종 payload가 완성됩니다.
          </p>
          <div className={s.grid2} style={{ marginBottom: 12 }}>
            <div className={s.painCard} style={{ borderLeftColor: '#5b8dee' }}>
              <h4>API Resolver</h4>
              <p>내부/외부 API를 호출해서 서비스 정보, 배포 이력, 인시던트 현황 같은 팩트 데이터를 가져옵니다.</p>
            </div>
            <div className={s.painCard} style={{ borderLeftColor: '#a78bfa' }}>
              <h4>LLM Resolver</h4>
              <p>수집된 데이터를 기반으로 리스크 요약, 추천 사유, 변경 설명 같은 자연어 필드를 생성합니다.</p>
            </div>
            <div className={s.painCard} style={{ borderLeftColor: '#34c38f' }}>
              <h4>Auth Resolver</h4>
              <p>현재 유저가 이 템플릿을 볼 수 있는지, 특정 액션 버튼을 노출할 수 있는지 권한을 체크합니다.</p>
            </div>
            <div className={s.painCard} style={{ borderLeftColor: '#fb923c' }}>
              <h4>Transform Resolver</h4>
              <p>여러 데이터 소스를 병합하거나 정규화해서 템플릿이 요구하는 payload shape로 변환합니다.</p>
            </div>
          </div>
          <Mermaid chart={`flowchart LR
    R1["API Resolver"] --> BR["Binding Recipe<br/>필드별 매핑"]
    R2["LLM Resolver"] --> BR
    R3["Auth Resolver"] --> BR
    R4["Transform"] --> BR
    BR --> PL["Template Payload<br/>완성"]
    PL --> FE["프론트 렌더링"]
    style BR stroke:#a78bfa,stroke-width:2px
    style PL stroke:#5b8dee,stroke-width:2px`} />

          {/* ============ Product 3: Agent Library ============ */}
          <div className={s.sectionLabel} style={{ color: "#22d3ee", marginTop: 48 }}>Product 3</div>
          <h3 className={s.flowTitle} style={{ fontSize: 22 }}>A2UI Agent Library</h3>
          <p className={s.sectionDesc}>기존 agent에 A2UI를 붙이기 위한 SDK입니다. MCP Server와의 통신, 템플릿 추천, 검증, fallback 등을 미리 구현해서 고수준 함수로 제공합니다.</p>

          <div style={{ margin: '2rem 0', borderRadius: 16, overflow: 'hidden' }}>
            <img src="/images/story-006.jpg" alt="Agent Toolkit에서 A2UI를 파이프라인에 끼워넣는 흐름" style={{ width: '100%', display: 'block' }} />
          </div>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>초반에 A2UI 응답을 먼저 시도</h3>
              <p>발표용 예시에서는 <code>shouldRespond()</code>와 <code>respond()</code>를 따로 보여주기보다, 둘을 하나의 helper로 합친 쪽이 더 자연스럽습니다. 먼저 A2UI 응답을 시도하고, 성공하면 바로 반환하고, 아니면 기존 agent workflow를 그대로 탑니다.</p>
              <blockquote>핵심은 "판단과 응답을 한 helper로 묶고, 초반에 한 번 시도해본다"는 그림입니다.</blockquote>
            </div>
            <div className={s.storyVisual}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#22d3ee' }}>고수준 API</div>
                <div style={{ fontSize: 13, lineHeight: 2, fontFamily: 'monospace' }}>
                  <code>nfxAgentToolkits.renderA2UI()</code><br/>
                </div>
              </div>
            </div>
          </div>

          <h3 className={s.flowTitle}>Before / After 코드 비교</h3>
          <div className={s.codeCompare}>
            <div className={s.codePanel}>
              <div className={`${s.codePanelLabel} ${s.codePanelLabelBefore}`}>Before</div>
              <pre>{`async function runAgentTurn(input) {
  const requestType = await resolveIntent(input);
  const plan = await planner.plan(requestType);
  const toolResult = await executor.run(plan);
  const memory = await memoryStore.recall(input.session);
  const answer = await narrator.generate({
    requestType, toolResult, memory,
  });

  return Response.json({
    text: answer,
    sources: toolResult.sources,
  });
}`}</pre>
            </div>
            <div className={s.codePanel}>
              <div className={`${s.codePanelLabel} ${s.codePanelLabelAfter}`}>After</div>
              <pre><span className={s.codeHighlight}>{`import { nfxAgentToolkits } from "@NFX-toolkits";`}</span>{`

async function runAgentTurn(input) {
  const requestType = await resolveIntent(input);
`}<span className={s.codeHighlight}>{`
  const a2uiResponse = await nfxAgentToolkits.renderA2UI({
    input, requestType,
  });

  if (a2uiResponse) return a2uiResponse;`}</span>{`
    
  const plan = await planner.plan(requestType);
  const toolResult = await executor.run(plan);
  const memory = await memoryStore.recall(input.session);
  const answer = await narrator.generate({
    requestType, toolResult, memory,
  });

  return Response.json({
    text: answer,
    sources: toolResult.sources,
  });
}`}</pre>
            </div>
          </div>


          <h3 className={s.flowTitle}>A2UI 초기 시도 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["입력 수신"] --> B["requestType 해석"]
    B --> C["A2UI 응답 시도"]
    C -->|성공| E["A2UI 응답 반환"]
    C -->|실패| F["기존 workflow 계속 실행"]
    F --> G["기존 텍스트 응답"]
    style B stroke:#22d3ee,stroke-width:2px
    style C stroke:#22d3ee,stroke-width:2px
    style E stroke:#34c38f,stroke-width:2px
    style G stroke:#fb923c,stroke-width:2px`} />


        </section>

        {/* ============================================================
            VALUE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Value Proposition</div>
          <h2 className={s.sectionTitle}>A2UI는 언제 가치가 있나요?</h2>
          <Image
            src="/images/story-001.jpg"
            alt="A2UI 가치 제안 — 기존 시스템 수정이 어려울 때, 복잡할 때, 자주 쓰는 기능을 묶을 때"
            width={1376}
            height={768}
            className={s.sectionImage}
          />
          <div className={s.closingCard}>
            <h3>A2UI는 DevOps 엔지니어가 찾아야 할 것을 AI가 먼저 준비합니다.</h3>
            <p>반복적인 네비게이션을 없애고, 컨텍스트 스위칭을 줄이며, 긴박한 순간에도 정확한 정보와 즉각적인 실행을 제공합니다.</p>
          </div>
        </section>


      </div>
    </AppFrame>
  );
}
