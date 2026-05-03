import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noDirectQueryHooks } from "./no-direct-query-hooks.ts";

function lint(code: string, fileName = "apps/web/src/components/C_Foo.tsx") {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
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
    const result = lint(`const x = useQuery({});`, "apps/web/src/lib/utils.ts");
    expect(result).toHaveLength(0);
  });

  it("allows with lint-ignore comment", () => {
    const code = `// lint-ignore: no-direct-query-hooks\nconst { data } = useQuery({ queryKey: ['x'], queryFn: f });`;
    expect(lint(code)).toHaveLength(0);
  });
});
