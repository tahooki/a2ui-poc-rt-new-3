export type { ActionEvent } from "@a2ui/contracts";

export type TemplateAction = {
  actionId: string;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  kind?: "submit" | "select" | "refresh" | "navigate";
  params?: Record<string, unknown>;
  confirm?: {
    title?: string;
    message?: string;
  };
  requiredPayloadFields?: string[];
  enableWhen?:
    | {
        field: string;
        equals: unknown;
      }
    | {
        field: string;
        exists: true;
      }
    | null;
  enabled?: boolean;
  disabledReason?: string;
};

export type ActionCallback = (event: {
  actionId: string;
  kind?: "submit" | "select" | "refresh" | "navigate";
  params?: Record<string, unknown>;
}) => void;
