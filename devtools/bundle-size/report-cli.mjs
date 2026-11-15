#!/usr/bin/env node

// PR 크기 증감 보고를 마크다운으로 찍습니다(ADR-0149).
//   node devtools/bundle-size/report-cli.mjs <이 PR 실측 JSON> [main 실측 JSON] [main 커밋]
// main 실측이 없거나 읽을 수 없으면 증감 없이 크기만 보입니다. 실패로 끝나지 않습니다 — 보고는 감지기입니다.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseBudget } from "./budget.mjs";
import { compareSizes, formatSizeReport } from "./report.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [headPath, basePath, baseRef] = process.argv.slice(2);

function readJson(file) {
  if (!file || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const targets = parseBudget(
  JSON.parse(readFileSync(path.join(repoRoot, "devtools/bundle-size/budget.json"), "utf8")),
);
const base = readJson(basePath);
const rows = compareSizes({ targets, base, head: readJson(headPath) });
process.stdout.write(formatSizeReport(rows, { baseRef: base === null ? null : (baseRef ?? null) }));
