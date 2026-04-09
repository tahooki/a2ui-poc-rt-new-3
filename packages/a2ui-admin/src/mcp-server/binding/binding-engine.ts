/**
 * Binding Engine — resolver 결과를 template payload로 조립
 */

export type BindingRule = {
  targetField: string;
  sourceKey: string;
  defaultValue?: unknown;
};

export type BindingRecipe = {
  templateId: string;
  rules: BindingRule[];
  staticValues?: Record<string, unknown>;
};

export function applyBinding(
  recipe: BindingRecipe,
  resolverData: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  // Apply static values first
  if (recipe.staticValues) {
    Object.assign(payload, recipe.staticValues);
  }

  // Apply binding rules
  for (const rule of recipe.rules) {
    const value = resolverData[rule.sourceKey];
    payload[rule.targetField] = value ?? rule.defaultValue;
  }

  return payload;
}

// --- Built-in recipes ---

export const DEPLOY_LAUNCHPAD_RECIPE: BindingRecipe = {
  templateId: "deploy_launchpad",
  staticValues: {
    templateId: "deploy_launchpad",
    state: "ready",
    primaryActionLabel: "배포 시작",
    secondaryActionLabel: "초안 새로 고침",
  },
  rules: [
    { targetField: "service", sourceKey: "serviceName" },
    { targetField: "environment", sourceKey: "environment", defaultValue: "production" },
    { targetField: "targetVersion", sourceKey: "recommendedVersion", defaultValue: "latest" },
    { targetField: "recommendedVersion", sourceKey: "recommendedVersion" },
    { targetField: "strategy", sourceKey: "strategy", defaultValue: "rolling" },
    { targetField: "impactSummary", sourceKey: "impactSummary" },
    { targetField: "preflightChecks", sourceKey: "preflightChecks" },
    { targetField: "imageDetail", sourceKey: "imageDetail" },
    { targetField: "requestDetail", sourceKey: "requestDetail" },
    { targetField: "riskSummary", sourceKey: "riskSummary" },
  ],
};

export const APPROVAL_QUEUE_INBOX_RECIPE: BindingRecipe = {
  templateId: "approval_queue_inbox",
  staticValues: {
    templateId: "approval_queue_inbox",
  },
  rules: [
    { targetField: "items", sourceKey: "items", defaultValue: [] },
    { targetField: "byStatus", sourceKey: "byStatus", defaultValue: {} },
    { targetField: "byType", sourceKey: "byType", defaultValue: {} },
    { targetField: "queueSummary", sourceKey: "queueSummary" },
  ],
};

export const ROLLBACK_SUMMARY_RECIPE: BindingRecipe = {
  templateId: "rollback_summary",
  staticValues: {
    templateId: "rollback_summary",
  },
  rules: [
    { targetField: "candidates", sourceKey: "candidates", defaultValue: [] },
    { targetField: "serviceHealth", sourceKey: "serviceHealth", defaultValue: [] },
    { targetField: "causeSummary", sourceKey: "causeSummary" },
    { targetField: "recommendation", sourceKey: "recommendation" },
  ],
};
