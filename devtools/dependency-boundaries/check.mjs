#!/usr/bin/env node

// 모노레포 의존 방향 검사(ADR-0004 D4 · ADR-0147) — package.json 의존 선언(D1), workspace 사이 import 방향(D2),
// core의 UI · 어댑터 · node import(D3), core의 브라우저 · 호스트 전역(D4). 위반이 있으면 종료 코드 1입니다.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { globalViolations, importViolations, isTestPath, manifestViolations } from "./policy.mjs";
import { scanSource } from "./scan-source.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.BOUNDARIES_ROOT ?? path.resolve(here, "../..");
// 루트 의존성을 늘리지 않으려고 모바일 앱이 이미 설치한 typescript를 씁니다(lint:motion과 같은 방식).
const ts = createRequire(path.join(path.resolve(here, "../.."), "apps/mobile/package.json"))(
  "typescript",
);

const sourcePattern = /\.(ts|tsx|mts|mjs|js|astro)$/;
const skippedDirs = new Set([
  "node_modules",
  "dist",
  ".rspeedy",
  "coverage",
  ".astro",
  "android",
  "ios",
]);

/** package.json이 있는 `apps/*` · `packages/*`. */
function workspaceDirs() {
  return ["apps", "packages"].flatMap((group) => {
    const root = path.join(repoRoot, group);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && existsSync(path.join(root, entry.name, "package.json")),
      )
      .map((entry) => `${group}/${entry.name}`);
  });
}

function sourceFiles(dir) {
  const out = [];
  const walk = (abs) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skippedDirs.has(entry.name) && !entry.name.startsWith("."))
          walk(path.join(abs, entry.name));
      } else if (sourcePattern.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        out.push(path.join(abs, entry.name));
      }
    }
  };
  walk(path.join(repoRoot, dir));
  return out;
}

const toPosix = (abs) => path.relative(repoRoot, abs).split(path.sep).join("/");

export function run() {
  const dirs = workspaceDirs();
  const manifests = new Map(
    dirs.map((dir) => [
      dir,
      JSON.parse(readFileSync(path.join(repoRoot, dir, "package.json"), "utf8")),
    ]),
  );
  const workspaces = new Map(dirs.map((dir) => [manifests.get(dir).name, dir]));
  const owner = (absFile) => {
    const rel = toPosix(absFile);
    return (
      dirs
        .filter((dir) => rel === dir || rel.startsWith(`${dir}/`))
        .sort((a, b) => b.length - a.length)[0] ?? null
    );
  };
  const problems = [];

  for (const dir of dirs) {
    const manifest = manifests.get(dir);
    const deps = Object.keys({
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    });
    for (const v of manifestViolations(dir, deps, workspaces))
      problems.push(`${dir}/package.json ${v.rule} ${v.message}`);

    for (const abs of sourceFiles(dir)) {
      const rel = toPosix(abs);
      const { imports, globals } = scanSource(ts, abs, readFileSync(abs, "utf8"));
      const isTest = isTestPath(rel);
      const resolveRelative = (name) => owner(path.resolve(path.dirname(abs), name));
      for (const v of importViolations({
        workspaceDir: dir,
        isTest,
        imports,
        workspaces,
        resolveRelative,
      }))
        problems.push(`${rel}:${v.line} ${v.rule} ${v.message}`);
      for (const v of globalViolations({ workspaceDir: dir, isTest, globals }))
        problems.push(`${rel}:${v.line} ${v.rule} ${v.message}`);
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = run();
  if (problems.length > 0) {
    console.error(`의존 방향 위반 ${problems.length}건:`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }
  console.log("의존 방향 검사 통과.");
}
