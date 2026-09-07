#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { checkRepository } from "./check.mjs";
import { evaluatePerformanceReportPolicy } from "./policy.mjs";
import { mergeChangeSets, parsePorcelain, resolveGateMode } from "./gate-inputs.mjs";

function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * `git diff --name-status -z`의 출력을 구조로 바꾼다. `check.mjs`의 같은 이름의
 * 내부 파서와 동일한 규칙이다 — `check.mjs`가 그것을 export하지 않으므로 이
 * 불순 진입점 안에서 다시 구현한다.
 */
function parseNameStatus(value) {
  const fields = value.split("\0");
  if (fields.at(-1) === "") {
    fields.pop();
  }

  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!status) {
      throw new Error("Git 변경 상태를 읽을 수 없습니다.");
    }
    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = fields[index++];
      const path = fields[index++];
      if (!oldPath || !path) {
        throw new Error("Git rename/copy 경로를 읽을 수 없습니다.");
      }
      changes.push({ oldPath, path, status: status[0] });
      continue;
    }

    const path = fields[index++];
    if (!path) {
      throw new Error("Git 변경 경로를 읽을 수 없습니다.");
    }
    changes.push({ path, status: status[0] });
  }
  return changes;
}

/**
 * base 해석 사다리 (D2): `origin/main`과의 merge-base, 실패하면 `main`과의
 * merge-base. 둘 다 실패하면 예외로 끝낸다 — 조용히 다른 것으로 넘어가지 않는다.
 */
function resolveLocalBase(cwd) {
  const candidates = [
    ["merge-base", "origin/main", "HEAD"],
    ["merge-base", "main", "HEAD"],
  ];
  for (const args of candidates) {
    try {
      return runGit(cwd, args).trim();
    } catch {
      // 다음 후보로 넘어간다.
    }
  }
  throw new Error(
    "base를 해석할 수 없습니다: origin/main과 main 어느 쪽에 대해서도 merge-base를 찾지 못했습니다.",
  );
}

/**
 * 범위를 산출해 `evaluatePerformanceReportPolicy`에 넘기고 결과를 찍는다.
 * @param {{ cwd?: string, env?: Record<string, string|undefined> }} [options]
 */
export function runGate({ cwd = process.cwd(), env = process.env } = {}) {
  const mode = resolveGateMode(env);

  if (mode.mode === "ci") {
    console.log(`성능 보고서 정책 게이트 — 모드: ci, base: ${mode.base}, head: ${mode.head}`);
    return checkRepository({ base: mode.base, head: mode.head, cwd });
  }

  const base = resolveLocalBase(cwd);
  const head = runGit(cwd, ["rev-parse", "HEAD"]).trim();
  console.log(`성능 보고서 정책 게이트 — 모드: local, base: ${base}, head: ${head}`);

  const committed = parseNameStatus(
    runGit(cwd, [
      "diff",
      "--name-status",
      "-z",
      "--diff-filter=ACDMRT",
      "--find-renames",
      `${base}...${head}`,
    ]),
  );
  const working = parsePorcelain(
    runGit(cwd, ["status", "--porcelain", "-z", "--untracked-files=all"]),
  );
  const merged = mergeChangeSets({ committed, working });

  const trackedHeadFiles = runGit(cwd, ["ls-tree", "-r", "--name-only", head])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const trackedFiles = Array.from(new Set([...trackedHeadFiles, ...merged.changedHeadFiles]));

  const workingPaths = new Set(working.map((entry) => entry.path));

  const readFile = (path) => {
    if (workingPaths.has(path)) {
      return readFileSync(join(cwd, path), "utf8");
    }
    return runGit(cwd, ["show", `${head}:${path}`]);
  };

  return evaluatePerformanceReportPolicy({
    changedFiles: merged.changedFiles,
    changedHeadFiles: merged.changedHeadFiles,
    trackedFiles,
    readFile,
  });
}

function main() {
  try {
    const result = runGate({ cwd: process.cwd(), env: process.env });
    const output = result.ok ? console.log : console.error;
    output(result.message);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`성능 보고서 정책 게이트 실행 실패: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
