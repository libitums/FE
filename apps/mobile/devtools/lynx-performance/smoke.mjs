import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildReport, parseCapture, validateCapture } from "./report.mjs";
import { captureFilePath, HOST_BUNDLE_ID } from "./simulator.mjs";

const USAGE = "usage: performance:capture:smoke -- [--udid <simulator-udid>]";
const UDID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const DEVICE_TYPE = "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro";
const RUNTIME = "com.apple.CoreSimulator.SimRuntime.iOS-26-5";
const CAPTURE_TIMEOUT_MS = 60_000;
const CAPTURE_POLL_INTERVAL_MS = 1_000;
const MAX_DIAGNOSTIC_LINES = 6;
const MAX_DIAGNOSTIC_LENGTH = 600;

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(moduleDirectory, "../../../..");

export function parseSmokeArgs(args) {
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  if (normalizedArgs.length === 0) {
    return { udid: null };
  }
  if (
    normalizedArgs.length !== 2 ||
    normalizedArgs[0] !== "--udid" ||
    !UDID_PATTERN.test(normalizedArgs[1])
  ) {
    throw new TypeError(USAGE);
  }
  return { udid: normalizedArgs[1] };
}

export function assertSmokeReport(report) {
  const renderingCount =
    (report?.rendering?.fcp?.length ?? 0) +
    (report?.rendering?.loadBundles?.length ?? 0) +
    (report?.rendering?.pipelines?.length ?? 0);
  if (renderingCount === 0) {
    throw new Error("performance smoke capture is missing Rendering evidence");
  }
  if ((report?.memory?.snapshots?.length ?? 0) === 0) {
    throw new Error("performance smoke capture is missing Memory evidence");
  }
  return report;
}

function sanitizeDiagnostic(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  const sanitizedLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_DIAGNOSTIC_LINES)
    .map((line) => {
      if (/^[{[][^\n]*[}\]][,]?$/.test(line)) {
        return "<raw diagnostic redacted>";
      }
      return line;
    });

  return sanitizedLines
    .join(" | ")
    .replace(
      /\b(?:NODE_AUTH_TOKEN|GITHUB_TOKEN|NPM_TOKEN|AUTH_TOKEN)\s*[:=]\s*\S+/gi,
      "token=<redacted>",
    )
    .replace(/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_=-]+/g, "<token>")
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "authorization=<redacted>")
    .replace(/file:\/\/\/[^\s|'"\])]+/gi, "file://<path>")
    .replace(/(^|[\s("'=])\/(?!\/)(?:[^/\s:'"\])]+\/)+[^/\s:'"\])]+/gm, "$1<path>")
    .replace(/[A-Za-z]:\\(?:[^\\\s:'"\])]+\\)+[^\\\s:'"\])]+/g, "<path>")
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}

export function runCommand(
  program,
  args,
  {
    cwd,
    allowFailure = false,
    stage = program === "xcrun" && args[0] === "simctl" ? `Simulator ${args[1]}` : program,
    spawnProcess = spawnSync,
  } = {},
) {
  const result = spawnProcess(program, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 50 * 1_024 * 1_024,
  });
  if (result.error && !allowFailure) {
    const diagnostic = sanitizeDiagnostic(result.error.message);
    throw new Error(`${stage} (${program}) failed to start${diagnostic ? `: ${diagnostic}` : ""}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const diagnostic = sanitizeDiagnostic(result.stderr || result.stdout);
    throw new Error(
      `${stage} (${program}) failed with exit status ${result.status ?? "unknown"}${diagnostic ? `: ${diagnostic}` : ""}`,
    );
  }
  return result.stdout?.trim() ?? "";
}

function runSimctl(run, args, options = {}) {
  return run("xcrun", ["simctl", ...args], options);
}

async function waitForSmokeReport({ run, readText, sleep, udid, now }) {
  const deadline = now() + CAPTURE_TIMEOUT_MS;
  let lastDiagnostic = "";
  while (now() <= deadline) {
    try {
      const container = runSimctl(run, ["get_app_container", udid, HOST_BUNDLE_ID, "data"]);
      const records = validateCapture(parseCapture(readText(captureFilePath(container))));
      return assertSmokeReport(buildReport(records));
    } catch (error) {
      // The file and the asynchronous memory query can appear after the app launches.
      lastDiagnostic = sanitizeDiagnostic(error instanceof Error ? error.message : String(error));
    }
    await sleep(CAPTURE_POLL_INTERVAL_MS);
  }
  throw new Error(
    `performance smoke capture did not produce Rendering and Memory evidence${lastDiagnostic ? `; last diagnostic: ${lastDiagnostic}` : ""}`,
  );
}

export async function runSmokeCapture(
  { udid: requestedUdid },
  {
    repoRoot = defaultRepoRoot,
    iosRoot = join(repoRoot, "apps/ios"),
    runCommand: run = runCommand,
    readText = (path) => readFileSync(path, "utf8"),
    createTemporaryDirectory = () => mkdtempSync(join(tmpdir(), "libitum-performance-smoke-")),
    removeTemporaryDirectory = (path) => rmSync(path, { recursive: true, force: true }),
    sleep = (milliseconds) =>
      new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds)),
    now = () => Date.now(),
    progress = () => {},
  } = {},
) {
  if (requestedUdid !== null && !UDID_PATTERN.test(requestedUdid)) {
    throw new TypeError(USAGE);
  }

  const derivedDataPath = createTemporaryDirectory();
  let udid = requestedUdid;
  let managedSimulator = false;
  let hostLaunchAttempted = false;

  try {
    run("pnpm", ["bundle:host"], { cwd: repoRoot, stage: "Host bundle build" });
    progress("Host bundle built.");
    run("pod", ["install", "--deployment"], {
      cwd: iosRoot,
      stage: "Locked CocoaPods installation",
    });
    progress("Locked CocoaPods installation complete.");

    if (udid === null) {
      udid = runSimctl(run, ["create", "Libitum Performance Smoke", DEVICE_TYPE, RUNTIME]);
      if (!UDID_PATTERN.test(udid)) {
        throw new Error("simctl did not return a simulator UDID");
      }
      managedSimulator = true;
    }

    runSimctl(run, ["boot", udid], { allowFailure: true });
    runSimctl(run, ["bootstatus", udid, "-b"]);
    progress("Simulator ready.");

    run(
      "xcodebuild",
      [
        "-workspace",
        "Host.xcworkspace",
        "-scheme",
        "Host",
        "-configuration",
        "Release",
        "-sdk",
        "iphonesimulator",
        "-destination",
        `platform=iOS Simulator,id=${udid}`,
        "-derivedDataPath",
        derivedDataPath,
        "CODE_SIGNING_ALLOWED=NO",
        "build",
      ],
      { cwd: iosRoot, stage: "iOS Host build" },
    );
    progress("iOS Host built.");

    const appPath = join(derivedDataPath, "Build/Products/Release-iphonesimulator/Host.app");
    runSimctl(run, ["install", udid, appPath]);
    runSimctl(run, ["terminate", udid, HOST_BUNDLE_ID], { allowFailure: true });
    hostLaunchAttempted = true;
    runSimctl(run, [
      "launch",
      udid,
      HOST_BUNDLE_ID,
      "--performance-capture",
      "--bundle-url=main.lynx",
    ]);
    progress("Performance capture started.");

    await waitForSmokeReport({ run, readText, sleep, udid, now });
    progress("Rendering and Memory evidence validated.");
    return {
      simulator: managedSimulator ? "managed" : "provided",
      status: "passed",
    };
  } finally {
    if (hostLaunchAttempted) {
      runSimctl(run, ["terminate", udid, HOST_BUNDLE_ID], { allowFailure: true });
    }
    if (managedSimulator) {
      runSimctl(run, ["shutdown", udid], { allowFailure: true });
      runSimctl(run, ["delete", udid], { allowFailure: true });
    }
    removeTemporaryDirectory(derivedDataPath);
  }
}
