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
        if (ts.isVariableStatement(node) && node.declarationList.flags & ts.NodeFlags.Let) {
          if (!isIgnored(node)) {
            const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            diagnostics.push({
              file: sourceFile.fileName,
              line: start.line + 1,
              column: start.character + 1,
              message:
                "Use 'const' with ternary, ts-pattern match(), or guard clauses instead of 'let'.",
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
