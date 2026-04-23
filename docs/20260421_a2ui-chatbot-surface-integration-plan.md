# A2UI Chatbot Surface Integration Plan

Date: 2026-04-21

## Background

The current PoC can render Admin-authored A2UI deploy surfaces through:

```text
Admin surfaceConfig
-> MCP/Admin runtime
-> Python or Next chat orchestration
-> SurfaceEnvelope
-> @a2ui/ui SurfaceRenderer
```

The next product question is whether A2UI can be inserted into an existing production chatbot library without replacing that chatbot.

The answer should be yes, but the integration boundary must be clean.

We should not move the app-specific chat panel into the production library. Instead, we should extract a small A2UI surface host and adapter layer that can be plugged into any chatbot that supports custom message rendering, tool result rendering, attachments, or an adjacent active-surface panel.

## Goal

Create a chatbot integration structure where:

1. Existing chatbot components can keep their own message list, composer, streaming, and state model.
2. A2UI can render rich surfaces inside or beside that chatbot.
3. Surface rendering uses the same `@a2ui/ui` `SurfaceRenderer` used by the PoC.
4. Surface actions can round-trip through the host app's backend/action executor.
5. The integration package does not depend on the PoC app store or app-specific routes.
6. Admin-authored `surfaceConfig` continues to work unchanged.

## Implementation Status

Implemented on 2026-04-22.

Completed:

- Added `packages/a2ui-chat` as the reusable chatbot integration package.
- Added `A2UISurfaceHost` as the public surface host component.
- Added `A2UIMessageSurface` for inline chatbot message rendering.
- Added host-provided action adapter types.
- Added surface normalization helpers and status reducer helpers.
- Refactored PoC `TemplateSurface` to use `A2UISurfaceHost` for A2UI surfaces.
- Moved PoC-specific action execution into `src/devops-chat/integrations/a2ui-surface-action-adapter.ts`.
- Updated Admin Surface preview to use `A2UISurfaceHost` in read-only/no-op mode.
- Added a generic chatbot embedding example under `examples/a2ui-chatbot-embed`.
- Added tests for host rendering, message part rendering, normalization, and action status state.

Pending only when the real production chatbot library is available:

- Write a concrete adapter against that library's actual message/tool renderer API.
- Browser-verify that specific production chatbot extension point.

## Non-Goals

This work should not:

- replace the existing production chatbot component
- force a new chat state store on the production app
- require the production chatbot to understand A2UI part internals
- expose raw React component imports from Admin or runtime data
- couple `@a2ui/ui` to the current `src/devops-chat/store`
- require all chatbot libraries to use the same message schema

## Current PoC Coupling

Today, A2UI rendering is split in a promising way, but some chat integration logic is still app-specific.

Reusable:

- `@a2ui/ui` `SurfaceRenderer`
- `@a2ui/ui` dynamic renderer
- `@a2ui/ui` part registry and part catalog
- `SurfaceEnvelope` shape
- `surfaceConfig + payload + actions` rendering contract

App-specific:

- `ChatAssistantPanel`
- `conversation-store`
- `executeSurfaceAction`
- `refreshAfterAction`
- pending tool bubble state
- page-specific selected entity facts
- `/api/chat` request/response mapping

The next step is to extract the reusable middle layer between these two groups.

## Target Architecture

```text
Production Chatbot Library
  -> message list / composer / streaming / status UI
  -> custom renderer slot
       -> A2UISurfaceHost
            -> SurfaceRenderer
            -> onAction adapter
            -> action pending/error state
            -> updated surface callback

Host Application Backend
  -> chat endpoint
  -> action endpoint
  -> Python/Node/MCP orchestration
  -> returns SurfaceEnvelope

Admin/MCP Runtime
  -> returns payload + actions + surfaceConfig
```

Recommended package boundary:

```text
packages/a2ui-ui
  -> SurfaceRenderer
  -> DynamicA2UICardRenderer
  -> part catalog
  -> contracts/types

packages/a2ui-chat
  -> A2UISurfaceHost
  -> A2UIMessageSurface
  -> A2UIActionController
  -> adapter interfaces
  -> normalization helpers

src/devops-console
  -> PoC-specific adapter implementation
  -> app store wiring
```

If adding a new workspace package is too much for the first step, the first implementation can live under:

```text
src/devops-chat/integrations/a2ui-chat-host/
```

Then it can be promoted into `packages/a2ui-chat` once the API stabilizes.

## Core Component

The integration should expose one primary React component:

```tsx
<A2UISurfaceHost
  surface={surface}
  disabled={false}
  onAction={handleAction}
  onSurfaceChange={handleUpdatedSurface}
  onStatusChange={handleStatus}
/>
```

Expected responsibilities:

- validate that a surface exists and has a renderable template or `surfaceConfig`
- render the surface using `SurfaceRenderer`
- translate renderer action events into a host-provided `onAction`
- show local pending/error/done status around action execution
- call `onSurfaceChange` when an action returns an updated surface
- avoid owning the whole chat conversation

## Adapter Contract

The action adapter should be host-provided.

```ts
type A2UISurfaceActionAdapter = (input: {
  actionId: string;
  surface: SurfaceEnvelope;
  payload?: Record<string, unknown>;
}) => Promise<{
  surface?: SurfaceEnvelope;
  facts?: Record<string, unknown>;
  message?: string;
}>;
```

This keeps the A2UI package independent from:

- current conversation store
- app-specific action registry
- Python vs Node backend choice
- MCP transport details
- chatbot vendor message schemas

## Chatbot Integration Modes

### Mode 1. Inline Message Surface

Use when the production chatbot supports custom message parts.

```text
assistant message
  text part
  a2ui surface part
```

The chatbot message renderer detects `message.surface` or an `a2ui_surface` part and renders `A2UISurfaceHost`.

### Mode 2. Tool Result Renderer

Use when the chatbot supports custom tool-call/result rendering.

```text
tool result: a2ui.renderSurface
  -> A2UISurfaceHost
```

This is useful for AI SDK-style chat UIs where tool calls are first-class message parts.

### Mode 3. Active Surface Panel

Use when the chatbot cannot render arbitrary React content inside messages.

```text
chat thread on left
active A2UI surface on right or below
```

This is less integrated visually, but it is the safest compatibility fallback.

## Proposed Implementation Phases

### Phase 1. Define Integration API

Create types and docs for:

- `A2UISurfaceHostProps`
- `A2UISurfaceActionAdapter`
- `A2UISurfaceStatus`
- `A2UIChatSurfacePart`
- `normalizeA2UISurface`

Acceptance:

- No dependency on `conversation-store`.
- No dependency on `src/devops-console`.
- No dependency on a specific chatbot vendor.

### Phase 2. Build `A2UISurfaceHost`

Move the common rendering/action shell out of PoC chat components.

Acceptance:

- Uses `SurfaceRenderer` internally.
- Accepts a host-provided action adapter.
- Shows pending/done/error state locally.
- Clears done status after a short timeout.
- Does not complete or mutate a chat turn by itself.

### Phase 3. Refactor PoC Chat To Use Host

Replace direct surface action wiring in PoC chat with `A2UISurfaceHost`.

Acceptance:

- Existing `/assistant` flow still renders dynamic deploy surfaces.
- `배포 시작` and `완료 반영` actions still update the active surface.
- Pending status no longer remains stuck.
- Existing tests continue passing.

### Phase 4. Add Generic Message Renderer Example

Create an example adapter that shows how a production chatbot can embed A2UI.

Possible examples:

```text
examples/a2ui-chatbot-embed/
  GenericChatMessage.tsx
  A2UIMessageRenderer.tsx
  mock-action-adapter.ts
```

Acceptance:

- Demonstrates inline message rendering.
- Demonstrates active surface panel fallback.
- Does not import PoC app store.

### Phase 5. Backend Contract Stabilization

Document and test how chat/action endpoints should return surfaces.

Acceptance:

- Chat endpoint can return `{ text, surface }`.
- Action endpoint can return `{ surface, message }`.
- Python path preserves `surfaceConfig`.
- Node/MCP path preserves `surfaceConfig`.

### Phase 6. Production Library Fit Check

Review the actual production chatbot library extension points.

Acceptance:

- Identify whether it supports inline custom renderers, tool result renderers, or only external panels.
- Write a concrete adapter for that library.
- Keep A2UI integration isolated to one adapter file plus `A2UISurfaceHost`.

## Review Finding Regression Guard

The previous review findings should become explicit regression checks:

### Finding 1 Guard: Surface Edits Persist

Required behavior:

- Surface editor loads stored catalog `surfaceConfig`.
- Save calls Admin `PUT /admin/templates/:templateId`.
- Save updates the editor JSON view.
- MCP/Admin simulate returns the saved `surfaceConfig`.

### Finding 2 Guard: Added Parts Are Configurable

Required behavior:

- Add-part dropdown is sourced from the shared part catalog.
- New parts use `createDefaultPart`.
- Per-part forms are generated from `editorFields`.
- Deploy parts expose bindings for `image`, `request`, `checks`, `state`, and `rows`.

### Finding 3 Guard: Action Status Clears

Required behavior:

- A2UI action enters pending/running state.
- Action success updates the surface.
- Done state is visible briefly.
- Done state clears automatically unless a newer action replaced it.

## TODO

### API Design

- [x] Decide package location: `packages/a2ui-chat` vs `src/devops-chat/integrations/a2ui-chat-host`.
- [x] Define `A2UISurfaceHostProps`.
- [x] Define `A2UISurfaceActionAdapter`.
- [x] Define `A2UISurfaceStatus`.
- [x] Define optional `A2UIChatSurfacePart` message-part shape.
- [x] Document inline, tool-result, and active-panel integration modes.

### Surface Host

- [x] Implement `A2UISurfaceHost`.
- [x] Use `SurfaceRenderer` internally.
- [x] Add local pending/done/error UI.
- [x] Add done-state auto-clear.
- [x] Add disabled/read-only preview mode.
- [x] Add no-op action mode for Admin preview.
- [x] Add unknown/non-renderable surface fallback.

### PoC Refactor

- [x] Replace direct `SurfaceRenderer` action wiring in PoC chat with `A2UISurfaceHost`.
- [x] Move action execution into a PoC-specific adapter.
- [x] Keep `executeSurfaceAction` and `refreshAfterAction` app-specific.
- [x] Ensure `ChatAssistantPanel` no longer owns reusable A2UI host behavior.
- [x] Ensure Admin preview uses no-op/read-only host mode if useful.

### Production Chatbot Adapter

- [ ] Inspect the production chatbot component API. Blocked until that library/API is available in this repo or provided externally.
- [ ] Identify its custom renderer extension point. Blocked until that library/API is available.
- [x] Implement inline message adapter if supported.
- [x] Implement tool-result adapter shape if supported.
- [x] Implement active surface panel fallback if inline rendering is not supported.
- [x] Document required backend response shape for the production chatbot.

### Backend and Runtime

- [x] Standardize chat response shape with optional `surface`.
- [x] Standardize action response shape with optional updated `surface`.
- [x] Confirm Python chat endpoint preserves `surfaceConfig`.
- [x] Confirm Node/MCP chat path preserves `surfaceConfig`.
- [x] Add tests for action response updating the host surface/status state.

### Tests

- [x] Unit test `A2UISurfaceHost` renders a dynamic `surfaceConfig`.
- [x] Unit test action pending -> done -> clear.
- [x] Unit test action error state.
- [x] Unit test updated surface callback/status contract through adapter result shape.
- [x] Unit test read-only/no-op preview mode.
- [x] Regression test Finding 1: save/load/simulate surfaceConfig.
- [x] Regression test Finding 2: added deploy parts have configurable props.
- [x] Regression test Finding 3: action status clears.

### Verification

- [x] Run `npx tsc --noEmit`.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] HTTP-smoke `/assistant` route from built Next server.
- [x] HTTP-smoke `/a2ui-test` and `/a2ui-test/admin` routes from built Next server.
- [ ] Browser-click verify `/assistant` deploy flow. Requires local browser automation permission.
- [ ] Browser-click verify Admin Surface preview and save flow. Requires local browser automation permission.
- [ ] Browser-verify the generic chatbot embedding example. This is a code example, not a running route yet.

## Open Questions

- Which production chatbot library will receive the integration first?
- Does that library support inline custom React rendering inside messages?
- Does it have a tool-call/result rendering API?
- Should action status be displayed by A2UI host, the chatbot, or both?
- Should updated surfaces replace the original message surface or update a global active surface panel?
- Should `A2UISurfaceHost` support streaming partial surfaces later?

## Recommended First Cut

Do the smallest useful extraction first:

1. Add `A2UISurfaceHost` in a local integration folder.
2. Give it a host-provided `onAction` adapter.
3. Refactor the current PoC chat surface rendering to use it.
4. Keep the production chatbot adapter as a separate second step.
5. Only promote it to `packages/a2ui-chat` after one real chatbot library integration proves the API shape.
