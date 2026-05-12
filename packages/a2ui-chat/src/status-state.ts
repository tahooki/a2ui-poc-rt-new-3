import type { A2UISurfaceStatus } from "./types";

export type A2UISurfaceStatusEvent =
  | { type: "start"; actionId: string; message?: string }
  | { type: "done"; actionId: string; message?: string }
  | { type: "error"; actionId: string; error: string }
  | { type: "clear"; actionId?: string };

export const A2UI_IDLE_STATUS: A2UISurfaceStatus = { phase: "idle" };

export function reduceA2UISurfaceStatus(
  current: A2UISurfaceStatus,
  event: A2UISurfaceStatusEvent,
): A2UISurfaceStatus {
  switch (event.type) {
    case "start":
      return {
        phase: "running",
        actionId: event.actionId,
        message: event.message,
      };
    case "done":
      return {
        phase: "done",
        actionId: event.actionId,
        message: event.message,
      };
    case "error":
      return {
        phase: "error",
        actionId: event.actionId,
        error: event.error,
      };
    case "clear":
      if (event.actionId && current.actionId !== event.actionId) return current;
      return A2UI_IDLE_STATUS;
  }
}

export function shouldAutoClearA2UISurfaceStatus(status: A2UISurfaceStatus): boolean {
  return status.phase === "done" && typeof status.actionId === "string" && status.actionId.length > 0;
}
