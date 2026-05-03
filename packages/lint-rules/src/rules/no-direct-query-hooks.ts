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
              message:
                "Use QO_* query options or use*Entity mutation hooks from ~/lib/queries/ instead.",
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
