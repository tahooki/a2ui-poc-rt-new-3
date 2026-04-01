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
          <h1 className={s.heroTitle}>DevOps 운영을<br/>A2UI로 보다 쉽게</h1>
          <p className={s.heroSub}>
            DevOps 3가지 핵심 사례 &mdash; 배포, 승인, 롤백 &mdash; 을 A2UI(Adaptive Agentic UI)로 풀어,
            복잡한 콘솔 조작을 AI가 맥락을 이해하고 필요한 화면을 직접 구성해주는 PoC를 소개합니다.
          </p>
          <img src="/images/story-title.jpg" alt="DevOps A2UI 소개" style={{ width: '100%', borderRadius: '12px', marginTop: '28px' }} />
        </section>

        {/* OVERVIEW */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Overview</div>
          <h2 className={s.sectionTitle}>A2UI PoC 발표 흐름</h2>
          <p className={s.sectionDesc}>DevOps 운영에서 반복되는 복잡한 콘솔 조작을, AI가 맥락을 파악해 필요한 화면을 직접 구성해주는 A2UI(Adaptive Agentic UI)의 컨셉, 작동 원리, 그리고 설계 배경을 소개합니다.</p>
          <img src="/images/story-000.jpg" alt="A2UI 발표 흐름 — 사례 소개, 로직 설명, 개발 이유" style={{ width: '100%', borderRadius: '12px', marginBottom: '28px' }} />
        </section>

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>A2UI 사례 소개</h2></div>

        {/* CASES */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Cases</div>
          <h2 className={s.sectionTitle}>A2UI로 풀어본 3가지 사례</h2>
          <p className={s.sectionDesc}>여러 단계를 거쳐야 하거나, 여러 페이지에서 확인해야 하는 정보를 한번에 풀 수 있도록 개선합니다.</p>
          <div className={s.grid3}>
            <div className={s.overviewCard} style={{ borderTopColor: "#5b8dee" }}><div style={{ fontSize: 28, fontWeight: 800 }}>1</div><h4>배포 (Deploy)</h4><p>도커 이미지 생성 &rarr; Request 등록 &rarr; Deploy 실행. 3단계 배포를 AI가 맥락에 맞는 화면으로 간소화합니다.</p></div>
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

          <h3 className={s.flowTitle}>이런 일이 있을 수 있습니다.</h3>
          <div className={s.grid2}>
            <div className={s.painCard}><h4>대기/보류/고위험 현황 파악이 어려움</h4><p>승인 대기 건수, 보류 건수, 고위험 건수를 한눈에 볼 수 없어 리스트를 직접 세야 합니다.</p></div>
            <div className={s.painCard}><h4>고위험 요청이 묻힘</h4><p>danger 등급의 break-glass 요청이나 데이터 작업이 일반 요청 사이에 섞여 놓치기 쉽습니다.</p></div>
            <div className={s.painCard}><h4>리스크 정보를 따로 확인해야 함</h4><p>영향 범위, 복구 방법, 검증 상태를 보려면 각 요청을 하나씩 열어봐야 합니다.</p></div>
            <div className={s.painCard}><h4>승인/보류를 건별로 처리</h4><p>요청마다 상세 페이지에 들어가서 개별적으로 승인하거나 보류해야 합니다.</p></div>
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
          <h2 className={s.sectionTitle}>박대응 대리의 긴박한 밤</h2>
          <p className={s.sectionDesc}>인프라 엔지니어. 같은 팀이라 서비스 배포 권한은 있지만, payments-api를 직접 배포한 적은 없습니다. 새벽 2시, PagerDuty 알림.</p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>새벽 2시, 알림이 울립니다</h3>
              <p>payments-api에 severity HIGH 인시던트. 에러율이 급등하고 있습니다. 배포한 김배포 선임에게 연락했지만 응답이 없습니다. 서비스 접근 권한은 있지만, 이 서비스를 직접 배포한 적이 없는 박대응 대리는 뭐가 바뀌어서 문제인지 알 수 없습니다.</p>
              <blockquote>나는 이 서비스 배포한 적 없는데... 뭐가 바뀌어서 터진 거지? 어떤 버전으로 돌려야 안전한 거야?</blockquote>
            </div>
            <div className={s.storyVisual}><div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div><div>새벽 인시던트 대응<br/>배포자 부재, 원인 파악 불가<br/>권한은 있지만 맥락이 없는 상황</div></div>
          </div>

          <h3 className={s.flowTitle}>이런 일이 있을 수 있습니다.</h3>
          <div className={s.grid2}>
            <div className={s.painCard}><h4>배포자가 아니라 원인 특정 불가</h4><p>어떤 변경이 들어갔는지, 왜 문제가 생겼는지 배포 맥락이 없어 원인을 파악할 수 없습니다.</p></div>
            <div className={s.painCard}><h4>담당자 연락까지 대기</h4><p>배포한 사람이 응답할 때까지 기다리거나, 혼자서 배포 이력을 하나씩 뒤져야 합니다.</p></div>
            <div className={s.painCard}><h4>롤백 대상 선택이 어려움</h4><p>어떤 버전이 안전한지 판단할 근거가 부족합니다. eligible 여부, health 상태를 직접 비교해야 합니다.</p></div>
            <div className={s.painCard}><h4>실행에 대한 불안감</h4><p>서비스를 잘 모르는 상태에서 롤백을 실행하면 더 큰 문제가 생기지 않을까 망설이게 됩니다.</p></div>
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
            <div><div className={s.demoLabel}>기존 Rollback Admin 시연 &mdash; 서비스 현황 확인</div><div className={s.demoDesc}>서비스 현황 페이지에서 에러율, 응답시간, 인시던트 확인</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>

          {/* A2UI Solution */}
          <div className={s.a2uiSolutionBlock}>
            <div className={s.chatMock}>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>박</div><div className={`${s.chatBubble} ${s.chatBubbleUser}`}>payments-api에 인시던트 떴는데, 원인이 뭐야?</div></div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  payments-api 인시던트를 분석했습니다.
                  <div className={s.surfacePreview}>
                    <div className={s.surfaceTitle} style={{ color: "#f46a6a" }}>Incident Alert &middot; CRITICAL</div>
                    <div style={{ fontSize: 11, margin: "4px 0", opacity: 0.7 }}>
                      INC-842: card timeout spike<br/>
                      에러율 12.4% (평소 0.3%) &middot; p99 4,200ms (평소 320ms)
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8, paddingTop: 8 }}>
                      <div className={s.surfaceTitle} style={{ color: "#fb923c" }}>원인 분석</div>
                      <div style={{ fontSize: 11, margin: "4px 0", opacity: 0.7 }}>
                        v2.3.18-rc1 배포 후 card-processing 모듈의 timeout 설정 변경이 원인으로 추정됩니다. 이전 안정 버전 대비 connection pool 설정이 변경되었습니다.
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8, paddingTop: 8 }}>
                      <div className={s.surfaceTitle}>Rollback Target List</div>
                      <div style={{ margin: "4px 0", fontSize: 12 }}>
                        <span className={`${s.badge} ${s.badgeGreen}`}>추천</span> v2.3.16 &mdash; 24h stable, low risk<br/>
                        <span className={`${s.badge} ${s.badgeYellow}`} style={{ marginTop: 4, display: "inline-block" }}>대안</span> v2.3.14 &mdash; stable, medium risk
                      </div>
                    </div>
                    <span className={s.surfaceBtnOrange}>이 버전으로 롤백</span>
                  </div>
                </div>
              </div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>박</div><div className={`${s.chatBubble} ${s.chatBubbleUser}`}>v2.3.16으로 롤백해줘</div></div>
              <div className={s.chatMsg}><div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  v2.3.16으로 롤백이 완료되었습니다. 에러율이 0.3%로 정상화되었습니다.
                </div>
              </div>
            </div>
            <div className={s.solutionText}>
              <span className={`${s.badge} ${s.badgeOrange}`}>A2UI Solution</span>
              <h3 className={s.solutionTitle}>AI가 원인을 특정하고, 안전한 버전을 추천합니다</h3>
              <p className={s.solutionDesc}>배포자가 아니어도 괜찮습니다. AI가 배포 이력을 분석해 원인을 특정하고, 안정성이 검증된 롤백 버전을 추천합니다. 서비스 맥락을 몰라도 근거 있는 판단이 가능합니다.</p>
              <p className={s.solutionHighlight}><strong>서비스 이해도가 부족해도, A2UI가 있다면 빠르고 안전하게 롤백할 수 있습니다.</strong></p>
            </div>
          </div>

          <h3 className={s.flowTitle}>A2UI 롤백 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 자연어 입력\\n원인이 뭐야?"] --> B["2. AI 원인 분석\\n+ 버전 추천"]
    B --> C["3. 롤백 요청\\n롤백해줘"]
    C --> D["4. 롤백 완료\\n정상화 확인"]
    style A stroke:#fb923c,stroke-width:2px
    style B stroke:#fb923c,stroke-width:2px
    style C stroke:#fb923c,stroke-width:2px
    style D stroke:#34c38f,stroke-width:2px`} />

          <button className={`${s.demoButton} ${s.demoButtonAccent}`} onClick={() => openDemo("/rollback")} type="button">
            <span style={{ fontSize: 24 }}>▶</span>
            <div><div className={s.demoLabel} style={{ color: "#fb923c" }}>A2UI Rollback 시연</div><div className={s.demoDesc}>배포자가 아니어도 AI가 원인 분석 + 롤백 추천</div></div>
            <span style={{ fontSize: 12, opacity: 0.5, marginLeft: "auto" }}>새 창에서 열기</span>
          </button>
        </section>

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>로직 설명</h2></div>

        {/* ============================================================
            ARCHITECTURE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Architecture</div>
          <h2 className={s.sectionTitle}>A2UI를 어떻게 구축하나요?</h2>
          <p className={s.sectionDesc}>A2UI는 템플릿 수준으로 필요한 화면, 백엔드, 관리 어드민을 설계합니다.</p>
          <div className={s.grid3}>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>🖼️</div><h4>React Renderer</h4><p>A2UI Surface 컴포넌트. Template별 전용 UI를 렌더링합니다.</p><span className={`${s.badge} ${s.badgeBlue}`} style={{ marginTop: 8 }}>7개 Template</span></div>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>⚙️</div><h4>Template 관리 어드민</h4><p>Template 정의, Input Contract, Selection Policy를 관리합니다.</p><span className={`${s.badge} ${s.badgeBlue}`} style={{ marginTop: 8 }}>Registry 기반</span></div>
            <div className={s.archBox}><div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div><h4>AI 판단 로직</h4><p>Intent 해석, Slot 수집, Tool 실행, Decision Engine, Template 선택.</p><span className={`${s.badge} ${s.badgeGreen}`} style={{ marginTop: 8 }}>8 Step Pipeline</span></div>
          </div>

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

        <div className={s.chapterDivider}><h2 className={s.chapterTitle}>이렇게 개발한 이유</h2></div>

        {/* ============================================================
            WHY
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Insight</div>
          <h2 className={s.sectionTitle}>이렇게 만든 이유</h2>
          <p className={s.sectionDesc}>A2UI를 여러 버전으로 구축하고 다시 만들면서 발견한 어려움과, 그에 따른 설계 결정입니다.</p>

          <img src="/images/story-002.jpg" alt="A2UI 설계 결정 — Challenge에서 솔루션으로" style={{ width: '100%', borderRadius: '12px', marginBottom: '28px' }} />

          <div style={{ display: 'grid', gap: '20px', lineHeight: '1.8', color: 'var(--text-secondary, #b0b0b0)' }}>
            <div>
              <h4 style={{ color: '#f46a6a', fontSize: '16px', marginBottom: '4px' }}>백엔드 작업의 부수적 부담</h4>
              <p>A2UI에 필요한 정보를 받아오는 백엔드, 버튼 액션에 맞는 백엔드 행동을 새롭게 만들어야 합니다.</p>
            </div>
            <div>
              <h4 style={{ color: '#f46a6a', fontSize: '16px', marginBottom: '4px' }}>기존보다 더 좋아야 하는 높은 기준</h4>
              <p>기존 페이지보다 더 좋아야 하며, Chatbot 텍스트보다 더 좋은 사례여야 A2UI의 가치가 있습니다.</p>
            </div>
            <div>
              <h4 style={{ color: '#f46a6a', fontSize: '16px', marginBottom: '4px' }}>사용자에게 직접 만들게 하는 한계</h4>
              <p>사용자가 A2UI를 학습하고 더 좋은 UIUX를 연구해서 등록하게 하는 것은 큰 어려움이 있습니다.</p>
            </div>
            <div>
              <h4 style={{ color: '#34c38f', fontSize: '16px', marginBottom: '4px' }}>솔루션으로 설계하여 제공</h4>
              <p>사용자가 직접 Template을 만들게 하는 것이 아니라, 솔루션 차원에서 직접 설계하여 템플릿 수준으로 제공하기로 결정했습니다.</p>
            </div>
            <div>
              <h4 style={{ color: '#34c38f', fontSize: '16px', marginBottom: '4px' }}>예측 가능한 품질 확보</h4>
              <p>어떤 값이 나올지 예측 가능해져, 고객에게 전달하는 A2UI 품질을 확보할 수 있습니다.</p>
            </div>
            <div>
              <h4 style={{ color: '#34c38f', fontSize: '16px', marginBottom: '4px' }}>사용자 학습 비용 절감</h4>
              <p>A2UI를 직접 필요한 부분을 솔루션하여 설계해줌으로써, 사용자가 무엇을 A2UI로 만들어야 할지 고민하는 시간을 줄여줍니다.</p>
            </div>
          </div>
        </section>

        {/* ============================================================
            VALUE
            ============================================================ */}
        <section className={s.section}>
          <div className={s.sectionLabel}>Value Proposition</div>
          <h2 className={s.sectionTitle}>A2UI는 언제 가치가 있나요?</h2>
          <img src="/images/story-001.jpg" alt="A2UI 가치 제안 — 기존 시스템 수정이 어려울 때, 복잡할 때, 자주 쓰는 기능을 묶을 때" style={{ width: '100%', borderRadius: '12px', marginBottom: '28px' }} />
          <div className={s.closingCard}>
            <h3>A2UI는 DevOps 엔지니어가 찾아야 할 것을 AI가 먼저 준비합니다.</h3>
            <p>반복적인 네비게이션을 없애고, 컨텍스트 스위칭을 줄이며, 긴박한 순간에도 정확한 정보와 즉각적인 실행을 제공합니다.</p>
          </div>
        </section>

      </div>
    </AppFrame>
  );
}
