"use client";

import { DataTable } from "../../primitives/DataTable";
import { StatusBadge } from "../../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";

const FIELD_LABELS: Record<string, string> = {
  repository: "Repository",
  imageTag: "Image tag",
  imageUri: "Image URI",
  gitRef: "Git ref",
  commitSha: "Commit SHA",
  imageDigest: "Image digest",
  buildStatus: "Build status",
  pushedAt: "Pushed at",
};

const DEFAULT_FIELDS = [
  "repository",
  "imageTag",
  "imageUri",
  "gitRef",
  "commitSha",
  "imageDigest",
  "buildStatus",
  "pushedAt",
];

export function DeployArtifactBlock(props: Record<string, unknown>) {
  const image = isRecord(props.image) ? props.image : null;
  const visibleFields = Array.isArray(props.visibleFields)
    ? props.visibleFields.filter((field): field is string => typeof field === "string")
    : DEFAULT_FIELDS;

  return (
    <PartSection subtitle="Selected deploy artifact from the service context." title="Image artifact">
      {image ? (
        <DataTable
          columns={[
            { key: "field", label: "Field", width: "32%" },
            {
              key: "value",
              label: "Value",
              render: (value, row) => row.fieldKey === "buildStatus"
                ? <StatusBadge label={stringifyPartValue(value)} level="success" />
                : <span style={{ overflowWrap: "anywhere" }}>{stringifyPartValue(value)}</span>,
            },
          ]}
          rows={visibleFields.map((field) => ({
            fieldKey: field,
            field: FIELD_LABELS[field] ?? field,
            value: image[field],
          }))}
        />
      ) : (
        <EmptyPartState label={typeof props.emptyLabel === "string" ? props.emptyLabel : "No image artifact selected"} />
      )}
    </PartSection>
  );
}

