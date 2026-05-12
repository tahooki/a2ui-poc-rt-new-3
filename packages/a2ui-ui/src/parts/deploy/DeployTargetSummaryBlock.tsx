"use client";

import { PartSection, stringifyPartValue } from "../shared";
import {
  choiceButtonStyle,
  choiceGridStyle,
  fieldStyle,
  formGridStyle,
  inputStyle,
  labelStyle,
  updateNestedPayloadValue,
  updatePayload,
  updateTopLevelPayloadValue,
} from "../form-utils";

const ENVIRONMENT_OPTIONS = ["production", "staging", "development"];
const STRATEGY_OPTIONS = ["rolling", "canary_10_50_100", "blue_green"];

function updateTargetField(props: Record<string, unknown>, field: string, value: string) {
  if (field === "service") {
    updatePayload(props, (payload) => ({
      ...payload,
      service: value,
      requestDetail: {
        ...(typeof payload.requestDetail === "object" && payload.requestDetail && !Array.isArray(payload.requestDetail)
          ? payload.requestDetail as Record<string, unknown>
          : {}),
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
        ...(typeof payload.requestDetail === "object" && payload.requestDetail && !Array.isArray(payload.requestDetail)
          ? payload.requestDetail as Record<string, unknown>
          : {}),
        environment: value,
      },
    }));
    return;
  }

  if (field === "strategy") {
    updateTopLevelPayloadValue(props, "strategy", value);
    updateNestedPayloadValue(props, "requestDetail", "deploymentStrategy", value);
    return;
  }

  updateTopLevelPayloadValue(props, field, value);
}

export function DeployTargetSummaryBlock(props: Record<string, unknown>) {
  const service = stringifyPartValue(props.service);
  const environment = stringifyPartValue(props.environment);
  const targetVersion = stringifyPartValue(props.targetVersion);
  const recommendedVersion = stringifyPartValue(props.recommendedVersion);
  const strategy = stringifyPartValue(props.strategy);

  return (
    <PartSection subtitle={stringifyPartValue(props.impactSummary)} title="Deploy target inputs">
      <div style={formGridStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Service</span>
          <input
            onChange={(event) => updateTargetField(props, "service", event.target.value)}
            style={inputStyle}
            value={service}
          />
        </label>
        <div style={fieldStyle}>
          <span style={labelStyle}>Environment</span>
          <div style={choiceGridStyle}>
            {ENVIRONMENT_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => updateTargetField(props, "environment", option)}
                style={choiceButtonStyle(environment === option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <label style={fieldStyle}>
          <span style={labelStyle}>Target version</span>
          <input
            onChange={(event) => updateTargetField(props, "targetVersion", event.target.value)}
            style={inputStyle}
            value={targetVersion}
          />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle}>Recommended version</span>
          <input
            onChange={(event) => updateTargetField(props, "recommendedVersion", event.target.value)}
            style={inputStyle}
            value={recommendedVersion}
          />
        </label>
        <div style={fieldStyle}>
          <span style={labelStyle}>Deployment strategy</span>
          <div style={choiceGridStyle}>
            {STRATEGY_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => updateTargetField(props, "strategy", option)}
                style={choiceButtonStyle(strategy === option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PartSection>
  );
}
