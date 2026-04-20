# Admin Template Catalog Editing Plan

Date: 2026-04-16

## 목표

현재는 A2UI admin/MCP가 코드 기반 catalog를 읽어 템플릿을 추천하고 payload를 생성한다.

이 계획의 목표는 아래 흐름을 실제로 닫는 것이다.

```text
Admin 화면에서 템플릿/리졸버/바인딩/액션 설정 수정
→ Admin 저장소에 반영
→ MCP가 저장소 기반 설정을 읽음
→ Python agent가 MCP를 호출
→ MCP가 resolver 실행 후 SurfaceEnvelope 생성
→ 기존 프론트 챗봇에서 A2UI 렌더
```

## 현재 상태

이미 동작하는 것:

- 기존 챗봇은 `ASSISTANT_BACKEND=python`일 때 Python agent를 호출한다.
- Python agent는 MCP `a2ui.recommendTemplate`, `a2ui.resolveTemplateData`를 호출한다.
- MCP는 `template-catalog.ts`의 코드 catalog를 기반으로 템플릿을 추천하고 데이터를 resolve한다.
- 기존 3개 템플릿은 챗봇에서 렌더 가능하다.

아직 부족한 것:

- Admin 화면에서 catalog를 수정할 수 없다.
- Catalog가 JSON/DB 저장소가 아니라 TypeScript 코드 상수다.
- Resolver/binding/action 설정이 런타임에 수정되지 않는다.
- `deployments.json` 같은 추가 데이터 소스가 deploy surface에 연결되어 있지 않다.
- Admin UI의 template manager와 실제 MCP catalog가 아직 분리되어 있다.

## 설계 방향

### 1. Catalog 저장소

우선 DB 대신 JSON 파일 기반 저장소를 사용한다.

```text
packages/a2ui-admin/data/template-catalog.json
```

이 파일은 admin UI가 수정하고 MCP가 읽는 단일 소스가 된다.

초기에는 서버 재시작 후 반영되어도 충분하다. 이후 필요하면 write-through cache 또는 파일 watch를 붙인다.

### 2. Binding recipe 처리

JSON에는 함수나 TypeScript 객체를 직접 넣을 수 없다. 따라서 catalog JSON에는 `bindingRecipeId`를 저장하고, 서버 코드가 이를 실제 `BindingRecipe`로 매핑한다.

예시:

```json
{
  "templateId": "deploy_launchpad",
  "bindingRecipeId": "deploy_launchpad"
}
```

서버 매핑:

```text
deploy_launchpad -> DEPLOY_LAUNCHPAD_RECIPE
approval_queue_inbox -> APPROVAL_QUEUE_INBOX_RECIPE
rollback_summary -> ROLLBACK_SUMMARY_RECIPE
```

### 3. Resolver 처리

초기 resolver는 제한된 종류만 지원한다.

```text
deploy_service
approval_queue
rollback_incidents
```

다음 단계에서 generic HTTP resolver를 추가한다.

```text
http_get
http_post
multi_http
```

### 4. Admin UI

처음부터 복잡한 form builder를 만들지 않는다. MVP는 다음 구성으로 충분하다.

```text
Template list
Raw JSON editor
Save button
Simulate button
Surface preview
Validation errors
```

안정화 후 Basic / Selection / Resolver / Binding / Actions 탭으로 확장한다.

## 구현 단계

### Phase 1. JSON Catalog 저장소화

목표:

- `template-catalog.ts`에 있는 현재 등록 정보를 JSON으로 옮긴다.
- MCP는 JSON을 읽어 기존과 동일하게 동작한다.

작업 파일:

- `packages/a2ui-admin/data/template-catalog.json`
- `packages/a2ui-admin/src/mcp-server/catalog/template-catalog.ts`
- `packages/a2ui-admin/src/mcp-server/catalog/template-store.ts`
- `packages/a2ui-admin/__tests__/template-catalog.test.ts`

Todo:

- [ ] 현재 `TEMPLATE_CATALOG` 내용을 `template-catalog.json`으로 복사한다.
- [ ] `bindingRecipeId` 필드를 도입한다.
- [ ] `template-store.ts`를 추가해 JSON read/write를 캡슐화한다.
- [ ] `getTemplateRegistration()`, `listTemplateSummaries()`, `getTemplateIntentRegistration()`가 store를 통해 읽게 한다.
- [ ] JSON schema 또는 runtime validation을 추가해 잘못된 catalog 파일을 빠르게 감지한다.
- [ ] 기존 admin MCP 테스트가 동일하게 통과하는지 확인한다.

완료 기준:

- [ ] MCP `a2ui.listTemplates`가 JSON 기반 목록을 반환한다.
- [ ] MCP `a2ui.recommendTemplate`가 JSON 기반 intent 설정으로 판단한다.
- [ ] MCP `a2ui.resolveTemplateData`가 JSON 기반 resolver/action 설정을 사용한다.
- [ ] 기존 3개 A2UI surface가 프론트 챗봇에서 그대로 나온다.

### Phase 2. Admin REST API 추가

목표:

- 브라우저 admin UI가 catalog를 읽고 저장할 수 있게 한다.

작업 파일:

- `packages/a2ui-admin/src/mcp-server/server.ts`
- `packages/a2ui-admin/src/mcp-server/admin-routes.ts`
- `packages/a2ui-admin/src/mcp-server/catalog/template-store.ts`
- `packages/a2ui-admin/__tests__/admin-routes.test.ts`

API:

```text
GET /admin/templates
GET /admin/templates/:templateId
PUT /admin/templates/:templateId
POST /admin/templates
DELETE /admin/templates/:templateId
POST /admin/templates/:templateId/simulate
```

Todo:

- [ ] `admin-routes.ts`를 추가한다.
- [ ] `GET /admin/templates`로 catalog summary를 반환한다.
- [ ] `GET /admin/templates/:templateId`로 전체 등록 정보를 반환한다.
- [ ] `PUT /admin/templates/:templateId`로 JSON catalog를 저장한다.
- [ ] 저장 전 validation을 수행한다.
- [ ] `POST /admin/templates/:templateId/simulate`를 추가한다.
- [ ] simulate는 입력 facts를 받아 `recommendTemplate` + `resolveTemplateData`에 준하는 결과를 반환한다.
- [ ] API 실패 시 validation error를 읽기 쉬운 형태로 반환한다.

완료 기준:

- [ ] curl로 template catalog 조회/수정이 가능하다.
- [ ] 수정 후 MCP 추천/resolve 결과가 바뀐다.
- [ ] 잘못된 catalog 저장은 거부된다.

### Phase 3. Admin UI 연결

목표:

- 기존 Template Admin 화면이 실제 admin API를 읽고 저장하게 한다.

작업 파일:

- `src/devops-console/template-admin/template-manager-page.tsx`
- `src/devops-console/template-admin/template-list-panel.tsx`
- 신규 `src/devops-console/template-admin/template-json-editor.tsx`
- 신규 `src/devops-console/template-admin/template-simulator-panel.tsx`
- 필요 시 `src/app/api/a2ui-admin/*` proxy route

Todo:

- [ ] admin MCP 서버를 직접 호출할지 Next proxy를 둘지 결정한다.
- [ ] Template list가 `GET /admin/templates`를 읽게 한다.
- [ ] 선택한 template detail을 `GET /admin/templates/:id`로 읽게 한다.
- [ ] Raw JSON editor를 추가한다.
- [ ] Save button으로 `PUT /admin/templates/:id`를 호출한다.
- [ ] Simulate panel을 추가한다.
- [ ] Simulate facts 입력란을 추가한다.
- [ ] Simulate 결과로 `SurfaceEnvelope` raw JSON을 표시한다.
- [ ] 가능하면 preview에 `@a2ui/ui SurfaceRenderer`를 붙인다.
- [ ] 저장 성공/실패 toast 또는 inline message를 표시한다.

완료 기준:

- [ ] Admin UI에서 `deploy_launchpad`의 resolver/default 값을 수정할 수 있다.
- [ ] 저장 후 MCP 서버 재시작 또는 reload로 변경이 반영된다.
- [ ] Simulate 버튼으로 완성된 SurfaceEnvelope를 확인할 수 있다.

### Phase 4. Resolver 확장

목표:

- `services.json`뿐 아니라 `deployments.json`도 deploy surface에 연결할 수 있게 한다.

현재 문제:

- `deploy_launchpad`는 `/api/services/{serviceName}`만 호출한다.
- `packages/demo-mock-api/src/fixtures/deployments.json`은 `/api/deployments`에서만 쓰이고 deploy surface에는 반영되지 않는다.

Todo:

- [ ] catalog resolver에 `resolvers: []` 형태의 multi resolver를 추가한다.
- [ ] resolver 결과를 alias로 저장한다.
- [ ] 예: `service` alias에는 `/api/services/{serviceName}` 결과 저장.
- [ ] 예: `deployments` alias에는 `/api/deployments` 결과 저장.
- [ ] binding source path가 nested path를 읽을 수 있게 한다.
- [ ] 예: `service.recommendedVersion -> payload.targetVersion`
- [ ] 예: `deployments.history[0] -> payload.lastDeployment`
- [ ] serviceName으로 deployments history를 filter하는 transform을 추가한다.

완료 기준:

- [ ] `deployments.json`의 값을 바꾸면 deploy surface에 반영된다.
- [ ] deploy surface에 last deployment 또는 deployment history 일부가 표시된다.

### Phase 5. Binding UI 고도화

목표:

- Raw JSON만이 아니라 form 기반으로 binding을 수정할 수 있게 한다.

Todo:

- [ ] Static value binding 추가/수정 UI.
- [ ] Source path -> target field binding UI.
- [ ] Default value 입력 UI.
- [ ] Transform 선택 UI.
- [ ] Binding preview 결과 표시.
- [ ] Validation 실패 필드 하이라이트.

완료 기준:

- [ ] 운영자가 코드 수정 없이 payload field mapping을 바꿀 수 있다.

### Phase 6. Action 실행 연결

목표:

- A2UI 버튼 클릭이 MCP action으로 이어지게 한다.

현재 상태:

- 프론트 action click은 일부 console log 수준이다.
- MCP에는 `a2ui.executeAction`이 존재한다.

Todo:

- [ ] Next action proxy route 추가.
- [ ] `TemplateSurface`의 `onAction`이 action proxy를 호출하게 한다.
- [ ] action params를 payload/facts 기반으로 resolve한다.
- [ ] action 결과를 챗봇 메시지로 표시한다.
- [ ] action 후 surface refresh 정책을 정한다.

완료 기준:

- [ ] Deploy Launchpad의 `배포 시작` 버튼 클릭 시 MCP `a2ui.executeAction`이 호출된다.
- [ ] 결과 메시지가 챗봇에 표시된다.

## 데이터 흐름 목표

최종 데이터 흐름:

```text
User chat
→ Python agent intent/facts
→ MCP recommendTemplate
→ JSON catalog selection
→ MCP resolveTemplateData
→ catalog resolver(s)
→ Mock API or real API
→ binding rules
→ payload validation
→ SurfaceEnvelope
→ Python agent
→ Next /api/chat
→ existing chatbot
→ A2UI renderer
```

## 테스트 계획

Unit tests:

- [ ] Template store read/write.
- [ ] Catalog validation.
- [ ] Intent selection from catalog.
- [ ] Resolver config parsing.
- [ ] Binding source path resolution.

Integration tests:

- [ ] Admin API read/write.
- [ ] MCP listTemplates uses saved catalog.
- [ ] MCP recommendTemplate uses saved catalog.
- [ ] MCP resolveTemplateData uses saved resolver config.
- [ ] Python agent returns surface after catalog change.

Manual smoke tests:

- [ ] `배포하고싶어` → `payments-api` → deploy surface.
- [ ] Admin에서 `defaultRequestDetail.cpu` 변경.
- [ ] Admin 저장 후 서버 reload.
- [ ] 챗봇에서 다시 deploy surface 확인.
- [ ] 바뀐 cpu가 카드에 표시되는지 확인.

## 리스크와 결정 필요 사항

### Catalog 저장 방식

초기 권장:

```text
JSON file
```

나중에 전환:

```text
SQLite or Postgres
```

### Admin API 접근 방식

옵션 A:

```text
Frontend → @a2ui/admin directly
```

장점: 단순함.
단점: CORS/포트/환경 구성이 드러남.

옵션 B:

```text
Frontend → Next proxy → @a2ui/admin
```

장점: 기존 app API 패턴과 맞음.
단점: proxy route 추가 필요.

권장: 옵션 B.

### Python agent와 admin decision 책임

원칙:

```text
Python agent는 intent/facts만 만든다.
어떤 A2UI를 띄울지, 어떤 데이터를 어떻게 넣을지는 admin MCP가 결정한다.
```

## 페이지 기획 — Admin Template Manager

### 기획 원칙

- 개발자용 어드민이다. 복잡한 form builder가 아닌, **JSON 편집 + 실시간 미리보기**가 핵심.
- 정보는 **목적에 필요한 것만** 표시한다. 엔진 내부 디버깅 정보(score, matched/missing 상세)는 노출하지 않는다.
- 기존 devops console 디자인(다크 테마, `console-page.module.css` 토큰)과 일관성을 유지한다.

### 현재 문제

현재 2개의 admin 페이지가 분리되어 있다:

| 경로 | 위치 | 문제 |
|------|------|------|
| `/assistant` | `devops-console/template-admin/` (콘솔 쉘 안) | 4탭 중 Policy 탭은 Simulator와 중복, Simulator 후보 테이블은 정보 과다 |
| `/a2ui-test/admin` | `src/app/a2ui-test/admin/page.tsx` (standalone) | 인라인 스타일, 정적 데이터, 콘솔 쉘 밖에 존재 |

→ **하나의 admin 페이지로 통합**한다. 콘솔 쉘(`AppFrame`) 안에서 동작하되, `/a2ui-test/admin`의 Simulation + Surface Preview 패턴을 가져온다.

### 페이지 레이아웃

```
┌─────────────────────────────────────────────────────┐
│  AppFrame (sidebar + header)                        │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Template │  [Template 제목]                         │
│ List     │  [상태 배지]                              │
│          │                                          │
│ ──────── │  ┌─────────┐ ┌──────────┐               │
│ • deploy │  │ Editor  │ │ Simulate │               │
│ • approv │  └─────────┘ └──────────┘               │
│ • rollba │                                          │
│          │  ┌──────────────────────────────────┐    │
│          │  │                                  │    │
│          │  │  Tab content area                │    │
│          │  │                                  │    │
│          │  └──────────────────────────────────┘    │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### 좌측 — Template List

표시 항목 (간소화):

```
Template 이름
상태 (active / draft)
```

제거 항목:
- ~~version~~ (3개 템플릿에서 무의미)
- ~~field count~~ (노이즈)
- ~~preview count~~ (노이즈)

### 우측 — 탭 구성

기존 4탭 → **2탭**으로 축소:

| 탭 | 역할 | 상세 |
|----|------|------|
| **Editor** | JSON 편집 + 실시간 미리보기 | 기존 Preview 탭의 JSON editor + live render를 유지. Save 버튼 추가. |
| **Simulate** | intent 입력 → 결과 확인 | intent 선택 + facts 입력 → 선택된 템플릿 + Surface preview 표시. |

제거:
- ~~Contract 탭~~ — Editor 탭에서 JSON을 직접 보면 스키마가 드러남. 별도 읽기 전용 테이블 불필요.
- ~~Policy 탭~~ — 엔진 내부 선택 정책. Simulate 탭에서 결과로 확인 가능.

### Editor 탭 상세

```
┌─────────────────────────┬─────────────────────────┐
│  Catalog JSON Editor    │  Live Preview            │
│                         │                          │
│  ┌───────────────────┐  │  ┌──────────────────┐   │
│  │ {                 │  │  │                  │   │
│  │   "templateId":   │  │  │  [실제 Surface   │   │
│  │   "deploy_...",   │  │  │   렌더링 결과]    │   │
│  │   ...             │  │  │                  │   │
│  │ }                 │  │  │                  │   │
│  └───────────────────┘  │  └──────────────────┘   │
│                         │                          │
│  [Parse error 표시]      │                          │
│                         │                          │
│  ┌──────┐               │                          │
│  │ Save │               │                          │
│  └──────┘               │                          │
│  [저장 성공/실패 메시지]  │                          │
└─────────────────────────┴─────────────────────────┘
```

- 좌: JSON textarea (기존 `ExamplePayloadEditor` 기반)
- 우: `SurfaceRenderer`로 실시간 렌더 (기존 `TemplateLivePreview` 기반)
- 하단: Save 버튼 → `PUT /admin/templates/:templateId` 호출
- 저장 결과를 inline 메시지로 표시 (toast 아님, 단순 텍스트)

### Simulate 탭 상세

```
┌─────────────────────────────────────────────────┐
│  Intent: [드롭다운 ▾]                            │
│  Facts:  [key=value 입력란]                      │
│  [Simulate 버튼]                                 │
├─────────────────────────────────────────────────┤
│  결과: render_surface                            │
│  선택된 템플릿: deploy_launchpad                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Surface Preview — SurfaceRenderer]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

표시 항목:
- 결과 모드 (render_surface / ask_followup / text_only) + StatusBadge
- 선택된 템플릿 ID
- missing facts (있을 경우)
- Surface 미리보기 (render_surface일 경우)

제거 항목:
- ~~후보 템플릿 테이블~~ (Template/Eligible/Score/Matched/Missing/Reason)
- ~~Decision mode 상세~~ (decisionMatched, decisionMissing 배열)

### 디자인 토큰 참조

기존 콘솔 디자인과 통일:

| 요소 | CSS token / 값 |
|------|----------------|
| 배경 | `rgba(15, 23, 34, 0.5)` (list panel), `var(--console-bg)` (detail) |
| 테두리 | `var(--console-border)` |
| 글꼴 | `var(--console-font-ui)` (Inter), 코드는 `var(--console-font-mono)` |
| 버튼 | `var(--console-info)` (#4c8dff) 배경, 흰 텍스트 |
| 탭 | pill 형태 (border-radius: 999px), 기존 `.templateTab` 스타일 유지 |
| 상태 배지 | `.status-active` (green), `.status-draft` (yellow) |
| 에러 | `var(--console-danger)` |
| 성공 | `var(--console-success)` |

### 컴포넌트 변경 계획

| 파일 | 변경 |
|------|------|
| `template-manager-page.tsx` | 탭을 `editor` / `simulate` 2개로 축소. Contract·Policy import 제거. |
| `template-list-panel.tsx` | version, fieldCount, previewCaseCount 표시 제거. 이름 + status만. |
| `template-live-preview.tsx` | 유지 (Editor 탭 우측에 사용). |
| `example-payload-editor.tsx` | 유지 (Editor 탭 좌측에 사용). Save 버튼 추가. |
| `decision-simulator.tsx` | 후보 테이블 제거. 결과 + Surface preview만 표시. |
| `template-contract-viewer.tsx` | **삭제** |
| `selection-policy-viewer.tsx` | **삭제** |

### `/a2ui-test/admin` 정리

standalone admin 페이지(`src/app/a2ui-test/admin/page.tsx`)는 통합 후 제거하거나, 콘솔 쉘 안의 admin으로 redirect한다.

## 1차 실행 Todo 요약

- [ ] `packages/a2ui-admin/data/template-catalog.json` 생성.
- [ ] `template-store.ts` 생성.
- [ ] `template-catalog.ts`가 JSON store를 읽도록 변경.
- [ ] `bindingRecipeId` 매핑 추가.
- [ ] `GET /admin/templates` 추가.
- [ ] `PUT /admin/templates/:templateId` 추가.
- [ ] Admin UI 간소화: 탭을 Editor / Simulate 2개로 축소.
- [ ] Template list 간소화: 이름 + status만 표시.
- [ ] Editor 탭에 Save button 추가.
- [ ] Simulator에서 후보 테이블 제거, 결과 + Surface preview만 표시.
- [ ] Contract viewer, Policy viewer 삭제.
- [ ] `POST /admin/templates/:templateId/simulate` 추가.
- [ ] Simulate 결과를 Surface preview로 표시.
- [ ] `deployments.json`을 deploy resolver에 연결하는 multi resolver 설계/구현.
