import type ts from "typescript";

export interface LintDiagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
}

export interface LintRule {
  name: string;
  check(sourceFile: ts.SourceFile, ts: typeof import("typescript")): LintDiagnostic[];
}
