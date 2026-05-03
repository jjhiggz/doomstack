# Onboarding & Lint Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-time setup section to CLAUDE.md and create 4 custom lint rules that enforce CLAUDE.md code conventions at the compiler level.

**Architecture:** Each lint rule is a TypeScript AST walker in `packages/lint-rules/src/rules/` following the existing `no-long-ternary` pattern. Rules produce `LintDiagnostic[]` and are registered in `cli.ts`. Files that intentionally violate rules use `// lint-ignore: <rule-name>` suppression comments. Tests use vitest with a shared `lint()` helper.

**Tech Stack:** TypeScript Compiler API, vitest

---

### Task 1: Add First-Time Setup to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add setup section to CLAUDE.md**

Add the following after the `# Project: Effect oRPC Todo App` heading, before `## Tech Stack`:

```markdown
## First-Time Setup

Prerequisites: Node.js 18+, pnpm 10+, Docker

1. `pnpm install`
2. `docker compose up -d` (starts Postgres)
3. `pnpm -F @repo/backend db:push` (pushes schema to DB)
4. `pnpm dev` (starts all dev servers)

Optional: `pnpm seed filterable up` for demo data (login: user@user.com / password)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add first-time setup section to CLAUDE.md"
```

---

### Task 2: `no-let` Rule

**Files:**
- Create: `packages/lint-rules/src/rules/no-let.ts`
- Create: `packages/lint-rules/src/rules/no-let.test.ts`

**Suppression:** The rule respects `// lint-ignore: no-let` on the line before a `let` declaration.

- [ ] **Step 1: Write the tests**

Create `packages/lint-rules/src/rules/no-let.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noLet } from "./no-let.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
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

  it("allows var (separate concern — use eslint no-var)", () => {
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: FAIL — `no-let.ts` does not exist

- [ ] **Step 3: Implement the rule**

Create `packages/lint-rules/src/rules/no-let.ts`:

```ts
import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";

export function noLet(): LintRule {
  return {
    name: "no-let",
    check(sourceFile, ts) {
      const diagnostics: LintDiagnostic[] = [];
      const text = sourceFile.getFullText();

      function isIgnored(node: ts.Node): boolean {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (pos.line === 0) return false;
        const prevLineStart = sourceFile.getPositionOfLineAndCharacter(pos.line - 1, 0);
        const prevLineEnd = sourceFile.getPositionOfLineAndCharacter(pos.line, 0);
        const prevLine = text.slice(prevLineStart, prevLineEnd).trim();
        return prevLine === "// lint-ignore: no-let";
      }

      function visit(node: ts.Node) {
        if (
          ts.isVariableStatement(node) &&
          node.declarationList.flags & ts.NodeFlags.Let
        ) {
          if (!isIgnored(node)) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            diagnostics.push({
              file: sourceFile.fileName,
              line: start.line + 1,
              column: start.character + 1,
              message: "Use 'const' with ternary, ts-pattern match(), or guard clauses instead of 'let'.",
              rule: "no-let",
            });
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return diagnostics;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/lint-rules/src/rules/no-let.ts packages/lint-rules/src/rules/no-let.test.ts
git commit -m "feat: add no-let lint rule"
```

---

### Task 3: `no-as-cast` Rule

**Files:**
- Create: `packages/lint-rules/src/rules/no-as-cast.ts`
- Create: `packages/lint-rules/src/rules/no-as-cast.test.ts`

**Suppression:** The rule respects `// lint-ignore: no-as-cast` on the line before a statement containing an `as` cast.

**Exceptions:** `as const` and `as HTML*` (DOM element types).

- [ ] **Step 1: Write the tests**

Create `packages/lint-rules/src/rules/no-as-cast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noAsCast } from "./no-as-cast.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: FAIL — `no-as-cast.ts` does not exist

- [ ] **Step 3: Implement the rule**

Create `packages/lint-rules/src/rules/no-as-cast.ts`:

```ts
import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";

export function noAsCast(): LintRule {
  return {
    name: "no-as-cast",
    check(sourceFile, ts) {
      const diagnostics: LintDiagnostic[] = [];
      const text = sourceFile.getFullText();

      function getStatementLine(node: ts.Node): number {
        let current: ts.Node = node;
        while (current.parent && !ts.isSourceFile(current.parent)) {
          current = current.parent;
        }
        return sourceFile.getLineAndCharacterOfPosition(current.getStart(sourceFile)).line;
      }

      function isIgnored(node: ts.Node): boolean {
        const stmtLine = getStatementLine(node);
        if (stmtLine === 0) return false;
        const prevLineStart = sourceFile.getPositionOfLineAndCharacter(stmtLine - 1, 0);
        const prevLineEnd = sourceFile.getPositionOfLineAndCharacter(stmtLine, 0);
        const prevLine = text.slice(prevLineStart, prevLineEnd).trim();
        return prevLine === "// lint-ignore: no-as-cast";
      }

      function visit(node: ts.Node) {
        if (ts.isAsExpression(node)) {
          const typeNode = node.type;
          const typeText = typeNode.getText(sourceFile);

          const isConst = typeText === "const";
          const isHtmlElement = typeText.startsWith("HTML");

          if (!isConst && !isHtmlElement && !isIgnored(node)) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.type.getStart(sourceFile));
            diagnostics.push({
              file: sourceFile.fileName,
              line: start.line + 1,
              column: start.character + 1,
              message: `Avoid type assertion with 'as ${typeText}'. Use a type guard, schema parse, or fix the types.`,
              rule: "no-as-cast",
            });
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return diagnostics;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: PASS — all 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/lint-rules/src/rules/no-as-cast.ts packages/lint-rules/src/rules/no-as-cast.test.ts
git commit -m "feat: add no-as-cast lint rule"
```

---

### Task 4: `no-imperative-loops` Rule

**Files:**
- Create: `packages/lint-rules/src/rules/no-imperative-loops.ts`
- Create: `packages/lint-rules/src/rules/no-imperative-loops.test.ts`

**Allowed:** `for...of` inside generator functions (needed for Effect patterns). All other `for`, `for...of`, `for...in`, and `while` loops are flagged.

**Suppression:** `// lint-ignore: no-imperative-loops`

- [ ] **Step 1: Write the tests**

Create `packages/lint-rules/src/rules/no-imperative-loops.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noImperativeLoops } from "./no-imperative-loops.ts";

function lint(code: string) {
  const sourceFile = ts.createSourceFile("test.ts", code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: FAIL — `no-imperative-loops.ts` does not exist

- [ ] **Step 3: Implement the rule**

Create `packages/lint-rules/src/rules/no-imperative-loops.ts`:

```ts
import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";

export function noImperativeLoops(): LintRule {
  return {
    name: "no-imperative-loops",
    check(sourceFile, ts) {
      const diagnostics: LintDiagnostic[] = [];
      const text = sourceFile.getFullText();

      function isIgnored(node: ts.Node): boolean {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (pos.line === 0) return false;
        const prevLineStart = sourceFile.getPositionOfLineAndCharacter(pos.line - 1, 0);
        const prevLineEnd = sourceFile.getPositionOfLineAndCharacter(pos.line, 0);
        const prevLine = text.slice(prevLineStart, prevLineEnd).trim();
        return prevLine === "// lint-ignore: no-imperative-loops";
      }

      function isInsideGenerator(node: ts.Node): boolean {
        let current = node.parent;
        while (current) {
          if (
            (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isMethodDeclaration(current)) &&
            current.asteriskToken
          ) {
            return true;
          }
          current = current.parent;
        }
        return false;
      }

      function isForOfStatement(node: ts.Node): boolean {
        return ts.isForOfStatement(node);
      }

      function visit(node: ts.Node) {
        const isLoop =
          ts.isForStatement(node) ||
          ts.isForOfStatement(node) ||
          ts.isForInStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isDoStatement(node);

        if (isLoop && !isIgnored(node)) {
          // Allow for...of inside generators
          if (isForOfStatement(node) && isInsideGenerator(node)) {
            ts.forEachChild(node, visit);
            return;
          }

          const keyword = ts.isWhileStatement(node) || ts.isDoStatement(node) ? "while" : "for";
          const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          diagnostics.push({
            file: sourceFile.fileName,
            line: start.line + 1,
            column: start.character + 1,
            message: `Use .map(), .filter(), .find(), or .reduce() instead of '${keyword}' loops.`,
            rule: "no-imperative-loops",
          });
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return diagnostics;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: PASS — all 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/lint-rules/src/rules/no-imperative-loops.ts packages/lint-rules/src/rules/no-imperative-loops.test.ts
git commit -m "feat: add no-imperative-loops lint rule"
```

---

### Task 5: `no-direct-query-hooks` Rule

**Files:**
- Create: `packages/lint-rules/src/rules/no-direct-query-hooks.ts`
- Create: `packages/lint-rules/src/rules/no-direct-query-hooks.test.ts`

**Behavior:** Flags calls to `useQuery(` and `useMutation(` in files whose path includes `components/` or `routes/`. `useSuspenseQuery` is NOT flagged — it's the intended consumption pattern for `QO_*` query options in routes/components. Files in `lib/queries/` are never flagged.

**Suppression:** `// lint-ignore: no-direct-query-hooks`

- [ ] **Step 1: Write the tests**

Create `packages/lint-rules/src/rules/no-direct-query-hooks.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noDirectQueryHooks } from "./no-direct-query-hooks.ts";

function lint(code: string, fileName = "apps/web/src/components/C_Foo.tsx") {
  const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  return noDirectQueryHooks().check(sourceFile, ts);
}

describe("no-direct-query-hooks", () => {
  it("flags useQuery in a component file", () => {
    const result = lint(`const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });`);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("no-direct-query-hooks");
    expect(result[0].message).toContain("QO_");
  });

  it("flags useMutation in a component file", () => {
    const result = lint(`const mutation = useMutation({ mutationFn: createTodo });`);
    expect(result).toHaveLength(1);
  });

  it("flags useQuery in a route file", () => {
    const result = lint(
      `const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });`,
      "apps/web/src/routes/_authed/todos.tsx",
    );
    expect(result).toHaveLength(1);
  });

  it("does NOT flag useSuspenseQuery in a route file", () => {
    const result = lint(
      `const { data } = useSuspenseQuery(QO_todosList(search));`,
      "apps/web/src/routes/_authed/todos.tsx",
    );
    expect(result).toHaveLength(0);
  });

  it("allows useQuery in lib/queries/ file", () => {
    const result = lint(
      `const { data } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos });`,
      "apps/web/src/lib/queries/todos.ts",
    );
    expect(result).toHaveLength(0);
  });

  it("allows useMutation in lib/queries/ file", () => {
    const result = lint(
      `const mutation = useMutation({ mutationFn: createTodo });`,
      "apps/web/src/lib/queries/todos.ts",
    );
    expect(result).toHaveLength(0);
  });

  it("does not flag in unrelated files", () => {
    const result = lint(
      `const x = useQuery({});`,
      "apps/web/src/lib/utils.ts",
    );
    expect(result).toHaveLength(0);
  });

  it("allows with lint-ignore comment", () => {
    const code = `// lint-ignore: no-direct-query-hooks\nconst { data } = useQuery({ queryKey: ['x'], queryFn: f });`;
    expect(lint(code)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: FAIL — `no-direct-query-hooks.ts` does not exist

- [ ] **Step 3: Implement the rule**

Create `packages/lint-rules/src/rules/no-direct-query-hooks.ts`:

```ts
import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";

const FLAGGED_HOOKS = ["useQuery", "useMutation"];

export function noDirectQueryHooks(): LintRule {
  return {
    name: "no-direct-query-hooks",
    check(sourceFile, ts) {
      const filePath = sourceFile.fileName;

      // Only check files in components/ or routes/
      const isTargetFile = filePath.includes("components/") || filePath.includes("routes/");
      // Never flag files in lib/queries/
      const isQueryFile = filePath.includes("lib/queries/");

      if (!isTargetFile || isQueryFile) return [];

      const diagnostics: LintDiagnostic[] = [];
      const text = sourceFile.getFullText();

      function isIgnored(node: ts.Node): boolean {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        if (pos.line === 0) return false;
        const prevLineStart = sourceFile.getPositionOfLineAndCharacter(pos.line - 1, 0);
        const prevLineEnd = sourceFile.getPositionOfLineAndCharacter(pos.line, 0);
        const prevLine = text.slice(prevLineStart, prevLineEnd).trim();
        return prevLine === "// lint-ignore: no-direct-query-hooks";
      }

      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          FLAGGED_HOOKS.includes(node.expression.text)
        ) {
          if (!isIgnored(node)) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            diagnostics.push({
              file: sourceFile.fileName,
              line: start.line + 1,
              column: start.character + 1,
              message: "Use QO_* query options or use*Entity mutation hooks from ~/lib/queries/ instead.",
              rule: "no-direct-query-hooks",
            });
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return diagnostics;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: PASS — all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/lint-rules/src/rules/no-direct-query-hooks.ts packages/lint-rules/src/rules/no-direct-query-hooks.test.ts
git commit -m "feat: add no-direct-query-hooks lint rule"
```

---

### Task 6: Register Rules and Fix Violations

**Files:**
- Modify: `packages/lint-rules/src/cli.ts`
- Modify: `packages/shared/src/utils/stub-builder.ts` (add suppression comments)
- Modify: `packages/lint-rules/src/runner.ts` (add suppression comments)
- Modify: `apps/backend/src/todos/todos.service.test.ts` (refactor `let` to `const`)

**Context:** The new rules will flag existing code. The violations fall into two categories:

1. **Intentional violations** in `stub-builder.ts` (complex generic utility with `let` mutation and imperative loops) and `runner.ts` (the lint runner itself uses `for...of` to iterate files/rules) — suppress with comments.
2. **Fixable violations** in `todos.service.test.ts` — `let pool` can be refactored to avoid `let`.

- [ ] **Step 1: Register all 4 new rules in cli.ts**

Replace the full contents of `packages/lint-rules/src/cli.ts` with:

```ts
import { runLint, formatDiagnostics } from "./runner.ts";
import { noLongTernary } from "./rules/no-long-ternary.ts";
import { noLet } from "./rules/no-let.ts";
import { noAsCast } from "./rules/no-as-cast.ts";
import { noImperativeLoops } from "./rules/no-imperative-loops.ts";
import { noDirectQueryHooks } from "./rules/no-direct-query-hooks.ts";

const patterns = [
  "apps/web/src/**/*.ts",
  "apps/web/src/**/*.tsx",
  "apps/backend/src/**/*.ts",
  "packages/shared/src/**/*.ts",
];

const rules = [noLongTernary(), noLet(), noAsCast(), noImperativeLoops(), noDirectQueryHooks()];

const diagnostics = await runLint(patterns, rules);

if (diagnostics.length > 0) {
  console.error(formatDiagnostics(diagnostics));
  console.error(`\n${diagnostics.length} lint error(s) found.`);
  process.exit(1);
} else {
  console.log("Custom lint rules: all clear.");
}
```

- [ ] **Step 2: Add suppression comments to `packages/shared/src/utils/stub-builder.ts`**

Add a file-level suppression comment at line 1:

```ts
// lint-ignore: no-let
// lint-ignore: no-imperative-loops
// lint-ignore: no-as-cast
```

**Wait — the current suppression is per-line, not per-file.** Instead, add `// lint-ignore: <rule>` on the line before each violation:

In `stub-builder.ts`, add suppression comments before these lines:

Before line 47 (`for (let i = 0; i < n; i++)`) add:
```ts
      // lint-ignore: no-imperative-loops
```

Before line 72 (`while (copy.length <= index)`) add:
```ts
    // lint-ignore: no-imperative-loops
```

Before line 79 (`value as (ctx: Ctx & { i: number; current?: T }) => T`) — the `as` is on line 79, but the statement starts on line 77. Add before line 77:
```ts
      // lint-ignore: no-as-cast
```

Before line 72 (`undefined as T`) — this is on the same suppressed while line, but `as T` is a separate expression. The `as` is inside the while body. Add before line 72's `copy.push`:
```ts
      // lint-ignore: no-as-cast
```

**Simpler approach:** Since `stub-builder.ts` is a complex generic utility that intentionally uses these patterns throughout, add `// lint-ignore: no-let`, `// lint-ignore: no-imperative-loops`, and `// lint-ignore: no-as-cast` before each individual violation. The violations are:

`no-let` (lines 175, 176, 179, 180, 299, 315 — 6 `let` statements in `buildFromSchema`, `getByPath`, `isPrimitive`):
- Before each `let` variable statement, add `// lint-ignore: no-let`

`no-imperative-loops` (lines 47, 72, 189, 316 — `for` and `while` loops):
- Before each loop, add `// lint-ignore: no-imperative-loops`

`no-as-cast` (line 72 `undefined as T`, line 79 `value as (...) => T`):
- Before the statement containing the `as` expression, add `// lint-ignore: no-as-cast`

Note: line 236 `for (const key of Object.keys(shape))` and line 300 `for (const p of parts)` are `for...of` loops, also needing suppression.

- [ ] **Step 3: Add suppression comments to `packages/lint-rules/src/runner.ts`**

The runner has 3 `for...of` loops (lines 7, 15, 26). Since the lint runner's own glob patterns don't include `packages/lint-rules/`, these won't actually be checked. The `patterns` array in `cli.ts` only covers `apps/` and `packages/shared/`. **No suppression needed for runner.ts.**

- [ ] **Step 4: Fix `let pool` in `apps/backend/src/todos/todos.service.test.ts`**

The `let pool: pg.Pool;` on line 11 is used so `pool` is accessible in `afterAll` for cleanup. Refactor to avoid `let`:

Replace lines 11-22 with:

```ts
const state = (() => {
  const pool = new pg.Pool({ connectionString: CONNECTION_STRING });
  const db = drizzle(pool, { schema });

  const L_TestDatabase = Layer.succeed(Svc_Database, db);
  const TestLayer = Layer.provideMerge(L_TodosRepo, L_TestDatabase);
  const runtime = ManagedRuntime.make(TestLayer);

  return { pool, runtime };
})();
```

Then update all references:
- `runtime` → `state.runtime`
- `pool` → `state.pool`

Read the full test file to find all references before making this change.

- [ ] **Step 5: Run `pnpm lint` to verify all violations are suppressed/fixed**

Run: `pnpm lint 2>&1`
Expected: `Custom lint rules: all clear.`

- [ ] **Step 6: Run `pnpm check` to verify everything passes**

Run: `pnpm check 2>&1`
Expected: PASS (format, lint, typecheck, fallow all pass)

- [ ] **Step 7: Run tests to verify nothing broke**

Run: `pnpm -F @repo/lint-rules test 2>&1`
Expected: PASS — all tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/lint-rules/src/cli.ts packages/shared/src/utils/stub-builder.ts apps/backend/src/todos/todos.service.test.ts
git commit -m "feat: register 4 new lint rules, suppress intentional violations, fix let in test"
```
