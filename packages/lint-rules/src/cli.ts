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

const excludePatterns = [/\.gen\./];

const rules = [noLongTernary(), noLet(), noAsCast(), noImperativeLoops(), noDirectQueryHooks()];

const diagnostics = (await runLint(patterns, rules)).filter(
  (d) => !excludePatterns.some((p) => p.test(d.file)),
);

if (diagnostics.length > 0) {
  console.error(formatDiagnostics(diagnostics));
  console.error(`\n${diagnostics.length} lint error(s) found.`);
  process.exit(1);
} else {
  console.log("Custom lint rules: all clear.");
}
