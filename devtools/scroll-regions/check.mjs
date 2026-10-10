#!/usr/bin/env node

// 모든 `<scroll-view>` · `<list>`가 `scroll-bar-enable={false}`를 갖는지 봅니다. 위반이 있으면 종료 코드 1입니다.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scrollBarReport } from "./tree.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// 루트에 typescript 의존을 더하지 않고 앱의 것을 씁니다.
const require = createRequire(path.join(repoRoot, "apps/mobile/package.json"));
const ts = require("typescript");

const { failures } = scrollBarReport(repoRoot, ts);

if (failures.length > 0) {
  console.error(`스크롤 바 규칙 위반 ${failures.length}건:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}
