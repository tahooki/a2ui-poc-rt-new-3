"use client";

import { DataTable } from "../../primitives/DataTable";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";

const FIELD_LABELS: Record<string, string> = {
  cpu: "CPU",
  memory: "Memory",
  containerPort: "Container port",
  desiredCount: "Desired count",
  minimumHealthyPercent: "Minimum healthy %",
  maximumPercent: "Maximum %",
  deploymentStrategy: "Deployment strategy",
  rollbackBaseline: "Rollback baseline",
  requestedBy: "Requested by",
};

const DEFAULT_FIELDS = [
  "deploymentStrategy",
  "cpu",
  "memory",
  "containerPort",
  "desiredCount",
  "minimumHealthyPercent",
  "maximumPercent",
  "rollbackBaseline",
  "requestedBy",
];

export function DeployRequestConfigBlock(props: Record<string, unknown>) {
  const request = isRecord(props.request) ? props.request : null;
  const visibleFields = Array.isArray(props.visibleFields)
    ? props.visibleFields.filter((field): field is string => typeof field === "string")
    : DEFAULT_FIELDS;

  return (
    <PartSection subtitle="ECS-style deployment request generated for the operator." title="Request configuration">
      {request ? (
        <DataTable
          columns={[
            { key: "field", label: "Setting", width: "36%" },
            { key: "value", label: "Value" },
          ]}
          rows={visibleFields.map((field) => ({
            field: FIELD_LABELS[field] ?? field,
            value: stringifyPartValue(request[field]),
          }))}
        />
      ) : (
        <EmptyPartState label="No request configuration available" />
      )}
    </PartSection>
  );
}

