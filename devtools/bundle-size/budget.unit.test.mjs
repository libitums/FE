import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBundleBudget, formatBytes, parseBudget } from "./budget.mjs";

const targets = [
  { path: "a.bundle", maxBytes: 1000 },
  { path: "b.js", maxBytes: 500 },
];

// BS1 — 예산 안이면 통과합니다. 같은 값(경계)도 통과라는 것을 함께 답니다.
test("BS1. 예산과 같거나 작으면 통과한다", () => {
  const result = evaluateBundleBudget({
    targets,
    sizes: new Map([
      ["a.bundle", 999],
      ["b.js", 500],
    ]),
  });

  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.results[0].remainingBytes, 1);
});

// BS2 — 이 검사의 본래 목적입니다. 예산을 1바이트라도 넘으면 막습니다.
test("BS2. 예산을 넘으면 위반으로 답고 초과한 대상만 싣는다", () => {
  const result = evaluateBundleBudget({
    targets,
    sizes: new Map([
      ["a.bundle", 1001],
      ["b.js", 100],
    ]),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.violations.map((violation) => violation.path),
    ["a.bundle"],
  );
  assert.equal(result.violations[0].status, "over");
});

// BS3 — 빌드를 돌리지 않고 초록을 받는 길을 막습니다. 산출물이 없으면 「작다」가 아니라
// 「모른다」이고, 이 검사는 모르는 것을 통과로 읽지 않습니다.
test("BS3. 산출물이 없으면 통과가 아니라 위반이다", () => {
  const result = evaluateBundleBudget({ targets, sizes: new Map([["b.js", 10]]) });

  assert.equal(result.ok, false);
  assert.equal(result.violations[0].path, "a.bundle");
  assert.equal(result.violations[0].status, "missing");
  assert.equal(result.violations[0].actualBytes, null);
});

// BS4 — 잘못된 예산 파일은 빌드가 커진 것과 다른 사건이라 오류로 던집니다.
test("BS4. 예산 파일이 잘못되면 위반이 아니라 오류다", () => {
  assert.throws(() => parseBudget({ targets: [] }), /targets/);
  assert.throws(() => parseBudget({ targets: [{ path: "a", maxBytes: 0 }] }), /maxBytes/);
  assert.throws(() => parseBudget({ targets: [{ path: " ", maxBytes: 10 }] }), /path/);
});

// BS5 — 표가 흔들리지 않도록 자릿수를 고정합니다.
test("BS5. 크기를 kB 한 자리로 적고 숫자가 아닌 값은 「없음」으로 적는다", () => {
  assert.equal(formatBytes(779615), "779.6 kB");
  assert.equal(formatBytes(null), "없음");
  // 타입 검사가 없는 파일이라 이 셋이 `NaN kB`로 새어 나가면 0에 가까운 값으로 읽힙니다.
  assert.equal(formatBytes(undefined), "없음");
  assert.equal(formatBytes(Number.NaN), "없음");
  assert.equal(formatBytes("779615"), "없음");
});
