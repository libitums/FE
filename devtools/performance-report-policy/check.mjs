#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import { evaluatePerformanceReportPolicy } from "./policy.mjs";

function runGit(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function lines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

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

export function checkRepository({ base, head, cwd = process.cwd() }) {
  if (!base || !head) {
    throw new Error("--base와 --head commit이 모두 필요합니다.");
  }

  const changes = parseNameStatus(
    runGit(cwd, [
      "diff",
      "--name-status",
      "-z",
      "--diff-filter=ACDMRT",
      "--find-renames",
      `${base}...${head}`,
    ]),
  );
  const changedFiles = changes.flatMap((change) =>
    change.status === "R" ? [change.oldPath, change.path] : [change.path],
  );
  const changedHeadFiles = changes
    .filter((change) => change.status !== "D")
    .map((change) => change.path);
  const trackedFiles = lines(runGit(cwd, ["ls-tree", "-r", "--name-only", head]));

  return evaluatePerformanceReportPolicy({
    changedFiles,
    changedHeadFiles,
    trackedFiles,
    readFile: (path) => runGit(cwd, ["show", `${head}:${path}`]),
  });
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key !== "--base" && key !== "--head") {
      throw new Error(`지원하지 않는 인자입니다: ${key}`);
    }
    const value = argv[index + 1];
    if (!value) {
      throw new Error(`${key} 뒤에 commit을 입력하세요.`);
    }
    values.set(key, value);
    index += 1;
  }
  return { base: values.get("--base"), head: values.get("--head") };
}

function main() {
  try {
    const result = checkRepository({
      ...parseArguments(process.argv.slice(2)),
      cwd: process.cwd(),
    });
    const output = result.ok ? console.log : console.error;
    output(result.message);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`성능 보고서 정책 실행 실패: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
