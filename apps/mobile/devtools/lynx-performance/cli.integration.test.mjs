import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const cliPath = join(dirname(fileURLToPath(import.meta.url)), "cli.mjs");
const temporaryDirectories = [];

const validRecords = [
  {
    source: "performance",
    entry: {
      entryType: "metric",
      name: "fcp",
      lynxFcp: { duration: 42 },
    },
  },
  {
    source: "memory",
    label: "after",
    result: { collectionStatus: 1, totalBytes: 2_048 },
  },
];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function writeCapture(name, contents) {
  const directory = mkdtempSync(join(tmpdir(), "libitums-lynx-performance-"));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  writeFileSync(path, contents, "utf8");
  return path;
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
  });
}

describe("Lynx performance report CLI", () => {
  it("prints a report for a JSON capture", () => {
    const path = writeCapture("capture.json", JSON.stringify(validRecords));

    const result = runCli([path]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Lynx performance report");
    expect(result.stdout).toContain("lynxFcp 42 ms");
    expect(result.stdout).toContain("after [partial]");
  });

  it("produces the same report for equivalent NDJSON", () => {
    const jsonPath = writeCapture("capture.json", JSON.stringify(validRecords));
    const ndjsonPath = writeCapture(
      "capture.ndjson",
      validRecords.map((record) => JSON.stringify(record)).join("\n"),
    );

    const jsonResult = runCli([jsonPath]);
    const ndjsonResult = runCli([ndjsonPath]);

    expect(ndjsonResult.status).toBe(0);
    expect(ndjsonResult.stdout).toBe(jsonResult.stdout);
  });

  it("returns exit 1 and a record field diagnostic for invalid input", () => {
    const path = writeCapture(
      "invalid.json",
      JSON.stringify([
        {
          source: "performance",
          entry: {
            entryType: "pipeline",
            name: "card",
            pipelineStart: 20,
            pipelineEnd: 10,
          },
        },
      ]),
    );

    const result = runCli([path]);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/record 1.*entry\.pipelineEnd/i);
  });

  it("returns exit 2 and usage when the capture path is missing", () => {
    const result = runCli([]);

    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/usage:.*capture/i);
  });
});
