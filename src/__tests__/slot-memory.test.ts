import { describe, it, expect } from "vitest";
import {
  setSlot,
  getSlot,
  getSlotValue,
  clearSlot,
  clearNamespace,
  mergeSlotPatch,
  invalidateDependentSlots,
  getFilledSlots,
} from "@/devops-chat/server/orchestration/slot-memory";
import type { ConversationFacts } from "@/devops-chat/types/conversation";

const emptyFacts: ConversationFacts = {};

describe("slot-memory", () => {
  it("setSlot creates a new slot entry", () => {
    const facts = setSlot(emptyFacts, "deploy.serviceName", "payments-api", "user");
    expect(facts.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
    expect(facts.slots?.["deploy.serviceName"]?.source).toBe("user");
  });

  it("getSlot and getSlotValue read slot values", () => {
    const facts = setSlot(emptyFacts, "deploy.serviceName", "payments-api", "user");
    expect(getSlot(facts, "deploy.serviceName")?.value).toBe("payments-api");
    expect(getSlotValue<string>(facts, "deploy.serviceName")).toBe("payments-api");
    expect(getSlotValue(facts, "nonexistent")).toBeUndefined();
  });

  it("user source takes precedence over tool source", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "old-service", "user");
    facts = setSlot(facts, "deploy.serviceName", "tool-service", "tool");
    expect(getSlotValue(facts, "deploy.serviceName")).toBe("old-service");
  });

  it("user source overwrites tool source", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "tool-service", "tool");
    facts = setSlot(facts, "deploy.serviceName", "user-service", "user");
    expect(getSlotValue(facts, "deploy.serviceName")).toBe("user-service");
  });

  it("same source overwrites", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "first", "user");
    facts = setSlot(facts, "deploy.serviceName", "second", "user");
    expect(getSlotValue(facts, "deploy.serviceName")).toBe("second");
  });

  it("clearSlot removes a slot", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "payments-api", "user");
    facts = clearSlot(facts, "deploy.serviceName");
    expect(getSlotValue(facts, "deploy.serviceName")).toBeUndefined();
  });

  it("clearNamespace removes all slots in namespace", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "api", "user");
    facts = setSlot(facts, "deploy.environment", "prod", "user");
    facts = setSlot(facts, "rollback.serviceName", "other", "user");
    facts = clearNamespace(facts, "deploy");
    expect(getSlotValue(facts, "deploy.serviceName")).toBeUndefined();
    expect(getSlotValue(facts, "deploy.environment")).toBeUndefined();
    expect(getSlotValue(facts, "rollback.serviceName")).toBe("other");
  });

  it("mergeSlotPatch merges multiple slots", () => {
    const facts = mergeSlotPatch(emptyFacts, {
      "deploy.serviceName": { value: "api", source: "tool" },
      "deploy.environment": { value: "production", source: "tool" },
    });
    expect(getSlotValue(facts, "deploy.serviceName")).toBe("api");
    expect(getSlotValue(facts, "deploy.environment")).toBe("production");
  });

  it("invalidateDependentSlots clears dependent slots", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "api", "user");
    facts = setSlot(facts, "deploy.selectedServiceContext", { data: true }, "tool");

    const staleMap = {
      "deploy.selectedServiceContext": ["deploy.serviceName"],
    };

    facts = invalidateDependentSlots(facts, "deploy.serviceName", staleMap);
    expect(getSlotValue(facts, "deploy.selectedServiceContext")).toBeUndefined();
    expect(getSlotValue(facts, "deploy.serviceName")).toBe("api");
  });

  it("getFilledSlots returns all non-null slot values", () => {
    let facts = setSlot(emptyFacts, "deploy.serviceName", "api", "user");
    facts = setSlot(facts, "deploy.environment", "production", "user");
    const filled = getFilledSlots(facts);
    expect(filled).toEqual({
      "deploy.serviceName": "api",
      "deploy.environment": "production",
    });
  });

  it("getFilledSlots returns empty object for no slots", () => {
    expect(getFilledSlots(emptyFacts)).toEqual({});
  });
});
