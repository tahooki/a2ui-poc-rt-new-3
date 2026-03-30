"use client";

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
          <h1 className={s.heroTitle}>DevOps 운영을<br/>대화 한 줄로</h1>
          <p className={s.heroSub}>
            DevOps 3가지 핵심 사례 &mdash; 배포, 승인, 롤백 &mdash; 을 A2UI(Adaptive Agentic UI)로 풀어,
            복잡한 콘솔 조작을 자연어 대화로 대체한 PoC를 소개합니다.
          </p>
          <div className={s.badgeRow}>
            <span className={`${s.badge} ${s.badgeBlue}`}>Deploy</span>
            <span className={`${s.badge} ${s.badgeGreen}`}>Approval</span>
            <span className={`${s.badge} ${s.badgeOrange}`}>Rollback</span>
          </div>
        </section>

        {/* OVERVIEW */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Overview</div>
          <h2 className={s.sectionTitle}>A2UI로 풀어본 3가지 사례</h2>
          <p className={s.sectionDesc}>여러 단계를 거쳐야 하거나, 여러 페이지에서 확인해야 하는 정보를 한번에 풀 수 있도록 개선합니다.</p>
          <div className={s.grid3}>
            <div className={s.overviewCard} style={{ borderTopColor: "#5b8dee" }}><div style={{ fontSize: 28, fontWeight: 800 }}>1</div><h4>배포 (Deploy)</h4><p>도커 이미지 생성 &rarr; Request 등록 &rarr; Deploy 실행. 3단계 배포를 대화로 간소화합니다.</p></div>
            <div className={s.overviewCard} style={{ borderTopColor: "#34c38f" }}><div style={{ fontSize: 28, fontWeight: 800 }}>2</div><h4>승인 (Approval)</h4><p>임시 접근, 설정 변경, 데이터 작업 등 다양한 타입의 승인 요청을 한곳에서 처리합니다.</p></div>
            <div className={s.overviewCard} style={{ borderTopColor: "#fb923c" }}><div style={{ fontSize: 28, fontWeight: 800 }}>3</div><h4>롤백 (Rollback)</h4><p>문제 발생 시 안정 버전 식별 &rarr; Dry Run &rarr; 확인 &rarr; 실행. 긴박한 인시던트 대응을 가속합니다.</p></div>
          </div>
        </section>

        {/* ============================================================
            PART 1 — DEPLOY
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#5b8dee" }}>Part 1 &mdash; Deploy</div>
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
              <h3 className={s.solutionTitle}>대화 한 줄로 배포를 시작합니다</h3>
              <p className={s.solutionDesc}>서비스명을 말하면 AI가 이전 배포 데이터를 기반으로 이미지 정보와 배포 설정을 자동으로 채워, Deploy Launchpad를 렌더링합니다. 수십 개의 필드를 직접 채울 필요가 없습니다.</p>
              <p className={s.solutionHighlight}><strong>3단계 7화면이 대화 2턴으로.</strong> 21개 입력이 확인 한 번으로.</p>
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
            <div><div className={s.demoLabel} style={{ color: "#93b4ff" }}>A2UI Deploy 시연</div><div className={s.demoDesc}>대화 2턴으로 배포 완료</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>
        </section>

        {/* ============================================================
            PART 2 — APPROVAL
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#34c38f" }}>Part 2 &mdash; Approval</div>
          <h2 className={s.sectionTitle}>이승인 팀장의 오후</h2>
          <p className={s.sectionDesc}>DevOps Team Lead. 임시 접근, 설정 변경, 데이터 작업 등 다양한 승인 요청을 관리합니다.</p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>쌓여가는 승인 큐</h3>
              <p>점심 미팅을 마치고 자리에 앉으면, 먼저 승인 대기 건수부터 확인합니다. 세 가지 질문에 답하려면 필터를 세 번 바꿔야 합니다.</p>
              <blockquote>지금 pending이 몇 건이지? config change는 따로 있나? 고위험 건은?</blockquote>
            </div>
            <div className={s.storyVisual}><div style={{ fontSize: 48, marginBottom: 12 }}>📋</div><div>승인 큐 페이지<br/>필터 변경, 긴 리스트, 유형 분류 없음</div></div>
          </div>

          <div className={s.grid2}>
            <div className={s.painCard}><h4>현황 파악에 필터 3번</h4><p>유형별, 상태별, 위험도별 필터 전환</p></div>
            <div className={s.painCard}><h4>고위험 요청 놓칠 위험</h4><p>리스트에 시각적 우선순위가 약함</p></div>
            <div className={s.painCard}><h4>판단 정보 부족</h4><p>&quot;보류하면 어떻게 되지?&quot; 즉시 답을 얻을 수 없음</p></div>
            <div className={s.painCard}><h4>도메인 전환 시 컨텍스트 유실</h4><p>승인 중 배포가 필요하면 탭 전환</p></div>
          </div>

          <h3 className={s.flowTitle}>기존 승인 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 승인 페이지\\n진입"] --> B["2. 필터: pending\\n건수 확인"]
    B --> C["3. 필터: type별\\n분류 확인"]
    C --> D["4. 고위험 건\\n눈으로 스캔"]
    D --> E["5. 개별 요청\\n상세 진입"]
    E --> F["6. 승인/보류\\n처리"]
    style F stroke:#34c38f,stroke-width:2px`} />

          <button className={s.demoButton} onClick={() => openDemo("/approve")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel}>기존 Approval Admin 시연</div><div className={s.demoDesc}>필터 변경 3회, 개별 요청 진입 필요</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>

          {/* A2UI Solution */}
          <div className={s.a2uiSolutionBlock}>
            <div className={s.chatMock}>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>이</div><div className={`${s.chatBubble} ${s.chatBubbleUser}`}>승인 요청 확인해줘</div></div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  승인 큐를 준비했습니다.
                  <div className={s.surfacePreview}>
                    <div className={s.surfaceTitle}>Approval Queue Inbox</div>
                    <div style={{ margin: "6px 0" }}>
                      <span className={`${s.badge} ${s.badgeRed}`} style={{ marginRight: 4 }}>HIGH</span> payments-prod read access<br/>
                      <span className={`${s.badge} ${s.badgeYellow}`} style={{ marginRight: 4 }}>MED</span> payments timeout tuning<br/>
                      <span className={`${s.badge} ${s.badgeGreen}`} style={{ marginRight: 4 }}>LOW</span> search feature flag enable
                    </div>
                    <span className={s.surfaceBtnGreen}>승인</span>
                    <span className={s.surfaceBtnGhost}>보류</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.solutionText}>
              <span className={`${s.badge} ${s.badgeGreen}`}>A2UI Solution</span>
              <h3 className={s.solutionTitle}>한 번의 질문으로 전체 현황</h3>
              <p className={s.solutionDesc}>대기 건수, 유형별 분류, 고위험 건 알림을 한 번에 받고, 큐 Surface에서 바로 승인/보류 처리합니다.</p>
              <p className={s.solutionHighlight}><strong>필터 3번이 질문 1번으로.</strong></p>
            </div>
          </div>

          <h3 className={s.flowTitle}>A2UI 승인 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 자연어 입력\\n승인 확인해줘"] --> B["2. 큐 Surface\\n렌더링"]
    B --> C["3. 클릭 한 번\\n승인 / 보류"]
    style A stroke:#34c38f,stroke-width:2px
    style B stroke:#34c38f,stroke-width:2px
    style C stroke:#34c38f,stroke-width:2px`} />

          <button className={`${s.demoButton} ${s.demoButtonAccent}`} onClick={() => openDemo("/approve")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel} style={{ color: "#34c38f" }}>A2UI Approval 시연</div><div className={s.demoDesc}>한 번에 현황 파악 + 즉시 처리</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>
        </section>

        {/* ============================================================
            PART 3 — ROLLBACK
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#fb923c" }}>Part 3 &mdash; Rollback</div>
          <h2 className={s.sectionTitle}>박롤백 대리의 긴박한 밤</h2>
          <p className={s.sectionDesc}>SRE. 새벽 2시, PagerDuty 알림. payments-api severity HIGH 인시던트. 에러율 급등.</p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>새벽 2시, 알림이 울립니다</h3>
              <p>잠에서 깬 박롤백 대리가 가장 먼저 알아야 할 것 &mdash; 어떤 서비스? 인시던트 심각도? 롤백 가능 버전? 기존에는 4개의 화면을 동시에 열어야 했습니다.</p>
              <blockquote>지금 뭐가 터진 거지? 어떤 버전으로 돌려야 해? 데이터는 괜찮을까?</blockquote>
            </div>
            <div className={s.storyVisual}><div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div><div>새벽 인시던트 대응<br/>4개 탭을 오가며 정보 수집</div></div>
          </div>

          <div className={s.grid2}>
            <div className={s.painCard}><h4>정보 수집에 5분</h4><p>4개 화면을 오가며 상황 파악</p></div>
            <div className={s.painCard}><h4>추천 버전 없음</h4><p>어떤 버전이 안전한지 스스로 판단</p></div>
            <div className={s.painCard}><h4>절차 확인 불가</h4><p>&quot;dry run이 뭐였지?&quot; 위키를 뒤져야 함</p></div>
            <div className={s.painCard}><h4>새벽의 인지 부하</h4><p>잠이 덜 깬 상태에서 여러 화면, 여러 판단</p></div>
          </div>

          <h3 className={s.flowTitle}>기존 롤백 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 모니터링\\n확인"] --> B["2. 인시던트\\n페이지 확인"]
    B --> C["3. 롤백 페이지\\n이동"]
    C --> D["4. 버전 목록\\n스캔 + 판단"]
    D --> E["5. 위키에서\\n절차 확인"]
    E --> F["6. 롤백 실행"]
    style F stroke:#fb923c,stroke-width:2px`} />

          <button className={s.demoButton} onClick={() => openDemo("/rollback")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel}>기존 Rollback Admin 시연</div><div className={s.demoDesc}>4개 화면 전환, 5분 소요</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>

          {/* A2UI Solution */}
          <div className={s.a2uiSolutionBlock}>
            <div className={s.chatMock}>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>박</div><div className={`${s.chatBubble} ${s.chatBubbleUser}`}>payments-api 롤백하고 싶어</div></div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  payments-api 롤백 대상을 준비했습니다.
                  <div className={s.surfacePreview}>
                    <div className={s.surfaceTitle}>Rollback Target List</div>
                    <div style={{ margin: "6px 0", fontSize: 12 }}>
                      <span className={`${s.badge} ${s.badgeGreen}`}>추천</span> v2.3.16 &mdash; 24h stable, low risk<br/>
                      <span className={`${s.badge} ${s.badgeYellow}`} style={{ marginTop: 4, display: "inline-block" }}>대안</span> v2.3.14 &mdash; stable, medium risk
                    </div>
                    <span className={s.surfaceBtnOrange}>이 버전으로 롤백</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.solutionText}>
              <span className={`${s.badge} ${s.badgeOrange}`}>A2UI Solution</span>
              <h3 className={s.solutionTitle}>30초 만에 롤백 완료</h3>
              <p className={s.solutionDesc}>현재 상태, 인시던트 정보, 추천 롤백 버전까지 한 번에. AI가 안정 버전을 추천하고, 한 번의 클릭으로 롤백합니다.</p>
              <p className={s.solutionHighlight}><strong>5분이 30초로.</strong> 4개 화면이 1개 화면으로.</p>
            </div>
          </div>

          <h3 className={s.flowTitle}>A2UI 롤백 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 자연어 입력\\n롤백하고 싶어"] --> B["2. AI 추천 버전\\n+ Target List"]
    B --> C["3. 클릭 한 번\\n롤백 실행"]
    style A stroke:#fb923c,stroke-width:2px
    style B stroke:#fb923c,stroke-width:2px
    style C stroke:#34c38f,stroke-width:2px`} />

          <button className={`${s.demoButton} ${s.demoButtonAccent}`} onClick={() => openDemo("/rollback")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel} style={{ color: "#fb923c" }}>A2UI Rollback 시연</div><div className={s.demoDesc}>대화 2턴, 30초 만에 롤백 완료</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>
        </section>

        {/* ============================================================
            ARCHITECTURE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Architecture</div>
          <h2 className={s.sectionTitle}>A2UI를 어떻게 구축하나요?</h2>
          <p className={s.sectionDesc}>A2UI는 템플릿 수준으로 필요한 화면, 백엔드, 관리 어드민을 설계합니다.</p>
          <div className={s.grid3}>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div><h4>React Renderer</h4><p>A2UI Surface 컴포넌트. Template별 전용 UI를 렌더링합니다.</p><span className={`${s.badge} ${s.badgeBlue}`} style={{ marginTop: 8 }}>7개 Template</span></div>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>⚙️</div><h4>Template 설계 어드민</h4><p>Template 정의, Input Contract, Selection Policy를 관리합니다.</p><span className={`${s.badge} ${s.badgeBlue}`} style={{ marginTop: 8 }}>Registry 기반</span></div>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div><h4>AI 판단 로직</h4><p>Intent 해석, Slot 수집, Tool 실행, Decision Engine, Template 선택.</p><span className={`${s.badge} ${s.badgeGreen}`} style={{ marginTop: 8 }}>8 Step Pipeline</span></div>
          </div>

          <h3 className={s.flowTitle}>AI Chatbot 작동 흐름</h3>
          <Mermaid chart={`sequenceDiagram
    actor User as User
    participant API as Chat API
    participant Orch as Orchestrator
    participant Dec as Decision Engine
    participant Tpl as Template System
    User->>API: "배포해줘"
    API->>Orch: orchestrate()
    rect rgba(91,141,238,0.08)
    Note over Orch: Intent 해석
    Note over Orch: Slot 추출 (serviceName)
    Note over Orch: Tool 실행 (getServiceDeployContext)
    end
    Orch->>Dec: evaluate(facts)
    Dec-->>Orch: render_surface
    Orch->>Tpl: select + bind(facts)
    Tpl-->>Orch: SurfaceEnvelope
    Orch-->>API: SSE stream (delta + result)
    API-->>User: Surface 렌더링`} />
        </section>

        {/* ============================================================
            WHY
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Insight</div>
          <h2 className={s.sectionTitle}>이렇게 만든 이유</h2>
          <p className={s.sectionDesc}>A2UI를 여러 버전으로 구축하고 다시 만들면서 발견한 어려움과, 그에 따른 설계 결정입니다.</p>

          <div className={s.insightCard}>
            <h3>Challenge</h3>
            <ul className={s.insightList}>
              <li><strong>백엔드 작업의 부수적 부담</strong> &mdash; A2UI에 필요한 정보를 받아오는 백엔드, 버튼 액션에 맞는 백엔드 행동을 새롭게 만들어야 합니다.</li>
              <li><strong>기존보다 더 좋아야 하는 높은 기준</strong> &mdash; 기존 페이지보다 더 좋아야 하며, Chatbot 텍스트보다 더 좋은 사례여야 A2UI의 가치가 있습니다.</li>
              <li><strong>사용자에게 직접 만들게 하는 한계</strong> &mdash; 사용자가 A2UI를 학습하고 더 좋은 UIUX를 연구해서 등록하게 하는 것은 큰 어려움이 있습니다.</li>
            </ul>
          </div>

          <div className={s.decisionCard}>
            <h3>따라서, 직접 등록이 아닌 솔루션으로 풀기로 했습니다.</h3>
            <p>사용자가 직접 Template을 만들게 하는 것이 아니라, 솔루션 차원에서 직접 설계하여 템플릿 수준으로 제공하기로 결정했습니다.</p>
          </div>

          <div className={s.grid2}>
            <div className={s.benefitCard}><h4>예측 가능한 품질 확보</h4><p>어떤 값이 나올지 예측 가능해져, 고객에게 전달하는 A2UI 품질을 확보할 수 있습니다.</p></div>
            <div className={s.benefitCard}><h4>사용자 학습 비용 절감</h4><p>A2UI를 직접 필요한 부분을 솔루션하여 설계해줌으로써, 사용자가 무엇을 A2UI로 만들어야 할지 고민하는 시간을 줄여줍니다.</p></div>
          </div>
        </section>

        {/* ============================================================
            VALUE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Value Proposition</div>
          <h2 className={s.sectionTitle}>A2UI는 언제 가치가 있나요?</h2>
          <div className={s.grid3}>
            <div className={s.valueCard}><h4>기존 시스템 수정이 어려울 때</h4><p>레거시 시스템을 건드리지 않고, Chatbot 레이어에서 새로운 UX를 제공합니다.</p></div>
            <div className={s.valueCard}><h4>기존 시스템이 복잡할 때</h4><p>여러 페이지에 흩어진 정보를 하나의 Surface로 모아 인지 부하를 줄입니다.</p></div>
            <div className={s.valueCard}><h4>자주 쓰는 기능을 묶을 때</h4><p>반복되는 워크플로우를 대화 한 줄로 압축하여 작업 속도를 높입니다.</p></div>
          </div>
          <div className={s.closingCard}>
            <h3>A2UI는 DevOps 엔지니어의 &quot;클릭&quot;을 &quot;대화&quot;로 바꿉니다.</h3>
            <p>반복적인 네비게이션을 없애고, 컨텍스트 스위칭을 줄이며, 긴박한 순간에도 정확한 정보와 즉각적인 실행을 제공합니다.</p>
          </div>
        </section>

      </div>
    </AppFrame>
  );
}
