import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runGate } from "./gate.mjs";

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

const invalidReport = `# 앱 초기 로드 — iPhone 시뮬레이터 — 01

작성 필요
`;

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/**
 * `main`에 런타임 없는 초기 커밋을 남기고, `work` 브랜치로 갈라선다.
 * 이후 커밋은 `work` 위에서만 쌓이므로 `merge-base main HEAD`가 안정적으로
 * 분기점(초기 커밋)을 가리킨다.
 */
function createRepository() {
  const cwd = mkdtempSync(join(tmpdir(), "performance-report-gate-"));
  git(cwd, "init", "--initial-branch=main");
  git(cwd, "config", "user.name", "Gate Test");
  git(cwd, "config", "user.email", "gate@example.com");
  mkdirSync(join(cwd, "apps/mobile/src"), { recursive: true });
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 1;\n");
  writeFileSync(join(cwd, "README.md"), "# 저장소\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "initial");
  git(cwd, "checkout", "-b", "work");
  return cwd;
}

function writeReport(cwd, content) {
  const reportDirectory = join(cwd, "docs/performance/reports");
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(join(reportDirectory, "app-launch-iphone-simulator-01.md"), content);
}

test("케이스 1: 커밋된 런타임 변경 + 보고서 없음 → ok는 false다", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change without report");

  const result = runGate({ cwd, env: {} });

  assert.equal(result.ok, false);
});

test("케이스 2: 커밋된 런타임 변경 + 규격 맞는 보고서 → ok는 true다", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  writeReport(cwd, validReport);
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change with report");

  const result = runGate({ cwd, env: {} });

  assert.equal(result.ok, true);
});

test("케이스 3: 문서만 변경 → 비적용으로 통과한다", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "README.md"), "# 저장소\n\n갱신.\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "docs only");

  const result = runGate({ cwd, env: {} });

  assert.equal(result.applicable, false);
  assert.equal(result.ok, true);
});

test("케이스 4: 작업 트리에만 있는 런타임 변경 + 보고서 없음 → ok는 false다 (AC2의 심장)", () => {
  const cwd = createRepository();
  // 커밋은 하나도 더하지 않는다 — 오직 작업 트리만 더럽힌다.
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");

  const result = runGate({ cwd, env: {} });

  assert.equal(result.applicable, true);
  assert.equal(result.ok, false);
});

test("케이스 5: 작업 트리에서만 고친 보고서는 디스크 내용으로 검증된다", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  writeReport(cwd, invalidReport);
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change with invalid report");
  // 커밋된 보고서는 규격 미달이다. 디스크에서만 규격에 맞게 고친다 — 커밋하지 않는다.
  writeReport(cwd, validReport);

  const result = runGate({ cwd, env: {} });

  assert.equal(result.ok, true);
});

test("케이스 6: CI 모드는 작업 트리를 무시하고 지정된 범위만 본다", () => {
  const cwd = createRepository();
  const base = git(cwd, "rev-parse", "HEAD");
  writeFileSync(join(cwd, "apps/mobile/src/App.tsx"), "export const value = 2;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "runtime change without report");
  const head = git(cwd, "rev-parse", "HEAD");
  // 작업 트리에는 보고서가 있지만, CI 모드는 이것을 보면 안 된다.
  writeReport(cwd, validReport);

  const result = runGate({ cwd, env: { POLICY_BASE: base, POLICY_HEAD: head } });

  assert.equal(result.ok, false);
});

test("케이스 7: base를 못 구하는 저장소는 조용한 통과가 아니라 실패한다", () => {
  const cwd = mkdtempSync(join(tmpdir(), "performance-report-gate-no-base-"));
  git(cwd, "init", "--initial-branch=trunk");
  git(cwd, "config", "user.name", "Gate Test");
  git(cwd, "config", "user.email", "gate@example.com");
  writeFileSync(join(cwd, "README.md"), "# 저장소\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "initial");
  // origin도 없고, main 브랜치도 없다.

  // "not implemented" 스텁 오류로도 assert.throws는 통과해버린다 — 그것으로
  // 이 케이스를 만족한 것처럼 보이면 안 된다. 실패 사유가 base 해석 실패임을
  // 메시지로 못 박는다.
  assert.throws(() => runGate({ cwd, env: {} }), /base/i);
});
