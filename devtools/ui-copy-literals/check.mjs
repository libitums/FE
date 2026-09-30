#!/usr/bin/env node

// 앱 소스의 한글 UI 리터럴을 허용 정책과 대조합니다. 위반이 있으면 종료 코드 1입니다.
// `--print-pending`은 지금 위반이 남은 파일을 전환 목록 모양으로 찍습니다(목록을 줄일 때 씁니다).

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { uiCopyLiteralPolicy, violationsFrom } from "./policy.mjs";
import { koreanLiteralsIn } from "./scan.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const roots = ["apps/mobile/src", "packages/ui-lynx/src"];

// 루트에 typescript 의존을 더하지 않고 앱의 것을 씁니다.
const require = createRequire(path.join(repoRoot, "apps/mobile/package.json"));
const ts = require("typescript");

function sourceFilesIn(root) {
  return readdirSync(path.join(repoRoot, root), { withFileTypes: true, recursive: true })
    .filter(
      (entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts"),
    )
    .map((entry) =>
      path.relative(repoRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .sort();
}

const printPending = process.argv.includes("--print-pending");
const policy = printPending
  ? { ...uiCopyLiteralPolicy, pendingMigration: [] }
  : uiCopyLiteralPolicy;

const failures = [];
const pending = [];
for (const fileName of roots.flatMap(sourceFilesIn)) {
  const literals = koreanLiteralsIn(
    readFileSync(path.join(repoRoot, fileName), "utf8"),
    fileName,
    ts,
  );
  const violations = violationsFrom(literals, fileName, policy);
  if (violations.length > 0) {
    pending.push(fileName);
  }
  for (const violation of violations) {
    failures.push(
      `${fileName}:${violation.line} ${violation.message}${violation.text === "" ? "" : ` "${violation.text}"`}`,
    );
  }
}

// 목록에 적힌 파일이 사라졌거나 옮겨졌으면 알립니다.
if (!printPending) {
  const existing = new Set(roots.flatMap(sourceFilesIn));
  for (const fileName of uiCopyLiteralPolicy.pendingMigration) {
    if (!existing.has(fileName)) {
      failures.push(`${fileName}: 전환 목록에 있으나 파일이 없습니다. 전환 목록에서 지우세요.`);
    }
  }
}

if (printPending) {
  for (const fileName of pending) {
    console.log(`  "${fileName}",`);
  }
  process.exit(0);
}

if (failures.length > 0) {
  console.error(`한글 UI 리터럴 ${failures.length}건:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
