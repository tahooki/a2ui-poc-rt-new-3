"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";
import {
  choiceButtonStyle,
  choiceGridStyle,
  fieldStyle,
  formGridStyle,
  inputStyle,
  labelStyle,
  updateNestedPayloadValue,
  updatePayload,
} from "../form-utils";

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

const BUILD_STATUS_OPTIONS = ["registered", "push_verified", "build_failed"];

function updateImageField(props: Record<string, unknown>, field: string, value: string) {
  if (field === "imageTag") {
    updatePayload(props, (payload) => ({
      ...payload,
      targetVersion: value,
      imageDetail: {
        ...(isRecord(payload.imageDetail) ? payload.imageDetail : {}),
        imageTag: value,
      },
    }));
    return;
  }

  if (field === "imageUri") {
    updatePayload(props, (payload) => ({
      ...payload,
      imageDetail: {
        ...(isRecord(payload.imageDetail) ? payload.imageDetail : {}),
        imageUri: value,
      },
      requestDetail: {
        ...(isRecord(payload.requestDetail) ? payload.requestDetail : {}),
        selectedImageUri: value,
      },
    }));
    return;
  }

  updateNestedPayloadValue(props, "imageDetail", field, value);
}

export function DeployArtifactBlock(props: Record<string, unknown>) {
  const image = isRecord(props.image) ? props.image : null;
  const visibleFields = Array.isArray(props.visibleFields)
    ? props.visibleFields.filter((field): field is string => typeof field === "string")
    : DEFAULT_FIELDS;

  return (
    <PartSection subtitle="Matches the Image registration step fields." title="Image registration inputs">
      {image ? (
        <div style={formGridStyle}>
          {visibleFields.map((field) => (
            field === "buildStatus" ? (
              <div key={field} style={fieldStyle}>
                <span style={labelStyle}>{FIELD_LABELS[field] ?? field}</span>
                <div style={choiceGridStyle}>
                  {BUILD_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => updateImageField(props, field, option)}
                      style={choiceButtonStyle(stringifyPartValue(image[field]) === option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label key={field} style={fieldStyle}>
                <span style={labelStyle}>{FIELD_LABELS[field] ?? field}</span>
                <input
                  onChange={(event) => updateImageField(props, field, event.target.value)}
                  style={inputStyle}
                  value={stringifyPartValue(image[field])}
                />
              </label>
            )
          ))}
        </div>
      ) : (
        <EmptyPartState label={typeof props.emptyLabel === "string" ? props.emptyLabel : "No image artifact selected"} />
      )}
    </PartSection>
  );
}
