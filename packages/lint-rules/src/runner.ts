import ts from "typescript";
import { glob } from "node:fs/promises";
import type { LintRule, LintDiagnostic } from "./types.ts";

export async function runLint(patterns: string[], rules: LintRule[]): Promise<LintDiagnostic[]> {
  const files: string[] = [];
  for (const pattern of patterns) {
    for await (const match of glob(pattern)) {
      files.push(match);
    }
  }

  const diagnostics: LintDiagnostic[] = [];

  for (const filePath of files) {
    const program = ts.createProgram([filePath], {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      noEmit: true,
    });

    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    for (const rule of rules) {
      diagnostics.push(...rule.check(sourceFile, ts));
    }
  }

  return diagnostics;
}

export function formatDiagnostics(diagnostics: LintDiagnostic[]): string {
  if (diagnostics.length === 0) return "";

  return diagnostics
    .map((d) => `${d.file}:${d.line}:${d.column} [${d.rule}] ${d.message}`)
    .join("\n");
}
