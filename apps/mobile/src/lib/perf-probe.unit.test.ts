import { expect, test } from "vitest";

import { createPerfProbe, LONG_TASK_MS } from "./perf-probe";

// `unit` 계층: 측정 장치(ADR-0105 D2) — 꺼져 있으면 아무것도 하지 않고, 켜져 있으면 50 ms 이상인 작업만 남기며
// 커밋 수는 창마다 모아 한 줄로 남긴다. 시계 · 기록 통로는 대역입니다.

function fakeClock(steps: number[]) {
  let index = 0;
  return () => steps[Math.min(index++, steps.length - 1)] ?? 0;
}

test("PP1. 꺼져 있으면 감싼 함수의 값을 그대로 돌려주고 시계도 기록도 쓰지 않는다", () => {
  const lines: string[] = [];
  let ticks = 0;
  const probe = createPerfProbe({
    enabled: false,
    now: () => ticks++,
    log: (line) => lines.push(line),
  });

  expect(probe.measureTask("x", () => 42)).toBe(42);
  probe.countRender("Map");
  probe.flushRenders();

  expect(ticks).toBe(0);
  expect(lines).toEqual([]);
});

test("PP2. 켜져 있으면 50 ms 이상인 작업만 이름과 시간으로 남긴다", () => {
  const lines: string[] = [];
  const probe = createPerfProbe({
    enabled: true,
    now: fakeClock([0, 49, 100, 100 + LONG_TASK_MS, 200, 320]),
    log: (line) => lines.push(line),
  });

  probe.measureTask("short", () => 1);
  probe.measureTask("edge", () => 2);
  probe.measureTask("catalog.load", () => 3);

  expect(lines).toEqual([
    `long name=edge ms=${String(LONG_TASK_MS)}`,
    "long name=catalog.load ms=120",
  ]);
});

test("PP3. 감싼 함수가 던져도 시간을 남기고 같은 오류를 다시 던진다", () => {
  const lines: string[] = [];
  const probe = createPerfProbe({
    enabled: true,
    now: fakeClock([0, 80]),
    log: (line) => lines.push(line),
  });

  expect(() =>
    probe.measureTask("boom", () => {
      throw new Error("x");
    }),
  ).toThrow("x");
  expect(lines).toEqual(["long name=boom ms=80"]);
});

test("PP4. 커밋 수는 창마다 이름 순으로 한 줄에 모으고, 센 것이 없으면 남기지 않는다", () => {
  const lines: string[] = [];
  const probe = createPerfProbe({ enabled: true, now: () => 0, log: (line) => lines.push(line) });

  probe.countRender("Map");
  probe.countRender("Shell");
  probe.countRender("Map");
  probe.flushRenders();
  probe.flushRenders();

  expect(lines).toEqual(["renders Map=2 Shell=1"]);
});

test("PP5. 기록 통로가 던져도 측정은 던지지 않는다", () => {
  const probe = createPerfProbe({
    enabled: true,
    now: fakeClock([0, 90]),
    log: () => {
      throw new Error("native");
    },
  });

  expect(probe.measureTask("x", () => 7)).toBe(7);
});
