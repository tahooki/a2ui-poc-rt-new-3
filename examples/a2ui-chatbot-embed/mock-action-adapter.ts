import type { A2UISurfaceActionAdapter } from "@a2ui/chat";

export const mockA2UISurfaceActionAdapter: A2UISurfaceActionAdapter = async ({
  actionId,
  surface,
}) => ({
  message: `${actionId} handled by the host chatbot adapter`,
  surface: {
    ...surface,
    payload: {
      ...surface.payload,
      lastActionId: actionId,
      state: actionId.includes("complete") ? "done" : surface.payload.state,
    },
    updatedAt: new Date().toISOString(),
  },
});
