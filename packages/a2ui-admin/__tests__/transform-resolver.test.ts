import { describe, it, expect } from "vitest";
import { executeTransform } from "../src/mcp-server/resolvers/transform-resolver";

describe("Transform Resolver", () => {
  it("merge — 여러 객체를 하나로 병합", () => {
    const result = executeTransform(
      [{ type: "merge", sources: ["a", "b"], target: "merged" }],
      { a: { x: 1 }, b: { y: 2 } },
    );
    expect(result.merged).toEqual({ x: 1, y: 2 });
  });

  it("pick — 특정 키만 추출", () => {
    const result = executeTransform(
      [{ type: "pick", sources: ["name", "env"], target: "picked" }],
      { name: "api", env: "prod", secret: "hidden" },
    );
    expect(result.picked).toEqual({ name: "api", env: "prod" });
    expect((result.picked as Record<string, unknown>).secret).toBeUndefined();
  });

  it("rename — 키 이름 변경", () => {
    const result = executeTransform(
      [{ type: "rename", sources: ["oldName:newName", "oldEnv:newEnv"], target: "" }],
      { oldName: "api", oldEnv: "prod" },
    );
    expect(result.newName).toBe("api");
    expect(result.newEnv).toBe("prod");
    expect(result.oldName).toBeUndefined();
  });

  it("compute — 템플릿 문자열 보간", () => {
    const result = executeTransform(
      [{ type: "compute", sources: ["${service} ${env} 배포"], target: "summary" }],
      { service: "payments-api", env: "production" },
    );
    expect(result.summary).toBe("payments-api production 배포");
  });

  it("compute — 누락된 변수는 빈 문자열", () => {
    const result = executeTransform(
      [{ type: "compute", sources: ["${service} v${version}"], target: "label" }],
      { service: "api" },
    );
    expect(result.label).toBe("api v");
  });

  it("여러 연산 순차 실행", () => {
    const result = executeTransform(
      [
        { type: "pick", sources: ["name"], target: "info" },
        { type: "compute", sources: ["Service: ${name}"], target: "display" },
      ],
      { name: "api", extra: "ignored" },
    );
    expect(result.info).toEqual({ name: "api" });
    expect(result.display).toBe("Service: api");
  });
});
