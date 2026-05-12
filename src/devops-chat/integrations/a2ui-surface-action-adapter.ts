import type {
  A2UISurfaceActionInput,
  A2UISurfaceActionResult,
} from "@a2ui/chat";
import type { ConversationFacts, SurfaceEnvelope } from "@/devops-chat/types/conversation";
import { executeSurfaceAction } from "@/devops-chat/actions/action-bridge";
import { refreshAfterAction } from "@/devops-chat/actions/post-action-refresh";
import type { SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export type ExecutePocA2UISurfaceActionInput = Omit<A2UISurfaceActionInput, "surface"> & {
  conversationId: string;
  activeSurface: SurfaceEnvelope | null;
  facts: ConversationFacts;
  intentKey?: string | null;
};

function surfaceActions(surface: SurfaceEnvelope): Array<Record<string, unknown>> {
  return [
    ...(surface.actions ?? []),
    ...(((surface.payload.actions as Array<Record<string, unknown>> | undefined) ?? [])),
  ];
}

export async function executePocA2UISurfaceAction({
  conversationId,
  activeSurface,
  actionId,
  params,
  payload,
  facts,
  intentKey,
}: ExecutePocA2UISurfaceActionInput): Promise<A2UISurfaceActionResult> {
  if (!activeSurface) {
    throw new Error("현재 활성화된 surface가 없습니다.");
  }

  const action = surfaceActions(activeSurface)
    .find((candidate) => candidate.actionId === actionId) as SurfaceActionDescriptor | undefined;

  if (!action) {
    throw new Error(`알 수 없는 액션입니다: ${actionId}`);
  }

  const result = await executeSurfaceAction({
    conversationId,
    activeSurface,
    actionDescriptor: {
      ...action,
      payload: {
        ...(action.payload ?? {}),
        ...(payload ?? {}),
        ...(params ?? {}),
      },
    },
    facts,
  });

  const refresh = refreshAfterAction(
    result,
    facts,
    activeSurface,
    intentKey ?? activeSurface.sourceIntent,
  );

  if (!result.ok) {
    throw new Error(refresh.userFacingMessage ?? result.userFacingMessage ?? result.summary);
  }

  return {
    facts: refresh.updatedFacts as Record<string, unknown>,
    message: refresh.userFacingMessage ?? result.userFacingMessage ?? result.summary,
    surface: refresh.updatedSurface,
  };
}
