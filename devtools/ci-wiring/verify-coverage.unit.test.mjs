// CI를 잡 여럿으로 나눈 뒤 생기는 위험은 하나입니다 — 검사가 조용히 빠지는 것입니다.
// `pnpm verify`는 로컬 한 줄로 남아 있고, CI는 그 안의 잎 명령을 나눠 돌립니다. 두 쪽이
// 어긋나면 로컬만 초록이거나 CI만 초록인 상태가 생기므로, 여기서 둘을 대조합니다.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
);
const workflowText = readFileSync(
  fileURLToPath(new URL("../../.github/workflows/verify.yml", import.meta.url)),
  "utf8",
);

/** `verify`가 부르는 pnpm 잎 명령입니다. `&&`로 이어진 사슬을 그대로 읽습니다. */
function verifyLeafCommands() {
  return packageJson.scripts.verify
    .split("&&")
    .map((part) => part.trim())
    .map((part) => part.replace(/^pnpm\s+/, ""))
    .filter(Boolean);
}

/**
 * 워크플로가 실제로 **실행하는** pnpm 명령입니다. 주석이나 YAML 키에 적힌 이름은 세지
 * 않습니다 — 「돈다」는 `run:` 안에 있을 때만 참입니다. 여러 줄 run 블록도 훑습니다.
 */
function workflowPnpmCommands() {
  const found = new Set();
  const lines = workflowText.split("\n");
  let runIndent = null;

  for (const line of lines) {
    if (/^\s*#/.test(line)) continue;

    const runStart = line.match(/^(\s*)-?\s*run:\s*(.*)$/);
    if (runStart) {
      const [, indent, rest] = runStart;
      // `run: |` 이면 뒤따르는 들여쓴 줄이 전부 명령입니다.
      runIndent = rest.trim() === "|" || rest.trim() === ">" ? indent.length : null;
      collect(rest, found);
      continue;
    }

    if (runIndent !== null) {
      const indent = line.match(/^\s*/)[0].length;
      if (line.trim() !== "" && indent <= runIndent) {
        runIndent = null;
        continue;
      }
      collect(line, found);
    }
  }
  return found;
}

function collect(text, found) {
  for (const match of text.matchAll(/pnpm\s+([a-z][\w:-]*)/g)) {
    found.add(match[1]);
  }
}

// CW1 — 이 파일의 존재 이유입니다. `verify`에 있는 검사가 CI 어딘가에서 돌아야 합니다.
test("CW1. verify가 부르는 검사를 CI가 모두 돈다", () => {
  const missing = verifyLeafCommands().filter((command) => !workflowPnpmCommands().has(command));

  assert.deepEqual(
    missing,
    [],
    `CI가 돌지 않는 검사가 있습니다: ${missing.join(", ")}. 워크플로에 추가하거나 verify에서 빼십시오.`,
  );
});

// CW2 — 반대 방향입니다. CI에만 있고 로컬 `verify`에 없는 검사가 있으면 「로컬에서 초록이면
// CI도 초록」이 깨집니다. 커버리지는 게이트가 아니므로 예외로 둡니다.
test("CW2. CI가 도는 검사 가운데 verify 밖의 게이트가 없다", () => {
  const allowedOutsideVerify = new Set(["install", "test:coverage"]);
  const leaves = new Set(verifyLeafCommands());

  const extra = [...workflowPnpmCommands()].filter(
    (command) => !leaves.has(command) && !allowedOutsideVerify.has(command),
  );

  assert.deepEqual(
    extra,
    [],
    `verify에 없는 검사가 CI에만 있습니다: ${extra.join(", ")}. verify에 넣거나 예외로 적으십시오.`,
  );
});

// CW3 — 정책 게이트는 base와 head를 환경 변수로 받습니다. 그 둘이 빠지면 게이트가 비교할
// 대상을 잃고 조용히 통과합니다.
test("CW3. 정책 게이트 단계가 POLICY_BASE·POLICY_HEAD를 받는다", () => {
  const index = workflowText.indexOf("run: pnpm performance:reports:gate");
  assert.notEqual(index, -1, "performance:reports:gate를 부르는 단계를 찾을 수 없습니다");

  // 그 단계가 끝나는 자리(다음 `- name:`/`- uses:` 또는 잡 끝)까지가 이 단계의 블록입니다.
  const rest = workflowText.slice(index);
  const end = rest.search(/\n\s*-\s*(?:name|uses):|\n\w/);
  const stepBlock = end === -1 ? rest : rest.slice(0, end);

  assert.match(stepBlock, /POLICY_BASE\s*:/);
  assert.match(stepBlock, /POLICY_HEAD\s*:/);
});

// CW4 — 정책 잡은 base~head 사이의 변경 목록을 읽으므로 얕은 체크아웃이면 못 셉니다.
test("CW4. 정책 잡이 전체 이력을 받는다", () => {
  const policyJob = workflowText.slice(workflowText.indexOf("  policy:"));

  assert.match(policyJob, /fetch-depth:\s*0/);
});

// CW5 — 크기 검사는 산출물이 있어야 뜻이 있습니다. 빌드와 같은 잡에 있어야 합니다.
test("CW5. 번들 크기 검사가 빌드와 같은 잡에 있다", () => {
  const buildJob = workflowText.slice(
    workflowText.indexOf("  build:"),
    workflowText.indexOf("  policy:"),
  );

  assert.match(buildJob, /pnpm build/);
  assert.match(buildJob, /pnpm size:check/);
});
