"use client";

import { DataTable } from "../../primitives/DataTable";
import { StatusBadge } from "../../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";

export function DeploymentHistoryBlock(props: Record<string, unknown>) {
  const rows = Array.isArray(props.rows) ? props.rows.filter(isRecord) : [];

  return (
    <PartSection subtitle="Recent deployments for this service." title="Deployment history">
      {rows.length > 0 ? (
        <DataTable
          columns={[
            { key: "version", label: "Version", width: "22%" },
            {
              key: "status",
              label: "Status",
              width: "18%",
              render: (value) => <StatusBadge label={stringifyPartValue(value)} level="success" />,
            },
            { key: "deployedBy", label: "Deployed by", width: "24%" },
            { key: "deployedAt", label: "Deployed at" },
          ]}
          rows={rows}
        />
      ) : (
        <EmptyPartState label="No deployment history available" />
      )}
    </PartSection>
  );
}

