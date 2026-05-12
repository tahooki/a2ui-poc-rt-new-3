"use client";

import Image from "next/image";
import { useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import s from "./story-page.module.css";

type VisualAssetProps = {
  alt: string;
  fallbackSrc: string;
  src: string;
};

const fallbackImages = {
  hero: "/images/story-title.jpg",
  overview: "/images/story-000.jpg",
  reason: "/images/story-002.jpg",
  cards: "/images/story-001.jpg",
};

function openDemo(path: string) {
  window.open(`${window.location.origin}${path}`, "_blank", "noopener");
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

const deployParts = ["요약 Part", "Artifact Part", "검증 Part"];

export function StoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppFrame
      activePage="story"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated="2026-04-30"
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
              A2UI는 AI가 매번 화면을 자유롭게 그리는 방식이 아닙니다. 제품팀이 만든 A2UI 컴포넌트,
              Admin의 데이터 바인딩, Agent 런타임을 연결해 서비스 운영에 필요한 UI를 안전하게 제공합니다.
            </p>
            <div className={s.badgeRow}>
              <span className={`${s.badge} ${s.badgeBlue}`}>Component catalog</span>
              <span className={`${s.badge} ${s.badgePurple}`}>Admin binding</span>
              <span className={`${s.badge} ${s.badgeGreen}`}>Agent runtime</span>
            </div>
          </div>
          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 플랫폼 히어로 이미지"
              fallbackSrc={fallbackImages.hero}
              src={fallbackImages.hero}
            />
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel}>Overview</div>
          <h2 className={s.sectionTitle}>스토리는 Deploy 하나로 압축합니다</h2>
          <p className={s.sectionDesc}>
            긴 사례 나열 대신, Deploy 문제 하나로 A2UI가 필요한 이유를 보여준 뒤 실제 제작 구조를 설명합니다.
            흐름과 비교는 생성 이미지를 중심으로 전달하고, 텍스트는 핵심 판단만 남깁니다.
          </p>
          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 발표 흐름 로드맵"
              fallbackSrc={fallbackImages.overview}
              src={fallbackImages.overview}
            />
          </div>
          <div className={s.overviewStrip} aria-label="수정된 발표 흐름">
            <span>Deploy 문제</span>
            <span>Deploy A2UI 해결</span>
            <span>컴포넌트 카탈로그</span>
            <span>Admin 바인딩</span>
            <span>Agent 통합</span>
          </div>
        </section>

        <div className={s.chapterDivider}>
          <h2 className={s.chapterTitle}>Deploy Case</h2>
        </div>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#5b8dee" }}>Case</div>
          <h2 className={s.sectionTitle}>배포는 왜 A2UI가 필요한가</h2>
          <p className={s.sectionDesc}>
            Docker image 등록, request 생성, deploy 실행이 서로 다른 화면과 폼으로 나뉘어 있습니다.
            하나의 배포를 시작하려면 이전 이력, 이미지 정보, 배포 설정, 검증 상태를 계속 오가며 확인해야 합니다.
          </p>

          <div className={s.storyBlock}>
            <div className={s.storyText}>
              <h3>운영자는 배포 자체보다 준비 작업에 시간을 씁니다</h3>
              <p>
                이미지 등록과 request 설정은 대부분 이전 배포와 비슷하지만, 서비스명, 환경, 버전, CPU,
                메모리, rollout 전략 같은 필드는 매번 다시 확인해야 합니다.
              </p>
              <blockquote>
                필요한 정보는 이미 여러 시스템에 있지만, 운영자는 그 정보를 찾아서 폼에 다시 옮기고 있습니다.
              </blockquote>
            </div>
            <div className={s.visualFrame}>
              <VisualAsset
                alt="복잡한 배포 Admin 흐름"
                fallbackSrc={fallbackImages.cards}
                src={fallbackImages.cards}
              />
            </div>
          </div>

          <div className={s.grid3}>
            <div className={s.painCard}>
              <h4>화면이 나뉘어 있음</h4>
              <p>Image, Request, Run 단계가 분리되어 있어 같은 맥락을 여러 번 다시 확인합니다.</p>
            </div>
            <div className={s.painCard}>
              <h4>입력값이 많음</h4>
              <p>서비스, 환경, 리소스, 전략, baseline 등 반복되는 값을 직접 채워야 합니다.</p>
            </div>
            <div className={s.painCard}>
              <h4>이전 이력 참조가 번거로움</h4>
              <p>안전한 설정을 확인하려면 최근 배포와 상태 정보를 따로 찾아야 합니다.</p>
            </div>
          </div>

          <button className={s.demoButton} onClick={() => openDemo("/deploy/image")} type="button">
            <span className={s.demoIcon}>Run</span>
            <div>
              <div className={s.demoLabel}>기존 Deploy Admin 시연</div>
              <div className={s.demoDesc}>이미지 등록, request 생성, deploy 실행 흐름 확인</div>
            </div>
            <span className={s.demoMeta}>새 창에서 열기</span>
          </button>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#34c38f" }}>A2UI Solution</div>
          <h2 className={s.sectionTitle}>Deploy Launchpad로 한 화면에 모읍니다</h2>
          <p className={s.sectionDesc}>
            사용자가 &ldquo;payments-api 배포해줘&rdquo;라고 말하면 Agent는 배포 의도를 파악하고,
            Admin/MCP runtime은 필요한 payload와 surfaceConfig를 돌려줍니다. Shared renderer는 검증된
            Deploy A2UI parts로 Launchpad를 렌더링합니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="Deploy A2UI Launchpad 솔루션"
              fallbackSrc={fallbackImages.hero}
              src={fallbackImages.hero}
            />
          </div>

          <div className={s.grid3}>
            <div className={s.valueCard}>
              <h4>Agent</h4>
              <p>사용자의 요청에서 의도와 서비스명을 파악하고 A2UI가 필요한 턴인지 판단합니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Admin/MCP</h4>
              <p>publish된 resolver와 binding recipe를 실행해 검증된 payload를 만듭니다.</p>
            </div>
            <div className={s.valueCard}>
              <h4>Renderer</h4>
              <p>surfaceConfig에 선언된 A2UI parts를 같은 컴포넌트로 렌더링합니다.</p>
            </div>
          </div>

          <button className={`${s.demoButton} ${s.demoButtonAccent}`} onClick={() => openDemo("/deploy/image")} type="button">
            <span className={s.demoIcon}>Run</span>
            <div>
              <div className={s.demoLabel} style={{ color: "#93b4ff" }}>A2UI Deploy 시연</div>
              <div className={s.demoDesc}>Deploy Launchpad에서 확인하고 실행</div>
            </div>
            <span className={s.demoMeta}>새 창에서 열기</span>
          </button>
        </section>

        <div className={s.chapterDivider}>
          <h2 className={s.chapterTitle}>A2UI Creation Flow</h2>
        </div>

        <section className={s.section}>
          <div className={s.sectionLabel}>Creation Flow</div>
          <h2 className={s.sectionTitle}>A2UI는 이렇게 만들어집니다</h2>
          <p className={s.sectionDesc}>
            제품팀의 부품, 서비스 Surface, Admin 바인딩, Agent 호출이 순서대로 이어집니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 제작 흐름"
              fallbackSrc={fallbackImages.overview}
              src="/images/story-revision-creation-flow.png"
            />
          </div>

          <div className={s.sequenceGrid}>
            <div>
              <strong>1. 컴포넌트/파트를 만든다</strong>
              <span>검증된 운영 UI 부품을 준비합니다.</span>
            </div>
            <div>
              <strong>2. 서비스 Surface를 구성한다</strong>
              <span>서비스 업무에 맞게 묶습니다.</span>
            </div>
            <div>
              <strong>3. Admin에서 바인딩한다</strong>
              <span>데이터가 들어갈 자리를 정합니다.</span>
            </div>
            <div>
              <strong>4. Agent에 연결한다</strong>
              <span>필요한 순간 Surface를 호출합니다.</span>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#5b8dee" }}>Component Catalog</div>
          <h2 className={s.sectionTitle}>A2UI 컴포넌트는 raw UI가 아닙니다</h2>
          <p className={s.sectionDesc}>
            버튼과 테이블을 즉석 조합하는 것이 아니라, 운영 의미가 담긴 Part를 제공합니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 컴포넌트 카탈로그"
              fallbackSrc={fallbackImages.cards}
              src="/images/story-revision-component-catalog.png"
            />
          </div>

          <div className={s.partCloud} aria-label="Deploy A2UI part examples">
            {deployParts.map((part) => (
              <span className={`${s.badge} ${s.badgeBlue}`} key={part}>{part}</span>
            ))}
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#fb923c" }}>Admin Binding</div>
          <h2 className={s.sectionTitle}>Admin은 데이터 연결을 관리합니다</h2>
          <p className={s.sectionDesc}>
            Admin은 UI를 그리지 않습니다. 데이터가 어떤 Part로 들어갈지 연결합니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="Admin 데이터 바인딩 흐름"
              fallbackSrc={fallbackImages.overview}
              src="/images/story-revision-admin-binding.png"
            />
          </div>

          <div className={s.grid3}>
            <div className={s.archBox}>
              <h4>데이터 수집</h4>
              <p>필요한 값을 가져옵니다.</p>
            </div>
            <div className={s.archBox}>
              <h4>위치 지정</h4>
              <p>Part의 필드에 연결합니다.</p>
            </div>
            <div className={s.archBox}>
              <h4>검증 후 배포</h4>
              <p>확인된 설정만 publish합니다.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#a78bfa" }}>Guardrails</div>
          <h2 className={s.sectionTitle}>왜 AI가 A2UI를 모두 직접 그리게 하지 않을까요?</h2>
          <p className={s.sectionDesc}>
            운영 UI는 매번 새로움보다 반복 가능한 규칙과 안전한 액션 연결이 중요합니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="AI 자유 생성 UI와 컴포넌트 기반 A2UI 비교"
              fallbackSrc={fallbackImages.reason}
              src="/images/story-revision-ai-vs-component.png"
            />
          </div>

          <div className={s.grid2}>
            <div className={s.decisionCard}>
              <h3>자유 생성</h3>
              <p>레이아웃, 액션, 데이터 연결이 매번 달라질 수 있습니다.</p>
            </div>
            <div className={s.decisionCard}>
              <h3>컴포넌트 기반</h3>
              <p>UX 품질, 권한, fallback, action routing을 유지합니다.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel} style={{ color: "#22d3ee" }}>Runtime</div>
          <h2 className={s.sectionTitle}>런타임에서는 payload와 surfaceConfig가 만납니다</h2>
          <p className={s.sectionDesc}>
            런타임의 핵심은 데이터와 화면 구성이 renderer에서 합쳐지는 것입니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 런타임 아키텍처"
              fallbackSrc={fallbackImages.overview}
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
          <div className={s.sectionLabel} style={{ color: "#22d3ee" }}>Agent Integration</div>
          <h2 className={s.sectionTitle}>기존 Agent에는 A2UI step만 추가합니다</h2>
          <p className={s.sectionDesc}>
            기존 Agent 흐름을 유지하고, 응답 직전 A2UI step을 하나 더합니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="기존 Agent에 A2UI step을 추가하는 흐름"
              fallbackSrc={fallbackImages.cards}
              src="/images/story-revision-agent-integration.png"
            />
          </div>

          <div className={s.grid3}>
            <div className={s.overviewCard} style={{ borderTopColor: "#22d3ee" }}>
              <h4>응답 직전</h4>
              <p>필요할 때 Surface를 만듭니다.</p>
            </div>
            <div className={s.overviewCard} style={{ borderTopColor: "#5b8dee" }}>
              <h4>Tool 실행 후</h4>
              <p>구조화 결과를 A2UI로 보여줍니다.</p>
            </div>
            <div className={s.overviewCard} style={{ borderTopColor: "#34c38f" }}>
              <h4>Action loop</h4>
              <p>클릭을 Agent 흐름으로 돌려보냅니다.</p>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <div className={s.sectionLabel}>Closing</div>
          <h2 className={s.sectionTitle}>A2UI의 역할은 표현 계층을 안전하게 넓히는 것입니다</h2>
          <p className={s.sectionDesc}>
            제품팀, Admin, Agent가 나뉘어 맡고 사용자는 바로 실행 가능한 운영 UI를 봅니다.
          </p>

          <div className={s.visualFrame}>
            <VisualAsset
              alt="A2UI 플랫폼 클로징 이미지"
              fallbackSrc={fallbackImages.hero}
              src="/images/story-revision-closing.png"
            />
          </div>

          <div className={s.closingCard}>
            <h3>검증된 A2UI를 필요한 순간에 호출합니다.</h3>
            <p>품질, 안전성, 재사용성이 이 구조에서 나옵니다.</p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
