import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noLet } from "./no-let.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  return noLet().check(sourceFile, ts);
}

describe("no-let", () => {
  it("flags let declaration", () => {
    const result = lint(`let x = 1;`);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("no-let");
    expect(result[0].message).toContain("const");
  });

  it("flags let without initializer", () => {
    const result = lint(`let x: string;`);
    expect(result).toHaveLength(1);
  });

  it("allows const declaration", () => {
    expect(lint(`const x = 1;`)).toHaveLength(0);
  });

  it("allows var (separate concern)", () => {
    expect(lint(`var x = 1;`)).toHaveLength(0);
  });

  it("flags multiple let declarations", () => {
    const result = lint(`let a = 1;\nlet b = 2;`);
    expect(result).toHaveLength(2);
  });

  it("allows let with lint-ignore comment", () => {
    const code = `// lint-ignore: no-let\nlet x = 1;`;
    expect(lint(code)).toHaveLength(0);
  });

  it("only suppresses the immediately following let", () => {
    const code = `// lint-ignore: no-let\nlet x = 1;\nlet y = 2;`;
    const result = lint(code);
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(3);
  });
});
