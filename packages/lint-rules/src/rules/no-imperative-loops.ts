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
            (ts.isFunctionDeclaration(current) ||
              ts.isFunctionExpression(current) ||
              ts.isMethodDeclaration(current)) &&
            current.asteriskToken
          ) {
            return true;
          }
          current = current.parent;
        }
        return false;
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
          if (ts.isForOfStatement(node) && isInsideGenerator(node)) {
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
