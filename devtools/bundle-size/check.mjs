#!/usr/bin/env node

// 빌드 산출물의 크기를 예산과 대조합니다. `pnpm build` 뒤에 돌립니다 — 산출물이 없으면
// 위반으로 답니다.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateBundleBudget, formatBytes, parseBudget } from "./budget.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const budgetPath = path.join(repoRoot, "devtools/bundle-size/budget.json");

// 폴더를 가리키면 그 아래 파일 크기를 전부 더합니다 — 그림처럼 파일 수가 늘어나는 자리는
// 파일 하나가 아니라 합계를 지켜야 합니다.
function sizeOf(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    return undefined;
  }
  if (!stats.isDirectory()) return stats.size;

  let total = 0;
  for (const entry of readdirSync(absolute, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    total += statSync(path.join(entry.parentPath, entry.name)).size;
  }
  return total;
}

const targets = parseBudget(JSON.parse(readFileSync(budgetPath, "utf8")));
const sizes = new Map();
for (const target of targets) {
  const size = sizeOf(target.path);
  if (size !== undefined) sizes.set(target.path, size);
}

const { ok, results, violations } = evaluateBundleBudget({ targets, sizes });

// PR 증감 보고(ADR-0149)가 쓸 실측입니다. `BUNDLE_SIZES_OUT`을 주면 `{경로: 바이트}`로 남깁니다.
if (process.env.BUNDLE_SIZES_OUT) {
  writeFileSync(
    process.env.BUNDLE_SIZES_OUT,
    `${JSON.stringify(Object.fromEntries(sizes), null, 2)}\n`,
  );
}

console.log("번들 크기 천장");
for (const result of results) {
  const mark = result.status === "ok" ? "통과" : result.status === "over" ? "초과" : "산출물 없음";
  console.log(
    `  ${mark}  ${result.path} — ${formatBytes(result.actualBytes)} / ${formatBytes(result.maxBytes)}`,
  );
}

if (ok) {
  process.exit(0);
}

console.error(`\n번들 크기 천장 초과: ${violations.length}개 위반.`);
for (const violation of violations) {
  if (violation.status === "missing") {
    console.error(`- ${violation.path}: 산출물이 없습니다. \`pnpm build\`를 먼저 돌리십시오.`);
    continue;
  }
  const over = violation.actualBytes - violation.maxBytes;
  console.error(
    `- ${violation.path}: ${formatBytes(violation.actualBytes)}로 천장을 ${formatBytes(over)} 넘었습니다.`,
  );
}
console.error(
  "\n천장은 저사양 기기 첫 실행 시간으로 정한 선입니다(ADR-0149). 실측에 맞춰 올리지 말고 먼저 줄이십시오.",
);
console.error(
  "줄일 수 없으면 docs/performance/startup-ceiling.md 절차로 첫 실행 시간을 재고, 사용자 결정으로 천장을 바꾸십시오.",
);
process.exit(1);
