#!/usr/bin/env node

// 세 뿌리의 CSS와 TypeScript 소스에서 모션 리터럴과 `@media`를 찾아 정책과 대조합니다.
// 위반이 있으면 종료 코드 1입니다.

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { allowlistProblems, loadAllowlist, violationsIn, violationsInSource } from "./policy.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const roots = ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"];

// 루트 의존성을 늘리지 않으려고 모바일 앱이 이미 설치한 typescript를 그 자리에서 풉니다.
const ts = createRequire(path.join(repoRoot, "apps/mobile/package.json"))("typescript");

const sourceExtensions = [".ts", ".tsx"];
const excludedSourceSuffixes = [".d.ts", ".test.ts", ".test.tsx"];

function isScannedFile(name) {
  if (name.endsWith(".css")) {
    return true;
  }
  return (
    sourceExtensions.some((extension) => name.endsWith(extension)) &&
    !excludedSourceSuffixes.some((suffix) => name.endsWith(suffix))
  );
}

function scannedFilesIn(root) {
  return readdirSync(path.join(repoRoot, root), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && isScannedFile(entry.name))
    .map((entry) =>
      path.relative(repoRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .sort();
}

const allowlist = loadAllowlist(
  JSON.parse(readFileSync(path.join(here, "allowlist.json"), "utf8")),
);
const allowed = new Set(allowlist.map((entry) => entry.path));
const files = roots.flatMap(scannedFilesIn);

const violationsByFile = new Map();
for (const fileName of files) {
  const text = readFileSync(path.join(repoRoot, fileName), "utf8");
  violationsByFile.set(
    fileName,
    fileName.endsWith(".css") ? violationsIn(text) : violationsInSource(text, fileName, ts),
  );
}

const failures = [];
for (const [fileName, violations] of violationsByFile) {
  if (allowed.has(fileName)) {
    continue;
  }
  for (const violation of violations) {
    failures.push(`${fileName}:${violation.line} ${violation.rule} — ${violation.text}`);
  }
}
failures.push(...allowlistProblems(allowlist, new Set(files), violationsByFile));

if (failures.length > 0) {
  console.error(`모션 리터럴 ${failures.length}건:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
