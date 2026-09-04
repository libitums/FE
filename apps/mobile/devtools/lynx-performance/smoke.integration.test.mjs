import { describe, expect, it, vi } from "vitest";

import { CAPTURE_RELATIVE_PATH, HOST_BUNDLE_ID } from "./simulator.mjs";
import { runSmokeCapture } from "./smoke.mjs";

const MANAGED_UDID = "0A1B2C3D-4567-89AB-CDEF-0123456789AB";
const EXTERNAL_UDID = "11111111-2222-3333-4444-555555555555";

const performanceRecord = {
  source: "performance",
  entry: {
    entryType: "pipeline",
    name: "loadBundle",
    identifier: "",
    loadBundleStart: 10,
    loadBundleEnd: 40,
    pipelineStart: 12,
    pipelineEnd: 40,
    lynxFcp: { duration: 30 },
  },
};

const memoryRecord = {
  source: "memory",
  label: "after-initial-load",
  result: {
    collectionStatus: 0,
    expectedInstanceCount: 1,
    completedInstanceCount: 1,
    totalBytes: 2_048,
  },
};

function fakeEnvironment({ failBundle = false, failBuild = false } = {}) {
  const calls = [];
  const cleanup = [];
  const captures = [
    JSON.stringify(performanceRecord),
    [performanceRecord, memoryRecord].map((record) => JSON.stringify(record)).join("\n"),
  ];

  return {
    calls,
    cleanup,
    dependencies: {
      repoRoot: "/workspace",
      iosRoot: "/workspace/apps/ios",
      createTemporaryDirectory: () => "/temporary/derived-data",
      removeTemporaryDirectory: (path) => cleanup.push(["remove", path]),
      sleep: vi.fn(),
      readText(path) {
        expect(path).toBe(`/simulator/data/container/${CAPTURE_RELATIVE_PATH}`);
        return captures.shift() ?? JSON.stringify([performanceRecord, memoryRecord]);
      },
      runCommand(program, args, options = {}) {
        calls.push({ program, args, options });
        if (program === "pnpm" && failBundle) {
          throw new Error("bundle failed");
        }
        if (program === "xcodebuild" && failBuild) {
          throw new Error("xcodebuild failed");
        }
        if (program === "xcrun" && args[0] === "simctl" && args[1] === "create") {
          return MANAGED_UDID;
        }
        if (program === "xcrun" && args[0] === "simctl" && args[1] === "get_app_container") {
          return "/simulator/data/container";
        }
        return "";
      },
    },
  };
}

function commandNames(calls) {
  return calls.map(({ program, args }) => [program, ...args.slice(0, 2)].join(" "));
}

describe("Lynx iOS performance smoke orchestration", () => {
  it("builds, boots, installs, captures, validates, and cleans up a managed simulator", async () => {
    const environment = fakeEnvironment();

    await expect(runSmokeCapture({ udid: null }, environment.dependencies)).resolves.toEqual({
      simulator: "managed",
      status: "passed",
    });

    expect(commandNames(environment.calls)).toEqual([
      "pnpm bundle:host",
      "pod install --deployment",
      "xcrun simctl create",
      "xcrun simctl boot",
      "xcrun simctl bootstatus",
      "xcodebuild -workspace Host.xcworkspace",
      "xcrun simctl install",
      "xcrun simctl terminate",
      "xcrun simctl launch",
      "xcrun simctl get_app_container",
      "xcrun simctl get_app_container",
      "xcrun simctl terminate",
      "xcrun simctl shutdown",
      "xcrun simctl delete",
    ]);
    expect(environment.calls).toContainEqual({
      program: "xcrun",
      args: [
        "simctl",
        "launch",
        MANAGED_UDID,
        HOST_BUNDLE_ID,
        "--performance-capture",
        "--bundle-url=main.lynx",
      ],
      options: {},
    });
    expect(environment.cleanup).toEqual([["remove", "/temporary/derived-data"]]);
  });

  it("uses but does not delete an explicitly supplied simulator", async () => {
    const environment = fakeEnvironment();

    await expect(
      runSmokeCapture({ udid: EXTERNAL_UDID }, environment.dependencies),
    ).resolves.toEqual({ simulator: "provided", status: "passed" });

    expect(commandNames(environment.calls)).not.toContain("xcrun simctl create");
    expect(commandNames(environment.calls)).not.toContain("xcrun simctl shutdown");
    expect(commandNames(environment.calls)).not.toContain("xcrun simctl delete");
    expect(environment.calls).toContainEqual({
      program: "xcrun",
      args: [
        "simctl",
        "install",
        EXTERNAL_UDID,
        "/temporary/derived-data/Build/Products/Release-iphonesimulator/Host.app",
      ],
      options: {},
    });
  });

  it("cleans managed resources when the build fails", async () => {
    const environment = fakeEnvironment({ failBuild: true });

    await expect(runSmokeCapture({ udid: null }, environment.dependencies)).rejects.toThrow(
      /xcodebuild failed/i,
    );

    expect(commandNames(environment.calls)).toContain("xcrun simctl shutdown");
    expect(commandNames(environment.calls)).toContain("xcrun simctl delete");
    expect(environment.cleanup).toEqual([["remove", "/temporary/derived-data"]]);
  });

  it("does not mutate a provided simulator when a prerequisite fails", async () => {
    const environment = fakeEnvironment({ failBundle: true });

    await expect(
      runSmokeCapture({ udid: EXTERNAL_UDID }, environment.dependencies),
    ).rejects.toThrow(/bundle failed/i);

    expect(environment.calls.every(({ program }) => program !== "xcrun")).toBe(true);
    expect(environment.cleanup).toEqual([["remove", "/temporary/derived-data"]]);
  });

  it("reports the last sanitized schema diagnostic when capture polling times out", async () => {
    const environment = fakeEnvironment();
    let clock = 0;
    environment.dependencies.now = () => clock;
    environment.dependencies.sleep = async () => {
      clock = 61_000;
    };
    environment.dependencies.readText = () =>
      JSON.stringify({
        source: "performance",
        token: "ghp_capture-secret",
        localPath: "/Users/person/private/capture.ndjson",
        raw: { content: "raw-capture-secret" },
      });

    let failure;
    try {
      await runSmokeCapture({ udid: null }, environment.dependencies);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toMatch(/last diagnostic.*record 1 entry.*expected an object/i);
    expect(failure.message).not.toMatch(
      /ghp_capture-secret|\/Users\/person|raw-capture-secret|"source"/,
    );
    expect(commandNames(environment.calls)).toContain("xcrun simctl delete");
    expect(environment.cleanup).toEqual([["remove", "/temporary/derived-data"]]);
  });
});
