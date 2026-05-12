# Story Image Simplification Plan

Date: 2026-04-30

## Problem

새로 추가한 Story 섹션 이미지들이 정보량이 많아 한눈에 메시지가 들어오지 않는다. 발표용 이미지는 "정교한 화면"보다 "즉시 이해되는 구조"가 우선이다.

## Direction

- 새로 추가한 7개 이미지만 다시 만든다.
- 이미지 안의 시각 요소를 현재 대비 최소 50% 줄인다.
- UI 패널, 라인, 노드 개수를 강하게 제한한다.
- 각 이미지는 하나의 메시지만 보여준다.
- 짧은 한글 라벨은 이미지 안에 직접 들어가게 프롬프트에 명시한다.
- 한글 라벨은 이미지마다 2~4개만 사용하고, 단어 수준으로 짧게 쓴다.
- 기존 Hero, Overview, Deploy case, Deploy A2UI solution 이미지는 유지한다.

## Text Strategy

이미지 자체만 보아도 의미가 잡히도록, 생성 프롬프트에 짧은 한글 라벨을 직접 포함한다. 라벨은 길게 쓰지 않고, 큰 글씨로 적어 이미지의 핵심 덩어리를 설명하게 한다.

## Visual Density Rules

- 한 이미지에는 큰 시각 덩어리 2~4개만 둔다.
- 작은 카드, 테이블, 줄글, 복잡한 대시보드 UI는 금지한다.
- 선은 굵고 적게 쓴다.
- 배경은 많이 비워둔다.
- 라벨은 이미지 이해를 돕는 짧은 단어만 쓴다.

## Regenerated Images

### 1. A2UI Creation Flow

파일: `/public/images/story-revision-creation-flow.png`

목표: 전체 제작 흐름을 4단계로만 보여준다.

라벨:

- 부품
- Surface
- 바인딩
- Agent

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal dark enterprise architecture illustration. Show exactly four large simple blocks connected left to right with one thick arrow between each. Add clear Korean labels directly inside the image: "부품", "Surface", "바인딩", "Agent". No small UI controls, no dense dashboard, no tables, no tiny cards. Mostly empty dark navy background. The Korean labels must be large, short, and readable.

### 2. Component Catalog And Raw UI Contrast

파일: `/public/images/story-revision-component-catalog.png`

목표: raw UI 조합이 아니라 검증된 컴포넌트 단위라는 메시지를 이미지로 보여준다.

구도:

- 왼쪽: 작은 raw UI 조각들이 흩어져 있고 AI가 무엇을 조합해야 할지 모르는 느낌
- 오른쪽: 큰 A2UI 컴포넌트 3개가 정돈되어 조합되는 느낌

라벨:

- raw UI?
- 검증된 Part
- 조합 완료

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal split scene. Left side has only a small confused AI symbol facing five scattered tiny raw UI atoms. Right side has three large clean component blocks snapping into one bigger surface. Add clear Korean labels directly inside the image: "raw UI?", "뭘 만들지?", "검증된 Part", "조합 완료". Very sparse, strong contrast, no dense UI, no tables. The Korean labels must be large, short, and readable.

### 3. Admin Binding Flow

파일: `/public/images/story-revision-admin-binding.png`

목표: Admin은 UI를 그리는 곳이 아니라 데이터 연결을 관리하는 곳이라는 점만 보여준다.

라벨:

- 데이터
- 연결
- 미리보기

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal admin binding illustration. Only three large zones: data icon group, connector hub with three lines, preview card. Add clear Korean labels directly inside the image: "데이터", "연결", "미리보기". No dashboard chrome, no tables, no small field lists. Mostly empty dark background. The Korean labels must be large, short, and readable.

### 4. Why Not Let AI Draw Everything

파일: `/public/images/story-revision-ai-vs-component.png`

목표: 자유 생성 UI와 컴포넌트 기반 UI의 차이를 단순 비교한다.

라벨:

- 매번 다름
- 규칙 있음

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal split comparison. Left side has two uneven unstable UI cards and one warning icon. Right side has two aligned component cards inside a simple guardrail frame. Add clear Korean labels directly inside the image: "매번 다름", "규칙 있음". Very sparse, no clutter, no extra panels. The Korean labels must be large, short, and readable.

### 5. Runtime Architecture

파일: `/public/images/story-revision-runtime-architecture.png`

목표: payload와 surfaceConfig가 renderer에서 합쳐지는 런타임 구조만 보여준다.

구도:

- 왼쪽 위: payload
- 왼쪽 아래: surfaceConfig
- 가운데: renderer
- 오른쪽: rendered A2UI

라벨:

- payload
- surfaceConfig
- renderer
- A2UI

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal technical diagram. Only four objects: top-left data cube, bottom-left config card, center renderer prism, right rendered A2UI card. Two thick arrows merge into the center, one arrow exits right. Add clear labels directly inside the image: "payload", "surfaceConfig", "renderer", "A2UI". No extra systems, no small UI details. The labels must be large, short, and readable.

### 6. Agent Integration

파일: `/public/images/story-revision-agent-integration.png`

목표: 기존 Agent pipeline에 A2UI step 하나가 끼어드는 장면으로, Runtime Architecture와 다르게 보이게 한다.

구도:

- 하나의 수평 파이프라인
- planner, tools, memory는 작은 기존 노드
- 끝부분에 새 A2UI step이 강조됨
- 실패 시 text fallback으로 갈라지는 작은 보조 경로

라벨:

- 기존 Agent
- A2UI step
- fallback

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal agent pipeline illustration. One simple horizontal pipe with three muted existing agent nodes, one bright inserted A2UI node near the end, one small lower fallback branch. Add clear Korean labels directly inside the image: "기존 Agent", "A2UI step", "fallback". No merge diagram, no data streams, no dense UI. The labels must be large, short, and readable.

### 7. Closing

파일: `/public/images/story-revision-closing.png`

목표: 제품팀, Admin, Agent가 하나의 안전한 운영 UI를 만드는 최종 그림을 단순하게 보여준다.

라벨:

- 제품팀
- Admin
- Agent
- 운영 UI

이미지 프롬프트 방향:

> Wide 16:9 ultra-minimal closing illustration. Three simple source pillars converge into one large operational UI surface. Add clear Korean labels directly inside the image: "제품팀", "Admin", "Agent", "운영 UI". Spacious composition, mostly empty dark background, no dense details, no small controls. The Korean labels must be large, short, and readable.

## Implementation Steps

1. 이 계획 문서를 작성한다.
2. 위 7개 이미지를 순서대로 다시 생성한다.
3. 생성한 이미지를 `/public/images/story-revision-*.png`에 덮어쓴다.
4. 생성 결과에서 한글 라벨이 실제 이미지 안에 잘 들어갔는지 확인한다.
5. `story-page.tsx`에서 HTML overlay 라벨 코드를 제거하고 이미지 파일만 사용한다.
6. `npm run lint`와 `npm run build`를 실행한다.
7. `http://localhost:3004/story`에서 이미지 정보량과 라벨 가독성을 확인한다.
