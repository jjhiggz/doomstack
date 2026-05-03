import { Effect } from "effect";
import { L_Database } from "@repo/backend/db.service";

const CONNECTION_STRING = "postgresql://postgres:postgres@localhost:5434/effect_orpc";

const SCENARIOS = ["basics", "filterable"] as const;
type Scenario = (typeof SCENARIOS)[number];

function printUsage(): void {
  console.log("Usage: pnpm seed <scenario> <up|down>");
  console.log("");
  console.log("Scenarios:");
  console.log("  basics      1 user (seed@test.com / password123) + 10 todos");
  console.log("  filterable  1 user (user@user.com / password) + 40 filterable todos");
  console.log("");
  console.log("Examples:");
  console.log("  pnpm seed basics up");
  console.log("  pnpm seed basics down");
}

async function main(): Promise<void> {
  const [scenario, direction] = process.argv.slice(2);

  if (!scenario || !direction || !["up", "down"].includes(direction)) {
    printUsage();
    process.exit(1);
  }

  if (!SCENARIOS.includes(scenario as Scenario)) {
    console.error(`Unknown scenario: "${scenario}"`);
    printUsage();
    process.exit(1);
  }

  const mod = await import(`./${scenario}.scenario.ts`);
  const effect = direction === "up" ? mod.up : mod.down;

  if (!effect) {
    console.error(`Scenario "${scenario}" has no ${direction}() export`);
    process.exit(1);
  }

  const layer = L_Database(CONNECTION_STRING);

  const result = await Effect.runPromise(effect.pipe(Effect.provide(layer)));

  if (direction === "up") {
    console.log(`Seeded "${scenario}" successfully.`);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Torn down "${scenario}" successfully.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
