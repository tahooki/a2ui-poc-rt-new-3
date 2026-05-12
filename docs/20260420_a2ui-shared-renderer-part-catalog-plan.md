# A2UI Shared Renderer and Part Catalog Plan

Date: 2026-04-20

## Background

The current dynamic A2UI implementation proves that a saved `surfaceConfig` can render a deploy card through `SurfaceRenderer` and `DynamicA2UICardRenderer`.

The next structural issue is how Admin should know which A2UI parts exist, what props they accept, how to generate forms for them, and how to preview the same components that the chat frontend renders.

The important direction:

- The actual React components should remain in `@a2ui/ui`.
- The chat frontend and Admin preview should both use the same shared renderer.
- Admin should not manually import and branch on every React component.
- Admin should consume a shared part definition manifest that describes each part's public contract.
- MCP/Admin runtime validation should also use the same manifest or a generated equivalent.

In short:

```text
Edit with part definitions.
Render with the shared renderer.
Validate with the same part contract.
```

## Goal

Create a shared A2UI part catalog structure so that:

1. Admin can list available parts from shared definitions.
2. Admin can generate part edit forms from shared editor metadata.
3. Admin can create default part props without hard-coded switch statements.
4. Admin can preview individual parts and full cards through the same renderer used by the frontend.
5. MCP/Admin runtime can validate `surfaceConfig.parts[*].type` and basic prop contracts from the same source of truth.
6. Chat and Admin preview render the same `surfaceConfig + payload + actions` envelope through `SurfaceRenderer`.

## Implementation Status

Completed on 2026-04-20.

Implemented shape:

- Part definitions now live in `packages/a2ui-ui/src/parts/catalog`.
- `@a2ui/ui` exports the manifest helpers alongside the shared `SurfaceRenderer`.
- Deploy and shared parts have definitions, default props, generated editor fields, preview payloads, and required payload paths.
- The Admin Surface tab generates the add-part dropdown, part forms, and part previews from the manifest.
- The Admin Surface tab supports sample payload preview, resolved payload preview, draft config preview, and saved config preview.
- Admin/MCP catalog validation now uses the manifest for known part types, declared props, binding roots, and generated required payload fields.
- The Python demo agent path has tests proving `surfaceConfig` is preserved from MCP response to chat surface response.

## Non-Goals

This is not a general React component explorer.

Do not expose:

- arbitrary React component imports
- arbitrary props objects without a known part definition
- raw layout primitives
- raw CSS controls
- JavaScript expressions in bindings
- Admin-only visual forks of production components

Admin should edit A2UI part contracts, not React implementation details.

## Target Architecture

```text
@a2ui/contracts
  -> SurfaceEnvelope schema
  -> SurfaceConfig schema
  -> BindingValue schema

@a2ui/ui
  -> A2UI React part components
  -> SurfaceRenderer
  -> DynamicA2UICardRenderer
  -> part component registry

@a2ui/part-catalog or @a2ui/ui/src/parts/catalog
  -> part definition manifest
  -> default props
  -> editor field definitions
  -> preview payloads
  -> validation metadata

Admin Surface Editor
  -> reads part definitions
  -> generates forms
  -> generates surfaceConfig
  -> calls SurfaceRenderer for preview

MCP/Admin Runtime
  -> validates surfaceConfig using part definitions
  -> returns payload + actions + surfaceConfig

Chat Frontend
  -> receives envelope
  -> calls SurfaceRenderer
```

## Key Concept

Admin does not directly render parts like this:

```tsx
if (part.type === "DeployArtifactBlock") {
  return <DeployArtifactBlock image={...} />;
}
```

Instead, Admin creates a preview envelope and delegates rendering:

```tsx
<SurfaceRenderer
  envelope={{
    templateId: "preview",
    version: "1.0.0",
    payload,
    actions,
    surfaceConfig,
    sourceIntent: "admin.preview",
    updatedAt: new Date().toISOString()
  }}
  onAction={() => {}}
/>
```

The renderer resolves:

```text
part.type
-> component registry
-> binding resolver
-> React part component
```

Admin only needs the manifest to know how to edit the part.

## Proposed Part Definition Shape

```ts
type A2UIPartCategory =
  | "shared"
  | "deploy"
  | "approval"
  | "rollback";

type A2UIPartDefinition = {
  type: string;
  label: string;
  category: A2UIPartCategory;
  description?: string;
  defaultProps: Record<string, SurfaceConfigValue>;
  editorFields: A2UIPartEditorField[];
  previewPayload?: Record<string, unknown>;
  requiredPayloadPaths?: string[];
};

type A2UIPartEditorField =
  | {
      kind: "bindingPath";
      prop: string;
      label: string;
      defaultPath: string;
      fallback?: unknown;
    }
  | {
      kind: "staticStringList";
      prop: string;
      label: string;
      defaultValue: string[];
    }
  | {
      kind: "staticText";
      prop: string;
      label: string;
      defaultValue?: string;
    }
  | {
      kind: "select";
      prop: string;
      label: string;
      options: Array<{ label: string; value: string }>;
      defaultValue?: string;
    };
```

## Example Deploy Part Definition

```ts
export const DEPLOY_ARTIFACT_PART_DEF = {
  type: "DeployArtifactBlock",
  label: "Deploy artifact",
  category: "deploy",
  description: "Show the selected image/ECR artifact details.",
  defaultProps: {
    image: {
      type: "binding",
      path: "payload.imageDetail"
    }
  },
  editorFields: [
    {
      kind: "bindingPath",
      prop: "image",
      label: "Image detail binding",
      defaultPath: "payload.imageDetail"
    }
  ],
  previewPayload: {
    imageDetail: {
      repository: "payments-api",
      imageTag: "v2.3.18-rc1",
      imageUri: "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/payments-api:v2.3.18-rc1",
      gitRef: "refs/heads/release/payments-2.3",
      commitSha: "a18fe902",
      imageDigest: "sha256:9e6dd0c3c7ad91e5fe7a1187a1f3c4be",
      buildStatus: "push_verified",
      pushedAt: "2026-03-25 12:10 KST"
    }
  },
  requiredPayloadPaths: ["payload.imageDetail"]
} satisfies A2UIPartDefinition;
```

## Preview Model

Admin should support two preview levels.

### 1. Part Preview

Part preview renders one part inside a lightweight preview shell.

```text
part definition
-> defaultProps
-> previewPayload
-> minimal surfaceConfig with one part
-> SurfaceRenderer
```

Example:

```json
{
  "payload": {
    "imageDetail": {
      "repository": "payments-api",
      "imageTag": "v2.3.18-rc1"
    }
  },
  "surfaceConfig": {
    "kind": "a2ui_card",
    "parts": [
      {
        "id": "preview-artifact",
        "type": "DeployArtifactBlock",
        "props": {
          "image": {
            "type": "binding",
            "path": "payload.imageDetail"
          }
        }
      }
    ]
  }
}
```

### 2. Full Card Preview

Full card preview renders the current Admin-authored surface config.

Preview modes:

```text
Sample Payload
  -> use editor JSON or merged part preview payloads

Resolved Payload
  -> call Admin simulate endpoint
  -> use actual resolver output envelope
  -> optionally overlay unsaved surfaceConfig for draft preview
```

Recommended Admin UI:

```text
Surface Tab

Card Shell
  Title
  Subtitle binding
  Description binding
  Tone binding

Parts
  DeployTargetSummaryBlock
    Binding fields...
    [Preview part]

  DeployArtifactBlock
    Binding fields...
    [Preview part]

Full Preview
  [Sample payload] [Resolved payload]
  [Use saved config] [Use draft config]
```

## Runtime Contracts

### Renderer Contract

The renderer receives only an envelope:

```ts
type DynamicA2UIEnvelope = {
  templateId: string;
  version?: string;
  payload: Record<string, unknown>;
  actions?: TemplateAction[];
  surfaceConfig?: SurfaceConfig;
  sourceIntent: string;
  updatedAt: string;
  meta?: Record<string, unknown>;
};
```

### Admin Contract

Admin receives part definitions:

```text
listPartDefinitions()
getPartDefinition(type)
createDefaultPart(type)
getPreviewPayload(type)
```

### MCP/Admin Validation Contract

MCP/Admin runtime should validate:

- `surfaceConfig.kind === "a2ui_card"`
- every `parts[*].id` is present and unique
- every `parts[*].type` exists in the part definition manifest
- part props match known editor fields or declared prop schema
- binding paths use allowed roots: `payload`, `actions`, `meta`, eventually `context`

## Implementation Plan

### Phase 1. Introduce Part Definition Manifest

Create shared part definition types and move deploy part metadata out of Admin editor switch statements.

Candidate location:

```text
packages/a2ui-ui/src/parts/catalog/
  part-definition-types.ts
  shared-part-definitions.ts
  deploy-part-definitions.ts
  index.ts
```

Acceptance:

- `listPartDefinitions()` returns all shared and deploy parts.
- `getPartDefinition("DeployArtifactBlock")` returns default props, editor fields, and preview payload.
- Admin no longer owns the deploy part list as local constants.

### Phase 2. Refactor Admin Surface Editor

Make Admin generate the part list, add-part flow, and part forms from the manifest.

Acceptance:

- Add part dropdown is populated from `listPartDefinitions()`.
- New parts use `definition.defaultProps`.
- Part editor fields are generated from `definition.editorFields`.
- Deploy-specific switch statements are removed from Admin.

### Phase 3. Add Part Preview

Add a per-part preview in the Surface tab.

Acceptance:

- Each part row can show/hide a preview.
- Preview uses `SurfaceRenderer`, not direct component imports.
- Preview uses `definition.previewPayload` merged with the current editor payload.
- Preview reflects current binding field edits.

### Phase 4. Add Full Preview Modes

Split full preview into sample payload and resolved payload modes.

Acceptance:

- Sample preview uses editor JSON plus the current draft `surfaceConfig`.
- Resolved preview calls `POST /admin/templates/:templateId/simulate`.
- Resolved preview can render with saved config.
- Draft resolved preview can render resolver payload with unsaved draft `surfaceConfig`.
- Missing resolver facts show a useful error state.

### Phase 5. Share Validation With MCP/Admin Runtime

Replace local known-part lists in the MCP/Admin runtime with the shared manifest or a generated JSON artifact.

Acceptance:

- `validateStoredTemplate()` validates known part types from the manifest.
- Unknown part type still fails with a precise error.
- Validation can derive required payload paths from part definitions.
- Tests cover at least one valid deploy config and one unknown part type.

### Phase 6. Documentation and Demo Flow

Update the existing composition plan and demo notes to explain the shared renderer/manifest model.

Acceptance:

- Document the difference between edit manifest and render registry.
- Document how Admin preview uses the same renderer as chat.
- Add a demo checklist for Admin edit -> preview -> save -> chat render.

## TODO

### Types and Catalog

- [x] Add `A2UIPartDefinition` type.
- [x] Add `A2UIPartEditorField` type.
- [x] Add `A2UIPartCategory` type.
- [x] Add `shared-part-definitions.ts`.
- [x] Add `deploy-part-definitions.ts`.
- [x] Add `listPartDefinitions()`.
- [x] Add `getPartDefinition(type)`.
- [x] Add `createDefaultPart(type, index?)`.
- [x] Add preview payloads for deploy parts.

### Renderer

- [x] Keep `SurfaceRenderer` as the only public render entrypoint for preview and chat.
- [x] Add a minimal single-part preview helper if useful.
- [x] Ensure unknown part fallback remains visible in Admin preview.
- [x] Ensure preview action buttons are disabled or no-op in Admin.

### Admin Surface Editor

- [x] Replace local `DEPLOY_PART_TYPES` with part definition list.
- [x] Replace `defaultPropsForPart()` switch with definition defaults.
- [x] Replace `PartPropsEditor` switch with generated field rendering.
- [x] Add per-part preview toggle.
- [x] Add sample payload preview mode.
- [x] Add resolved payload preview mode.
- [x] Add draft/saved config preview toggle.
- [x] Show resolver errors and missing facts in preview.
- [x] Keep `Save surface` writing to Admin catalog.

### MCP/Admin Runtime

- [x] Replace `KNOWN_A2UI_PART_TYPES` local set with shared manifest or generated artifact.
- [x] Validate part props against manifest editor fields.
- [x] Derive required binding paths from part definitions.
- [x] Include required binding paths in generated validation output.
- [x] Add tests for valid deploy part definitions.
- [x] Add tests for unknown part type validation.

### Python and Agent Integration

- [x] Verify Python agent surface responses preserve `surfaceConfig`.
- [x] Add Python agent E2E test for `deploy.start -> payments-api -> surface`.
- [x] Assert returned surface contains deploy part types.
- [x] Document Python path as rule-based orchestration plus MCP render.

### Verification

- [x] Run `npx tsc --noEmit`.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run Admin server and verify catalog/simulate `surfaceConfig` flow.
- [x] Verify `/assistant` route loads from the built Next server.
- [x] Verify chat and Admin use the same `SurfaceRenderer` path for dynamic `surfaceConfig`.

## Open Questions

- Should the part catalog live in `@a2ui/ui` or a separate `@a2ui/part-catalog` package?
- Should MCP/Admin runtime import TypeScript definitions directly, or should it consume a generated JSON manifest?
- Should part preview use only `previewPayload`, or merge preview payload with the current template preview case?
- Should resolved preview call Admin REST directly or go through MCP tools?
- Should unsaved draft `surfaceConfig` be sent to the simulate endpoint, or overlaid client-side on the returned payload?

## Recommended First Cut

Do the smallest useful refactor first:

1. Add part definition manifest inside `packages/a2ui-ui/src/parts/catalog`.
2. Move deploy part default props and editor fields into that manifest.
3. Make `SurfaceConfigEditor` generate its add-part and field UI from the manifest.
4. Add per-part sample preview using `SurfaceRenderer`.
5. Keep MCP validation on the current local known type set for one more step.

Then follow with runtime validation sharing once the Admin editing model feels right.
