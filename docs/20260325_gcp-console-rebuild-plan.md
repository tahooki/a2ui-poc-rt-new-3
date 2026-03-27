# GCP Console Rebuild Plan

## Goal

Rebuild the frontend presentation layer of the DevOps Chat POC into a GCP-style DevOps console while preserving the working in-memory engine underneath where it already matches the product spec.

## Execution Status

- Last updated: 2026-03-25
- Overall state: In progress
- Engine/UI boundary: locked
- Frontend redesign: implemented
- Old shell retirement: implemented
- Deploy IA note: deploy now follows `docs/20260325_deploy-workflow-restructure-plan.md` with `/deploy/image`, `/deploy/request`, `/deploy/run`, and `/assistant`
- Verification: blocked in current workspace because `node` / `npm` are not installed on `PATH`

## Implementation Note

### Preserved engine/runtime layer

- `src/devops-chat/store/app-store.ts`
- `src/devops-chat/data/seed/*.json`
- `src/devops-chat/types/domain.ts`
- `src/devops-chat/types/templates.ts`
- `src/devops-chat/lib/prompt-router.ts`
- `src/devops-chat/templates/build-template-envelope.ts`
- `src/devops-chat/view-models/build-console-view-model.ts`

### Replaced UI layer

- Route mounting now points to `src/devops-console/console-page.tsx`
- Shared shell moved to `src/devops-console/shell/*`
- Shared primitives/tokens moved to `src/devops-console/foundation/*`
- Page workspaces moved to `src/devops-console/pages/*`
- Assistant workspace moved to `src/devops-console/assistant/*`
- Typed template visuals moved to `src/devops-console/templates/*`
- Product-owned styling now lives in `src/devops-console/foundation/tokens.css`, `src/devops-console/console-page.module.css`, and `src/app/globals.css`

### Icon system decision

- Chosen strategy: one local Material-style outlined SVG registry
- Implemented at: `src/devops-console/foundation/icon-registry.tsx`
- Visible UI no longer mixes PatternFly iconography into the product layer

The target experience is:

- left navigation sidebar
- slim top header
- main admin workspace for `/deploy`, `/approve`, `/rollback`
- right-side AI workspace opened from a header icon trigger
- restrained radius, dense enterprise hierarchy, low-noise surfaces

This is a frontend publishing-only redesign. It should not be constrained by the current UI shell if fidelity would suffer.

## Design References

- `docs/20260324_json-devops-a2ui-poc-spec.md`
- `docs/20260324_json-devops-a2ui-poc-ux-ui-design.md`
- `docs/20260324_patternfly-adoption-plan.md`
- `docs/20260324_patternfly-component-mapping.md`
- `docs/20260325_patternfly-publishing-guide.md`
- `docs/20260325_page-development-todo.md`

## Current Codebase Read

The current repo is no longer just a static shell. These parts already exist and should be treated as implementation assets:

- route split: `src/app/deploy/page.tsx`, `src/app/approve/page.tsx`, `src/app/rollback/page.tsx`
- in-memory runtime/state: `src/devops-chat/store/app-store.ts`
- seed data: `src/devops-chat/data/seed/*.json`
- domain/template contracts: `src/devops-chat/types/domain.ts`, `src/devops-chat/types/templates.ts`
- prompt routing and template selection: `src/devops-chat/lib/prompt-router.ts`, `src/devops-chat/templates/build-template-envelope.ts`
- view-model derivation: `src/devops-chat/view-models/build-console-view-model.ts`
- page shell and styling that are safe to replace: `src/devops-chat/console-page.tsx`, `src/devops-chat/components/*`, `src/devops-chat/console-page.module.css`, `src/app/globals.css`

## In Scope

- full frontend redesign of the app shell and page presentation
- a new design system and token layer aligned to a GCP-style admin console
- intentional icon system selection and integration
- full redesign of `/deploy`, `/approve`, and `/rollback`
- chatbot moved into a separate right workspace pane opened from a header icon trigger
- component architecture that clearly separates reusable engine/state code from replaceable UI code
- responsive behavior for desktop and tablet, with a usable mobile fallback

## Out of Scope

- backend, auth, persistence, infra integration, or API changes
- changing the three route model
- reintroducing A2UI renderer or schema-driven UI generation
- expanding beyond deploy, approve, and rollback workflows
- rewriting working store/action logic only for stylistic reasons

## Design Assumptions

- Visual direction should feel closer to GCP Console than PatternFly demo pages.
- Radius should remain effectively zero or heavily restrained across cards, inputs, tables, and panes.
- Dense tables, panel dividers, and information hierarchy matter more than decorative cards.
- The assistant should read as an operator workspace, not a chat app.
- PatternFly may still be used where it accelerates structure, but visible UI should not look PatternFly-branded.
- Use one icon system only. Recommended direction: Material Symbols or another Google-adjacent outlined admin set. Do not mix PatternFly icons into the visible product layer.
- Next.js app-router structure stays in place; route files should remain thin entry points.

## Keep vs Rebuild

### Keep

- `src/devops-chat/store/app-store.ts`
  - Reason: already contains the page runtime, selection state, prompt actions, and template state transitions.
- `src/devops-chat/data/seed/*.json`
  - Reason: already satisfies the refresh-reset demo model.
- `src/devops-chat/types/domain.ts`
  - Reason: domain contracts are useful and largely UI-agnostic.
- `src/devops-chat/types/templates.ts`
  - Reason: typed template envelopes remain valid for the redesigned assistant workspace.
- `src/devops-chat/lib/prompt-router.ts`
  - Reason: routing intents/prompts to template states is engine behavior, not presentation behavior.
- `src/devops-chat/templates/build-template-envelope.ts`
  - Reason: template selection and payload shaping are reusable logic.
- `src/devops-chat/view-models/build-console-view-model.ts`
  - Reason: keep if it stays presentation-neutral; refactor only where current field names or grouping are coupled to the old shell.
- route entries in `src/app/*/page.tsx`
  - Reason: route split is correct; pages should continue to mount one page container each.

### Rebuild

- `src/devops-chat/console-page.tsx`
  - Reason: current composition assumes the old PatternFly shell and inline open drawer layout.
- `src/devops-chat/components/app-shell.tsx`
  - Reason: header/nav structure does not match the target sidebar + slim top header frame.
- `src/devops-chat/components/assistant-drawer.tsx`
  - Reason: assistant must become a dedicated right workspace pane with icon-triggered open/close behavior.
- `src/devops-chat/components/admin-table-card.tsx`
  - Reason: table presentation must be redesigned for denser GCP-style admin hierarchy.
- `src/devops-chat/components/detail-panel-card.tsx`
  - Reason: detail surfaces and metadata hierarchy need new layout rules.
- `src/devops-chat/components/summary-strip.tsx`
  - Reason: KPI presentation should move from card-centric strip to a calmer console summary language.
- `src/devops-chat/components/toolbar-strip.tsx`
  - Reason: filters and actions need a more console-like command bar.
- `src/devops-chat/components/templates/*`
  - Reason: the template visuals should be redesigned inside the new assistant workspace.
- `src/devops-chat/console-page.module.css`
  - Reason: tightly coupled to the current shell.
- large parts of `src/app/globals.css`
  - Reason: current tokens and overrides are PatternFly-first; the redesign needs product-owned tokens first.

### Conditional Keep

- PatternFly package usage in `package.json`
  - Keep only where it still helps structure without fighting the new UI.
  - If component overrides become heavier than custom implementation, replace the affected PatternFly surfaces instead of forcing fidelity through overrides.
- `@patternfly/react-icons`
  - Expect to remove from the visible product surface once the new icon system is adopted.

## New UI Layer Architecture

Build a new UI layer that consumes the existing engine rather than continuing to mutate the current shell.

### Proposed Structure

```txt
src/devops-console/
  shell/
    app-frame.tsx
    sidebar-nav.tsx
    top-header.tsx
    workspace-layout.tsx
    assistant-workspace.tsx
  foundation/
    tokens.css
    typography.ts
    icon-registry.tsx
    status-chip.tsx
    data-table.tsx
    property-list.tsx
    empty-state.tsx
  pages/
    deploy-workspace.tsx
    approve-workspace.tsx
    rollback-workspace.tsx
  sections/
    summary-band.tsx
    filter-bar.tsx
    detail-sidebar.tsx
    activity-timeline.tsx
  assistant/
    assistant-header.tsx
    context-summary.tsx
    activity-log.tsx
    command-composer.tsx
    template-surface.tsx
  templates/
    quick-deploy-launchpad.tsx
    deployment-approval-inbox.tsx
    rollback-summary.tsx
    dry-run-stepper.tsx
    confirm-action.tsx
```

### Integration Boundary

- `src/app/*/page.tsx` should mount a new page container from the new UI layer.
- The new UI layer should read from the existing Zustand store selectors and existing template builders.
- If current `build-console-view-model.ts` proves too tied to old sections, split it into:
  - domain selectors and derived counts that remain shared
  - new page-presenter mappers owned by the new UI layer

### Layout Contract

- Left sidebar: product name, environment scope, global navigation.
- Top header: page title, scoped actions, assistant icon trigger, status/meta area.
- Main workspace: summary band, filters/commands, table-first operational canvas, supporting detail pane.
- Right assistant workspace: closed by default on smaller screens, persistent/openable on large screens, always contextual to current route and selected row.

## Todo List

### 1. Lock the redesign direction and reusable engine boundary

- Title: Freeze redesign scope and preserve-engine boundary
- Summary: Document that the redesign will replace the current shell/components while preserving the runtime store, seed data, template contracts, and prompt/action engine unless a concrete UI blocker is found.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - A shared implementation note exists naming the files to preserve versus replace.
  - No execution task assumes a full rewrite of store/data logic by default.
  - The team has one agreed boundary for “engine” versus “UI layer.”
- Blocker if any: None.

### 2. Define the new product design system

- Title: Create GCP-style console token and component rules
- Summary: Replace the current PatternFly-first visual layer with product-owned tokens for color, typography, borders, spacing, elevation, density, and motion.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - A token source defines app background, pane backgrounds, borders, text hierarchy, accent states, and table density.
  - Border radius rules are explicitly near-zero across all primitives.
  - Typography and spacing rules are documented for shell, tables, panels, and assistant workspace.
- Blocker if any: Depends on agreement that the redesign is not constrained by the current shell.

### 3. Choose and integrate a single icon system

- Title: Standardize iconography for the new console
- Summary: Adopt one admin-appropriate icon system, map it to nav/status/action use cases, and remove visible mixed iconography.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - One icon package or asset strategy is chosen and documented.
  - Header trigger, sidebar items, status markers, and assistant affordances all use the same icon family.
  - PatternFly icons are not mixed into the visible final UI unless intentionally wrapped behind the new icon registry.
- Blocker if any: None.

### 4. Build a new app frame instead of extending the current shell

- Title: Implement the new sidebar + top-header + workspace frame
- Summary: Create a new page frame with left navigation, slim header, central workspace, and right assistant region rather than adapting `console-page.tsx`.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/deploy`, `/approve`, and `/rollback` all render inside the new shared frame.
  - Navigation persists across pages without reverting to the old header layout.
  - The assistant trigger lives in the top header and controls the right workspace pane.
- Blocker if any: Depends on token and icon direction.

### 5. Create a new assistant workspace model

- Title: Replace the drawer with a right-side operator workspace
- Summary: Rebuild the assistant as a contextual workspace pane with header, context summary, action intents, compact log, template region, and command composer.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - The assistant is opened from a header icon trigger.
  - The pane feels like a tool workspace rather than a messaging drawer.
  - The pane can render existing typed templates and composer interactions from the store.
- Blocker if any: Depends on the new app frame.

### 6. Build reusable low-level console primitives

- Title: Implement reusable console UI primitives
- Summary: Create reusable status chips, table primitives, property lists, section headers, filters, and empty states so the three pages share one language.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - Shared UI primitives exist for dense data table, semantic status, key-value detail sections, and command bars.
  - New page implementations do not duplicate status styling or metadata rendering logic.
  - Primitives align to the new design tokens and icon system.
- Blocker if any: Depends on token definition.

### 7. Refactor view-model consumption for the new UI layer

- Title: Adapt state selectors and view models to the new presentation layer
- Summary: Keep the current store/actions but expose selectors or presenters that fit the new page frame, table sections, detail panes, and assistant workspace.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - The new UI layer reads route state, row selection, summary counts, assistant context, and templates from stable selectors or presenter functions.
  - Presentation mapping no longer depends on old component assumptions such as old strip/card structures.
  - Existing actions continue to drive visible updates without route reloads.
- Blocker if any: Depends on the new shell structure being defined.

### 8. Rebuild `/deploy` as a release-operations workspace

- Title: Redesign `/deploy`
- Summary: Present deployment preparation as a dense operational console with a table-first main area, structured release detail, and assistant-driven launchpad in the right workspace.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/deploy` reads as execution preparation, not a generic dashboard.
  - The selected service and release target are obvious within one screen.
  - The existing deploy launchpad template works inside the new assistant workspace and reflects live store state.
- Blocker if any: Depends on shared primitives and selector adaptation.

### 9. Rebuild `/approve` as a risk-review workspace

- Title: Redesign `/approve`
- Summary: Make risk, verification evidence, change scope, and rollback readiness the primary reading order while preserving approve/hold actions through the existing state engine.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/approve` has a visibly different emphasis from `/deploy` while sharing the same shell.
  - Risk and verification are more prominent than general metadata.
  - Approval and hold actions update the UI through the existing assistant/state path.
- Blocker if any: Depends on shared primitives and selector adaptation.

### 10. Rebuild `/rollback` as a recovery workspace

- Title: Redesign `/rollback`
- Summary: Present rollback candidates, blast radius, last stable version, dry run stage, and final confirm stage in a calm but high-risk recovery layout.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/rollback` clearly communicates recovery context and rollback target.
  - Dry run and confirm remain distinct stages in the assistant workspace.
  - Existing rollback state transitions remain visible across table, detail, and assistant surfaces.
- Blocker if any: Depends on shared primitives and selector adaptation.

### 11. Re-skin or rebuild assistant templates in the new system

- Title: Redesign typed assistant templates
- Summary: Keep the existing template IDs and typed payloads, but rebuild the visible template components to match the new console design system.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `quick_deploy_launchpad`, `deployment_approval_inbox`, `rollback_summary`, `dry_run_stepper`, and `confirm_action` all match the new system visually.
  - Template states still map correctly to the existing store/action flows.
  - Templates feel like operational work surfaces, not generic cards.
- Blocker if any: Depends on the assistant workspace and design system.

### 12. Remove obsolete UI layer paths after parity is reached

- Title: Retire or isolate the old shell
- Summary: Once the new UI layer reaches route parity, remove or quarantine old shell components and CSS to avoid dual-system drift.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - Old shell files are either deleted or clearly marked unused.
  - Route pages do not import the old `console-page.tsx` path anymore.
  - The codebase has one active frontend design system, not two competing ones.
- Blocker if any: Depends on full parity across all three routes.

### 13. Validate responsive and operational behavior

- Title: Verify responsive behavior and workflow continuity
- Summary: Confirm that the new frame remains usable across breakpoints and that the redesign did not break selection, assistant routing, or in-memory state transitions.
- Owner Hint: at-builder
- Status: Blocked
- Blocker detail: this workspace currently has no `node`, `npm`, `pnpm`, `yarn`, or `bun` executable on `PATH`, so lint/build and browser validation could not be executed here.
- Acceptance Criteria:
  - Desktop supports the intended multi-pane experience.
  - Tablet preserves usable navigation, table reading, and assistant access.
  - Refresh still resets to seed state.
  - `/deploy`, `/approve`, and `/rollback` each complete their core assistant-driven flow.
- Blocker if any: Depends on implementation completion.

## Recommended Phasing

### Phase 1

- Todos 1 through 4
- Outcome: design direction, icon system, token system, and new app frame are in place

### Phase 2

- Todos 5 through 7
- Outcome: assistant workspace and state integration work against the new shell

### Phase 3

- Todos 8 through 11
- Outcome: all three pages and all assistant templates are redesigned in the new system

### Phase 4

- Todos 12 through 13
- Outcome: old shell is retired and the rebuilt frontend is validated

## Risks

- The current view-model builder may be more presentation-coupled than it first appears.
  - Mitigation: split shared selectors from page-presenter mapping early.
- PatternFly components may slow fidelity if heavily overridden.
  - Mitigation: stop forcing PatternFly where custom primitives are cleaner.
- GCP-style imitation can drift into shallow visual mimicry without operational clarity.
  - Mitigation: prioritize hierarchy, density, and workflow structure over brand-like cosmetics.
- The assistant pane can regress into a chat UI if template hierarchy is not enforced.
  - Mitigation: keep conversation compact and make typed work surfaces dominant.
- Mobile can become an afterthought because the target layout is multi-pane.
  - Mitigation: define collapse behavior for sidebar and assistant workspace before page polish begins.

## Final Acceptance Criteria

- The app presents as a cohesive GCP-style DevOps console rather than a PatternFly-themed demo.
- `/deploy`, `/approve`, and `/rollback` all use the same new shell and design system but preserve distinct operational hierarchy.
- The assistant opens from a header icon and behaves as a right-side workspace, not a default chat drawer.
- Existing seed-driven state transitions still work for deploy, approve/hold, dry run, confirm, and rollback execution.
- Engine logic and UI code are clearly separated so future design iterations do not require store rewrites.
