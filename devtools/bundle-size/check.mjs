#!/usr/bin/env node

// 빌드 산출물의 크기를 예산과 대조합니다. `pnpm build` 뒤에 돌립니다 — 산출물이 없으면
// 위반으로 답니다.

import { readdirSync, readFileSync, statSync } from "node:fs";
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

console.log("번들 크기 예산");
for (const result of results) {
  const mark = result.status === "ok" ? "통과" : result.status === "over" ? "초과" : "산출물 없음";
  console.log(
    `  ${mark}  ${result.path} — ${formatBytes(result.actualBytes)} / ${formatBytes(result.maxBytes)}`,
  );
}

if (ok) {
  process.exit(0);
}

console.error(`\n번들 크기 예산 실패: ${violations.length}개 위반.`);
for (const violation of violations) {
  if (violation.status === "missing") {
    console.error(`- ${violation.path}: 산출물이 없습니다. \`pnpm build\`를 먼저 돌리십시오.`);
    continue;
  }
  const over = violation.actualBytes - violation.maxBytes;
  console.error(
    `- ${violation.path}: ${formatBytes(violation.actualBytes)}로 예산을 ${formatBytes(over)} 넘었습니다.`,
  );
}
console.error(
  "\n무엇이 커졌는지 PR에 적으십시오. 커진 것이 맞는 변경이면 devtools/bundle-size/budget.json의",
);
console.error("maxBytes를 올리고, 왜 올렸는지 같은 PR에 남기십시오.");
process.exit(1);
