#!/usr/bin/env node

import { parseCaptureCommand, runSimulatorCommand } from "./simulator.mjs";

try {
  const command = parseCaptureCommand(process.argv.slice(2));
  process.stdout.write(runSimulatorCommand(command));
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error instanceof TypeError ? 2 : 1;
}
