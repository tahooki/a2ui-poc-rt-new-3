import type { ComponentType } from "react";
import { AlertBlock } from "../parts/AlertBlock";
import { ChecklistBlock } from "../parts/ChecklistBlock";
import { DataTableBlock } from "../parts/DataTableBlock";
import { KeyValueSummary } from "../parts/KeyValueSummary";
import { MetricGridBlock } from "../parts/MetricGridBlock";
import { StepProgressBlock } from "../parts/StepProgressBlock";
import { TimelineBlock } from "../parts/TimelineBlock";
import { ActionListBlock } from "../parts/ActionListBlock";
import { DeployArtifactBlock } from "../parts/deploy/DeployArtifactBlock";
import { DeployPreflightChecklistBlock } from "../parts/deploy/DeployPreflightChecklistBlock";
import { DeployRequestConfigBlock } from "../parts/deploy/DeployRequestConfigBlock";
import { DeployRolloutProgressBlock } from "../parts/deploy/DeployRolloutProgressBlock";
import { DeployTargetSummaryBlock } from "../parts/deploy/DeployTargetSummaryBlock";
import { DeploymentHistoryBlock } from "../parts/deploy/DeploymentHistoryBlock";

export type A2UIPartComponent = ComponentType<Record<string, unknown>>;

export const A2UI_PART_REGISTRY = {
  KeyValueSummary,
  DataTableBlock,
  StepProgressBlock,
  MetricGridBlock,
  ChecklistBlock,
  AlertBlock,
  TimelineBlock,
  ActionListBlock,
  DeployTargetSummaryBlock,
  DeployArtifactBlock,
  DeployRequestConfigBlock,
  DeployPreflightChecklistBlock,
  DeployRolloutProgressBlock,
  DeploymentHistoryBlock,
} satisfies Record<string, A2UIPartComponent>;

export type A2UIPartType = keyof typeof A2UI_PART_REGISTRY;

export function getA2UIPart(type: string): A2UIPartComponent | undefined {
  return A2UI_PART_REGISTRY[type as A2UIPartType];
}

export function listA2UIPartTypes(): string[] {
  return Object.keys(A2UI_PART_REGISTRY);
}

