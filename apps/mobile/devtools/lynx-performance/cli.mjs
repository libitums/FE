#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { buildReport, formatReport, parseCapture, validateCapture } from "./report.mjs";

const args = process.argv.slice(2);

if (args.length !== 1) {
  process.stderr.write("Usage: lynx-performance-report <capture.json-or-ndjson>\n");
  process.exitCode = 2;
} else {
  try {
    const contents = readFileSync(args[0], "utf8");
    const records = validateCapture(parseCapture(contents));
    process.stdout.write(formatReport(buildReport(records)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Lynx performance report error: ${message}\n`);
    process.exitCode = 1;
  }
}
