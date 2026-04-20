# A2UI Admin Part Composition Plan

Date: 2026-04-20

## Background

The current A2UI proof of concept can register templates in Admin, resolve them through MCP, and render them inside the chat surface. That proves the end-to-end path, but the rendering model is still mostly code-owned:

```text
templateId
-> prebuilt React template component
-> payload binding
-> render
```

The next product direction is to let Admin define more of the card content structure without turning Admin into a low-level UI builder.

The important clarification:

- Admin should not compose raw UI atoms directly.
- Ant Design is out of scope for the first implementation.
- A2UI should render through product-owned primitives and parts in `@a2ui/ui`.
- A2UI primitives are internal implementation details, not Admin-facing building blocks.
- Admin should compose A2UI-specific parts that are large enough to preserve UX quality and product consistency.
- Every A2UI surface should have a fixed base card shell with title/content/actions configured through normal Admin inputs.
- Additional internal content should be configured as ordered A2UI parts.

For the immediate demo, this plan should focus on the deploy flow. When the user says "배포하고싶어", the assistant should collect or infer the deploy target, resolve deploy context, and render a deploy-specific A2UI card composed from Admin-configured parts.

## Goal

Build a schema-driven A2UI rendering model where Admin can configure:

1. The default card shell.
2. The card title, body/description, status/tone, and actions.
3. Optional A2UI parts inside the card body.
4. Data bindings from resolved payload into card shell fields and part props.

The frontend then parses the saved JSON and renders a complete A2UI card using a controlled registry of A2UI part components.

## Non-Goals

This is not a general-purpose page builder.

Do not expose these as Admin-level building blocks:

- raw `SurfaceCard`
- raw `ActionButton`
- raw `PropertyList`
- raw `DataTable`
- raw typography/text atoms
- raw flex/grid/layout primitives
- raw CSS/layout controls
- arbitrary React component names
- arbitrary JavaScript expressions

Admin should configure meaningful A2UI parts, not implementation details.

## Target Mental Model

```text
A2UI Primitives
  -> internal implementation detail

A2UI Parts
  -> product-owned reusable surface blocks

Deploy A2UI Parts
  -> demo-focused operational blocks for deploy preparation and execution

Admin Template Surface Config
  -> card shell + ordered parts + bindings

A2UI Dynamic Renderer
  -> safe parser + part registry + payload binding
```

The rendered surface should still feel like a single coherent A2UI card, not a pile of arbitrary components.

The initial implementation should not depend on Ant Design. If a design system dependency is reconsidered later, it should remain behind A2UI primitives and never become part of the Admin contract.

## Base Card Shell

Every dynamic A2UI template has a base shell that is not added through the `+ Add part` flow.

The base shell is configured through standard Admin form inputs:

- Title
- Subtitle
- Description or body summary
- Status/tone
- Footer note
- Primary action
- Secondary action
- Additional actions

This shell should render consistently for all dynamic templates.

Example Admin fields:

```text
Card title
Card subtitle binding
Card description binding
Tone binding
Primary action label
Primary action ID
Secondary action label
Secondary action ID
```

## A2UI Parts

A2UI parts are medium-sized surface blocks. They are more structured than atoms and should map to common operational UI patterns.

Shared part candidates:

| Part | Purpose |
| --- | --- |
| `KeyValueSummary` | Show a compact list of labels and values. |
| `DataTableBlock` | Show structured rows with configured columns. |
| `MetricGridBlock` | Show multiple summary metrics. |
| `StepProgressBlock` | Show a process, current step, and completed steps. |
| `ChecklistBlock` | Show preflight or validation checks. |
| `AlertBlock` | Show warning/success/danger callouts. |
| `TimelineBlock` | Show history or activity events. |
| `ActionListBlock` | Show contextual actions or command candidates. |

Deploy demo part candidates:

| Part | Purpose |
| --- | --- |
| `DeployTargetSummaryBlock` | Show service, environment, version, strategy, and impact summary. |
| `DeployArtifactBlock` | Show selected image/ECR artifact details. |
| `DeployRequestConfigBlock` | Show ECS-style request configuration for the deploy. |
| `DeployPreflightChecklistBlock` | Show deploy readiness checks with pass/warn/fail support. |
| `DeployRolloutProgressBlock` | Show deployment execution steps and current progress. |
| `DeploymentHistoryBlock` | Show recent deployment history for the selected service. |

The first demo should prioritize deploy-specific parts over generic smoke-test parts. Shared parts are still useful, but the deploy story needs domain-shaped blocks so the card feels like an operational deploy surface, not a generic data report.

## Deploy Demo Scope

The near-term demo path is deploy-only:

```text
User: 배포하고싶어
-> intent resolves to deploy.start
-> assistant asks for service if missing
-> service deploy context is resolved
-> MCP/Admin runtime returns payload + actions + surfaceConfig
-> DynamicA2UICardRenderer renders Deploy Launchpad from deploy A2UI parts
-> user clicks 배포 시작
-> deploy action starts rollout state
-> DeployRolloutProgressBlock shows execution progress
```

The deploy surface should show:

- what service will be deployed
- which environment will receive it
- which image/version was selected
- what request configuration will be used
- whether preflight checks are ready
- what will happen after the operator clicks the deploy action

This means `deploy_launchpad` or `quick_deploy_launchpad` should become the first meaningful dynamic A2UI conversion target.

## Proposed Surface Config Shape

The catalog stores a `surfaceConfig` or similarly named object.

Deploy-focused example:

```json
{
  "surfaceConfig": {
    "kind": "a2ui_card",
    "version": 1,
    "card": {
      "title": {
        "type": "static",
        "value": "Deploy Launchpad"
      },
      "subtitle": {
        "type": "binding",
        "path": "payload.service"
      },
      "description": {
        "type": "binding",
        "path": "payload.impactSummary"
      },
      "tone": {
        "type": "binding",
        "path": "payload.state"
      },
      "footerNote": {
        "type": "static",
        "value": "Generated from Admin surface config"
      },
      "actions": {
        "source": "templateActions"
      }
    },
    "parts": [
      {
        "id": "deploy-target",
        "type": "DeployTargetSummaryBlock",
        "props": {
          "service": {
            "type": "binding",
            "path": "payload.service"
          },
          "environment": {
            "type": "binding",
            "path": "payload.environment"
          },
          "targetVersion": {
            "type": "binding",
            "path": "payload.targetVersion"
          },
          "recommendedVersion": {
            "type": "binding",
            "path": "payload.recommendedVersion"
          },
          "strategy": {
            "type": "binding",
            "path": "payload.strategy"
          },
          "impactSummary": {
            "type": "binding",
            "path": "payload.impactSummary"
          }
        }
      },
      {
        "id": "deploy-artifact",
        "type": "DeployArtifactBlock",
        "props": {
          "image": {
            "type": "binding",
            "path": "payload.imageDetail"
          }
        }
      },
      {
        "id": "deploy-request",
        "type": "DeployRequestConfigBlock",
        "props": {
          "request": {
            "type": "binding",
            "path": "payload.requestDetail"
          }
        }
      },
      {
        "id": "deploy-preflight",
        "type": "DeployPreflightChecklistBlock",
        "props": {
          "checks": {
            "type": "binding",
            "path": "payload.preflightChecks",
            "fallback": []
          }
        }
      },
      {
        "id": "deploy-rollout",
        "type": "DeployRolloutProgressBlock",
        "props": {
          "state": {
            "type": "binding",
            "path": "payload.state"
          },
          "steps": {
            "type": "static",
            "value": [
              "이미지 Pull",
              "컨테이너 생성",
              "헬스체크 실행",
              "트래픽 전환",
              "최종 검증"
            ]
          }
        }
      }
    ]
  }
}
```

## Binding Model

Use a small binding expression model instead of arbitrary code.

Supported value sources:

```ts
type BindingValue =
  | { type: "static"; value: unknown }
  | { type: "binding"; path: string; fallback?: unknown };
```

Examples:

```json
{ "type": "binding", "path": "payload.service" }
{ "type": "binding", "path": "payload.rows", "fallback": [] }
{ "type": "static", "value": "Deployment history" }
```

The renderer resolves binding paths against:

- `payload`
- `actions`
- `meta`
- eventually `context`

Do not allow:

- JavaScript expressions
- function calls
- arbitrary eval
- remote component references

## Runtime Rendering Flow

```text
Admin saves catalog template
-> MCP resolver creates payload
-> MCP returns envelope with payload + actions + surfaceConfig
-> Chat surface receives envelope
-> DynamicA2UICardRenderer resolves bindings
-> Renderer renders base card shell
-> Renderer renders configured A2UI parts in order
```

During migration, existing code-owned templates can continue working:

```text
if envelope.surfaceConfig exists:
  render dynamic A2UI card
else:
  render registered code template by templateId
```

## Shared Renderer and Part Manifest

Implementation update on 2026-04-20:

Admin preview and chat now share the same render entrypoint:

```text
surfaceConfig + payload + actions
-> SurfaceRenderer
-> DynamicA2UICardRenderer
-> explicit part registry
-> A2UI part component
```

Admin does not import or branch on deploy React components directly. It reads the shared part definition manifest exported by `@a2ui/ui`, then uses that manifest to populate:

- available part list
- default part props
- generated editor fields
- per-part preview payload
- required payload path validation

The renderer remains the runtime display path. The manifest is the Admin/runtime edit and validation contract.

## Admin UX

Admin should separate template editing into conceptual areas:

```text
Basic
Resolvers
Actions
Surface
Simulate
Generated JSON
```

The Surface tab should not be a raw JSON-first editor.

Surface tab layout:

```text
Card Shell
  Title
  Subtitle binding
  Description binding
  Tone binding
  Footer note binding
  Action source

Parts
  [DeployTargetSummaryBlock]       Deploy target
  [DeployArtifactBlock]            Image detail
  [DeployRequestConfigBlock]       Request config
  [DeployPreflightChecklistBlock]  Preflight
  [+ Add part]

Generated Surface JSON
  collapsed by default
```

Part editing should be form-based where possible.

For example, `DataTableBlock` editor:

```text
Title
Rows binding path
Columns
  Label / Field / Format
  Label / Field / Format
  [+ Add column]
```

For example, `DeployArtifactBlock` editor:

```text
Image detail binding path
Visible fields
  Repository
  Image tag
  Image URI
  Git ref
  Commit SHA
  Image digest
  Build status
  Pushed at
Empty state label
```

## Frontend Implementation Shape

Likely new modules:

```text
packages/a2ui-ui/src/dynamic/
  DynamicA2UICardRenderer.tsx
  binding.ts
  schema.ts
  part-registry.ts

packages/a2ui-ui/src/parts/
  A2UICardShell.tsx
  KeyValueSummary.tsx
  DataTableBlock.tsx
  StepProgressBlock.tsx
  MetricGridBlock.tsx
  ChecklistBlock.tsx
  AlertBlock.tsx

packages/a2ui-ui/src/parts/deploy/
  DeployTargetSummaryBlock.tsx
  DeployArtifactBlock.tsx
  DeployRequestConfigBlock.tsx
  DeployPreflightChecklistBlock.tsx
  DeployRolloutProgressBlock.tsx
  DeploymentHistoryBlock.tsx
```

The part registry should be explicit:

```ts
const A2UI_PART_REGISTRY = {
  KeyValueSummary,
  DataTableBlock,
  StepProgressBlock,
  MetricGridBlock,
  ChecklistBlock,
  AlertBlock,
  DeployTargetSummaryBlock,
  DeployArtifactBlock,
  DeployRequestConfigBlock,
  DeployPreflightChecklistBlock,
  DeployRolloutProgressBlock,
  DeploymentHistoryBlock,
} satisfies Record<string, A2UIPartComponent>;
```

No dynamic imports from Admin-provided strings.

## MCP/Admin Runtime Changes

MCP should remain mostly data-focused.

Required runtime changes:

- Preserve `surfaceConfig` from stored template catalog.
- Include `surfaceConfig` in the resolved envelope.
- Validate that `surfaceConfig.parts[*].type` is known through the shared part manifest.
- Validate declared part props and binding roots from the same manifest.
- Generate `renderRequiredPayloadFields` from part definitions and binding paths.

Python remains rule-based orchestration plus MCP render in this phase. Python/MCP clients preserve the returned envelope, including `surfaceConfig`; clients that do not render UI can still ignore it.

## Migration Strategy

### Phase 1: Schema and Renderer

Create schema types and a dynamic card renderer in `@a2ui/ui`.

Acceptance:

- Static fixture surfaceConfig renders a card.
- Binding values resolve from payload.
- Unknown part type fails safely.

### Phase 2: First Parts

Implement the first deploy-demo parts:

- `DeployTargetSummaryBlock`
- `DeployArtifactBlock`
- `DeployRequestConfigBlock`
- `DeployPreflightChecklistBlock`

Acceptance:

- Existing `quick_deploy_launchpad` ready state can be recreated using dynamic card shell + deploy parts.
- The dynamic deploy card has parity for service, environment, target version, image details, request details, and preflight checks.

### Phase 3: Admin Surface Editor

Add a Surface tab to Admin.

Acceptance:

- Admin can edit base card shell fields.
- Admin can add/remove/reorder A2UI parts.
- Admin can configure common part props without raw JSON.
- Generated JSON is visible for inspection.

### Phase 4: MCP Envelope Support

Attach `surfaceConfig` to resolved envelopes.

Acceptance:

- `a2ui.resolveTemplateData` returns payload, actions, and surfaceConfig.
- Chat renderer chooses dynamic renderer when surfaceConfig exists.

### Phase 5: Convert Deploy Template

Convert `quick_deploy_launchpad` to use surfaceConfig.

Acceptance:

- Admin-created deploy launchpad still renders in:
  - Admin simulation
  - Python MCP call
  - standalone A2UI test page
  - Deploy chat panel

### Phase 6: Add Rollout Progress

Add deploy action feedback using `DeployRolloutProgressBlock`.

Acceptance:

- Clicking `배포 시작` moves the deploy card into a visible rollout/progress state.
- The progress state can be represented by payload changes and `surfaceConfig`, not by a separate hard-coded deploy template.

## Risks

### Risk: Admin becomes a low-level UI builder

Mitigation:

- Only expose A2UI parts.
- Keep card shell fixed.
- Avoid raw A2UI primitives.
- Avoid freeform CSS.

### Risk: JSON shape becomes too flexible

Mitigation:

- Validate surfaceConfig.
- Version the schema.
- Keep each part contract small and explicit.

### Risk: Existing templates break

Mitigation:

- Keep current template registry path as fallback.
- Only use dynamic renderer when `surfaceConfig` exists.

### Risk: Binding paths drift from payload

Mitigation:

- Simulate should show unresolved bindings.
- Validation should warn on missing paths.
- Generated validation can derive required paths from configured bindings.

## Open Questions

- Should `surfaceConfig` live at the stored catalog root or under a `rendering` key?
- Should actions remain separate from card shell, or should card shell reference action groups?
- How strict should part prop validation be in Admin before save?
- Should `surfaceConfig` be returned in `envelope.meta`, `envelope.surfaceConfig`, or inside `payload`?
- Should Admin support drag-and-drop reorder in the first version, or simple up/down buttons?
- Is `DeploymentHistoryBlock` required for the first deploy demo, or can it wait until after rollout progress works?
- Should rollout progress be local UI state, action-updated payload state, or both during the demo?

## TODO

### Design

- [x] Define the first `surfaceConfig` JSON schema.
- [x] Decide final field name: `surfaceConfig`, `renderConfig`, or `cardConfig`.
- [x] Define base card shell fields and binding support.
- [x] Define the first A2UI part contracts.
- [x] Define deploy-specific part contracts.
- [x] Confirm Ant Design remains excluded from the first implementation.
- [x] Decide how actions attach to the base card shell.
- [x] Decide where `surfaceConfig` appears in MCP envelopes.

### A2UI UI Package

- [x] Add `packages/a2ui-ui/src/dynamic/schema.ts`.
- [x] Add safe binding resolver for `payload.*`, `actions`, and `meta.*`.
- [x] Add `A2UICardShell`.
- [x] Add `DynamicA2UICardRenderer`.
- [x] Add explicit A2UI part registry.
- [x] Implement `KeyValueSummary`.
- [x] Implement `DataTableBlock`.
- [x] Implement `ChecklistBlock`.
- [x] Implement `MetricGridBlock`.
- [x] Implement `StepProgressBlock`.
- [x] Implement `DeployTargetSummaryBlock`.
- [x] Implement `DeployArtifactBlock`.
- [x] Implement `DeployRequestConfigBlock`.
- [x] Implement `DeployPreflightChecklistBlock`.
- [x] Implement `DeployRolloutProgressBlock`.
- [x] Add unknown-part fallback UI.
- [x] Add unit tests for binding resolution.
- [x] Add unit tests for dynamic renderer fallback behavior.

### Admin

- [x] Add `surfaceConfig` to stored template model.
- [x] Add validation for known part types.
- [x] Add Surface tab to Admin UI.
- [x] Add base card shell editor.
- [x] Add part list editor.
- [x] Add `+ Add part` flow using A2UI part types.
- [x] Add per-part form editor for `KeyValueSummary`.
- [x] Add per-part form editor for `DataTableBlock`.
- [x] Add per-part form editor for deploy parts.
- [x] Add generated JSON preview for surfaceConfig.
- [x] Show missing binding path warnings in Simulate.

### MCP Runtime

- [x] Preserve `surfaceConfig` when reading/writing templates.
- [x] Return `surfaceConfig` from `a2ui.resolveTemplateData`.
- [x] Ensure chat explicit template resolve passes through `surfaceConfig`.
- [x] Add tests for `surfaceConfig` in resolved envelope.
- [x] Add validation errors for unknown part types.

### Migration

- [x] Rebuild `quick_deploy_launchpad` as dynamic card config.
- [x] Verify "배포하고싶어" routes to `deploy.start`.
- [x] Verify service follow-up still works when service name is missing.
- [x] Verify `quick_deploy_launchpad` in Admin simulation.
- [x] Verify `quick_deploy_launchpad` through Python MCP call.
- [ ] Verify `quick_deploy_launchpad` in Deploy chat panel with Computer Use. Current attempt was blocked by local Computer Use approval denial; HTTP route/build smoke passed.
- [x] Convert one real operational block from `deploy_launchpad` to dynamic parts.

### Verification

- [x] Run targeted unit tests.
- [x] Run full `npm test`.
- [x] Run targeted eslint on changed files.
- [ ] Run Computer Use browser flow for Admin edit -> save -> simulate. Current attempt was blocked by local Computer Use approval denial; Admin REST save/simulate path was verified by HTTP smoke.
- [ ] Run Computer Use browser flow for chat -> registered template render. Current attempt was blocked by local Computer Use approval denial; `/assistant` and `/a2ui-test` returned 200 from built Next server.
- [x] Document current known build/lint blockers separately if they still exist.
