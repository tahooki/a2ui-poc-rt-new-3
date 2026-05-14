# Story Page Presentation Restructure Plan

Date: 2026-05-13

## Background

`src/devops-console/pages/story-page.tsx`는 두 번의 개편(`20260430_story-revision-plan.md`, `20260430_story-image-simplification-plan.md`)을 거쳐 현재 11섹션 구조를 가지고 있다. 그러나 발표자료로 평가할 때 다음 문제가 남아 있다.

- 발표 흐름이 "공감 4섹션 → 시스템 도큐먼트 6섹션 → 한 줄 마무리" 구조라, 데모 직후 나와야 할 핵심 반론("왜 AI가 직접 그리면 안 되나?")이 8번째에 묻혀 있다.
- 카피가 미니멀화 과정에서 구체 수치(`presentation-flow.md`의 "3분→3초", "7단계→2턴")와 Part 구체명(DeployTargetSummaryBlock 등)을 모두 잃었다.
- Overview 섹션의 카피가 "스토리는 Deploy 하나로 압축합니다"처럼 발표 편집 결정을 본문에 노출한다(메타 발화).
- 이미지 일부가 새 thesis와 모순되거나(예: `story-title.jpg`는 콘솔 폭파 + 3 도메인 카드를 보여줌), 레이어가 어긋난 자리에 배치되어 있다.

이 문서는 위 내용을 **4막 발표 흐름 + 짧은 회수**로 재구성하는 최종 계획이다. 본격적인 5막 역할 분배(제품팀/Admin/Agent/사용자 4열 표)는 제외하되, 1막의 김배포 캐릭터와 수치를 회수하는 **1분짜리 closing**은 유지한다 — 그렇지 않으면 4-4에서 페이지가 매달린 채 끝난다.

## Diagnosis Summary

| 영역 | 핵심 문제 |
|---|---|
| 흐름 | 반론 처리("Why not AI draw") 자리가 8번째 → 데모 직후로 끌어와야 함 |
| 카피 | 메타 발화 + 수치/구체 사례 누락 + 후반 6섹션 동어반복 정의 |
| 이미지 | Hero 모순(`story-title.jpg`) / 죽은 자산(`story-002.jpg`) / 레이어 미스매치(`story-001.jpg`) / 메타 중복(`story-000.jpg`) |
| 톤 | jpg(실사 일러스트)와 png(미니멀 다이어그램) 두 세트 혼재로 시각 분기 |

## New Structure: 4-Act Flow

| 막 | 분량 | 메시지 | 사용 섹션(현재) | 사용 이미지 |
|---|---|---|---|---|
| **1막. 통증** | ~3분 | 김배포 선임의 아침. 7단계, 3분, 12 서비스. 기존 콘솔의 페인을 수치와 캐릭터로 전달 | Hero + Deploy Case 통합 | (신규 Hero 이미지) |
| **2막. 마법** | ~3분 | 챗봇에서 "payments-api 배포해줘" → Launchpad → 클릭. 설명 없이 보여주고 한 문장: "방금 그 화면은 AI가 그린 게 아닙니다." | Deploy A2UI Solution | (옵션) 데모 캡처 또는 이미지 없음 |
| **3막. 반론** | ~4분 | "왜 AI가 직접 그리지 않나?" 정면 응답. 운영 UI는 매번 새로움이 아니라 매번 똑같은 안전이 미덕 | Guardrails + Component Catalog | `ai-vs-component.png` (메인), `component-catalog.png` (보조) |
| **4막. 거꾸로 해부** | ~5분 | "방금 본 화면을 누가 만들었나" — 청중 시점에서 한 겹씩 벗기기 | Runtime → Admin Binding → Creation Flow → Agent Integration | `runtime-architecture.png` → `admin-binding.png` → `creation-flow.png` → `agent-integration.png` |
| **5막. 회수** | ~1분 | "다시 월요일 아침입니다" — 1막의 김배포 수치를 다시 불러 마무리. 새 표·새 카드 없음, 한 문장 callback만 | Closing (축약) | `closing.png` |

### Old → New 섹션 매핑

| Old 섹션 (현재 코드) | New 위치 |
|---|---|
| Hero | 1막 시작 (카피/이미지 모두 변경) |
| Overview | **제거** (메타 발화) |
| Chapter Divider "Deploy Case" | **제거** |
| Deploy Case | 1막 본문 (수치 추가) |
| Deploy A2UI Solution | 2막 |
| Chapter Divider "A2UI Creation Flow" | **제거** (4막 자체 헤더로 대체) |
| Creation Flow | 4막 세 번째 |
| Component Catalog | 3막 보조 |
| Admin Binding | 4막 두 번째 |
| Guardrails ("Why not AI") | 3막 메인 (위치 이동) |
| Runtime | 4막 첫 번째 |
| Agent Integration | 4막 마지막 |
| Closing | **축약 유지** (5막 — 1막 callback 한 문장 + 이미지) |

## Section-by-Section Copy Revision

### 1막. 통증 (Hero + Deploy Case)

#### Hero 카피

| 필드 | Before | After |
|---|---|---|
| Label | `A2UI Platform Story` | `A2UI Platform Story` (유지) |
| Title | `Agent가 호출하는<br />검증된 운영 UI` | `Agent가 호출하는<br />검증된 운영 UI` (유지 — thesis로 적합) |
| Sub | "A2UI는 AI가 매번 화면을 자유롭게 그리는 방식이 아닙니다..." (현 텍스트) | `매일 12개 서비스 × 3개 환경. 이력 확인 3분, 배포 시작 7단계. 김배포 선임의 아침부터 보겠습니다.` |
| Badge Row | Component catalog / Admin binding / Agent runtime | **제거** (thesis 시각화는 본문에서 단계적으로) |

#### Deploy Case 카피

> 섹션 라벨: `Case` (유지)
> 섹션 제목 변경: `배포는 왜 A2UI가 필요한가` → `김배포 선임의 7단계`

본문 변경:
- 현재 페인 카드 3장(`화면이 나뉘어 있음 / 입력값이 많음 / 이전 이력 참조가 번거로움`)을 **수치 기반 카드 3장**으로 교체.

| 카드 | After |
|---|---|
| 1 | **이력 확인 3분** — payments-api 마지막 배포가 언제였는지 확인하려면 페이지 이동, 필터, 스크롤이 필요합니다. |
| 2 | **배포 시작 7단계** — 서비스 선택 → 환경 → 이미지 로딩 → 버전 → preflight → 결과 확인 → 최종 실행. |
| 3 | **매일 2~3회 반복** — 같은 클릭의 반복이 하루의 절반을 차지합니다. |

스토리 블록(`storyBlock`) 부분의 문구:
- h3: `배포 자체보다 준비 작업에 시간을 씁니다`
- p: `서비스명, 환경, 버전, CPU, 메모리, rollout 전략. 매번 같은 값을 다시 확인하고 다시 입력합니다.`
- blockquote: 그대로 유지 가능.

데모 버튼: 유지 (`기존 Deploy Admin 시연 → /deploy/image`).

### 2막. 마법 (Deploy A2UI Solution)

> 섹션 라벨: `A2UI Solution` (유지)
> 섹션 제목 변경: `Deploy Launchpad로 한 화면에 모읍니다` → `대화 2턴으로 끝납니다`

본문 변경:
- 현재 sectionDesc 그대로 두되, **수치 비교 한 줄을 앞에 박는다**.
- `3분이 3초로, 7단계가 2턴으로 줄어듭니다.`
- 이후 "사용자가 'payments-api 배포해줘'라고 말하면..." 문장 유지.

데모 흐름 카피(grid3) 변경:
| 카드 | After |
|---|---|
| Agent | `의도 인식` — `"payments-api 배포해줘"에서 서비스명과 작업을 즉시 파악합니다.` |
| Admin/MCP | `payload 준비` — `검증된 resolver가 이미지, 추천 버전, preflight 결과를 채웁니다.` |
| Renderer | `검증된 UI 렌더링` — `매번 같은 Deploy Launchpad가 같은 자리에 나옵니다.` |

데모 버튼: `/deploy/image`를 유지한다. 1막과 같은 데모 주소를 열고, 발표자가 해당 화면에서 Assistant를 직접 열어 A2UI Launchpad 흐름을 시연한다.

**마지막에 빈 문단 한 줄로 강조:**
> 방금 그 화면은 AI가 그린 게 아닙니다.

(별도 callout 블록 권장. CSS에 `.thesisHook` 또는 기존 `closingCard` 재활용)

### 3막. 반론 (Why Not AI Draw + Component Catalog)

> 섹션 라벨: `Question` (현재 Guardrails를 라벨 변경)
> 섹션 제목 변경: `왜 AI가 A2UI를 모두 직접 그리게 하지 않을까요?` → `왜 AI가 직접 그리지 않습니까?`

본문 변경:
- 현재 sectionDesc("운영 UI는 매번 새로움보다...")는 약함. 다음으로 교체:
- `매번 새로운 UI는 매번 다른 action ID, 다른 권한 처리, 다른 fallback을 의미합니다. 운영 화면에서 이것은 안전이 무너진다는 뜻입니다.`

비교 카드(grid2) 강화:
| 카드 | After |
|---|---|
| 자유 생성 | h3: `매번 다름` — `버튼 위치, action ID, 데이터 매핑이 호출마다 달라집니다. 권한·감사·롤백 흐름이 끊깁니다.` |
| 컴포넌트 기반 | h3: `매번 같음` — `검증된 Part가 같은 action contract와 fallback을 유지합니다. 한 번 검토하면 계속 안전합니다.` |

**Component Catalog를 이 막의 보조로 흡수:**
- 현재 Component Catalog 섹션을 별도로 두지 말고, 3막 안에서 "그러면 검증된 Part가 뭐냐"의 답으로 잇는다.
- 카드 cloud(`partCloud`)의 라벨을 **구체 Part 이름**으로 교체:

```
const deployParts = [
  "DeployTargetSummaryBlock",
  "DeployArtifactBlock",
  "DeployRequestConfigBlock",
  "DeployPreflightChecklistBlock",
  "DeployRolloutProgressBlock",
  "DeploymentHistoryBlock",
];
```

설명 한 줄 추가: `각 Part는 UX 검증, 권한, action 라우팅, fallback을 내장합니다.`

이미지는 `ai-vs-component.png`를 메인, `component-catalog.png`를 그 아래 보조로 배치.

### 4막. 거꾸로 해부 (Runtime → Admin → Creation → Agent)

> 4막 시작 직전에 짧은 인트로 한 문장:
> `방금 그 화면은 누가 만들었습니까? 끝에서부터 한 겹씩 벗겨 보겠습니다.`

#### 4-1. Runtime Architecture (첫 번째)

> 섹션 제목 변경: `런타임에서는 payload와 surfaceConfig가 만납니다` → `화면 = renderer + surfaceConfig + payload`

본문 변경:
- 현재 sectionDesc 한 줄을 다음으로 교체:
- `청중이 본 Launchpad는 세 가지 입력의 결합입니다. renderer는 항상 같고, payload와 surfaceConfig만 호출마다 새로 들어옵니다.`

grid3 카드는 현 카피 유지 가능(`payload` / `surfaceConfig` / `actions` 정의 — 짧지만 이 자리에서는 적합).

#### 4-2. Admin Binding (두 번째)

> 섹션 제목 변경: `Admin은 데이터 연결을 관리합니다` → `payload는 어디서 옵니까`

본문 변경:
- sectionDesc 교체: `Admin은 UI를 그리는 곳이 아니라, 어떤 데이터를 어떤 Part 필드에 연결할지 정하는 곳입니다.`
- grid3 카드 카피 강화:

| 카드 | After |
|---|---|
| 데이터 수집 | h4: `Resolver 등록` — `API/LLM/Auth/Transform resolver를 등록해 payload 소스를 정의합니다.` |
| 위치 지정 | h4: `Binding path` — `payload의 어느 필드가 Part의 어느 자리에 들어갈지 매핑합니다.` |
| 검증 후 배포 | h4: `Preview & Publish` — `미리보기로 검증한 뒤에만 publish하여 런타임에 노출됩니다.` |

#### 4-3. Creation Flow (세 번째)

> 섹션 제목 변경: `A2UI는 이렇게 만들어집니다` → `Part는 어디서 옵니까`

본문 변경:
- sectionDesc 교체: `Part는 제품팀이 만들고 publish합니다. Admin이 raw UI atoms를 조합하는 게 아니라, 검증된 Part 중에서 고릅니다.`
- sequenceGrid 4단계 카피 강화:

| 단계 | After |
|---|---|
| 1 | strong: `컴포넌트/파트를 만든다` — `제품팀이 UX, action contract, fallback을 검증해 publish합니다.` |
| 2 | strong: `서비스 Surface를 구성한다` — `Deploy 업무에 맞는 Part 묶음을 선택합니다.` |
| 3 | strong: `Admin에서 바인딩한다` — `payload 소스와 binding path를 등록합니다.` |
| 4 | strong: `Agent에 연결한다` — `Agent 파이프라인에 호출 step 하나를 추가합니다.` |

#### 4-4. Agent Integration (마지막)

> 섹션 제목 변경: `기존 Agent에는 A2UI step만 추가합니다` → `Agent에 step 한 줄. 그게 전부입니다.`

본문 변경:
- sectionDesc 교체: `기존 planner, tool, memory는 그대로 둡니다. 응답 직전에 A2UI step 하나를 끼우고, 실패하면 텍스트 응답으로 돌아갑니다.`
- grid3 카드 카피는 현재 유지 가능(`응답 직전` / `Tool 실행 후` / `Action loop`).

바로 5막 회수 섹션으로 이어진다.

### 5막. 회수 (Closing — 짧게)

> 섹션 라벨: `Closing` (유지)
> 섹션 제목 변경: `A2UI의 역할은 표현 계층을 안전하게 넓히는 것입니다` → `다시 월요일 아침입니다`

본문 변경:
- sectionDesc 교체: `이력 확인 3분이 3초가 됐습니다. 7단계가 두 턴이 됐습니다. 콘솔이 사라진 게 아니라, 검증된 운영 UI가 대화 안에서 호출되고 있습니다.`

이미지: `story-revision-closing.png` (제품팀 + Admin + Agent → 운영 UI). 1막 통증에서 출발한 캐릭터를 회수하는 자리에 세 입력이 한 화면으로 모이는 그림이 들어간다.

마지막 closingCard 카피 변경:
- h3: `Agent는 더 풍부한 응답을, 운영자는 같은 안전한 화면을.`
- p: `제품팀이 Part를 publish하고, Admin이 데이터를 연결하고, Agent가 그 Surface를 호출합니다.`

**원칙: 새 표 만들지 않는다. 새 카드 만들지 않는다. 한 단락 + 이미지 + 한 줄 callout으로 끝낸다.** 5막이 길어지면 4-4의 "Agent에 step 한 줄. 그게 전부입니다." 펀치라인이 묽어진다.

## Image Plan

### Keep (그대로 사용)

| 파일 | 사용 위치 |
|---|---|
| `story-revision-ai-vs-component.png` | 3막 메인 |
| `story-revision-component-catalog.png` | 3막 보조 |
| `story-revision-runtime-architecture.png` | 4-1 |
| `story-revision-admin-binding.png` | 4-2 |
| `story-revision-creation-flow.png` | 4-3 |
| `story-revision-agent-integration.png` | 4-4 |
| `story-revision-closing.png` | 5막 (1막 callback 자리에서 제품팀·Admin·Agent 세 입력 → 운영 UI 회수) |

### Remove from page (파일은 `/public/images/`에 남겨둠)

| 파일 | 제거 이유 |
|---|---|
| `story-000.jpg` | Overview 섹션 제거에 따라 unused. 그림 자체가 발표 목차라 새 흐름과 안 맞음. |
| `story-001.jpg` | 3패널이 "A2UI 적합 상황" 일반론. Deploy 페인 자리에 박힌 게 레이어 미스매치. 새 1막에는 텍스트 + 수치 카드만 둠. |
| `story-002.jpg` | 6패널 정보 과부하. 현재도 `reason` fallback으로만 잡혀 있고 메인에 안 쓰임. |

### Replace (신규 생성 필요)

| 파일 | 위치 | 이유 |
|---|---|---|
| **`story-hero-revised.png`** (신규) | 1막 Hero | 현 `story-title.jpg`가 "콘솔 폭파 + Deploy/Approval/Rollback 3카드"로 새 thesis와 모순. 톤도 jpg 일러스트라 png 세트와 분기. |

### Image Generation Prompt: 신규 Hero

파일명: `/public/images/story-hero-revised.png`

목표: "기존을 깨부순다"가 아니라 "기존 흐름 안에서 검증된 운영 UI를 호출한다"를 보여준다. `story-revision-*.png` 7장과 같은 톤(미니멀 다이어그램, 짧은 한글 라벨, dark navy + cyan/green/violet 액센트)을 유지해 시각 분기를 없앤다.

프롬프트:

> Wide 16:9 ultra-minimal dark enterprise illustration. Composition has only three large objects on a mostly empty dark navy background. On the left: a simple chat panel with one blue user message bubble (no readable text inside). In the middle: a single thick calm glowing line flowing from left to right. On the right: a clean A2UI surface card containing three stacked abstract operational UI parts — a summary block, an artifact block, and a primary action button bar. Add clear Korean labels directly inside the image: "대화" below the chat panel, "검증된 운영 UI" below the surface card. Cyan blue and green accents only, no violet chaos. Do not include broken glass, shattering screens, exploding consoles, portals, Approval cards, or Rollback cards. The illustration must look like a minimal technical diagram with two large clean objects connected by one line, matching the style of a system architecture diagram, not a hero illustration. The Korean labels must be large, short, and readable.

폴백: 신규 이미지 생성 전까지는 `fallbackImages.hero`를 `story-revision-creation-flow.png`로 임시 매핑(콘솔 폭파 그림이 잠깐이라도 노출되지 않도록).

## Code Changes Required (`story-page.tsx`)

### 1. 상단 상수 변경

```tsx
const fallbackImages = {
  hero: "/images/story-hero-revised.png", // ← 신규 이미지로 교체
};

const deployParts = [
  "DeployTargetSummaryBlock",
  "DeployArtifactBlock",
  "DeployRequestConfigBlock",
  "DeployPreflightChecklistBlock",
  "DeployRolloutProgressBlock",
  "DeploymentHistoryBlock",
];
```

`overview`, `reason`, `cards` fallback 키는 더 이상 사용처가 없으므로 제거.

### 2. 섹션 삭제

- Overview 섹션 전체 (`<section>` 블록)
- 두 개의 `chapterDivider` 블록
- 별도 Component Catalog 섹션 (3막 안으로 흡수)
- Closing 섹션은 **삭제하지 않고 축약**한다 (sectionDesc 한 줄 + 이미지 + closingCard 한 개로 줄임)

### 3. 섹션 순서 재배치

최종 순서:
1. Hero (1막 시작)
2. Deploy Case (1막 본문)
3. Deploy A2UI Solution (2막) — 끝에 thesis hook 한 줄 추가
4. Guardrails + Component Catalog 통합 (3막)
5. Runtime (4-1)
6. Admin Binding (4-2)
7. Creation Flow (4-3)
8. Agent Integration (4-4)
9. Closing — 축약 (5막)

### 4. 카피 교체

위 "Section-by-Section Copy Revision"의 After 값 그대로 적용.

### 5. 데모 버튼 URL 정리

- 1막 Deploy Case 버튼: `/deploy/image` 유지
- 2막 Deploy A2UI Solution 버튼: `/deploy/image` 유지
- 발표자가 같은 데모 주소에서 Assistant를 직접 열어 `"payments-api 배포해줘"` 흐름을 시연한다.

### 6. CSS 추가 (선택)

2막 끝의 thesis hook을 위한 강조 블록 스타일 한 개:

```css
.thesisHook {
  margin-top: 32px;
  padding: 20px 24px;
  border-left: 3px solid rgba(167,139,250,.7);
  background: rgba(167,139,250,.06);
  border-radius: 0 12px 12px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--console-text);
}
```

기존 `closingCard` 스타일을 재활용해도 무방.

## Implementation Checklist

1. [x] 본 문서 검토 및 승인
2. [x] 신규 Hero 이미지(`story-hero-revised.png`) 생성, `/public/images/`에 저장
3. [x] `story-page.tsx` 섹션 삭제 (Overview, chapterDivider 2개, Closing, 별도 Component Catalog)
4. [x] `story-page.tsx` 섹션 순서 재배치 및 카피 교체
5. [x] `deployParts` 배열을 구체 Part 이름으로 교체
6. [x] 2막 데모 버튼 URL은 `/deploy/image`로 유지
7. [x] 2막 끝 thesis hook 블록 추가 + CSS
8. [x] `story-page.module.css`에서 unused 클래스 정리(`overviewStrip`, `chapterDivider`, `chapterTitle` 등)
9. [x] `fallbackImages`에서 unused 키 제거
10. [x] `http://localhost:3004/story`에서 렌더링 확인
11. [ ] **Closing 섹션을 5막 축약본으로 복원** — `story-revision-closing.png` 재연결, 제목 `다시 월요일 아침입니다`, sectionDesc + closingCard 카피를 위 5막 항목대로 적용
12. [ ] 4-4 섹션 제목(`Agent에 step 한 줄. 그게 전부입니다.`)과 5막 closingCard 카피가 같은 문장을 반복하지 않는지 최종 점검

## Open Questions

- 2막 A2UI Deploy 시연 버튼 URL: `/deploy/image` 유지. 발표자가 같은 데모 주소에서 Assistant를 직접 열어 시연한다.
- 신규 Hero 이미지 생성 도구: Codex imagegen built-in tool 사용. 산출물은 `/public/images/story-hero-revised.png`.
- Closing 섹션: **축약 유지로 변경**. 4-4 이후 페이지가 매달리는 느낌을 막기 위해 1분짜리 회수 섹션(`다시 월요일 아침입니다`)을 둔다. 4-4의 펀치라인은 그대로 유지하되, 5막 closingCard는 다른 문장(`Agent는 더 풍부한 응답을, 운영자는 같은 안전한 화면을.`)을 쓴다.
