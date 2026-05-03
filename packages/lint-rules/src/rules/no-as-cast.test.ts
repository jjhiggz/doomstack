import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noAsCast } from "./no-as-cast.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  return noAsCast().check(sourceFile, ts);
}

describe("no-as-cast", () => {
  it("flags 'as string'", () => {
    const result = lint(`const x = value as string;`);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("no-as-cast");
  });

  it("flags 'as any'", () => {
    const result = lint(`const x = value as any;`);
    expect(result).toHaveLength(1);
  });

  it("flags 'as unknown as T'", () => {
    const result = lint(`const x = value as unknown as string;`);
    expect(result).toHaveLength(2);
  });

  it("allows 'as const'", () => {
    expect(lint(`const x = [1, 2, 3] as const;`)).toHaveLength(0);
  });

  it("allows 'as HTMLInputElement'", () => {
    expect(lint(`const el = e.target as HTMLInputElement;`)).toHaveLength(0);
  });

  it("allows 'as HTMLFormElement'", () => {
    expect(lint(`const form = e.target as HTMLFormElement;`)).toHaveLength(0);
  });

  it("flags 'as Element' (not an HTML* type)", () => {
    const result = lint(`const el = e.target as Element;`);
    expect(result).toHaveLength(1);
  });

  it("allows with lint-ignore comment", () => {
    const code = `// lint-ignore: no-as-cast\nconst x = value as string;`;
    expect(lint(code)).toHaveLength(0);
  });

  it("reports correct location", () => {
    const result = lint(`const a = 1;\nconst x = value as string;`);
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
  });
});
