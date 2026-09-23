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

// CI가 잡 여럿으로 나뉘면서 게이트는 `pnpm verify` 안이 아니라 자기 잡에서 직접 돈다.
// 이 테스트가 보는 것은 여전히 같다 — 게이트를 부르는 단계가 base·head를 받는가.
test("배선 4: workflow가 게이트를 부르고 그 단계에 POLICY_BASE·POLICY_HEAD를 준다", () => {
  const workflowText = readWorkflowText();
  const index = workflowText.indexOf("run: pnpm performance:reports:gate");

  assert.notEqual(index, -1, "performance:reports:gate를 실행하는 run: 줄을 찾을 수 없다");

  const rest = workflowText.slice(index);
  const end = rest.search(/\n\s*-\s*(?:name|uses):|\n\w/);
  const stepBlock = end === -1 ? rest : rest.slice(0, end);

  assert.match(stepBlock, /POLICY_BASE\s*:/);
  assert.match(stepBlock, /POLICY_HEAD\s*:/);
});
