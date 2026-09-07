import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
const workflowPath = fileURLToPath(new URL("../../.github/workflows/verify.yml", import.meta.url));

function readPackageJson() {
  const text = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(text);
}

function readWorkflowText() {
  return readFileSync(workflowPath, "utf8");
}

test("배선 1: scripts.verify가 performance:reports:gate를 부른다", () => {
  const packageJson = readPackageJson();

  assert.match(packageJson.scripts.verify, /pnpm performance:reports:gate\b/);
});

test("배선 2: scripts['performance:reports:gate']가 gate.mjs를 가리킨다", () => {
  const packageJson = readPackageJson();

  assert.match(
    packageJson.scripts["performance:reports:gate"] ?? "",
    /devtools\/performance-report-policy\/gate\.mjs\b/,
  );
});

test("배선 3: workflow의 어떤 run: 줄도 performance:reports:check를 부르지 않는다", () => {
  const workflowText = readWorkflowText();
  const runLines = workflowText.split("\n").filter((line) => /^\s*run:\s*/.test(line));

  const offendingLines = runLines.filter((line) => line.includes("performance:reports:check"));

  assert.deepEqual(offendingLines, []);
});

test("배선 4: workflow가 pnpm verify를 부르고 그 단계에 POLICY_BASE·POLICY_HEAD를 준다", () => {
  const workflowText = readWorkflowText();
  const verifyStepMatch = workflowText.match(
    /run:\s*pnpm verify\s*\n(?:[^\n]*\n)*?(?=\s*- name:|\s*$)/,
  );

  assert.ok(verifyStepMatch, "pnpm verify를 실행하는 run: 줄을 찾을 수 없다");

  const verifyStepBlock = verifyStepMatch[0];
  assert.match(verifyStepBlock, /POLICY_BASE\s*:/);
  assert.match(verifyStepBlock, /POLICY_HEAD\s*:/);
});
