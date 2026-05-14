"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import s from "./story-page.module.css";

type VisualAssetProps = {
  alt: string;
  fallbackSrc: string;
  src: string;
};

const fallbackImages = {
  hero: "/images/story-hero-revised.png",
};

const deployParts = [
  "DeployTargetSummaryBlock",
  "DeployArtifactBlock",
  "DeployRequestConfigBlock",
  "DeployPreflightChecklistBlock",
  "DeployRolloutProgressBlock",
  "DeploymentHistoryBlock",
];

function openDemo(path: string) {
  window.open(`${window.location.origin}${path}`, "_blank", "noopener");
}

function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
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
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

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

  return <div ref={ref} className={s.mermaidWrap} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function VisualAsset({ alt, fallbackSrc, src }: VisualAssetProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <Image
      fill
      alt={alt}
      className={s.visualImage}
      loading="eager"
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
      sizes="(max-width: 900px) 100vw, 960px"
      src={currentSrc}
      unoptimized
    />
  );
}

export function StoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppFrame
      activePage="story"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated="2026-05-13"
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      pageScope="A2UI Story"
      pageTitle="Story"
      sidebarOpen={sidebarOpen}
    >
      <div className={s.storyContainer}>
        <section className={`${s.hero} ${s.heroSplit}`}>
          <div>
            <div className={s.heroLabel}>A2UI Platform Story</div>
            <h1 className={s.heroTitle}>Agent가 호출하는<br />검증된 운영 UI</h1>
            <p className={s.heroSub}>
              매일 12개 서비스 × 3개 환경. 이력 확인 3분, 배포 시작 7단계. 김배포 선임의
              아침부터 보겠습니다.
            </p>
          </div>
          <div className={s.visualFrame}>
            <VisualAsset
              alt="대화에서 검증된 운영 UI를 호출하는 A2UI 흐름"
              fallbackSrc={fallbackImages.hero}
              src={fallbackImages.hero}
            />
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#5b8dee" }}>Deploy</div>
          <h2 className={s.sectionTitle}>김배포 선임의 배포 일지</h2>
          <p className={s.sectionDesc}>
            Platform Engineer. 도커 이미지 기반 배포 파이프라인을 운영하며, 매번 여러 단계를 거쳐야 하는
            배포 프로세스를 담당합니다.
          </p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>배포 한 번이 이렇게 복잡합니다</h3>
              <p>
                배포를 하려면 먼저 도커 이미지를 빌드하고, 레지스트리에 push한 뒤, 콘솔에서 이미지를 등록해야
                합니다. 그 다음 배포 요청(Request)을 만들기 위해 서비스, 환경, CPU, 메모리, 전략 등을
                하나하나 입력합니다.
              </p>
              <blockquote>
                이미지 등록하고, 리퀘스트 만들고, 실행까지... 3단계를 각각 다른 탭에서 해야 해. 입력할 게 너무 많아.
              </blockquote>
            </div>
            <div className={s.storyVisual}>
              <div className={s.storyVisualTitle}>Docker image 기반 3단계 배포</div>
              <div className={s.storyVisualFlow}>Image 등록 &rarr; Request 생성 &rarr; Deploy 실행</div>
            </div>
          </div>

          <h3 className={s.flowTitle}>이런 일이 있을 수 있습니다.</h3>
          <div className={s.grid2}>
            <div className={s.painCard}>
              <h4>3단계를 각각 따로</h4>
              <p>이미지 등록, 배포 요청 생성, 실행이 별도의 탭과 폼으로 분리되어 있습니다.</p>
            </div>
            <div className={s.painCard}>
              <h4>총 21개의 입력 필드</h4>
              <p>이미지 등록 8개 + 배포 요청 13개. 매번 수동으로 채워야 합니다.</p>
            </div>
            <div className={s.painCard}>
              <h4>이전 배포 참고가 번거로움</h4>
              <p>같은 서비스를 배포했던 설정을 보려면 이력 페이지로 이동해서 하나하나 찾아야 합니다.</p>
            </div>
            <div className={s.painCard}>
              <h4>실수하면 처음부터</h4>
              <p>서비스나 환경을 잘못 선택하면 뒤로 가기 후 다시 입력해야 합니다.</p>
            </div>
          </div>

          <h3 className={s.flowTitle}>기존 배포 흐름</h3>
          <Mermaid chart={`flowchart LR
    A["1. 도커 이미지\\n빌드 + Push"] --> B["2. Image 탭\\n8개 필드 입력"]
    B --> C["3. Image\\n등록"]
    C --> D["4. Request 탭\\n이미지 선택"]
    D --> E["5. 배포 설정\\n13개 필드 입력"]
    E --> F["6. Request\\n생성"]
    F --> G["7. Run 탭\\n배포 실행"]
    style G stroke:#5b8dee,stroke-width:2px`} />

          <button className={s.demoButton} onClick={() => openDemo("/deploy/image")} type="button">
            <span className={s.demoIcon}>Run</span>
            <div>
              <div className={s.demoLabel}>기존 Deploy Admin 시연</div>
              <div className={s.demoDesc}>3단계 탭 전환, 21개 필드 입력의 기존 배포 과정</div>
            </div>
            <span className={s.demoMeta}>새 창에서 열기</span>
          </button>

          <div className={s.a2uiSolutionBlock}>
            <div className={s.chatMock}>
              <div className={s.chatMsg}>
                <div className={`${s.chatAvatar} ${s.chatAvatarUser}`}>김</div>
                <div className={`${s.chatBubble} ${s.chatBubbleUser}`}>payments-api 배포해줘</div>
              </div>
              <div className={s.chatMsg}>
                <div className={`${s.chatAvatar} ${s.chatAvatarAi}`}>AI</div>
                <div className={`${s.chatBubble} ${s.chatBubbleAi}`}>
                  payments-api 배포를 준비했습니다.
                  <div className={s.surfacePreview}>
                    <div className={s.surfaceTitle}>Deploy Launchpad</div>
                    payments-api &middot; production &middot; v2.3.18-rc1 &middot; rolling<br />
                    <span style={{ opacity: 0.6 }}>Image 정보 &middot; Request 설정</span><br />
                    <span className={s.surfaceBtn}>배포 시작</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={s.solutionText}>
              <span className={`${s.badge} ${s.badgeBlue}`}>A2UI Solution</span>
              <h3 className={s.solutionTitle}>AI가 맥락을 파악해 배포를 준비합니다</h3>
              <p className={s.solutionDesc}>
                서비스명을 말하면 AI가 이전 배포 데이터를 기반으로 이미지 정보와 배포 설정을 자동으로 채워,
                Deploy Launchpad를 렌더링합니다. 수십 개의 필드를 직접 채울 필요가 없습니다.
              </p>
              <p className={s.solutionHighlight}>
                <strong>여러 페이지, 여러 입력을</strong> AI가 정리해서 한 화면에.
              </p>
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
            <span className={s.demoIcon}>Run</span>
            <div>
              <div className={s.demoLabel} style={{ color: "#93b4ff" }}>A2UI Deploy 시연</div>
              <div className={s.demoDesc}>흩어진 정보를 한 화면에서 배포</div>
            </div>
            <span className={s.demoMeta}>새 창에서 열기</span>
          </button>

        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#a78bfa" }}>Question</div>
          <h2 className={s.sectionTitle}>AI가 모든 걸 그리게 하지 않는 이유</h2>
          <p className={s.sectionDesc}>
            매번 새로운 UI는 매번 다른 action ID, 다른 권한 처리, 다른 fallback을 의미합니다. 운영 화면에서
            이것은 안전이 무너진다는 뜻입니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="AI 자유 생성 UI와 컴포넌트 기반 A2UI 비교"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-ai-vs-component.png"
            />
          </div>

          <div className={s.grid2}>
            <div className={s.decisionCard}>
              <h3>매번 다름</h3>
              <p>버튼 위치, action ID, 데이터 매핑이 호출마다 달라집니다. 권한·감사·롤백 흐름이 끊깁니다.</p>
            </div>
            <div className={s.decisionCard}>
              <h3>매번 같음</h3>
              <p>검증된 Part가 같은 action contract와 fallback을 유지합니다. 한 번 검토하면 계속 안전합니다.</p>
            </div>
          </div>

          <div className={s.catalogIntro}>
            <h3>검증된 Part는 무엇입니까?</h3>
            <p>각 Part는 UX 검증, 권한, action 라우팅, fallback을 내장합니다.</p>
          </div>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 컴포넌트 카탈로그"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-component-catalog.png"
            />
          </div>

          <div className={s.partCloud} aria-label="Deploy A2UI part examples">
            {deployParts.map((part) => (
              <span className={`${s.badge} ${s.badgeBlue}`} key={part}>{part}</span>
            ))}
          </div>
        </section>

        <div className={s.actIntro}>
          방금 그 화면은 누가 만들었습니까? 끝에서부터 한 겹씩 벗겨 보겠습니다.
        </div>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#22d3ee" }}>Runtime</div>
          <h2 className={s.sectionTitle}>화면 = renderer + surfaceConfig + payload</h2>
          <p className={s.sectionDesc}>
            청중이 본 Launchpad는 세 가지 입력의 결합입니다. renderer는 항상 같고, payload와
            surfaceConfig만 호출마다 새로 들어옵니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 런타임 아키텍처"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-runtime-architecture.png"
            />
          </div>

          <div className={s.grid3}>
            <div className={s.valueCard}>
              <h4>payload</h4>
              <p>resolver가 만든 실제 서비스 데이터입니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>surfaceConfig</h4>
              <p>어떤 Part를 쓸지 담습니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>actions</h4>
              <p>클릭을 실행 흐름으로 보냅니다.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#fb923c" }}>Admin Binding</div>
          <h2 className={s.sectionTitle}>payload는 어디서 옵니까</h2>
          <p className={s.sectionDesc}>
            Admin은 UI를 그리는 곳이 아니라, 어떤 데이터를 어떤 Part 필드에 연결할지 정하는 곳입니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="Admin 데이터 바인딩 흐름"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-admin-binding.png"
            />
          </div>

          <div className={s.grid3}>
            <div className={s.archBox}>
              <h4>Resolver 등록</h4>
              <p>API/LLM/Auth/Transform resolver를 등록해 payload 소스를 정의합니다.</p>
            </div>
            <div className={s.archBox}>
              <h4>Binding path</h4>
              <p>payload의 어느 필드가 Part의 어느 자리에 들어갈지 매핑합니다.</p>
            </div>
            <div className={s.archBox}>
              <h4>Preview & Publish</h4>
              <p>미리보기로 검증한 뒤에만 publish하여 런타임에 노출됩니다.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel}>Creation Flow</div>
          <h2 className={s.sectionTitle}>Part는 어디서 옵니까</h2>
          <p className={s.sectionDesc}>
            Part는 제품팀이 만들고 publish합니다. Admin이 raw UI atoms를 조합하는 게 아니라, 검증된 Part
            중에서 고릅니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 제작 흐름"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-creation-flow.png"
            />
          </div>

          <div className={s.sequenceGrid}>
            <div>
              <strong>컴포넌트/파트를 만든다</strong>
              <span>제품팀이 UX, action contract, fallback을 검증해 publish합니다.</span>
            </div>
            <div>
              <strong>서비스 Surface를 구성한다</strong>
              <span>Deploy 업무에 맞는 Part 묶음을 선택합니다.</span>
            </div>
            <div>
              <strong>Admin에서 바인딩한다</strong>
              <span>payload 소스와 binding path를 등록합니다.</span>
            </div>
            <div>
              <strong>Agent에 연결한다</strong>
              <span>Agent 파이프라인에 호출 step 하나를 추가합니다.</span>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#22d3ee" }}>Agent Integration</div>
          <h2 className={s.sectionTitle}>Agent에 step 한 줄. 그게 전부입니다.</h2>
          <p className={s.sectionDesc}>
            기존 planner, tool, memory는 그대로 둡니다. 응답 직전에 A2UI step 하나를 끼우고, 실패하면
            텍스트 응답으로 돌아갑니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="기존 Agent에 A2UI step을 추가하는 흐름"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-agent-integration.png"
            />
          </div>

          <div className={s.grid3}>
            <div className={s.valueCard}>
              <h4>응답 직전</h4>
              <p>필요할 때 Surface를 만듭니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Tool 실행 후</h4>
              <p>구조화 결과를 A2UI로 보여줍니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Action loop</h4>
              <p>클릭을 Agent 흐름으로 돌려보냅니다.</p>
            </div>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
