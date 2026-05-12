# Story Page Revision Plan

Date: 2026-04-30

## Background

현재 `Story` 페이지는 "AI가 맥락을 이해해서 필요한 화면을 직접 구성한다"는 메시지가 강하다. 하지만 최신 방향은 조금 다르다.

A2UI는 AI가 매번 UI를 자유롭게 그리는 방식이 아니라, 제품팀이 제공하는 검증된 A2UI 컴포넌트/파트를 기반으로 서비스별 A2UI를 만들고, Admin에서 데이터 바인딩을 설정한 뒤, Agent가 필요한 코드를 추가해 실행 흐름에 연결하는 방식이다.

따라서 스토리도 "AI가 화면을 직접 만든다"에서 "AI가 검증된 A2UI 시스템을 호출하고, 데이터가 바인딩된 UI를 사용자에게 제공한다"로 바꾼다.

## Goals

- Case 섹션은 Deploy 하나만 남긴다.
- Approval, Rollback 사례 설명은 제거하거나 한 줄 언급 수준으로 줄인다.
- 긴 코드 예시, 마크다운식 설명 블록, 텍스트 중심 비교표는 줄인다.
- 흐름, 비교, 구조 설명은 생성 이미지 중심으로 보여준다.
- A2UI 제작 흐름을 명확히 보여준다.
- "왜 AI가 A2UI를 모두 직접 그리게 하지 않는가?" 섹션을 추가한다.

## Visual Asset Scope

이번 수정에서 이미지를 새로 생성하는 대상은 기존 섹션 전체가 아니라, 새로 추가되는 설명 섹션뿐이다.

- 기존 Hero, Overview, Deploy case, Deploy A2UI solution 영역은 현재 프로젝트에 있는 기존 이미지를 유지한다.
- 새로 추가하는 흐름/비교/구조 설명 섹션만 생성 이미지를 사용한다.
- 생성 대상은 총 7개다: A2UI Creation Flow, Component Catalog, Admin Binding Flow, Why Not Let AI Draw Everything, Runtime Architecture, Agent Integration, Closing.
- 이미지는 설명 문구를 이미지 안에 넣지 않고, 아이콘/패널/라인/placeholder 중심으로 만든다.

## Core Message

수정 후 핵심 메시지는 다음과 같다.

> A2UI는 AI가 임의로 UI를 생성하는 제품이 아니다.
> 서비스 운영에 필요한 검증된 A2UI 컴포넌트를 만들고, Admin에서 데이터 바인딩을 설정하고, Agent가 그 Surface를 호출해서 실제 업무 흐름 안에서 작동하게 만드는 구조다.

## Scope Changes

### Keep

- Hero
- Overview
- Deploy case
- A2UI 작동 흐름
- A2UI 개발 구성
- Agent 통합 흐름

### Remove Or Compress

- Approval 상세 사례 섹션 제거
- Rollback 상세 사례 섹션 제거
- Before/After 코드 비교 제거
- 긴 순서형 설명 문단 축소
- 텍스트 표 중심 비교 축소

### Add

- A2UI 제작 흐름 섹션
- AI 자유 생성 UI와 A2UI 컴포넌트 기반 UI 비교 섹션
- 이미지 생성 프롬프트 기반 시각 자료 계획

## Proposed Page Structure

### 1. Hero

목적: A2UI를 "AI가 그리는 UI"가 아니라 "Agent가 호출하는 검증된 운영 UI 시스템"으로 소개한다.

권장 문구 방향:

- 기존: "AI가 맥락을 이해하고 필요한 화면을 직접 구성"
- 변경: "검증된 A2UI 컴포넌트와 Admin 바인딩을 통해 Agent가 운영 UI를 실행 흐름 안에 연결"

이미지 삽입:

- 기존 이미지 유지: `/images/story-title.jpg`
- 이번 수정 범위에서는 새로 생성하지 않는다.

### 2. Overview: New A2UI Story Flow

목적: 발표 흐름 자체를 짧게 보여준다. 사례는 Deploy 하나만 두고, 그 뒤에 제작 구조와 이유를 설명한다.

구성:

- Deploy 문제
- Deploy A2UI 해결
- A2UI 제작 흐름
- 왜 컴포넌트를 제공해야 하는가
- Agent 통합

이미지 삽입:

- 기존 이미지 유지: `/images/story-000.jpg`
- 이번 수정 범위에서는 새로 생성하지 않는다.

### 3. Case: Deploy Only

목적: 기존 3개 사례 중 Deploy만 남긴다. 설명은 짧고, "왜 A2UI가 필요한지"를 보여주는 대표 사례로 사용한다.

남길 내용:

- Docker image 등록
- Request 생성
- Deploy 실행
- 입력 필드가 많고 탭 이동이 많은 문제
- 이전 배포 설정과 이력을 참고해야 하는 문제

줄일 내용:

- 김배포 선임 캐릭터 설명은 짧게 유지
- Pain card는 2~3개만 유지
- 기존 admin 시연 버튼은 유지 가능
- Approval/Rollback은 삭제

이미지 삽입:

- 기존 이미지 유지: `/images/story-001.jpg`
- 이번 수정 범위에서는 새로 생성하지 않는다.

### 4. Deploy A2UI Solution

목적: Deploy 문제를 A2UI가 어떻게 한 화면으로 줄이는지 보여준다.

핵심 메시지:

- 사용자가 "payments-api 배포해줘"라고 말한다.
- Agent가 배포 의도와 서비스명을 파악한다.
- Admin/MCP runtime이 필요한 payload와 surfaceConfig를 돌려준다.
- Shared renderer가 Deploy A2UI parts를 렌더링한다.
- 사용자는 Launchpad에서 확인하고 실행한다.

이미지 삽입:

- 기존 이미지 유지: `/images/story-title.jpg`
- 이번 수정 범위에서는 새로 생성하지 않는다.

### 5. A2UI Creation Flow

목적: 사용자가 말한 새 흐름을 스토리의 중심 구조로 둔다.

내용:

1. A2UI로 쓸 수 있는 컴포넌트/파트를 만든다.
2. 서비스에 필요한 A2UI Surface를 구성한다.
3. Admin에서 데이터 바인딩과 resolver를 설정한다.
4. Agent에는 필요한 호출 코드를 추가한다.
5. 런타임에서 payload와 surfaceConfig가 합쳐져 작동한다.

강조할 표현:

- 컴포넌트는 제품팀이 관리한다.
- Admin은 raw UI를 만드는 곳이 아니라 데이터 연결과 구성을 관리한다.
- Agent는 UI를 직접 그리지 않고, A2UI Surface를 호출한다.

이미지 삽입:

- 파일 후보: `/images/story-revision-creation-flow.png`
- 이미지 프롬프트:
  - "Wide 16:9 clean enterprise architecture illustration showing a left-to-right assembly flow: reusable A2UI component catalog, service-specific surface composition, admin binding console, agent integration node, final rendered chat surface. Use abstract product UI panels connected by glowing lines. Dark navy background, cyan blue, violet, and green accents, premium SaaS visual design, no readable text, no code."

### 6. Component Catalog And Service Surface

목적: A2UI 컴포넌트가 raw button/table/card가 아니라 운영 도메인에 맞춘 Part라는 점을 보여준다.

예시로 보여줄 Deploy parts:

- DeployTargetSummaryBlock
- DeployArtifactBlock
- DeployRequestConfigBlock
- DeployPreflightChecklistBlock
- DeployRolloutProgressBlock
- DeploymentHistoryBlock

설명 방향:

- Admin이 raw UI atoms를 조합하는 것이 아니다.
- Admin은 검증된 Part를 선택하고, 어떤 payload에 연결할지만 설정한다.
- Part는 제품 UX 품질, 접근성, 액션 처리 규칙을 포함한다.

이미지 삽입:

- 파일 후보: `/images/story-revision-component-catalog.png`
- 이미지 프롬프트:
  - "Wide 16:9 product design system catalog view for A2UI. Show a grid of reusable operational UI part cards: summary block, artifact block, request config block, checklist block, rollout progress block, history block. The parts look like polished dark mode enterprise dashboard components. No readable text, no code, consistent design system, subtle blue and green accents."

### 7. Admin Binding Flow

목적: Admin의 역할을 명확하게 보여준다. Admin은 UI를 새로 그리는 곳이 아니라, 컴포넌트와 데이터의 연결을 설정하는 Control Plane이다.

내용:

- template/surface 선택
- payload 필드 확인
- API resolver, LLM resolver, Auth resolver, Transform resolver 설정
- binding path 지정
- preview 후 publish

이미지 삽입:

- 파일 후보: `/images/story-revision-admin-binding.png`
- 이미지 프롬프트:
  - "Wide 16:9 dark enterprise admin console illustration. Show an admin user configuring data bindings: data source panels on the left, binding lines in the middle, A2UI surface preview on the right. Include visual hints of API, LLM, auth, and transform sources as icons, but no readable text. Sophisticated SaaS admin UI, precise layout, blue violet accents."

### 8. Why Not Let AI Draw Everything?

목적: 새로 추가할 핵심 설득 섹션. AI가 모든 A2UI를 직접 그리지 않고 컴포넌트를 제공해야 하는 이유를 설명한다.

핵심 논리:

- 운영 UI는 일관성과 안전성이 중요하다.
- 배포/승인/롤백 버튼은 실제 액션이므로 권한과 감사 로그가 필요하다.
- AI가 매번 자유롭게 UI를 만들면 레이아웃, 액션 ID, 데이터 매핑, 접근성이 흔들릴 수 있다.
- 제품팀이 만든 A2UI Part는 UX 품질, 검증, fallback, action routing을 포함한다.
- AI는 UI 생성자가 아니라 "어떤 Surface가 필요한지 판단하고 데이터를 채우는 조력자"가 되는 편이 안전하다.

이미지 삽입:

- 파일 후보: `/images/story-revision-ai-vs-component.png`
- 이미지 프롬프트:
  - "Wide 16:9 split-screen comparison illustration. Left side shows unstable AI-generated UI variations as scattered inconsistent dark UI cards with mismatched buttons and layouts. Right side shows a controlled A2UI component system with consistent cards, guardrails, contract lines, and admin-approved bindings. Enterprise SaaS style, dark background, left side slightly chaotic, right side orderly and trustworthy, no readable text."

### 9. Runtime Architecture

목적: 실제 작동 흐름을 코드 없이 이미지 중심으로 보여준다.

수정 방향:

- 기존 sequence diagram과 긴 설명은 축소한다.
- LLM, Decision Engine, Tool, Admin/MCP, SurfaceRenderer의 역할을 이미지로 보여준다.
- `surfaceConfig + payload + actions`가 renderer로 전달되어 화면이 만들어진다는 개념을 보여준다.

이미지 삽입:

- 파일 후보: `/images/story-revision-runtime-architecture.png`
- 이미지 프롬프트:
  - "Wide 16:9 technical product architecture diagram without readable text. Show user chat input flowing into an agent runtime, then intent decision, tool data collection, admin/MCP runtime, validated payload and surface config, shared renderer, and final A2UI card. Use clean node-and-edge visual language, dark enterprise console palette, cyan blue and green highlights, no code, no dense labels."

### 10. Agent Integration

목적: 기존 Agent에 A2UI를 어떻게 붙이는지 설명한다. 코드 비교는 제거하고, 삽입 위치를 그림으로 보여준다.

핵심 메시지:

- 기존 planner/tool/memory는 유지한다.
- 응답 직전 또는 tool 실행 후 A2UI step을 추가한다.
- UI 액션은 다시 Agent 흐름으로 들어온다.
- 실패하면 텍스트 응답으로 fallback한다.

이미지 삽입:

- 파일 후보: `/images/story-revision-agent-integration.png`
- 이미지 프롬프트:
  - "Wide 16:9 visual flow for adding A2UI to an existing agent. Show an existing agent pipeline with planner, tools, memory, narrator, then a new A2UI step inserted near the end, leading to either rendered UI surface or text fallback. Use abstract blocks and arrows, dark premium SaaS technical style, no readable text, no code snippets."

### 11. Closing

목적: A2UI의 최종 가치를 짧게 정리한다.

권장 메시지:

- Agent는 더 풍부한 응답을 제공한다.
- Admin은 데이터 연결과 운영 정책을 관리한다.
- 제품팀은 검증된 UI 품질을 유지한다.
- 사용자는 대화 중 바로 실행 가능한 운영 화면을 얻는다.

이미지 삽입:

- 파일 후보: `/images/story-revision-closing.png`
- 이미지 프롬프트:
  - "Wide 16:9 polished closing illustration for an enterprise A2UI platform. Show four coordinated roles around a final rendered operational UI: product components, admin binding, agent runtime, and user workflow. Calm confident dark SaaS aesthetic, blue green violet accents, elegant lighting, no readable text, leave center space for a short closing headline overlay."

## Recommended Story Copy Changes

### Replace Main Framing

Before:

- AI가 필요한 화면을 직접 구성한다.

After:

- AI가 검증된 A2UI Surface를 선택하고, Admin에서 설정된 바인딩을 통해 데이터를 채운 뒤, Agent 흐름 안에서 실행 가능한 UI로 보여준다.

### Replace Template Framing

Before:

- templateId에 맞는 템플릿을 선택하고 payload를 채운다.

After:

- A2UI part catalog에서 제공되는 검증된 Part로 Surface를 구성하고, Admin이 binding path와 resolver를 관리한다.

### Replace Agent Framing

Before:

- 기존 agent에 `renderOrFallback()` 같은 코드를 추가한다.

After:

- 기존 Agent 흐름 안에 A2UI step을 추가한다. 이 step은 Admin/MCP runtime에서 검증된 Surface를 받아 렌더링하고, 실패 시 기존 텍스트 응답으로 돌아간다.

## Implementation Notes For The Later Edit

- `src/devops-console/pages/story-page.tsx`에서 Approval/Rollback case section을 삭제한다.
- Deploy case는 현재 구조를 재사용하되 텍스트를 절반 이하로 줄인다.
- Mermaid flow는 대부분 생성 이미지로 교체한다.
- 코드 비교 영역은 삭제한다.
- 새로 추가되는 섹션의 이미지 파일만 `/public/images/`에 추가한다.
- 기존 Hero, Overview, Deploy 관련 이미지는 현재 파일을 유지한다.
- 이미지에는 가급적 텍스트를 넣지 않는다. 제목, 짧은 설명, 단계 라벨은 React/HTML 텍스트로 오버레이하거나 이미지 아래 캡션으로 처리한다.
- 생성 이미지는 16:9 기준으로 만들고, 현재 dark console theme과 맞춘다.

## Open Questions

- Deploy 시연 버튼은 기존 `/deploy/image`를 유지할지, A2UI 중심 시연 경로를 별도로 둘지 결정이 필요하다.
- Overview 이미지는 하나의 큰 roadmap 이미지로 갈지, 섹션별 작은 이미지를 여러 개 배치할지 결정이 필요하다.
- 최종 발표용이면 이미지에 한글 텍스트를 넣기보다, 이미지 위에 HTML 텍스트를 얹는 방식이 안정적이다.
