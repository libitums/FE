import { describe, expect, it } from "vitest";

import { HOST_BUNDLE_ID, runSimulatorCommand } from "./simulator.mjs";

const capture = [
  {
    source: "performance",
    capturedAt: "2026-09-03T12:00:00.000Z",
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
  },
  {
    source: "memory",
    capturedAt: "2026-09-03T12:00:01.000Z",
    label: "after-initial-load",
    result: {
      collectionStatus: 0,
      expectedInstanceCount: 1,
      completedInstanceCount: 1,
      totalBytes: 2048,
      elementBytes: 256,
      viewBytes: 512,
      mainThreadRuntimeBytes: 512,
      backgroundThreadRuntimeBytes: 768,
      appBytes: 4096,
      elementNodeCount: 24,
    },
  },
]
  .map((record) => JSON.stringify(record))
  .join("\n");

function fakeEnvironment() {
  const calls = [];
  return {
    calls,
    dependencies: {
      simctl(args, options = {}) {
        calls.push({ args, options });
        if (args[0] === "get_app_container") {
          return "/simulator/data/container";
        }
        return args[0] === "launch" ? `${HOST_BUNDLE_ID}: 42` : "";
      },
      readText(path) {
        expect(path).toBe(
          "/simulator/data/container/Library/Caches/LynxPerformance/capture.ndjson",
        );
        return capture;
      },
    },
  };
}

describe("Lynx simulator capture integration", () => {
  it("restarts the installed Host with capture enabled", () => {
    const environment = fakeEnvironment();

    const output = runSimulatorCommand("start", environment.dependencies);

    expect(environment.calls).toEqual([
      {
        args: ["terminate", "booted", HOST_BUNDLE_ID],
        options: { allowFailure: true },
      },
      {
        args: [
          "launch",
          "booted",
          HOST_BUNDLE_ID,
          "--performance-capture",
          "--bundle-url=main.lynx",
        ],
        options: {},
      },
    ]);
    expect(output).toMatch(/capture enabled/i);
  });

  it("locates and analyzes the native NDJSON capture", () => {
    const environment = fakeEnvironment();

    expect(runSimulatorCommand("path", environment.dependencies)).toContain(
      "Library/Caches/LynxPerformance/capture.ndjson",
    );

    const report = runSimulatorCommand("report", environment.dependencies);
    expect(report).toContain("Lynx performance report");
    expect(report).toContain("LoadBundle loadBundle");
    expect(report).toContain("after-initial-load [complete]");
  });

  it("stops the Host without hiding simctl failures", () => {
    const environment = fakeEnvironment();

    expect(runSimulatorCommand("stop", environment.dependencies)).toMatch(/stopped/i);
    expect(environment.calls).toEqual([
      {
        args: ["terminate", "booted", HOST_BUNDLE_ID],
        options: {},
      },
    ]);
  });
});
