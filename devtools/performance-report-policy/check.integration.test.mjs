import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkRepository } from "./check.mjs";

const validReport = `# 앱 초기 로드 — iPhone 시뮬레이터 — 01

## 실행 조건

- 상태: 측정 — 수집 완료
- 대상 commit: \`0123456789abcdef0123456789abcdef01234567\`
- 기기: iPhone 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: Debug

## 시나리오

- 단계: 앱을 실행한다.

## 분석 결과

Rendering 100 ms

## 해석

단일 실행이라 일반화할 수 없다.

## 결론과 후속

- 결론: 수집 경로가 동작한다.
`;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createRepository() {
  const cwd = mkdtempSync(join(tmpdir(), "performance-report-policy-"));
  git(cwd, "init", "--initial-branch=main");
  git(cwd, "config", "user.name", "Policy Test");
  git(cwd, "config", "user.email", "policy@example.com");
  mkdirSync(join(cwd, "apps/mobile/src"), { recursive: true });
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 1;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "initial");
  return cwd;
}

test("실제 git diff에서 런타임 변경과 보고서를 함께 검사한다", () => {
  const cwd = createRepository();
  const base = git(cwd, "rev-parse", "HEAD");
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  const reportDirectory = join(cwd, "docs/performance/reports");
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(join(reportDirectory, "app-launch-iphone-simulator-01.md"), validReport);
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change with report");
  const head = git(cwd, "rev-parse", "HEAD");

  const result = checkRepository({ base, head, cwd });

  assert.equal(result.ok, true);
  assert.equal(result.applicable, true);
});

test("실제 git diff에서 보고서 없는 런타임 변경을 거부한다", () => {
  const cwd = createRepository();
  const base = git(cwd, "rev-parse", "HEAD");
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change without report");
  const head = git(cwd, "rev-parse", "HEAD");

  const result = checkRepository({ base, head, cwd });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});

test("실제 git diff에서 삭제된 런타임 파일도 보고서를 요구한다", () => {
  const cwd = createRepository();
  const base = git(cwd, "rev-parse", "HEAD");
  rmSync(join(cwd, "apps/mobile/src/App.tsx"));
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "remove runtime feature");
  const head = git(cwd, "rev-parse", "HEAD");

  const result = checkRepository({ base, head, cwd });

  assert.equal(result.applicable, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});

test("runtime 경계 밖으로 rename한 이전 경로도 보고서를 요구한다", () => {
  const cwd = createRepository();
  const base = git(cwd, "rev-parse", "HEAD");
  mkdirSync(join(cwd, "archive"));
  renameSync(join(cwd, "apps/mobile/src/App.tsx"), join(cwd, "archive/App.tsx"));
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "archive runtime feature");
  const head = git(cwd, "rev-parse", "HEAD");

  const result = checkRepository({ base, head, cwd });

  assert.equal(result.applicable, true);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /성능 보고서/);
});
