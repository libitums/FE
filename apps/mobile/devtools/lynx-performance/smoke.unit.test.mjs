import { describe, expect, it } from "vitest";

import { assertSmokeReport, parseSmokeArgs, runCommand } from "./smoke.mjs";

describe("Lynx iOS performance smoke options", () => {
  it("accepts an explicit simulator UDID after pnpm's argument separator", () => {
    expect(parseSmokeArgs(["--", "--udid", "0A1B2C3D-4567-89AB-CDEF-0123456789AB"])).toEqual({
      udid: "0A1B2C3D-4567-89AB-CDEF-0123456789AB",
    });
  });

  it("uses a managed temporary simulator when no UDID is supplied", () => {
    expect(parseSmokeArgs([])).toEqual({ udid: null });
  });

  it("rejects missing, malformed, duplicate, and unknown options", () => {
    expect(() => parseSmokeArgs(["--udid"])).toThrow(/usage/i);
    expect(() => parseSmokeArgs(["--udid", "booted"])).toThrow(/usage/i);
    expect(() =>
      parseSmokeArgs([
        "--udid",
        "0A1B2C3D-4567-89AB-CDEF-0123456789AB",
        "--udid",
        "0A1B2C3D-4567-89AB-CDEF-0123456789AB",
      ]),
    ).toThrow(/usage/i);
    expect(() => parseSmokeArgs(["--device", "iPhone"])).toThrow(/usage/i);
  });
});

describe("Lynx iOS performance smoke report gate", () => {
  it("accepts a structurally complete report without applying numerical thresholds", () => {
    expect(() =>
      assertSmokeReport({
        rendering: { fcp: [], loadBundles: [{ name: "loadBundle" }], pipelines: [] },
        memory: { snapshots: [{ label: "after-initial-load" }] },
      }),
    ).not.toThrow();
  });

  it("requires both rendering and memory evidence", () => {
    expect(() =>
      assertSmokeReport({
        rendering: { fcp: [], loadBundles: [], pipelines: [] },
        memory: { snapshots: [{ label: "after-initial-load" }] },
      }),
    ).toThrow(/rendering/i);

    expect(() =>
      assertSmokeReport({
        rendering: { fcp: [{ name: "fcp" }], loadBundles: [], pipelines: [] },
        memory: { snapshots: [] },
      }),
    ).toThrow(/memory/i);
  });
});

describe("Lynx iOS performance smoke diagnostics", () => {
  it("keeps the stage and tool while redacting paths, tokens, and raw records", () => {
    let failure;

    try {
      runCommand("xcodebuild", ["build"], {
        stage: "iOS Host build",
        spawnProcess: () => ({
          error: undefined,
          status: 65,
          stdout: "",
          stderr: [
            "/Users/runner/work/FE/apps/ios/Host/AppDelegate.swift:10: error: compile failed",
            "NODE_AUTH_TOKEN=ghp_super-secret",
            '{"source":"performance","capture":"raw-secret"}',
          ].join("\n"),
        }),
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toMatch(/iOS Host build/);
    expect(failure.message).toMatch(/xcodebuild/);
    expect(failure.message).toMatch(/compile failed/);
    expect(failure.message).not.toMatch(/\/Users\/runner|ghp_super-secret|raw-secret/);
  });
});
