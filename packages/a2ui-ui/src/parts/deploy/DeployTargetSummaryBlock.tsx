"use client";

import { PropertyList } from "../../primitives/PropertyList";
import { PartSection, stringifyPartValue } from "../shared";

export function DeployTargetSummaryBlock(props: Record<string, unknown>) {
  return (
    <PartSection subtitle={stringifyPartValue(props.impactSummary)} title="Deploy target">
      <PropertyList
        columns={2}
        items={[
          { label: "Service", value: stringifyPartValue(props.service) },
          { label: "Environment", value: stringifyPartValue(props.environment) },
          { label: "Target version", value: stringifyPartValue(props.targetVersion) },
          { label: "Recommended", value: stringifyPartValue(props.recommendedVersion) },
          { label: "Strategy", value: stringifyPartValue(props.strategy) },
        ]}
      />
    </PartSection>
  );
}

