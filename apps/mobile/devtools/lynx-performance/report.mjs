const MEMORY_FIELDS = [
  "totalBytes",
  "elementBytes",
  "viewBytes",
  "mainThreadRuntimeBytes",
  "backgroundThreadRuntimeBytes",
  "appBytes",
  "elementNodeCount",
];

const MEMORY_COLLECTION_FIELDS = [
  "collectionDurationMs",
  "collectionTimeoutMs",
  "expectedInstanceCount",
  "completedInstanceCount",
  "ratioToApp",
];

const COMMON_TIMING_PAIRS = [
  ["mtsRender", "mtsRenderStart", "mtsRenderEnd"],
  ["resolve", "resolveStart", "resolveEnd"],
  ["layout", "layoutStart", "layoutEnd"],
  [
    "paintingUiOperationExecute",
    "paintingUiOperationExecuteStart",
    "paintingUiOperationExecuteEnd",
  ],
  ["layoutUiOperationExecute", "layoutUiOperationExecuteStart", "layoutUiOperationExecuteEnd"],
];

const PIPELINE_TIMING_PAIRS = [
  ["pipeline", "pipelineStart", "pipelineEnd"],
  ...COMMON_TIMING_PAIRS,
];

const LOAD_BUNDLE_TIMING_PAIRS = [
  ["loadBundle", "loadBundleStart", "loadBundleEnd"],
  ["parse", "parseStart", "parseEnd"],
  ["loadBackground", "loadBackgroundStart", "loadBackgroundEnd"],
  ...PIPELINE_TIMING_PAIRS,
];

function inputError(recordIndex, path, message) {
  return new TypeError(`record ${recordIndex + 1} ${path}: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, recordIndex, path) {
  if (!isRecord(value)) {
    throw inputError(recordIndex, path, "expected an object");
  }
}

function requireString(value, recordIndex, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw inputError(recordIndex, path, "expected a non-empty string");
  }
}

function requireFiniteNumber(value, recordIndex, path, { nonNegative = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw inputError(recordIndex, path, "expected a finite number");
  }
  if (nonNegative && value < 0) {
    throw inputError(recordIndex, path, "expected a non-negative number");
  }
}

function requireNonNegativeInteger(value, recordIndex, path) {
  requireFiniteNumber(value, recordIndex, path, { nonNegative: true });
  if (!Number.isInteger(value)) {
    throw inputError(recordIndex, path, "expected an integer");
  }
}

function validateTimingPair(entry, recordIndex, startField, endField, { required = false } = {}) {
  const hasStart = entry[startField] !== undefined;
  const hasEnd = entry[endField] !== undefined;

  if (!hasStart && !hasEnd) {
    if (!required) {
      return;
    }
    throw inputError(
      recordIndex,
      `entry.${startField}/entry.${endField}`,
      "timing pair is required",
    );
  }
  if (!hasStart) {
    throw inputError(
      recordIndex,
      `entry.${startField}`,
      `required when entry.${endField} is present`,
    );
  }
  if (!hasEnd) {
    throw inputError(
      recordIndex,
      `entry.${endField}`,
      `required when entry.${startField} is present`,
    );
  }

  requireFiniteNumber(entry[startField], recordIndex, `entry.${startField}`, {
    nonNegative: true,
  });
  requireFiniteNumber(entry[endField], recordIndex, `entry.${endField}`, {
    nonNegative: true,
  });
  if (entry[endField] < entry[startField]) {
    throw inputError(
      recordIndex,
      `entry.${endField}`,
      `must be greater than or equal to entry.${startField}`,
    );
  }
}

function validatePerformanceRecord(record, recordIndex) {
  requireRecord(record.entry, recordIndex, "entry");
  requireString(record.entry.entryType, recordIndex, "entry.entryType");
  requireString(record.entry.name, recordIndex, "entry.name");

  const { entry } = record;
  const supportedEntryTypes = new Set(["init", "metric", "pipeline", "resource"]);
  if (!supportedEntryTypes.has(entry.entryType)) {
    throw inputError(
      recordIndex,
      "entry.entryType",
      `expected one of ${[...supportedEntryTypes].join(", ")}`,
    );
  }

  const isLoadBundle =
    (entry.entryType === "pipeline" && entry.name === "loadBundle") ||
    (entry.entryType === "resource" && entry.name === "LoadBundle");

  if (entry.entryType === "metric" && entry.name === "fcp") {
    validateFcpMetrics(entry, recordIndex);
  }

  if (isLoadBundle) {
    if (entry.identifier !== undefined) {
      if (typeof entry.identifier !== "string") {
        throw inputError(recordIndex, "entry.identifier", "expected a string");
      }
    }
    validateFcpMetrics(entry, recordIndex);
    for (const [, startField, endField] of LOAD_BUNDLE_TIMING_PAIRS) {
      validateTimingPair(entry, recordIndex, startField, endField, {
        required: startField === "loadBundleStart" || startField === "pipelineStart",
      });
    }
  } else if (entry.entryType === "pipeline") {
    if (entry.identifier !== undefined) {
      requireString(entry.identifier, recordIndex, "entry.identifier");
    }
    for (const [, startField, endField] of PIPELINE_TIMING_PAIRS) {
      validateTimingPair(entry, recordIndex, startField, endField, {
        required: startField === "pipelineStart",
      });
    }
  }

  if (entry.paintEnd !== undefined) {
    requireFiniteNumber(entry.paintEnd, recordIndex, "entry.paintEnd", {
      nonNegative: true,
    });
  }
}

function validateMemoryRecord(record, recordIndex) {
  requireString(record.label, recordIndex, "label");
  requireRecord(record.result, recordIndex, "result");
  const validStatuses = new Set([0, 1, "completed", "timeout"]);
  if (!validStatuses.has(record.result.collectionStatus)) {
    throw inputError(
      recordIndex,
      "result.collectionStatus",
      'expected 0, 1, "completed", or "timeout"',
    );
  }

  const integerFields = new Set([
    "elementNodeCount",
    "expectedInstanceCount",
    "completedInstanceCount",
  ]);
  for (const field of [...MEMORY_FIELDS, ...MEMORY_COLLECTION_FIELDS]) {
    if (record.result[field] !== undefined) {
      if (integerFields.has(field)) {
        requireNonNegativeInteger(record.result[field], recordIndex, `result.${field}`);
      } else {
        requireFiniteNumber(record.result[field], recordIndex, `result.${field}`, {
          nonNegative: true,
        });
      }
    }
  }
  if (
    record.result.expectedInstanceCount !== undefined &&
    record.result.completedInstanceCount !== undefined &&
    record.result.completedInstanceCount > record.result.expectedInstanceCount
  ) {
    throw inputError(
      recordIndex,
      "result.completedInstanceCount",
      "must be less than or equal to result.expectedInstanceCount",
    );
  }
}

function memoryCollectionStatus(value) {
  return value === 0 || value === "completed" ? "completed" : "timeout";
}

function durationsFor(entry, pairs) {
  const durationsMs = {};
  for (const [name, startField, endField] of pairs) {
    if (entry[startField] !== undefined && entry[endField] !== undefined) {
      durationsMs[name] = entry[endField] - entry[startField];
    }
  }
  return durationsMs;
}

function metricDuration(metric) {
  return metric?.duration;
}

function validateFcpMetrics(entry, recordIndex) {
  requireRecord(entry.lynxFcp, recordIndex, "entry.lynxFcp");
  requireFiniteNumber(entry.lynxFcp.duration, recordIndex, "entry.lynxFcp.duration", {
    nonNegative: true,
  });
  for (const field of ["fcp", "totalFcp"]) {
    if (entry[field] === undefined) {
      continue;
    }
    requireRecord(entry[field], recordIndex, `entry.${field}`);
    requireFiniteNumber(entry[field].duration, recordIndex, `entry.${field}.duration`, {
      nonNegative: true,
    });
  }
}

function fcpSummary(entry) {
  const summary = {
    name: entry.name,
    lynxFcpMs: metricDuration(entry.lynxFcp),
  };
  if (entry.fcp !== undefined) {
    summary.fcpMs = metricDuration(entry.fcp);
  }
  if (entry.totalFcp !== undefined) {
    summary.totalFcpMs = metricDuration(entry.totalFcp);
  }
  return summary;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function formatDurations(durations) {
  const entries = Object.entries(durations);
  return entries.length === 0
    ? "n/a"
    : entries.map(([name, value]) => `${name} ${formatNumber(value)} ms`).join(", ");
}

export function parseCapture(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new SyntaxError("capture is empty");
  }

  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (isRecord(parsed)) {
      return [parsed];
    }
    throw new SyntaxError("capture must contain records");
  } catch (error) {
    const lines = text
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => line !== "");

    let firstLineIsRecord = false;
    try {
      firstLineIsRecord = isRecord(JSON.parse(lines[0]?.line));
    } catch {
      // A multiline capture whose first line is not a complete record cannot be NDJSON.
    }
    if (lines.length > 1 && !firstLineIsRecord && /^[{[]/.test(trimmed)) {
      throw new SyntaxError(`JSON syntax error: ${error.message}`);
    }

    if (lines.length <= 1 && !(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      throw new SyntaxError(`line 1: ${error.message}`);
    }

    return lines.map(({ line, number }) => {
      try {
        const record = JSON.parse(line);
        if (!isRecord(record)) {
          throw new SyntaxError("expected an object record");
        }
        return record;
      } catch (lineError) {
        throw new SyntaxError(`line ${number}: ${lineError.message}`);
      }
    });
  }
}

export function validateCapture(records) {
  if (!Array.isArray(records)) {
    throw new TypeError("capture: expected an array of records");
  }

  records.forEach((record, recordIndex) => {
    requireRecord(record, recordIndex, "record");
    requireString(record.source, recordIndex, "source");
    if (record.capturedAt !== undefined) {
      requireString(record.capturedAt, recordIndex, "capturedAt");
    }

    if (record.source === "performance") {
      validatePerformanceRecord(record, recordIndex);
    } else if (record.source === "memory") {
      validateMemoryRecord(record, recordIndex);
    } else {
      throw inputError(recordIndex, "source", "expected performance or memory");
    }
  });

  return records;
}

export function traceChecklist() {
  return [
    {
      area: "render",
      checks: [
        "Inspect LoadBundle parse, MTS render, resolve, layout, UI operation, and paint stages.",
        "For updates, inspect diff, pack, parse, and patch work before resolve and layout.",
      ],
    },
    {
      area: "fluency",
      checks: [
        "Capture the complete real iOS scroll interval at representative interaction speed.",
        "Correlate long frames with UI work, resource loading, and bridge activity; use measured evidence instead of Android trace color thresholds.",
      ],
    },
    {
      area: "memory",
      checks: [
        "Compare before, peak, and after snapshots, then investigate retained growth with Xcode Leaks or Allocations.",
        "Treat background runtime memory as a globally deduplicated value, not memory owned only by one LynxView.",
      ],
    },
    {
      area: "NativeModule",
      checks: [
        "Inspect parameter conversion, platform implementation, background callback wait, result conversion, and callback execution.",
        "Check cleanup for special calls and avoid exposing sensitive NativeModule parameters in shared traces.",
      ],
    },
  ];
}

export function buildReport(records) {
  const rendering = { fcp: [], loadBundles: [], pipelines: [] };
  const memoryRecords = [];

  for (const record of records) {
    if (record.source === "memory") {
      const values = {};
      const collection = {};
      const missingFields = [];
      for (const field of MEMORY_FIELDS) {
        if (record.result[field] === undefined) {
          missingFields.push(field);
        } else {
          values[field] = record.result[field];
        }
      }
      for (const field of MEMORY_COLLECTION_FIELDS) {
        if (record.result[field] !== undefined) {
          collection[field] = record.result[field];
        }
      }
      const status = memoryCollectionStatus(record.result.collectionStatus);
      const instanceCollectionIsPartial =
        collection.expectedInstanceCount !== undefined &&
        collection.completedInstanceCount !== undefined &&
        collection.completedInstanceCount < collection.expectedInstanceCount;
      memoryRecords.push({
        label: record.label,
        status,
        partial: status === "timeout" || instanceCollectionIsPartial || missingFields.length > 0,
        missingFields,
        values,
        collection,
      });
      continue;
    }

    const { entry } = record;
    const isLoadBundle =
      (entry.entryType === "pipeline" && entry.name === "loadBundle") ||
      (entry.entryType === "resource" && entry.name === "LoadBundle");
    if (entry.entryType === "metric" && entry.name === "fcp") {
      rendering.fcp.push(fcpSummary(entry));
    } else if (isLoadBundle) {
      rendering.fcp.push(fcpSummary(entry));
      rendering.loadBundles.push({
        name: entry.name,
        paintEndMs: entry.paintEnd ?? null,
        durationsMs: durationsFor(entry, LOAD_BUNDLE_TIMING_PAIRS),
      });
    } else if (entry.entryType === "pipeline") {
      rendering.pipelines.push({
        name: entry.name,
        identifier: entry.identifier ?? null,
        paintEndMs: entry.paintEnd ?? null,
        durationsMs: durationsFor(entry, PIPELINE_TIMING_PAIRS),
      });
    }
  }

  let delta = null;
  if (memoryRecords.length >= 2) {
    const first = memoryRecords[0];
    const last = memoryRecords.at(-1);
    const values = {};
    for (const field of MEMORY_FIELDS) {
      if (first.values[field] !== undefined && last.values[field] !== undefined) {
        values[field] = last.values[field] - first.values[field];
      }
    }
    delta = { from: first.label, to: last.label, values };
  }

  return {
    rendering,
    memory: { snapshots: memoryRecords, delta },
    trace: traceChecklist(),
  };
}

export function formatReport(report) {
  const lines = ["Lynx performance report", "", "Rendering"];

  const renderingCount =
    report.rendering.fcp.length +
    report.rendering.loadBundles.length +
    report.rendering.pipelines.length;
  if (renderingCount === 0) {
    lines.push("  n/a");
  }

  for (const entry of report.rendering.fcp) {
    const values = [`lynxFcp ${formatNumber(entry.lynxFcpMs)} ms`];
    if (entry.fcpMs !== undefined) {
      values.push(`fcp ${formatNumber(entry.fcpMs)} ms`);
    }
    if (entry.totalFcpMs !== undefined) {
      values.push(`totalFcp ${formatNumber(entry.totalFcpMs)} ms`);
    }
    lines.push(`  FCP ${entry.name}: ${values.join(", ")}`);
  }

  for (const entry of report.rendering.loadBundles) {
    const paintEnd = entry.paintEndMs === null ? "n/a" : `${formatNumber(entry.paintEndMs)} ms`;
    lines.push(
      `  LoadBundle ${entry.name}: ${formatDurations(entry.durationsMs)}; paintEnd ${paintEnd}`,
    );
  }

  for (const entry of report.rendering.pipelines) {
    const identifier = entry.identifier === null ? "n/a" : entry.identifier;
    const paintEnd = entry.paintEndMs === null ? "n/a" : `${formatNumber(entry.paintEndMs)} ms`;
    lines.push(
      `  Pipeline ${entry.name} (${identifier}): ${formatDurations(entry.durationsMs)}; paintEnd ${paintEnd}`,
    );
  }

  lines.push("", "Memory");
  if (report.memory.snapshots.length === 0) {
    lines.push("  n/a");
  }
  for (const snapshot of report.memory.snapshots) {
    const quality = snapshot.partial ? "partial" : "complete";
    const values = Object.entries(snapshot.values).map(([field, value]) => {
      const unit = field === "elementNodeCount" ? "nodes" : "bytes";
      return `${field} ${formatNumber(value)} ${unit}`;
    });
    const missing =
      snapshot.missingFields.length === 0 ? "" : `; missing ${snapshot.missingFields.join(", ")}`;
    const instanceCollection =
      snapshot.collection.completedInstanceCount === undefined ||
      snapshot.collection.expectedInstanceCount === undefined
        ? ""
        : `; instances ${formatNumber(snapshot.collection.completedInstanceCount)}/${formatNumber(snapshot.collection.expectedInstanceCount)}`;
    const duration =
      snapshot.collection.collectionDurationMs === undefined
        ? ""
        : `; collection ${formatNumber(snapshot.collection.collectionDurationMs)} ms`;
    lines.push(
      `  ${snapshot.label} [${quality}]: ${values.length === 0 ? "n/a" : values.join(", ")}; status ${snapshot.status}${instanceCollection}${duration}${missing}`,
    );
  }

  if (report.memory.delta !== null) {
    const values = Object.entries(report.memory.delta.values).map(([field, value]) => {
      const unit = field === "elementNodeCount" ? "nodes" : "bytes";
      const sign = value > 0 ? "+" : "";
      return `${field} ${sign}${formatNumber(value)} ${unit}`;
    });
    lines.push(
      `  Delta ${report.memory.delta.from} -> ${report.memory.delta.to}: ${values.length === 0 ? "n/a" : values.join(", ")}`,
    );
  }

  lines.push("", "Trace follow-up");
  for (const section of report.trace) {
    lines.push(`  ${section.area}`);
    for (const check of section.checks) {
      lines.push(`    - ${check}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
