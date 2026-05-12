# Admin Resolver/Action Driven Editing Plan

Date: 2026-04-17

## Background

The current admin console feels like a raw `template-catalog.json` editor. It works for a proof of concept, but it asks the operator to understand and maintain internal JSON structure directly.

The desired product shape is different:

```text
Operator edits template behavior with inputs
-> Admin generates catalog JSON
-> Admin shows generated output JSON for inspection
-> Save writes the generated JSON
-> MCP uses the saved configuration on the next call
```

In this model, the main editing surface should be Resolver and Action configuration. Contract should not be a separate user-facing editor because it duplicates information already implied by resolvers, bindings, and actions.

## Current Problems

### 1. Contract is misleading

`contract.requiredFields` and `contract.optionalFields` are exposed in admin JSON, but runtime validation still uses hard-coded schemas in `payload-validator.ts`.

This means:

- Adding a required field in Admin does not actually enforce it.
- Removing a required field in Admin may still fail runtime validation.
- Operators can think they changed the template contract when they only changed metadata.

### 2. Actions are not runtime-driven

The MCP envelope returns `actions`, but the UI template components render hard-coded buttons. Editing `actions` in the catalog changes API output, but it does not reliably change the rendered buttons.

### 3. Resolver configuration will grow

Deploy surfaces already need multiple data sources:

- service detail
- deployment history
- filtered history for the selected service
- risk summary
- optional LLM generated text

A single `resolver` object will not scale. Resolver configuration should support multiple resolver cards.

### 4. Raw JSON UI is too low-level

The current admin UI makes JSON the primary editing experience. The intended experience should be:

- input controls first
- operational status summary at the top
- generated JSON as secondary inspection output
- raw JSON editing only as an advanced fallback

### 5. Simulate does not match runtime

The simulate endpoint currently applies binding to provided facts only. It skips real API resolver and LLM resolver behavior, so simulation can diverge from actual `a2ui.resolveTemplateData`.

## Product Direction

The admin console should become a template behavior builder, not a JSON editor.

Primary concepts:

- **Resolvers** define what inputs are required and what data is produced.
- **Actions** define which buttons/commands are available and when they are enabled.
- **Payload assembly** remains template-owned for now. Admin edits resolvers/actions, while code-owned binding recipes and template helpers map resolver output into the known payload shape.
- **Generated validation** is derived from resolver/action settings.
- **Generated JSON** is visible but not the primary editing surface.
- **Contract** is removed from the main UI and becomes internal/generated metadata only if needed.

## Target UX

```text
+-------------------------------------------------------------+
| Deploy Launchpad                                            |
| Published · Valid · Saved                                   |
| Ready to render deploy surface                              |
|                                                             |
| Latest simulation                                           |
| payments-api / production · Target v2.3.18-rc1              |
| Last deployment: success · Missing inputs: none             |
+-------------------------------------------------------------+

Tabs:
Basic | Resolvers | Actions | Simulate | Generated JSON

Resolvers
[>] service          HTTP GET    requires: serviceName    output: service
[>] deployments      HTTP GET    optional                 output: deployments
[>] historyFilter    Transform   requires: serviceName    output: deploymentHistory
[>] riskSummary      LLM         optional                 output: riskSummary
[+] Add resolver

Actions
[>] deploy.start     Primary Submit    requires: service, environment, targetVersion
[>] deploy.refresh   Ghost Refresh     always available
[+] Add action

Generated JSON
[collapsed by default]
```

## Concept Clarification

### Resolver

A resolver is a data-producing step. It declares:

- what facts it needs before execution
- how it fetches or derives data
- where its output is stored
- which outputs are required for the template to be considered valid
- whether failure blocks rendering or only removes optional enrichment

Example:

```json
{
  "id": "service",
  "kind": "http_get",
  "label": "Service detail",
  "phase": "blocking",
  "requiredFacts": ["serviceName"],
  "optionalFacts": ["environment"],
  "endpoint": "/api/services/{serviceName}",
  "outputAlias": "service",
  "requiredOutputs": ["recommendedVersion", "availableImages"],
  "assign": {
    "recommendedVersion": "service.recommendedVersion",
    "availableImages": "service.availableImages"
  }
}
```

Resolver phases:

- `blocking`: missing required facts or failed required outputs stop rendering.
- `optional`: missing facts or failed execution are shown in trace, but the surface can still render.
- `actionOnly`: reserved for data that only enables an action and should not block the base surface.

### Action

An action is a command the user can trigger from the rendered surface. It declares:

- button label and visual variant
- action kind
- required payload fields
- enablement condition
- optional confirmation and params

Example:

```json
{
  "actionId": "deploy.start",
  "label": "배포 시작",
  "variant": "primary",
  "kind": "submit",
  "requiredPayloadFields": ["service", "environment", "targetVersion"],
  "enableWhen": {
    "field": "state",
    "equals": "ready"
  }
}
```

### Generated Validation

Instead of asking the operator to edit a separate Contract, Admin derives validation from Resolver and Action settings.

```text
resolver.requiredFacts
-> used by decision / ask-followup logic

resolver.requiredOutputs
-> used after resolver execution

action.requiredPayloadFields
-> used to show enabled/disabled action state, not to invalidate the whole surface

binding recipe output
-> used to validate renderable payload fields
```

Render validation and action enablement are separate:

- Render validation checks the minimum fields needed to draw the surface.
- Action enablement checks fields needed to click a specific button.
- An unavailable action should be disabled or hidden without making the whole surface invalid.

## Proposed Catalog Shape

The stored catalog should move toward this shape.

```json
{
  "templateId": "deploy_launchpad",
  "schemaVersion": 2,
  "version": "1.0.0",
  "title": "Deploy Launchpad",
  "status": "published",
  "description": "서비스명 기반 배포 준비 정보를 카드로 보여주는 A2UI 템플릿",
  "resolvers": [
    {
      "id": "service",
      "kind": "http_get",
      "label": "Service detail",
      "phase": "blocking",
      "requiredFacts": ["serviceName"],
      "optionalFacts": ["environment"],
      "endpoint": "/api/services/{serviceName}",
      "outputAlias": "service",
      "requiredOutputs": ["recommendedVersion", "availableImages"],
      "assign": {
        "recommendedVersion": "service.recommendedVersion",
        "availableImages": "service.availableImages",
        "environments": "service.environments"
      }
    },
    {
      "id": "deployments",
      "kind": "http_get",
      "label": "Deployment history source",
      "requiredFacts": [],
      "optionalFacts": [],
      "endpoint": "/api/deployments",
      "outputAlias": "deployments",
      "requiredOutputs": []
    },
    {
      "id": "deploymentHistory",
      "kind": "transform_filter",
      "label": "Filter history by service",
      "requiredFacts": ["serviceName"],
      "inputPath": "deployments.history",
      "filter": {
        "field": "service",
        "fact": "serviceName"
      },
      "outputAlias": "deploymentHistory",
      "requiredOutputs": []
    }
  ],
  "bindingRecipeId": "deploy_launchpad",
  "actions": [
    {
      "actionId": "deploy.start",
      "label": "배포 시작",
      "variant": "primary",
      "kind": "submit",
      "requiredPayloadFields": ["service", "environment", "targetVersion"],
      "enableWhen": {
        "field": "state",
        "equals": "ready"
      }
    },
    {
      "actionId": "deploy.refresh",
      "label": "초안 새로 고침",
      "variant": "ghost",
      "kind": "refresh",
      "requiredPayloadFields": [],
      "enableWhen": null
    }
  ],
  "generatedValidation": {
    "requiredFacts": ["serviceName"],
    "renderRequiredPayloadFields": ["templateId", "state", "service", "environment", "targetVersion", "strategy"],
    "actionRequiredPayloadFields": {
      "deploy.start": ["service", "environment", "targetVersion"],
      "deploy.refresh": []
    },
    "requiredResolverOutputs": {
      "service": ["recommendedVersion", "availableImages"]
    }
  }
}
```

Notes:

- `generatedValidation` is not edited directly.
- It may be persisted for debugging, or computed in memory only.
- Existing single `resolver` catalogs should be supported during migration.
- `bindingRecipeId` can remain internal for now.
- `schemaVersion` is required once the catalog is saved in the resolver/action-driven shape.
- `assign` maps resolver output paths into the flat resolver data consumed by the code-owned binding recipe.

## Admin UI Plan

### Header Summary

Replace the current long JSON-style summary with operational status.

Show:

- template title
- published/draft/disabled status
- saved/unsaved/error state
- validation state
- latest simulation result
- missing required facts, if any

Do not show:

- full required field lists
- all action JSON
- raw binding details
- long catalog summary tables

### Resolvers Tab

Use accordion cards.

Collapsed card content:

```text
service · HTTP GET · requires serviceName · output service
```

Expanded fields:

- Resolver ID
- Label
- Kind
- Enabled
- Required facts
- Optional facts
- Output alias
- Required outputs
- Kind-specific config
  - `http_get`: endpoint
  - `transform_filter`: input path, filter field, filter fact
  - `llm_summary`: input aliases, prompt key
- Test resolver button
- Last test result

### Actions Tab

Use accordion cards.

Collapsed card content:

```text
deploy.start · Primary · Submit · requires service, environment, targetVersion
```

Expanded fields:

- Action ID
- Label
- Variant
- Kind
- Required payload fields
- Enable condition
- Confirm title/message
- Params template
- Delete action

### Simulate Tab

Simulation should be close to runtime behavior.

Inputs:

- intent key
- facts key/value editor
- optional raw facts JSON advanced editor

Output:

- decision mode
- missing facts
- resolver trace
- generated payload
- validation result
- final SurfaceEnvelope JSON
- rendered preview if available

### Generated JSON Tab

Generated JSON is read-only by default.

Sections:

- Catalog JSON
- Generated validation
- Last simulated SurfaceEnvelope

Advanced option:

- Edit raw JSON
- Requires explicit toggle
- Save should still run deep validation

## Server Plan

### Catalog Store

Add deep validation for stored templates.

Validation must check:

- template identity fields
- status enum
- unique resolver IDs
- resolver kind enum
- required/optional facts are string arrays
- output aliases are valid strings
- required outputs are string arrays
- action IDs are unique
- action label is string
- action variant/kind enums are valid
- action required payload fields are string arrays
- known `bindingRecipeId`
- no unsupported resolver/action shapes are saved silently

### Decision Engine

Derive required facts from all enabled resolvers.

Rules:

- If any enabled `blocking` resolver has missing `requiredFacts`, return `ask_followup`.
- If all required facts are present, allow `render_surface`.
- Optional resolver facts do not block rendering.
- Existing `intents[]` can remain temporarily, but long term the resolver requirements should be the source of truth.

### Resolver Runtime

Replace single resolver execution with ordered resolver pipeline.

Execution model:

```text
context facts
-> resolver output map
-> binding recipe
-> payload
-> generated validation
-> SurfaceEnvelope
```

Initial resolver kinds:

- `http_get`
- `transform_filter`
- `static_defaults`
- `llm_summary`

Resolver dependency rules:

- Resolvers execute in array order.
- A resolver may read prior resolver output via dot paths such as `deployments.history`.
- Missing dependency input fails `blocking` resolvers and skips `optional` resolvers.
- Cycles are avoided by not allowing resolvers to read outputs produced later in the array.

Backward compatibility:

- Existing `resolver.kind = deploy_service | approval_queue | rollback_incidents` should be converted internally into `resolvers[]`.

### Payload Validation

Stop treating user-editable `contract` as the source of truth.

Use generated validation:

- template-level minimum render fields from built-in template metadata
- required resolver outputs

Do not use action required fields as render validation. They only determine whether a specific action is enabled.

For the migration phase, hard-coded schemas can remain as a safety net, but Admin should not expose them as editable Contract.

### Actions Runtime

Pass `envelope.actions` into template rendering.

Templates should:

- render actions from envelope actions
- apply `requiredPayloadFields`
- apply `enableWhen`
- call `onAction` with the configured action ID/kind/params

Fallback:

- If no actions are provided, templates may use default built-in actions.

### Simulation Runtime

Make `/admin/templates/:templateId/simulate` call the same path as MCP `a2ui.resolveTemplateData`, or refactor shared runtime logic so both routes use the same function.

Simulation must include:

- resolver execution
- LLM resolver execution if configured
- binding
- validation
- final envelope generation

## Security Plan

The admin HTML must stop writing unescaped user-editable values into `innerHTML`.

Required changes:

- Escape all values before HTML insertion.
- Avoid inline `onclick` with user-controlled IDs.
- Prefer DOM creation and event listeners.
- Treat raw JSON editor content as untrusted input.

## Migration Strategy

Phase 1 should be backward compatible.

Existing catalog:

```json
{
  "resolver": {
    "kind": "deploy_service"
  },
  "contract": {
    "requiredFields": []
  }
}
```

Migration behavior:

- Keep reading old `resolver`.
- Generate equivalent `resolvers[]` in memory.
- Hide `contract` in UI.
- Save in the new `resolvers[]` shape after the first Admin save.
- Write `schemaVersion: 2` on save.
- Keep generated validation reproducible from source settings so rollback is possible by restoring the JSON file.

## Todo List

### Phase 1. Planning and Model

- [ ] Define `ResolverConfig` TypeScript types.
- [ ] Define `ActionConfig` TypeScript types.
- [ ] Define generated validation shape.
- [ ] Decide whether `generatedValidation` is persisted or computed in memory only.
- [ ] Document migration from `resolver` to `resolvers[]`.

### Phase 2. Catalog Validation

- [ ] Replace shallow `validateStoredTemplate` with deep validation.
- [ ] Validate resolver IDs, kinds, facts, aliases, and required outputs.
- [ ] Validate action IDs, labels, variants, kinds, and required payload fields.
- [ ] Validate known `bindingRecipeId`.
- [ ] Add unit tests for invalid nested resolver config.
- [ ] Add unit tests for invalid nested action config.
- [ ] Add unit tests for unknown `bindingRecipeId`.

### Phase 3. Resolver Pipeline

- [ ] Add `resolvers[]` support to catalog type.
- [ ] Add backward compatibility adapter for old single `resolver`.
- [ ] Implement ordered resolver execution.
- [ ] Implement `http_get` resolver.
- [ ] Implement `transform_filter` resolver.
- [ ] Implement `static_defaults` resolver.
- [ ] Keep existing deploy/approval/rollback resolver behavior through adapter.
- [ ] Update `a2ui.resolveTemplateData` to use shared resolver pipeline.
- [ ] Add tests for multi-resolver deploy flow.

### Phase 4. Generated Validation

- [ ] Derive required facts from enabled resolvers.
- [ ] Use derived required facts in decision / ask-followup logic.
- [ ] Derive action required payload fields.
- [ ] Validate resolver required outputs after execution.
- [ ] Validate action enablement against generated payload.
- [ ] Stop exposing editable Contract in Admin UI.
- [ ] Keep hard-coded schemas only as a temporary safety net.

### Phase 5. Action-Driven Rendering

- [ ] Extend template component props to receive `actions`.
- [ ] Pass `envelope.actions` from `SurfaceRenderer` to templates.
- [ ] Update `DeployLaunchpad` to render configured actions.
- [ ] Update `ApprovalQueueInbox` to render configured actions where applicable.
- [ ] Update `RollbackSummary` to render configured actions where applicable.
- [ ] Add fallback default actions for envelopes without actions.
- [ ] Add tests or preview cases proving catalog action edits affect rendered buttons.

### Phase 6. Admin UI Redesign

- [ ] Replace raw JSON-first screen with form-first layout.
- [ ] Build operational header summary.
- [ ] Build Resolvers accordion UI.
- [ ] Build Actions accordion UI.
- [ ] Remove user-facing Contract tab/section.
- [ ] Move generated JSON to collapsed/read-only panel.
- [ ] Add explicit Advanced raw JSON edit mode.
- [ ] Track saved/unsaved/error states.
- [ ] Show validation result in the top summary.

### Phase 7. Simulation

- [ ] Refactor MCP resolve logic into shared function.
- [ ] Make admin simulate route call the shared resolve function.
- [ ] Show decision result.
- [ ] Show resolver trace.
- [ ] Show generated payload.
- [ ] Show validation errors.
- [ ] Show final SurfaceEnvelope JSON.
- [ ] Add rendered preview if available.

### Phase 8. Security and Robustness

- [ ] Remove unsafe `innerHTML` rendering for user-controlled values.
- [ ] Remove inline `onclick` with template IDs.
- [ ] Escape all text values in generated preview.
- [ ] Add route-level error handling for malformed JSON and store read failures.
- [ ] Add write safety for `template-catalog.json` writes.
- [ ] Consider backup file or atomic write for catalog saves.

### Phase 9. Verification

- [ ] Run `npx vitest run packages/a2ui-admin/__tests__`.
- [ ] Add admin route tests for create/update/simulate.
- [ ] Add resolver pipeline tests.
- [ ] Add action rendering tests.
- [ ] Manually verify `http://localhost:3100`.
- [ ] Verify editing resolver required facts changes ask-followup behavior.
- [ ] Verify editing actions changes rendered buttons.
- [ ] Verify generated JSON is saved to `packages/a2ui-admin/data/template-catalog.json`.

## Open Questions

- Should `intents[]` remain as a separate concept, or should intent matching be derived from resolver requirements plus template metadata?
- Should `bindingRecipeId` remain a code-owned internal field, or should binding become editable later?
- Should generated validation be persisted for debugging or computed every time?
- Should Admin save new catalog files with backward-compatible `resolver` plus new `resolvers[]`, or move fully to `resolvers[]`?
- Should templates support disabled actions visually, or hide unavailable actions entirely?

## Recommendation

For the next implementation pass:

1. Remove Contract from the visible Admin editing model.
2. Add `resolvers[]` with required/optional fact settings.
3. Add action required field and enablement settings.
4. Generate validation from Resolver and Action settings.
5. Keep generated JSON visible but secondary.
6. Fix the review findings as part of the migration, not as isolated patches.
