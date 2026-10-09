#!/usr/bin/env node

// 세 뿌리의 CSS에서 모션 리터럴과 `@media`를 찾아 정책과 대조합니다. 위반이 있으면 종료 코드 1입니다.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { allowlistProblems, loadAllowlist, violationsIn } from "./policy.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const roots = ["apps/mobile/src", "packages/ui-lynx/src", "apps/storybook-lynx/src"];

function cssFilesIn(root) {
  return readdirSync(path.join(repoRoot, root), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) =>
      path.relative(repoRoot, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"),
    )
    .sort();
}

const allowlist = loadAllowlist(
  JSON.parse(readFileSync(path.join(here, "allowlist.json"), "utf8")),
);
const allowed = new Set(allowlist.map((entry) => entry.path));
const files = roots.flatMap(cssFilesIn);

const violationsByFile = new Map();
for (const fileName of files) {
  violationsByFile.set(
    fileName,
    violationsIn(readFileSync(path.join(repoRoot, fileName), "utf8"), fileName),
  );
}

const failures = [];
for (const [fileName, violations] of violationsByFile) {
  if (allowed.has(fileName)) {
    continue;
  }
  for (const violation of violations) {
    failures.push(`${fileName}:${violation.line} ${violation.text} (${violation.rule})`);
  }
}
failures.push(...allowlistProblems(allowlist, files, violationsByFile));

if (failures.length > 0) {
  console.error(`모션 리터럴 ${failures.length}건:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
