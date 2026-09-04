#!/usr/bin/env node

import { parseSmokeArgs, runSmokeCapture } from "./smoke.mjs";

try {
  const options = parseSmokeArgs(process.argv.slice(2));
  await runSmokeCapture(options, {
    progress(message) {
      process.stdout.write(`${message}\n`);
    },
  });
  process.stdout.write("Lynx iOS performance smoke passed.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Lynx iOS performance smoke failed: ${message}\n`);
  process.exitCode = error instanceof TypeError ? 2 : 1;
}
