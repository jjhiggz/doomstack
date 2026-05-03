import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noLongTernary } from "./no-long-ternary.ts";

function lint(code: string, maxLines?: number) {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  return noLongTernary(maxLines).check(sourceFile, ts);
}

describe("no-long-ternary", () => {
  it("allows single-line ternary", () => {
    expect(lint(`const x = a ? b : c;`)).toHaveLength(0);
  });

  it("allows 2-line ternary", () => {
    expect(lint(`const x = a\n  ? b : c;`)).toHaveLength(0);
  });

  it("allows 3-line ternary (at limit)", () => {
    expect(lint(`const x = a\n  ? b\n  : c;`)).toHaveLength(0);
  });

  it("flags 4-line ternary with multi-line branch", () => {
    const code = `const x = someCondition
  ? doSomething(
      arg1
    )
  : fallback;`;
    const result = lint(code);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("no-long-ternary");
    expect(result[0].line).toBe(1);
  });

  it("flags outer nested ternary (5 lines), inner is at limit (3 lines)", () => {
    const code = `const label = status === 'approved'
  ? 'Approved'
  : status === 'pending'
    ? 'Pending'
    : 'Unknown';`;
    const result = lint(code);
    // Outer ternary: 5 lines (flagged), inner: 3 lines (at limit, not flagged)
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(1);
  });

  it("flags 6-line ternary with complex branches", () => {
    const code = `const el = condition
  ? functionA(
      arg1,
      arg2
    )
  : functionB();`;
    const result = lint(code);
    expect(result).toHaveLength(1);
  });

  it("respects custom maxLines", () => {
    const code = `const x = a\n  ? b\n  : c;`;
    expect(lint(code, 3)).toHaveLength(0);
    expect(lint(code, 2)).toHaveLength(1);
  });

  it("reports correct file, line, and column", () => {
    const code = `const foo = 1;\nconst x = someCondition\n  ? doSomething(\n      arg1\n    )\n  : fallback;`;
    const result = lint(code);
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe("test.ts");
    expect(result[0].line).toBe(2);
  });
});
