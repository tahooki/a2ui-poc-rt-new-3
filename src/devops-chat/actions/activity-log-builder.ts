/**
 * Activity log builder: converts action events into log entries
 * that can be displayed alongside chat messages.
 */

import type { ActivityEvent, ActionExecutionResult } from "./action-types";

export type ActivityLogItem = {
  id: string;
  type: "message" | "action";
  timestamp: string;
  // For message type
  role?: "user" | "assistant";
  text?: string;
  // For action type
  actionStatus?: "started" | "succeeded" | "failed";
  title?: string;
  detail?: string;
};

let logSequence = 0;

function nextLogId(): string {
  logSequence += 1;
  return `activity-${logSequence}`;
}

export function buildActionLogEntry(event: ActivityEvent): ActivityLogItem {
  return {
    id: nextLogId(),
    type: "action",
    timestamp: event.timestamp,
    actionStatus: event.status,
    title: event.title,
    detail: event.detail,
  };
}

export function buildActionStartedEntry(actionId: string, label: string): ActivityLogItem {
  return {
    id: nextLogId(),
    type: "action",
    timestamp: new Date().toISOString(),
    actionStatus: "started",
    title: `${label} 실행 중...`,
  };
}

export function buildActionResultEntry(result: ActionExecutionResult): ActivityLogItem | null {
  if (!result.activityEvent) return null;
  return buildActionLogEntry(result.activityEvent);
}
