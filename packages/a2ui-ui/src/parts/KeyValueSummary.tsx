"use client";

import { PropertyList } from "../primitives/PropertyList";
import { EmptyPartState, PartSection, stringifyPartValue } from "./shared";

type SummaryItem = {
  label?: unknown;
  value?: unknown;
};

export function KeyValueSummary(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const rawItems = Array.isArray(props.items) ? props.items : [];
  const items = rawItems
    .filter((item): item is SummaryItem => !!item && typeof item === "object")
    .map((item) => ({
      label: stringifyPartValue(item.label),
      value: stringifyPartValue(item.value),
    }));

  return (
    <PartSection title={title}>
      {items.length > 0 ? <PropertyList columns={2} items={items} /> : <EmptyPartState />}
    </PartSection>
  );
}

