"use client";

import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";
import {
  choiceButtonStyle,
  choiceGridStyle,
  fieldStyle,
  formGridStyle,
  inputStyle,
  labelStyle,
  textareaStyle,
  updateNestedPayloadValue,
  updatePayload,
} from "../form-utils";

const FIELD_LABELS: Record<string, string> = {
  selectedImageId: "Selected image ID",
  selectedImageUri: "Selected image",
  service: "Service",
  environment: "Environment",
  deploymentStrategy: "Deployment strategy",
  cpu: "CPU",
  memory: "Memory",
  containerPort: "Container port",
  desiredCount: "Desired count",
  minimumHealthyPercent: "Minimum healthy %",
  maximumPercent: "Maximum %",
  healthCheckPath: "Health check path",
  healthCheckGracePeriod: "Health check grace period",
  rollbackBaseline: "Rollback baseline",
  requestedBy: "Requested by",
  executionProfile: "Execution profile",
  operatorNote: "Operator note",
};

const DEFAULT_FIELDS = [
  "selectedImageId",
  "selectedImageUri",
  "service",
  "environment",
  "deploymentStrategy",
  "cpu",
  "memory",
  "containerPort",
  "desiredCount",
  "minimumHealthyPercent",
  "maximumPercent",
  "healthCheckPath",
  "healthCheckGracePeriod",
  "rollbackBaseline",
  "requestedBy",
  "executionProfile",
  "operatorNote",
];

const ENVIRONMENT_OPTIONS = ["production", "staging", "development"];
const STRATEGY_OPTIONS = ["rolling", "canary_10_50_100", "blue_green"];
const CPU_OPTIONS = [
  { value: "256", label: "0.25 vCPU" },
  { value: "512", label: "0.5 vCPU" },
  { value: "1024", label: "1 vCPU" },
  { value: "2048", label: "2 vCPU" },
];
const MEMORY_OPTIONS = [
  { value: "512", label: "512 MiB" },
  { value: "1024", label: "1 GiB" },
  { value: "2048", label: "2 GiB" },
  { value: "4096", label: "4 GiB" },
];

function updateRequestField(props: Record<string, unknown>, field: string, value: string) {
  if (field === "service") {
    updatePayload(props, (payload) => ({
      ...payload,
      service: value,
      requestDetail: {
        ...(isRecord(payload.requestDetail) ? payload.requestDetail : {}),
        service: value,
      },
    }));
    return;
  }

  if (field === "environment") {
    updatePayload(props, (payload) => ({
      ...payload,
      environment: value,
      requestDetail: {
        ...(isRecord(payload.requestDetail) ? payload.requestDetail : {}),
        environment: value,
      },
    }));
    return;
  }

  if (field === "deploymentStrategy") {
    updatePayload(props, (payload) => ({
      ...payload,
      strategy: value,
      requestDetail: {
        ...(isRecord(payload.requestDetail) ? payload.requestDetail : {}),
        deploymentStrategy: value,
      },
    }));
    return;
  }

  updateNestedPayloadValue(props, "requestDetail", field, value);
}

function renderSelectField(
  props: Record<string, unknown>,
  field: string,
  value: string,
  options: Array<{ value: string; label: string }>,
) {
  return (
    <label key={field} style={fieldStyle}>
      <span style={labelStyle}>{FIELD_LABELS[field] ?? field}</span>
      <select
        onChange={(event) => updateRequestField(props, field, event.target.value)}
        style={inputStyle}
        value={value}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DeployRequestConfigBlock(props: Record<string, unknown>) {
  const request = isRecord(props.request) ? props.request : null;
  const visibleFields = Array.isArray(props.visibleFields)
    ? props.visibleFields.filter((field): field is string => typeof field === "string")
    : DEFAULT_FIELDS;

  return (
    <PartSection subtitle="Matches the Deploy request composition form." title="Request form inputs">
      {request ? (
        <div style={formGridStyle}>
          {visibleFields.map((field) => {
            const value = stringifyPartValue(request[field]);

            if (field === "selectedImageUri") {
              return (
                <label key={field} style={fieldStyle}>
                  <span style={labelStyle}>{FIELD_LABELS[field]}</span>
                  <input readOnly style={{ ...inputStyle, opacity: 0.72 }} value={value} />
                </label>
              );
            }

            if (field === "environment") {
              return (
                <div key={field} style={fieldStyle}>
                  <span style={labelStyle}>{FIELD_LABELS[field]}</span>
                  <div style={choiceGridStyle}>
                    {ENVIRONMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => updateRequestField(props, field, option)}
                        style={choiceButtonStyle(value === option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (field === "deploymentStrategy") {
              return (
                <div key={field} style={fieldStyle}>
                  <span style={labelStyle}>{FIELD_LABELS[field]}</span>
                  <div style={choiceGridStyle}>
                    {STRATEGY_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => updateRequestField(props, field, option)}
                        style={choiceButtonStyle(value === option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (field === "cpu") {
              return renderSelectField(props, field, value, CPU_OPTIONS);
            }

            if (field === "memory") {
              return renderSelectField(props, field, value, MEMORY_OPTIONS);
            }

            if (field === "operatorNote") {
              return (
                <label key={field} style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>{FIELD_LABELS[field]}</span>
                  <textarea
                    onChange={(event) => updateRequestField(props, field, event.target.value)}
                    style={textareaStyle}
                    value={value}
                  />
                </label>
              );
            }

            return (
              <label key={field} style={fieldStyle}>
                <span style={labelStyle}>{FIELD_LABELS[field] ?? field}</span>
                <input
                  onChange={(event) => updateRequestField(props, field, event.target.value)}
                  style={inputStyle}
                  value={value}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <EmptyPartState label="No request configuration available" />
      )}
    </PartSection>
  );
}
