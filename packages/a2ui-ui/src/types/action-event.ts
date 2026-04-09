export type { ActionEvent } from "@a2ui/contracts";

export type ActionCallback = (event: {
  actionId: string;
  kind?: "submit" | "select" | "refresh" | "navigate";
  params?: Record<string, unknown>;
}) => void;
