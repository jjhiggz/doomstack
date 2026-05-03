import { runLint, formatDiagnostics } from "./runner.ts";
import { noLongTernary } from "./rules/no-long-ternary.ts";

const patterns = [
  "apps/web/src/**/*.ts",
  "apps/web/src/**/*.tsx",
  "apps/backend/src/**/*.ts",
  "packages/shared/src/**/*.ts",
];

const rules = [noLongTernary()];

const diagnostics = await runLint(patterns, rules);

if (diagnostics.length > 0) {
  console.error(formatDiagnostics(diagnostics));
  console.error(`\n${diagnostics.length} lint error(s) found.`);
  process.exit(1);
} else {
  console.log("Custom lint rules: all clear.");
}
