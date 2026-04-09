/**
 * Transform Resolver — 데이터 병합/정규화/이름변경/계산
 */

export type TransformOperation = {
  type: "merge" | "pick" | "rename" | "compute";
  sources: string[];
  target: string;
};

export function executeTransform(
  operations: TransformOperation[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...data };

  for (const op of operations) {
    switch (op.type) {
      case "merge": {
        const merged: Record<string, unknown> = {};
        for (const src of op.sources) {
          const val = data[src];
          if (val && typeof val === "object") Object.assign(merged, val);
        }
        result[op.target] = merged;
        break;
      }
      case "pick": {
        const picked: Record<string, unknown> = {};
        for (const key of op.sources) {
          if (key in data) picked[key] = data[key];
        }
        result[op.target] = picked;
        break;
      }
      case "rename": {
        for (const pair of op.sources) {
          const [oldKey, newKey] = pair.split(":");
          if (oldKey && newKey && oldKey in result) {
            result[newKey] = result[oldKey];
            delete result[oldKey];
          }
        }
        break;
      }
      case "compute": {
        // Template string interpolation: "${field1} ${field2}"
        const template = op.sources[0] ?? "";
        const computed = template.replace(/\$\{(\w+)\}/g, (_, key) => {
          const val = data[key];
          return val !== undefined && val !== null ? String(val) : "";
        });
        result[op.target] = computed;
        break;
      }
    }
  }

  return result;
}
