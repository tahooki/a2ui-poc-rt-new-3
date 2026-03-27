# Deploy Field Restructure Workdoc

## Goal

Apply the deploy field and workflow corrections from `docs/20260325125323_deploy-workflow-field-restructure-plan.md` to the actual code for:

- `/deploy/image`
- `/deploy/request`
- `/deploy/run`

This document is the execution handoff for implementation. It is scoped to concrete code changes, state/data updates, gating, and validation.

## Current Gaps

The current route split exists, but the behavior and page meaning still reflect the older handoff model instead of the new AWS-style field structure.

Observed gaps in the current code:

- `src/devops-console/deploy/deploy-workflow-page.tsx`
  - `/deploy/image` still behaves like candidate inspection plus request handoff.
  - `/deploy/image` still includes a direct CTA to `/deploy/request`.
  - `/deploy/request` assumes a selected image was already handed over from the image page.
  - `/deploy/request` currently exposes only a small subset of the required request fields.
  - `/deploy/run` needs stronger request-first context and explicit empty-state gating.
- `src/devops-chat/store/app-store.ts`
  - deploy workflow state needs to store image registration fields and request draft fields more explicitly.
- `src/devops-chat/view-models/build-console-view-model.ts`
  - deploy page derivation still reflects the older combined deploy model and should not remain the source of truth for the three route-specific pages.
- `src/devops-chat/data/seed/deploy.json`
  - seed data likely needs to separate registered images, request drafts, and run records more clearly.

## Target Changes

### Route Meaning

- `/deploy/image`
  - becomes image registration and registry management
- `/deploy/request`
  - becomes registered-image selection plus deploy request creation
- `/deploy/run`
  - becomes request-based execution and rollout tracking

### Required UX Corrections

- Add page-top role + AWS meaning descriptions to all three pages.
- Remove request-handoff emphasis from `/deploy/image`.
- Remove embedded AI shortcut behavior from all deploy pages.
- Make `/deploy/request` choose from registered images on that page.
- Make `/deploy/run` explicitly tied to request context before showing execution detail.

## State And Data Changes

### 1. Deploy seed structure

- Split deploy seed data into three conceptual groups:
  - registered images
  - deploy request drafts or created requests
  - deploy run or execution records
- Preserve refresh-reset behavior from seed JSON.

### 2. Deploy workflow state

- Add or normalize deploy workflow state for:
  - `registeredImages`
  - `selectedRegisteredImageId`
  - `requestDraft`
  - `createdRequests`
  - `selectedRequestId`
  - `activeRunId`
- `requestDraft` must at minimum support:
  - `selectedImageId`
  - `service`
  - `environment`
  - `cpu`
  - `memory`
  - `containerPort`
  - `desiredCount`
  - `deploymentStrategy`
  - `minimumHealthyPercent`
  - `maximumPercent`
  - `healthCheckPath`
  - `healthCheckGracePeriod`
  - `rollbackBaseline`
  - `requestedBy`
  - optional `executionProfile`
  - optional `operatorNote`

### 3. Action updates

- Add or adapt actions for:
  - register image
  - select image on `/deploy/request`
  - update request draft field-by-field
  - validate and create request
  - select request on `/deploy/run`
  - start deploy run from request
  - progress and complete run state

## Concrete Code Work

### Phase 1. Reshape deploy data contracts

- Title: Normalize deploy types and seed data
- Summary: Update deploy domain types and seed JSON so the three pages operate on registered images, requests, and runs rather than one overloaded deploy item model.
- Owner Hint: at-builder
- Acceptance Criteria:
  - Deploy seed data distinguishes image records, request records, and run records.
  - Store types can represent request-less and run-less states cleanly.
  - Refresh still restores the same initial deploy state.
- Blocker if any: None.

### Phase 2. Refactor deploy store state and actions

- Title: Add workflow-specific deploy state
- Summary: Update `src/devops-chat/store/app-store.ts` so deploy state supports explicit image registration, request drafting, and run tracking.
- Owner Hint: at-builder
- Acceptance Criteria:
  - Image registration can be stored in-memory.
  - Request drafting is independent from the old automatic handoff behavior.
  - Run state is request-based, not just selected-row based.
- Blocker if any: Depends on Phase 1.

### Phase 3. Rebuild `/deploy/image`

- Title: Convert image page to registry registration workflow
- Summary: Update `src/devops-console/deploy/deploy-workflow-page.tsx` or split it so `/deploy/image` becomes an image registration and registry-management page.
- Owner Hint: at-uxui-builder
- Acceptance Criteria:
  - Page header explains both product role and AWS/ECR meaning.
  - Main layout includes image registration form, registered image list, and selected image detail.
  - Form includes:
    - `Repository`
    - `Image tag`
    - `Image URI`
    - `Git ref` or `Commit SHA`
    - optional `Image digest`
    - optional `Build status`
    - optional `Pushed at`
  - Direct “write request from this image now” CTA is removed.
  - No AI shortcut button appears on the page.
- Blocker if any: Depends on Phase 2.

### Phase 4. Rebuild `/deploy/request`

- Title: Convert request page to registered-image-driven request authoring
- Summary: Update the request stage so users choose from registered images on that page and then complete a real deploy request form.
- Owner Hint: at-uxui-builder
- Acceptance Criteria:
  - Page header explains both product role and AWS/ECS request meaning.
  - Page includes an image picker sourced from registered images.
  - The request form is disabled until an image is selected.
  - The request form includes:
    - `Service`
    - `Environment`
    - `CPU`
    - `Memory`
    - `Container port`
    - `Desired count`
    - `Deployment strategy`
    - `Minimum healthy percent`
    - `Maximum percent`
    - `Health check path`
    - `Health check grace period`
    - `Rollback baseline`
    - `Requested by`
    - optional `Execution profile`
    - optional `Operator note`
  - Request creation is blocked when there is no registered image.
  - Request creation is blocked when required fields are incomplete.
  - The page no longer relies on a preselected image handoff from `/deploy/image`.
- Blocker if any: Depends on Phases 1 and 2.

### Phase 5. Rebuild `/deploy/run`

- Title: Convert run page to request-based execution tracking
- Summary: Update the run stage so execution is explicitly tied to created requests and their associated image context.
- Owner Hint: at-uxui-builder
- Acceptance Criteria:
  - Page header explains both product role and AWS/ECS rollout-monitoring meaning.
  - The page leads with selected request summary and selected image summary.
  - The page shows:
    - `Request ID`
    - `Selected image`
    - `Service`
    - `Environment`
    - `CPU`
    - `Memory`
    - `Desired count`
    - `Deployment strategy`
    - `Current stage`
    - `Rollout progress`
    - `Health status`
    - `Verification status`
    - optional task-definition-style identifier
    - optional running count
    - events/timeline
  - If there is no created request, the page shows an empty state and blocks run start.
  - If request context is missing, run detail rendering stays minimal instead of showing misleading placeholders.
- Blocker if any: Depends on Phases 1 and 2.

### Phase 6. Split route-specific page components if needed

- Title: Stop overloading one deploy workflow component
- Summary: If `src/devops-console/deploy/deploy-workflow-page.tsx` becomes too conditional, split it into route-specific components.
- Owner Hint: at-builder
- Acceptance Criteria:
  - Route code remains easy to follow.
  - Page-specific logic is not buried in large `stage === ...` branches.
  - Shared primitives remain reusable without forcing one monolithic deploy component.
- Blocker if any: Depends on page rebuild work.

### Phase 7. Remove stale manual-handoff assumptions

- Title: Delete outdated CTA and copy
- Summary: Remove old copy and UI paths that imply image selection automatically hands off into request creation.
- Owner Hint: at-builder
- Acceptance Criteria:
  - `/deploy/image` no longer contains request-handoff CTA emphasis.
  - `/deploy/request` no longer states that image context was automatically carried over.
  - Deploy pages do not contain embedded AI shortcut controls.
- Blocker if any: Depends on Phases 3 through 5.

## Validation And Gating Requirements

### Field gating

- `/deploy/request`
  - must block request creation if no registered images exist
  - must block request creation if no image is selected
  - must block request creation if required fields are incomplete
- `/deploy/run`
  - must block run start if no request exists
  - must show an empty state before a request is available

### Copy gating

- Each page must include:
  - a product-role description
  - an AWS meaning description

### UX gating

- No deploy page may contain an embedded AI shortcut button or drawer.
- `/deploy/image` must read as registration/management, not candidate-handoff.
- `/deploy/request` must read as request composition, not passive handoff.
- `/deploy/run` must read as request execution, not generic status viewing.

## Acceptance Criteria

- `/deploy/image` functions as image registration and registry management.
- `/deploy/request` functions as registered-image selection plus request creation.
- `/deploy/run` functions as request-based execution and tracking.
- Deploy state and seed data support images, requests, and runs as separate concepts.
- Required request fields and validation gates are implemented.
- Empty-state and blocked-state behavior exists where request or run context is missing.
- Old image-to-request auto-handoff assumptions are removed from copy and interaction.
- The result is implementation-ready for `/assistant` to accelerate later without being embedded in deploy pages.
