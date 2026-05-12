"use client";

import { A2UISurfaceHost } from "./A2UISurfaceHost";
import type { A2UIMessageSurfaceProps } from "./types";

export function A2UIMessageSurface({ part, ...hostProps }: A2UIMessageSurfaceProps) {
  if (!part || part.type !== "a2ui_surface") {
    return null;
  }

  return <A2UISurfaceHost {...hostProps} surface={part.surface} />;
}
