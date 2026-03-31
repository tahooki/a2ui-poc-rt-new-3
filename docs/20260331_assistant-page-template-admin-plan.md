# Assistant 페이지 → A2UI 템플릿 관리 페이지 변경 계획서

## 1. 배경

현재 `/assistant` 페이지는 Chatbot 대화 화면만 표시하고 있습니다.
실제로 이 페이지는 A2UI의 핵심 관리 기능을 제공해야 합니다:

- Chat API에서 A2UI를 선택하는 판단 규칙 확인 및 시뮬레이션
- 렌더링에 필요한 데이터 형식(Input Contract) 확인
- 템플릿 목록 관리 및 미리보기
- 선택 정책(Selection Policy) 확인

이미 `src/devops-console/template-admin/` 디렉토리에 7개 컴포넌트가 구현되어 있으나, 라우팅에 연결되지 않은 상태입니다.

---

## 2. 현재 상태 분석

### 2.1 Assistant 페이지 (`src/devops-console/assistant-page.tsx`)
- `AppFrame` 래퍼 안에 `ChatAssistantPanel` 렌더링
- deploy/approve/rollback 탭으로 워크플로 전환
- Chat 전용 화면, 관리 기능 없음

### 2.2 이미 구현된 Template Admin 컴포넌트 (`src/devops-console/template-admin/`)

| 파일 | 역할 | 탭 |
|------|------|-----|
| `template-manager-page.tsx` | 메인 페이지 (좌측 목록 + 우측 탭 뷰) | - |
| `template-list-panel.tsx` | 템플릿 목록 (7개 템플릿) | 좌측 패널 |
| `template-contract-viewer.tsx` | 입력 데이터 형식 확인 (필드, 타입, 필수 여부) | Contract |
| `example-payload-editor.tsx` | 테스트 페이로드 JSON 편집기 | Preview (좌) |
| `template-live-preview.tsx` | 페이로드로 템플릿 라이브 미리보기 | Preview (우) |
| `selection-policy-viewer.tsx` | 선택 정책 규칙 확인 (intent, 필수 facts, 제외 조건) | Policy |
| `decision-simulator.tsx` | 판단 규칙 시뮬레이터 (intent + facts → 결과) | Simulator |

### 2.3 사이드바 네비게이션 (`src/devops-console/shell/sidebar-nav.tsx`)
- "Assistant" 라벨로 `/assistant` 경로 연결
- 라벨과 실제 페이지 내용이 불일치

---

## 3. 변경 계획

### 3.1 `assistant-page.tsx` 수정
Chat 관련 코드를 모두 제거하고, `TemplateManagerPage`를 렌더링합니다.

**변경 전:**
```tsx
// Chat 관련 import, state, 렌더링
<ChatAssistantPanel ... />
```

**변경 후:**
```tsx
import { TemplateManagerPage } from "@/devops-console/template-admin/template-manager-page";

export function AssistantPage() {
  return (
    <AppFrame
      activePage="assistant"
      pageTitle="Template Admin"
      pageScope="a2ui template manager"
      ...
    >
      <TemplateManagerPage />
    </AppFrame>
  );
}
```

**상세 작업:**
- `ChatAssistantPanel`, `buildConsoleViewModel`, `findSelectedItem` 등 Chat 관련 import 제거
- `activeTab` (deploy/approve/rollback) state 제거
- `noticeStrip`, `workflowNav`, `chatAssistantStandalone` 제거
- `TemplateManagerPage` import 및 렌더링
- `pageTitle`을 "Template Admin"으로 변경
- `pageScope`를 "a2ui template manager"로 변경

### 3.2 `sidebar-nav.tsx` 수정
네비게이션 라벨을 변경합니다.

**변경 전:**
```tsx
{ href: "/assistant", key: "assistant", label: "Assistant", icon: "assistant" }
```

**변경 후:**
```tsx
{ href: "/assistant", key: "assistant", label: "Template Admin", icon: "assistant" }
```

### 3.3 `template-manager-page.tsx` 확인
- 현재 독립적으로 동작하도록 설계되어 있음 (`AppFrame` 미포함)
- `assistant-page.tsx`의 `AppFrame` 안에 그대로 삽입 가능
- **추가 수정 불필요** (이미 embedded 가능한 구조)

---

## 4. 수정 파일 목록

| 파일 | 작업 |
|------|------|
| `src/devops-console/assistant-page.tsx` | Chat 코드 제거, TemplateManagerPage 렌더링 |
| `src/devops-console/shell/sidebar-nav.tsx` | "Assistant" → "Template Admin" 라벨 변경 |

---

## 5. TODO

- [ ] `assistant-page.tsx`에서 Chat 관련 import 제거 (`ChatAssistantPanel`, `buildConsoleViewModel`, `findSelectedItem` 등)
- [ ] `assistant-page.tsx`에서 Chat 관련 state 제거 (`activeTab`, `selectedItem` 등)
- [ ] `assistant-page.tsx`에서 Chat UI 제거 (`noticeStrip`, `workflowNav`, `chatAssistantStandalone`)
- [ ] `assistant-page.tsx`에 `TemplateManagerPage` import 추가
- [ ] `assistant-page.tsx`의 `AppFrame` 안에 `<TemplateManagerPage />` 렌더링
- [ ] `assistant-page.tsx`의 `pageTitle`을 "Template Admin"으로 변경
- [ ] `sidebar-nav.tsx`에서 "Assistant" 라벨을 "Template Admin"으로 변경
- [ ] 브라우저에서 `/assistant` 접속하여 확인:
  - [ ] 좌측 템플릿 목록 표시
  - [ ] 템플릿 선택 시 Contract 탭에서 입력 데이터 형식 확인
  - [ ] Preview 탭에서 페이로드 편집 + 라이브 미리보기
  - [ ] Policy 탭에서 선택 정책 규칙 확인
  - [ ] Simulator 탭에서 intent + facts 입력 → 판단 결과 시뮬레이션

---

## 6. 검증 시나리오

1. `/assistant` 접속 → 템플릿 관리 화면 정상 표시
2. 좌측 패널에서 `quick_deploy_launchpad` 선택 → 우측에 제목, 설명 표시
3. **Contract 탭** → 필드명, 타입, 필수 여부, 예시 값 테이블 확인
4. **Preview 탭** → 좌측 JSON 편집기에서 값 변경 → 우측 미리보기에 실시간 반영
5. **Policy 탭** → intentKeys, requiredFacts, optionalFacts, disqualifiers, minScore 확인
6. **Simulator 탭** → intent를 `deploy.start`로 선택, facts JSON 입력 → 판단 결과(mode, reason, matched/missing) 확인
7. 사이드바에서 "Template Admin" 라벨 정상 표시 및 활성 상태 확인
