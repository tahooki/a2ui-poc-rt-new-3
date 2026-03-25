# DevOps Chat POC Page Development Todo

## Goal

Build `/deploy`, `/approve`, and `/rollback` from the current static PatternFly shell into an interaction-ready POC with JSON seed data, in-memory state, typed template rendering, and page-specific assistant workflows.

## In Scope

- Shell refactor from the current monolithic `DevopsConsolePage`
- JSON seed data and in-memory store setup
- Shared page foundation components and typed domain/template contracts
- Page-specific admin UI completion for deploy, approve, and rollback
- Assistant drawer template rendering and action flows
- State transitions for deploy, approval, dry run, confirm, and rollback actions
- Verification of responsive layout, reset behavior, and interaction consistency

## Out of Scope

- Real backend, DB, auth, or infra integration
- Persistent storage across refresh
- Reintroducing A2UI renderer or schema-driven UI tree generation
- Expanding beyond the three POC flows
- Broad admin-console features outside the documented scenarios

## Assumptions

- Refresh reset is intentional; state should always rehydrate from seed JSON.
- `Zustand` is the preferred client store unless the implementation team has a stronger local constraint.
- PatternFly remains a structure primitive only; product tone stays driven by repo CSS tokens.
- The current routes continue to be `/deploy`, `/approve`, and `/rollback`.
- Because this repo uses a nonstandard Next.js version, the implementer should read the relevant guide in `node_modules/next/dist/docs/` before changing app-router behavior.

## Todo List

### Phase 0. Current Baseline

- [x] Shared app shell and theme scaffold exist in `src/app/layout.tsx`, `src/app/globals.css`, and `src/devops-chat/console-page.module.css`.
  - Summary: PatternFly base CSS, product dark tokens, responsive spacing rhythm, and shell styling are already in place.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: Existing shell styling remains the visual baseline for refactor work.
  - Blocker: None.

- [x] Three page routes already resolve through a shared console renderer.
  - Summary: `src/app/deploy/page.tsx`, `src/app/approve/page.tsx`, and `src/app/rollback/page.tsx` already bind static content into `DevopsConsolePage`.
  - Owner Hint: at-builder
  - Acceptance Criteria: The route split remains intact during refactor; no single-page regression back to `/`.
  - Blocker: None.

- [x] Static page content model and shell skeleton already cover header, notice, summary, toolbar, table, detail panel, assistant drawer, and placeholder template card.
  - Summary: `src/devops-chat/content.ts` and `src/devops-chat/console-page.tsx` already express the intended information architecture for all three pages.
  - Owner Hint: at-builder
  - Acceptance Criteria: The plan should treat the current scaffold as replaceable foundation, not as missing work.
  - Blocker: None.

### Phase 1. Foundation Refactor

- [x] Split `DevopsConsolePage` into reusable shell components before adding behavior.
  - Summary: Extract app shell, summary strip, toolbar, admin table card, detail panel card, and assistant drawer shell so state wiring does not stay trapped in one file.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: `src/devops-chat/console-page.tsx` is reduced to orchestration or replaced by smaller composition files; shared shell pieces are reusable across all three routes.
  - Blocker: None.

- [x] Define shared domain and UI contracts for page data, rows, statuses, selected entities, and template envelopes.
  - Summary: Move the ad hoc `content.ts` types into dedicated domain/template types so seed loading, store state, and renderer props share one contract.
  - Owner Hint: at-builder
  - Acceptance Criteria: Types clearly separate domain data, derived page view models, and template payloads; status tones and page keys are not duplicated across files.
  - Blocker: None.

- [x] Formalize shared status and semantic display helpers.
  - Summary: Centralize label tone mapping, status formatting, and compact key-value/detail section helpers so deploy, approve, and rollback do not drift visually.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: Badge tone and section rendering are driven by shared utilities/components, not repeated page-local conditionals.
  - Blocker: None.

### Phase 2. Data and Store Setup

- [x] Add page seed JSON files for deploy, approve, and rollback scenarios.
  - Summary: Convert the current hardcoded page content into seed files that represent table data, selected defaults, summary metrics inputs, assistant context inputs, and template source data.
  - Owner Hint: at-builder
  - Acceptance Criteria: Seed data lives under a dedicated `src/devops-chat/data/seed/` structure; page reload restores original seed state without `localStorage`.
  - Blocker: None.

- [x] Implement the in-memory app store and bootstrapping flow.
  - Summary: Hydrate deep-copied seed data into a client store, expose per-page selectors, and provide reset-safe state initialization.
  - Owner Hint: at-builder
  - Acceptance Criteria: Store state survives client interactions during a session, resets on refresh, and exposes current page state, selected row, assistant state, and derived summaries.
  - Blocker: None.

- [x] Move static `content.ts` toward derived view-model builders.
  - Summary: Replace hardcoded page snapshots with functions that derive summary cards, detail groups, assistant context, and template envelopes from store state.
  - Owner Hint: at-builder
  - Acceptance Criteria: `content.ts` is either removed or reduced to builder logic; rendered UI reflects the current store instead of fixed strings.
  - Blocker: Depends on seed and store setup.

### Phase 3. Shared Interaction Wiring

- [x] Implement real row selection and selected-detail synchronization.
  - Summary: Clicking a table row should update the selected entity, detail panel content, assistant context, and template region for the active page.
  - Owner Hint: at-builder
  - Acceptance Criteria: Every page has a visible selected row state; changing selection updates the detail panel and assistant drawer without route reload.
  - Blocker: Depends on store selectors and derived content builders.

- [x] Wire the assistant drawer to page context and command state.
  - Summary: Make the drawer reflect the current page, selection, and suggested intents, and manage composer input as actual state rather than a static field.
  - Owner Hint: at-builder
  - Acceptance Criteria: Drawer header, context summary, messages, intents, and composer all update from store-backed state.
  - Blocker: Depends on shared state model.

- [x] Add empty, loading-like, and no-selection presentation states where needed.
  - Summary: Even in a seed-based POC, shell components should handle cases such as no selected row, cleared template region, and action-in-progress UI.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: No panel or drawer section appears broken or blank when state is absent or mid-transition.
  - Blocker: Depends on state wiring.

### Phase 4. Page-Specific Admin UI Completion

- [x] Complete `/deploy` admin page behavior and information density.
  - Summary: Add deploy-specific row selection behavior, detail sections for baseline/artifact/health/activity, and page actions that feel like execution prep rather than generic dashboard cards.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: `/deploy` clearly reads as a deployment-prep workspace with table-first hierarchy and restrained CTAs.
  - Blocker: Depends on shared shell refactor and state wiring.

- [x] Complete `/approve` admin page behavior and risk-first hierarchy.
  - Summary: Emphasize request review, verification evidence, rollback availability, and hold/approve clarity in both table and detail panel.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: `/approve` surfaces risk and verification before action buttons; approval context feels different from deploy and rollback while retaining the same shell rhythm.
  - Blocker: Depends on shared shell refactor and state wiring.

- [x] Complete `/rollback` admin page behavior and staged recovery structure.
  - Summary: Ensure current version, last stable version, blast radius, and recovery steps are visually legible, and keep dry run and final confirm as distinct stages.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: `/rollback` reads as a calm but high-risk recovery workspace; rollback target is visually prominent and not buried in detail text.
  - Blocker: Depends on shared shell refactor and state wiring.

### Phase 5. Template Component Work

- [x] Build the typed template renderer and template component registry.
  - Summary: Introduce a renderer that switches on `templateId` and passes typed payloads to dedicated React components.
  - Owner Hint: at-builder
  - Acceptance Criteria: Template rendering no longer uses one generic placeholder card; each supported template is rendered through a dedicated component path.
  - Blocker: Depends on shared type contracts.

- [x] Implement `quick_deploy_launchpad`.
  - Summary: Render service, environment, recommended version, rollout strategy, impact, preflight checks, and deploy CTA for the deploy flow.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: The deploy template supports at least `ready`, `deploying`, and `done` presentation states and is populated from store-derived data.
  - Blocker: Depends on template renderer and deploy view-model builders.

- [x] Implement `deployment_approval_inbox`.
  - Summary: Render request summary, risk, impact, verification, rollback availability, and approve/hold actions for the approval flow.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: The approval template supports at least `pending`, `approved`, and `hold` states and does not require rereading the full detail panel to act.
  - Blocker: Depends on template renderer and approval view-model builders.

- [x] Implement `rollback_summary`, `dry_run_stepper`, and `confirm_action`.
  - Summary: Break rollback into explicit summary, validation, and dangerous final-confirm components rather than one overloaded card.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: Rollback flow can progress from identified summary to dry run to confirm state with clearly distinct UI components.
  - Blocker: Depends on template renderer and rollback view-model builders.

### Phase 6. Actions and State Transitions

- [x] Add deploy actions and transition handling.
  - Summary: Support launch draft, start deploy, and completion updates that modify row status, assistant messages, template state, and relevant summary metrics.
  - Owner Hint: at-builder
  - Acceptance Criteria: Triggering deploy actions mutates in-memory state in observable ways on `/deploy` and remains resettable on refresh.
  - Blocker: Depends on store and `quick_deploy_launchpad`.

- [x] Add approval actions and transition handling.
  - Summary: Support approve and hold flows that update the approval queue, selected detail state, assistant messages, and related KPI summaries.
  - Owner Hint: at-builder
  - Acceptance Criteria: Approve/hold actions visibly change request state and assistant output on `/approve` without manual page refresh.
  - Blocker: Depends on store and `deployment_approval_inbox`.

- [x] Add rollback actions and staged transition handling.
  - Summary: Support identify summary, dry run start/completion, confirm, and executed rollback states with visible progression in the table, detail panel, and assistant template region.
  - Owner Hint: at-builder
  - Acceptance Criteria: `/rollback` demonstrates a multi-step state transition path rather than a single status flip.
  - Blocker: Depends on rollback templates and store.

- [x] Implement prompt routing and autofill helpers at POC level.
  - Summary: Map current page context plus a small set of assistant intents/prompts to the correct template envelope and prefilled action data.
  - Owner Hint: at-builder
  - Acceptance Criteria: Suggested intents and representative typed prompts consistently open the expected template state for the selected entity.
  - Blocker: Depends on template registry and store-backed context.

### Phase 7. Verification

- [x] Verify shell consistency and responsive behavior across all three routes.
  - Summary: Confirm the same shell rhythm is preserved while desktop, tablet, and mobile adapt according to the publishing guide.
  - Owner Hint: at-uxui-builder
  - Acceptance Criteria: Summary strip, toolbar, content split, and assistant panel remain readable at desktop, tablet, and mobile breakpoints.
  - Blocker: Depends on shell refactor.

- [x] Verify refresh reset and state-transition reproducibility.
  - Summary: Ensure all in-memory actions are deterministic for demo use and fully reset to seed state on browser refresh.
  - Owner Hint: at-builder
  - Acceptance Criteria: Each route can be exercised repeatedly from the same initial state after refresh, with no persisted client residue.
  - Blocker: Depends on store and action implementation.

- [x] Verify page-specific acceptance behavior before handoff.
  - Summary: Run a final pass that confirms deploy, approve, and rollback each satisfy the documented page purpose and assistant workflow.
  - Owner Hint: at-builder
  - Acceptance Criteria: 
    - `/deploy` supports selecting a deployment candidate and completing a deploy-oriented assistant flow.
    - `/approve` supports selecting an approval request and completing an approve or hold flow.
    - `/rollback` supports selecting a rollback candidate and completing summary, dry run, and final confirm flow.
  - Blocker: Depends on all prior phases.
