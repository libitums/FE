import { describe, expect, it } from "vitest";

import {
  buildReport,
  formatReport,
  parseCapture,
  traceChecklist,
  validateCapture,
} from "./report.mjs";

const performanceRecords = [
  {
    source: "performance",
    entry: {
      entryType: "metric",
      name: "fcp",
      lynxFcp: { duration: 48.5 },
      fcp: { duration: 52 },
      totalFcp: { duration: 61 },
    },
  },
  {
    source: "performance",
    entry: {
      entryType: "resource",
      name: "LoadBundle",
      loadBundleStart: 10,
      loadBundleEnd: 50,
      pipelineStart: 10,
      pipelineEnd: 50,
      parseStart: 12,
      parseEnd: 18,
      mtsRenderStart: 20,
      mtsRenderEnd: 28,
      resolveStart: 28,
      resolveEnd: 34,
      layoutStart: 34,
      layoutEnd: 40,
      paintingUiOperationExecuteStart: 40,
      paintingUiOperationExecuteEnd: 44,
      layoutUiOperationExecuteStart: 44,
      layoutUiOperationExecuteEnd: 47,
      paintEnd: 50,
      lynxFcp: { duration: 40 },
      fcp: { duration: 45 },
      totalFcp: { duration: 50 },
    },
  },
  {
    source: "performance",
    entry: {
      entryType: "pipeline",
      name: "feed-card-42",
      identifier: "feed-card-42:1",
      pipelineStart: 100,
      pipelineEnd: 124,
      mtsRenderStart: 100,
      mtsRenderEnd: 107,
      resolveStart: 107,
      resolveEnd: 111,
      layoutStart: 111,
      layoutEnd: 117,
      paintingUiOperationExecuteStart: 117,
      paintingUiOperationExecuteEnd: 121,
      layoutUiOperationExecuteStart: 121,
      layoutUiOperationExecuteEnd: 123,
      paintEnd: 124,
    },
  },
];

describe("Lynx performance capture parsing", () => {
  it("parses equivalent JSON arrays and NDJSON records", () => {
    const json = JSON.stringify(performanceRecords);
    const ndjson = performanceRecords.map((record) => JSON.stringify(record)).join("\n");

    expect(parseCapture(json)).toEqual(performanceRecords);
    expect(parseCapture(ndjson)).toEqual(performanceRecords);
  });

  it("reports the failing NDJSON line", () => {
    expect(() => parseCapture('{"source":"performance"}\n{broken')).toThrow(/line 2/i);
  });
});

describe("Lynx render timing analysis", () => {
  it("calculates FCP, LoadBundle, and timing-flag pipeline values", () => {
    const report = buildReport(validateCapture(performanceRecords));

    expect(report.rendering.fcp).toEqual([
      { name: "fcp", lynxFcpMs: 48.5, fcpMs: 52, totalFcpMs: 61 },
      { name: "LoadBundle", lynxFcpMs: 40, fcpMs: 45, totalFcpMs: 50 },
    ]);
    expect(report.rendering.loadBundles[0]).toMatchObject({
      name: "LoadBundle",
      paintEndMs: 50,
      durationsMs: {
        loadBundle: 40,
        pipeline: 40,
        parse: 6,
        mtsRender: 8,
        resolve: 6,
        layout: 6,
        paintingUiOperationExecute: 4,
        layoutUiOperationExecute: 3,
      },
    });
    expect(report.rendering.pipelines[0]).toMatchObject({
      name: "feed-card-42",
      identifier: "feed-card-42:1",
      paintEndMs: 124,
      durationsMs: {
        pipeline: 24,
        mtsRender: 7,
        resolve: 4,
        layout: 6,
        paintingUiOperationExecute: 4,
        layoutUiOperationExecute: 2,
      },
    });
  });

  it("rejects an incomplete or reversed timing pair with a record and field path", () => {
    const incomplete = [
      {
        source: "performance",
        entry: {
          entryType: "pipeline",
          name: "card",
          pipelineStart: 10,
          pipelineEnd: 20,
          resolveStart: 12,
        },
      },
    ];
    const reversed = structuredClone(incomplete);
    reversed[0].entry.resolveEnd = 11;

    expect(() => validateCapture(incomplete)).toThrow(/record 1.*entry\.resolveEnd/i);
    expect(() => validateCapture(reversed)).toThrow(/record 1.*entry\.resolveEnd/i);
  });
});

describe("Lynx memory analysis", () => {
  it("keeps partial snapshots and calculates available category deltas", () => {
    const records = [
      {
        source: "memory",
        label: "before",
        result: {
          collectionStatus: 0,
          expectedInstanceCount: 2,
          completedInstanceCount: 2,
          totalBytes: 1_000,
          elementBytes: 100,
          viewBytes: 200,
          mainThreadRuntimeBytes: 250,
          backgroundThreadRuntimeBytes: 300,
          appBytes: 150,
          elementNodeCount: 10,
        },
      },
      {
        source: "memory",
        label: "after",
        result: {
          collectionStatus: 1,
          expectedInstanceCount: 2,
          completedInstanceCount: 1,
          totalBytes: 1_120,
          elementBytes: 90,
          viewBytes: 240,
          mainThreadRuntimeBytes: 270,
          backgroundThreadRuntimeBytes: 340,
          elementNodeCount: 12,
        },
      },
    ];

    const report = buildReport(validateCapture(records));

    expect(report.memory.snapshots[1]).toMatchObject({
      label: "after",
      status: "timeout",
      partial: true,
      missingFields: ["appBytes"],
      collection: {
        expectedInstanceCount: 2,
        completedInstanceCount: 1,
      },
    });
    expect(report.memory.delta).toEqual({
      from: "before",
      to: "after",
      values: {
        totalBytes: 120,
        elementBytes: -10,
        viewBytes: 40,
        mainThreadRuntimeBytes: 20,
        backgroundThreadRuntimeBytes: 40,
        elementNodeCount: 2,
      },
    });
  });

  it("rejects impossible instance collection counts", () => {
    const records = [
      {
        source: "memory",
        label: "after",
        result: {
          collectionStatus: 0,
          expectedInstanceCount: 1,
          completedInstanceCount: 2,
        },
      },
    ];

    expect(() => validateCapture(records)).toThrow(/record 1.*result\.completedInstanceCount/i);
  });
});

describe("Lynx performance report output", () => {
  it("keeps the four official trace follow-up areas without an iOS frame threshold", () => {
    const checklist = traceChecklist();

    expect(checklist.map(({ area }) => area)).toEqual([
      "render",
      "fluency",
      "memory",
      "NativeModule",
    ]);
    expect(checklist.find(({ area }) => area === "fluency").checks.join(" ")).not.toMatch(
      /\b(?:16|32)\s*ms\b/i,
    );
  });

  it("formats a deterministic plain-text report with units and partial warnings", () => {
    const records = [
      performanceRecords[0],
      {
        source: "memory",
        label: "after",
        result: { collectionStatus: "timeout", totalBytes: 1_120 },
      },
    ];
    const report = buildReport(validateCapture(records));

    const first = formatReport(report);
    const second = formatReport(report);

    expect(second).toBe(first);
    expect(first).toContain("Lynx performance report");
    expect(first).toContain("Rendering");
    expect(first).toContain("48.5 ms");
    expect(first).toContain("Memory");
    expect(first).toContain("after [partial]");
    expect(first).toContain("1120 bytes");
    expect(first).toContain("Trace follow-up");
    expect(first.endsWith("\n")).toBe(true);
  });
});
