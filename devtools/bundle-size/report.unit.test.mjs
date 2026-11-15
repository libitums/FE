import assert from "node:assert/strict";
import test from "node:test";

import { compareSizes, formatSizeReport, REPORT_MARKER } from "./report.mjs";

// PR마다 다는 크기 증감 보고(ADR-0149). 게이트가 아니라 감지기 — 무엇이 얼마나 늘었는지 보인다.

const targets = [
  { path: "apps/mobile/dist/main.lynx.bundle", maxBytes: 5_000_000 },
  { path: "packages/ui-lynx/dist", maxBytes: 600_000 },
];

test("BR1. 대상마다 main 크기 · 이 PR 크기 · 증감 · 천장까지 남은 양을 낸다", () => {
  const rows = compareSizes({
    targets,
    base: { "apps/mobile/dist/main.lynx.bundle": 4_800_000, "packages/ui-lynx/dist": 560_000 },
    head: { "apps/mobile/dist/main.lynx.bundle": 4_812_500, "packages/ui-lynx/dist": 560_000 },
  });
  assert.deepEqual(rows, [
    {
      path: "apps/mobile/dist/main.lynx.bundle",
      baseBytes: 4_800_000,
      headBytes: 4_812_500,
      deltaBytes: 12_500,
      maxBytes: 5_000_000,
      headroomBytes: 187_500,
    },
    {
      path: "packages/ui-lynx/dist",
      baseBytes: 560_000,
      headBytes: 560_000,
      deltaBytes: 0,
      maxBytes: 600_000,
      headroomBytes: 40_000,
    },
  ]);
});

test("BR2. main 크기를 모르면 증감은 null이고 나머지는 그대로 낸다", () => {
  const [row] = compareSizes({
    targets: [targets[0]],
    base: null,
    head: { "apps/mobile/dist/main.lynx.bundle": 4_812_500 },
  });
  assert.equal(row.baseBytes, null);
  assert.equal(row.deltaBytes, null);
  assert.equal(row.headBytes, 4_812_500);
});

test("BR3. 보고서는 표식 주석으로 시작하고 증감에 부호를 단다", () => {
  const rows = compareSizes({
    targets,
    base: { "apps/mobile/dist/main.lynx.bundle": 4_800_000, "packages/ui-lynx/dist": 561_000 },
    head: { "apps/mobile/dist/main.lynx.bundle": 4_812_500, "packages/ui-lynx/dist": 560_000 },
  });
  const text = formatSizeReport(rows, { baseRef: "abc1234" });
  assert.ok(text.startsWith(REPORT_MARKER));
  assert.match(text, /\+12\.5 kB/);
  assert.match(text, /−1\.0 kB/);
  assert.match(text, /abc1234/);
});

test("BR4. 증감이 0이면 「변화 없음」, main을 모르면 「main 기록 없음」이라 적는다", () => {
  const same = formatSizeReport(
    compareSizes({
      targets: [targets[1]],
      base: { "packages/ui-lynx/dist": 1 },
      head: { "packages/ui-lynx/dist": 1 },
    }),
    { baseRef: "abc1234" },
  );
  assert.match(same, /변화 없음/);
  const unknown = formatSizeReport(
    compareSizes({ targets: [targets[1]], base: null, head: { "packages/ui-lynx/dist": 1 } }),
    { baseRef: null },
  );
  assert.match(unknown, /main 기록 없음/);
});

test("BR5. 천장을 넘은 대상은 표에서 바로 보이게 표시한다", () => {
  const text = formatSizeReport(
    compareSizes({
      targets: [targets[1]],
      base: { "packages/ui-lynx/dist": 590_000 },
      head: { "packages/ui-lynx/dist": 610_000 },
    }),
    { baseRef: "abc1234" },
  );
  assert.match(text, /천장 초과/);
});
