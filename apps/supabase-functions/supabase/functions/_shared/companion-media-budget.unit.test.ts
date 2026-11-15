import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

import {
  createBudget,
  edgeWallClockMs,
  finishReserveMs,
  jobBudgetMs,
  type Phase,
  SNAPSHOT_PHASES,
  VOICE_PHASES,
} from "./companion-media-budget.ts";
import { EngineError } from "./companion-media-engines.ts";
import { engineRetries, withRetry } from "./companion-media-job.ts";

// 스냅샷 · 음성 작업의 시간 예산(리뷰 반영 2026-11-14): 가짜 시계만 쓴다 — 실제로 기다리지 않는다.

function fakeClock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

test("MB1. timeoutFor — cap과 (남은 시간 − 뒤 몫) 중 작은 값, 최소보다 작으면 null, 시계가 가면 준다", () => {
  const clock = fakeClock();
  const budget = createBudget(clock.now, clock.now() + 100_000);
  const phase: Phase = { capMs: 30_000, minMs: 5_000, tailMs: 50_000 };

  expect(budget.remainingMs()).toBe(100_000);
  expect(budget.timeoutFor(phase)).toBe(30_000); // cap이 더 작다
  expect(budget.timeoutFor(phase, 10_000)).toBe(10_000); // cap 덮어쓰기

  clock.advance(30_000); // 남은 70초 − 뒤 50초 = 20초
  expect(budget.remainingMs()).toBe(70_000);
  expect(budget.timeoutFor(phase)).toBe(20_000);

  clock.advance(16_000); // 남은 54초 − 50초 = 4초 < 최소 5초
  expect(budget.timeoutFor(phase)).toBeNull();

  clock.advance(100_000); // 마감을 넘음
  expect(budget.remainingMs()).toBe(0);
  expect(budget.timeoutFor(phase)).toBeNull();
});

/** 모든 단계가 받은 제한 시간을 다 쓴다고 치고(최악 경로) 끝난 시각까지 걸린 시간. */
function worstCase(phases: readonly { phase: Phase; attempts: number }[]) {
  const clock = fakeClock();
  const started = clock.now();
  const budget = createBudget(clock.now, started + jobBudgetMs);
  const used: number[] = [];
  for (const { phase, attempts } of phases) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const timeout = budget.timeoutFor(phase);
      if (timeout === null) break;
      used.push(timeout);
      clock.advance(timeout);
    }
  }
  return { elapsed: clock.now() - started, used };
}

test("MB2. 최악 경로 — 모든 단계가 제한 시간을 다 써도 닫기 몫까지 예산 안, 예산은 Edge 상한보다 10초 이상 짧다", () => {
  expect(jobBudgetMs).toBeLessThanOrEqual(edgeWallClockMs - 10_000);

  const snapshot = worstCase([
    { phase: SNAPSHOT_PHASES.refs, attempts: 1 },
    { phase: SNAPSHOT_PHASES.prompt, attempts: 1 },
    { phase: SNAPSHOT_PHASES.image, attempts: 1 + engineRetries },
    { phase: SNAPSHOT_PHASES.check, attempts: 1 },
    { phase: SNAPSHOT_PHASES.upload, attempts: 1 },
  ]);
  expect(snapshot.elapsed + finishReserveMs).toBeLessThanOrEqual(jobBudgetMs);
  // 모든 단계가 최소 한 번은 시도할 몫을 받는다(앞 단계가 다 써도).
  expect(snapshot.used).toHaveLength(5);
  // 이미지는 앞 단계가 다 써도 최소 시도 시간을 받는다.
  expect(snapshot.used[2]).toBeGreaterThanOrEqual(SNAPSHOT_PHASES.image.minMs);

  const voice = worstCase([
    { phase: VOICE_PHASES.speech, attempts: 1 + engineRetries },
    { phase: VOICE_PHASES.upload, attempts: 1 },
  ]);
  expect(voice.elapsed + finishReserveMs).toBeLessThanOrEqual(jobBudgetMs);
  expect(voice.used.length).toBeGreaterThanOrEqual(2);

  // 옛 값(이미지 300초 × 2, 텍스트 90초 × 2)은 어느 단계도 혼자 예산을 넘지 못한다.
  for (const phase of [...Object.values(SNAPSHOT_PHASES), ...Object.values(VOICE_PHASES)]) {
    expect(phase.minMs).toBeGreaterThan(0);
    expect(phase.tailMs).toBeGreaterThanOrEqual(finishReserveMs);
    expect(phase.minMs + phase.tailMs).toBeLessThanOrEqual(jobBudgetMs);
  }
});

test("MB3. withRetry — 엔진 오류여도 다음 예산이 없으면 다시 하지 않는다 · 있으면 그 예산으로 · 첫 예산이 없으면 부르지 않는다", async () => {
  const seen: number[] = [];
  const failing = async (timeout: number) => {
    seen.push(timeout);
    throw new EngineError("OpenAI 503", true);
  };

  // 예산이 한 번분만 있다 → 한 번만 부르고 원래 오류.
  const once = [80_000, null];
  await expect(withRetry(failing, () => once.shift() ?? null)).rejects.toMatchObject({
    message: "OpenAI 503",
    retries: 0,
  });
  expect(seen).toEqual([80_000]);

  // 두 번분 → 두 번째는 그때 받은 예산으로.
  seen.length = 0;
  const twice = [80_000, 61_000];
  await expect(withRetry(failing, () => twice.shift() ?? null)).rejects.toMatchObject({
    retries: 1,
  });
  expect(seen).toEqual([80_000, 61_000]);

  // 성공하면 그 값.
  const ok = await withRetry(
    async (timeout) => `done in ${timeout}`,
    () => 5_000,
  );
  expect(ok).toEqual({ value: "done in 5000", retries: 0 });

  // 첫 예산이 없다 → 부르지 않고 다시 할 수 없는 budget exhausted.
  seen.length = 0;
  const none = await withRetry(failing, () => null).catch((error: unknown) => error);
  expect(seen).toEqual([]);
  expect(none).toBeInstanceOf(EngineError);
  expect((none as EngineError).retryable).toBe(false);
  expect((none as EngineError).message).toMatch(/budget exhausted/);
});

test("MB4. 서버 대조 — pending 만료 하한(분)이 Edge 실행 상한보다 길다(늦은 업로드가 예약 해제 뒤에 오지 않게)", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/20261202120000_companion_media_limits.sql"),
    "utf8",
  );
  const match = /media_pending_minutes between (\d+) and (\d+)/.exec(sql);
  expect(match).not.toBeNull();
  const minMinutes = Number(match![1]);
  expect(minMinutes * 60_000).toBeGreaterThan(edgeWallClockMs);
  // 지금 운영 기본값 10분은 새 범위 안에 있다.
  expect(10).toBeGreaterThanOrEqual(minMinutes);
});
