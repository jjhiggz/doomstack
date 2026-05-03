import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noImperativeLoops } from "./no-imperative-loops.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile(
    "test.ts",
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  return noImperativeLoops().check(sourceFile, ts);
}

describe("no-imperative-loops", () => {
  it("flags for loop", () => {
    const result = lint(`for (let i = 0; i < 10; i++) { console.log(i); }`);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("no-imperative-loops");
  });

  it("flags while loop", () => {
    const result = lint(`while (true) { break; }`);
    expect(result).toHaveLength(1);
  });

  it("flags for...of outside generator", () => {
    const result = lint(`for (const x of items) { console.log(x); }`);
    expect(result).toHaveLength(1);
  });

  it("flags for...in", () => {
    const result = lint(`for (const k in obj) { console.log(k); }`);
    expect(result).toHaveLength(1);
  });

  it("allows for...of inside generator function", () => {
    const code = `function* gen() { for (const x of items) { yield x; } }`;
    expect(lint(code)).toHaveLength(0);
  });

  it("allows for...of inside generator method", () => {
    const code = `const obj = { *gen() { for (const x of items) { yield x; } } };`;
    expect(lint(code)).toHaveLength(0);
  });

  it("flags for (non-of) inside generator", () => {
    const code = `function* gen() { for (let i = 0; i < 10; i++) { yield i; } }`;
    const result = lint(code);
    expect(result).toHaveLength(1);
  });

  it("allows with lint-ignore comment", () => {
    const code = `// lint-ignore: no-imperative-loops\nfor (let i = 0; i < 10; i++) { console.log(i); }`;
    expect(lint(code)).toHaveLength(0);
  });

  it("reports correct location", () => {
    const code = `const x = 1;\nwhile (true) { break; }`;
    const result = lint(code);
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
  });
});
