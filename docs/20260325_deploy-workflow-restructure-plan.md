# Deploy Workflow Restructure Plan

## Purpose

Restructure the deploy experience so the product first shows the real admin workflow a DevOps operator would follow, then shows AI as a separate acceleration layer over that workflow.

## Execution Status

- Last updated: 2026-03-25
- Overall state: In progress
- Primary deploy IA: implemented
- Deploy manual workflow pages: implemented
- Assistant separation: implemented
- Verification: blocked in current workspace because `node` / package runners are not installed on `PATH`

This plan is deploy-only. It intentionally does not redesign approval or rollback structure.

## Problem

The current direction collapses deploy into a single `/deploy` surface with AI inside the page. That weakens the main product story:

- it hides the real multi-step operational workflow
- it makes AI look like the primary UI instead of a shortcut over the original UI
- it reduces the contrast between manual page-switching and AI-assisted acceleration
- it encourages drifting into lower-level route experiments before the primary deploy structure is correct

For the deploy flow, the primary structure must be fixed first:

- `/deploy/image`
- `/deploy/request`
- `/deploy/run`

AI must be separated into its own page such as `/assistant`.

## Source-of-Truth Direction

For deploy workflow planning, this document supersedes prior assumptions that AI lives inside the deploy pages.

The required IA is:

- `/deploy/image` as a primary workflow page
- `/deploy/request` as a primary workflow page
- `/deploy/run` as a primary workflow page
- `/assistant` as a separate acceleration page layered over the same underlying deploy workflow

Do not introduce finer-grained route ideas until this structure is implemented and stable.

## Target IA

### Primary Deploy Workflow

- `/deploy/image`
  - image discovery, artifact selection, version inspection, baseline comparison
- `/deploy/request`
  - deployment request authoring, environment/strategy selection, preflight setup, reviewer-ready request preparation
- `/deploy/run`
  - execution status, rollout progress, verification, completion or failure follow-up

### AI Shortcut Layer

- `/assistant`
  - separate workflow accelerator
  - helps users jump across image, request, and run tasks with less page-switching and less manual setup
  - must reference the original workflow pages instead of replacing them

## Page Roles

### `/deploy/image`

- Purpose: select the right artifact and deployment candidate
- Primary user questions:
  - Which image/version should I deploy?
  - What is currently running?
  - What changed from the baseline?
- Required content:
  - artifact/image table
  - current deployed version context
  - release metadata and change context
  - selection handoff to request creation

### `/deploy/request`

- Purpose: turn the selected image into an actual deployment request
- Primary user questions:
  - Which environment and rollout strategy should I use?
  - What needs to be configured manually?
  - Is the request complete enough to submit?
- Required content:
  - selected image summary
  - environment and strategy controls
  - preflight checklist
  - request summary and submit action

### `/deploy/run`

- Purpose: execute and monitor the approved request
- Primary user questions:
  - What is running now?
  - Is the rollout healthy?
  - What should I do if verification fails?
- Required content:
  - active run status
  - rollout and health indicators
  - execution log or timeline
  - completion/failure state

## AI Separation

AI should not be embedded in `/deploy/image`, `/deploy/request`, or `/deploy/run`.

Instead:

- `/assistant` should act as a cross-workflow shortcut page
- it should reduce navigation and repeated manual setup
- it should be able to prefill or accelerate work that otherwise spans the three deploy pages
- it should still make the original workflow legible by referencing the same underlying steps and data

The demo story should be:

1. show the operator using the original deploy workflow pages
2. make the inconvenience visible: page-switching, repeated setup, manual carry-over of context
3. show `/assistant` compressing that same workflow into fewer steps

## Keep vs Change

### Keep

- deploy domain/state engine in `src/devops-chat/store/app-store.ts` where reusable
- deploy seed data and typed contracts in `src/devops-chat/data/seed/*.json`, `src/devops-chat/types/domain.ts`, and `src/devops-chat/types/templates.ts`
- prompt routing and template-envelope logic where it helps `/assistant`
- existing refresh-reset model based on JSON seed + in-memory state

### Change

- current single-page `/deploy` information architecture
- any assumption that deploy AI lives inside the deploy page frame
- current deploy shell/view-model wiring if it cannot represent image -> request -> run as distinct pages
- current deploy UI content that merges artifact selection, request creation, and execution monitoring into one workspace

### Refactor Boundary

- Reuse logic/state underneath when practical
- Rebuild page presentation and route structure where needed
- Prefer clear workflow separation over preserving current UI abstractions

## Phased Implementation Plan

### Phase 1. Lock the deploy IA

- Title: Establish primary deploy routes
- Summary: Create the primary route structure around `/deploy/image`, `/deploy/request`, and `/deploy/run` before refining lower-level navigation ideas.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - The plan of record names the three primary deploy workflow pages exactly.
  - Implementation work is organized around these pages, not around a single `/deploy` screen.
  - No new subroute ideas are introduced ahead of this structure.
- Blocker if any: None.

### Phase 2. Split deploy state and presenters by workflow stage

- Title: Separate image, request, and run concerns in the presentation layer
- Summary: Adapt selectors, page data builders, and route mounting so each deploy page has a focused responsibility while still reusing the existing in-memory engine.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - Each deploy page can render its own focused state and actions.
  - Shared deploy state can carry the selected image and request context forward across pages.
  - Presentation logic no longer assumes one combined deploy workspace.
- Blocker if any: Depends on Phase 1.

### Phase 3. Build `/deploy/image`

- Title: Implement image selection workflow page
- Summary: Build the page that makes artifact discovery and version choice explicit before the user starts authoring a request.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/deploy/image` clearly focuses on artifact/version selection.
  - The chosen image can be handed off into `/deploy/request`.
  - The page does not include embedded AI workspace behavior.
- Blocker if any: Depends on Phase 2.

### Phase 4. Build `/deploy/request`

- Title: Implement deployment request workflow page
- Summary: Build the page for environment choice, rollout setup, preflight review, and request submission.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/deploy/request` clearly focuses on request composition and validation.
  - It consumes the selected image context from `/deploy/image`.
  - The page does not include embedded AI workspace behavior.
- Blocker if any: Depends on Phase 3 or an equivalent state handoff.

### Phase 5. Build `/deploy/run`

- Title: Implement deployment execution workflow page
- Summary: Build the page for execution monitoring, rollout verification, and run-result follow-up.
- Owner Hint: at-uxui-builder
- Status: Complete
- Acceptance Criteria:
  - `/deploy/run` clearly focuses on execution and monitoring.
  - It reflects the request/run state from the shared deploy engine.
  - The page does not include embedded AI workspace behavior.
- Blocker if any: Depends on Phase 4 or an equivalent request handoff.

### Phase 6. Create `/assistant` as a separate deploy accelerator

- Title: Move deploy AI into its own page
- Summary: Build `/assistant` as the shortcut layer that reduces page-switching and manual setup across the three real deploy pages.
- Owner Hint: at-builder
- Status: Complete
- Acceptance Criteria:
  - `/assistant` is a standalone page, not an in-page deploy drawer.
  - It can use the same deploy engine and template logic to accelerate image selection, request setup, and run initiation.
  - The UX clearly communicates that AI is compressing the existing workflow, not replacing the original admin flow.
- Blocker if any: Depends on the three primary deploy pages being defined first.

### Phase 7. Validate the comparison story

- Title: Verify manual-vs-AI deploy narrative
- Summary: Confirm that the product now demonstrates the original admin inconvenience first and the AI shortcut second.
- Owner Hint: at-builder
- Status: Blocked
- Blocker detail: `node`, `npm`, `pnpm`, `yarn`, and `bun` are unavailable in this workspace, so lint/build/browser validation could not be executed here.
- Acceptance Criteria:
  - A user can follow the manual deploy path across `/deploy/image`, `/deploy/request`, and `/deploy/run`.
  - A user can then see `/assistant` reduce the number of page transitions or repeated inputs for the same deploy outcome.
  - The deploy story no longer depends on AI being embedded inside deploy pages.
- Blocker if any: Depends on all prior phases.

## Acceptance Criteria

- `/deploy/image`, `/deploy/request`, and `/deploy/run` are the primary deploy workflow pages.
- `/assistant` is separate from deploy pages and acts as an acceleration layer over the same workflow.
- The manual deploy workflow is legible on its own before AI is introduced.
- AI is framed as reducing page-switching and manual setup, not as the main deploy UI.
- The implementation plan does not drift into lower-level route ideas before this primary structure is established.
