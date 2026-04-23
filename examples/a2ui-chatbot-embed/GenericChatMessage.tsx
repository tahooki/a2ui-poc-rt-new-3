"use client";

import {
  A2UIMessageSurface,
  createA2UIChatSurfacePart,
  type A2UISurfaceActionAdapter,
  type A2UIRenderableSurface,
} from "@a2ui/chat";

export type GenericChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  text?: string;
  surface?: A2UIRenderableSurface;
};

export function GenericChatMessageView({
  message,
  onSurfaceAction,
}: {
  message: GenericChatMessage;
  onSurfaceAction: A2UISurfaceActionAdapter;
}) {
  const part = message.surface ? createA2UIChatSurfacePart(message.surface, `${message.id}-surface`) : null;

  return (
    <article style={{ display: "grid", gap: 10 }}>
      {message.text ? (
        <div style={{ color: message.role === "user" ? "#d7e2ff" : "#e4e8ef", fontSize: 14 }}>
          {message.text}
        </div>
      ) : null}
      {part ? (
        <A2UIMessageSurface
          onAction={onSurfaceAction}
          part={part}
        />
      ) : null}
    </article>
  );
}
