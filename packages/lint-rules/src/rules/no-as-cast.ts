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
