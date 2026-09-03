import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { buildReport, formatReport, parseCapture, validateCapture } from "./report.mjs";

export const HOST_BUNDLE_ID = "com.libitum.host";
export const CAPTURE_RELATIVE_PATH = "Library/Caches/LynxPerformance/capture.ndjson";
const COMMANDS = new Set(["start", "path", "report", "stop"]);
const USAGE = "usage: performance:capture -- <start|path|report|stop>";

export function parseCaptureCommand(args) {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  if (normalizedArgs.length !== 1 || !COMMANDS.has(normalizedArgs[0])) {
    throw new TypeError(USAGE);
  }
  return normalizedArgs[0];
}

export function captureFilePath(dataContainerPath) {
  if (typeof dataContainerPath !== "string" || dataContainerPath.trim() === "") {
    throw new TypeError("simulator app data container path is empty");
  }
  return join(dataContainerPath.trim(), CAPTURE_RELATIVE_PATH);
}

export function simctl(args, { allowFailure = false } = {}) {
  const result = spawnSync("xcrun", ["simctl", ...args], { encoding: "utf8" });
  if (result.error) {
    throw new Error(`simctl ${args[0]} failed: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const diagnostic = result.stderr.trim() || `exit ${result.status}`;
    throw new Error(`simctl ${args[0]} failed: ${diagnostic}`);
  }
  return result.stdout.trim();
}

function dataContainerPath(runSimctl) {
  return runSimctl(["get_app_container", "booted", HOST_BUNDLE_ID, "data"]);
}

export function runSimulatorCommand(
  command,
  { simctl: runSimctl = simctl, readText = (path) => readFileSync(path, "utf8") } = {},
) {
  switch (command) {
    case "start":
      runSimctl(["terminate", "booted", HOST_BUNDLE_ID], { allowFailure: true });
      runSimctl([
        "launch",
        "booted",
        HOST_BUNDLE_ID,
        "--performance-capture",
        "--bundle-url=main.lynx",
      ]);
      return "Host started with performance capture enabled.\n";
    case "path":
      return `${captureFilePath(dataContainerPath(runSimctl))}\n`;
    case "report": {
      const path = captureFilePath(dataContainerPath(runSimctl));
      const records = validateCapture(parseCapture(readText(path)));
      return formatReport(buildReport(records));
    }
    case "stop":
      runSimctl(["terminate", "booted", HOST_BUNDLE_ID]);
      return "Host stopped.\n";
    default:
      throw new TypeError(USAGE);
  }
}
