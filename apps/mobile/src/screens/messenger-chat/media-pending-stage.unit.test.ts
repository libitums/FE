import { expect, test } from "vitest";

import {
  createPendingClock,
  nextStageDelay,
  pendingEnded,
  pendingStartOf,
  PHOTO_STAGE_MARKS,
  stageAt,
  stageLine,
  VOICE_STAGE_MARKS,
} from "./media-pending-stage";

// `unit` 계층(MPS-U1 ~ MPS-U3): 사진 · 음성 대기 문구의 단계 — 기다린 시간만으로 정합니다(서버는 진행 단계를 주지 않음).
// 사진은 운영 중간값 19초(2026-11-17 ~ 22, 60건)에 맞춘 네 단계, 음성은 4초에 맞춘 두 단계입니다.

test("MPS-U1 단계 시각 — 사진 0 · 5 · 11 · 17초, 음성 0 · 1.5초", () => {
  expect(PHOTO_STAGE_MARKS).toEqual([0, 5000, 11000, 17000]);
  expect(VOICE_STAGE_MARKS).toEqual([0, 1500]);
});

test("MPS-U2 기다린 시간 → 단계. 마지막 단계는 끝까지 남고, 시계가 거꾸로면(음수) 첫 단계", () => {
  expect(stageAt(PHOTO_STAGE_MARKS, 0)).toBe(0);
  expect(stageAt(PHOTO_STAGE_MARKS, 4999)).toBe(0);
  expect(stageAt(PHOTO_STAGE_MARKS, 5000)).toBe(1);
  expect(stageAt(PHOTO_STAGE_MARKS, 11000)).toBe(2);
  expect(stageAt(PHOTO_STAGE_MARKS, 17000)).toBe(3);
  expect(stageAt(PHOTO_STAGE_MARKS, 600_000)).toBe(3);
  expect(stageAt(PHOTO_STAGE_MARKS, -3000)).toBe(0);
  expect(stageAt(VOICE_STAGE_MARKS, 1500)).toBe(1);
});

test("MPS-U3 다음 단계까지 남은 시간 — 마지막 단계면 null, 이미 지났으면 0", () => {
  expect(nextStageDelay(PHOTO_STAGE_MARKS, 0, 0)).toBe(5000);
  expect(nextStageDelay(PHOTO_STAGE_MARKS, 1, 6000)).toBe(5000);
  expect(nextStageDelay(PHOTO_STAGE_MARKS, 1, 30_000)).toBe(0);
  expect(nextStageDelay(PHOTO_STAGE_MARKS, 3, 18_000)).toBeNull();
  expect(nextStageDelay(VOICE_STAGE_MARKS, 1, 100)).toBeNull();
});

// 시작 시각은 기기 시계로만 잡습니다(리뷰 #541) — 메시지의 `at`은 서버 방에서 서버 시계라 기기 시계와 빼면 단계가 틀립니다.
test("MPS-U4 시작 시각 — 같은 메시지는 다시 서도 처음 선 때(방을 나갔다 들어옴)", () => {
  const clock = createPendingClock();
  expect(pendingStartOf(clock, "m1", "mina:photo", 1000)).toBe(1000);
  pendingEnded(clock, "mina:photo", 9000);
  expect(pendingStartOf(clock, "m1", "mina:photo", 40_000)).toBe(1000);
});

test("MPS-U5 시작 시각 — 자리표시자가 서버 줄로 바뀌어(id가 달라짐) 곧바로 다시 서면 이어 가고, 한참 뒤의 새 요청은 새로 센다", () => {
  const clock = createPendingClock();
  expect(pendingStartOf(clock, "m~req", "mina:photo", 1000)).toBe(1000);
  // 새 말풍선이 먼저 서고(옛 것은 아직 떠 있음) 그 뒤 옛 것이 내려간다.
  expect(pendingStartOf(clock, "m~srv", "mina:photo", 7000)).toBe(1000);
  pendingEnded(clock, "mina:photo", 7000);
  // 옛 것이 먼저 내려가고 2초 안에 새것이 서도 이어 간다.
  pendingEnded(clock, "mina:photo", 8000);
  expect(pendingStartOf(clock, "m~srv2", "mina:photo", 9500)).toBe(1000);
  // 다른 매체 · 다른 인물은 따로.
  expect(pendingStartOf(clock, "v1", "mina:voice", 9500)).toBe(9500);
  // 끝난 지 2초가 넘은 뒤의 새 요청.
  pendingEnded(clock, "mina:photo", 20_000);
  expect(pendingStartOf(clock, "m2", "mina:photo", 23_000)).toBe(23_000);
});

test("MPS-U6 오래된 기억은 버리고(10분), id · 묶음이 없으면 지금", () => {
  const clock = createPendingClock();
  pendingStartOf(clock, "old", "mina:photo", 0);
  pendingEnded(clock, "mina:photo", 1000);
  expect(pendingStartOf(clock, "new", "duksu:photo", 700_000)).toBe(700_000);
  expect(clock.byId.has("old")).toBe(false);
  expect(pendingStartOf(clock, undefined, undefined, 5)).toBe(5);
});

test("MPS-U7 문구 고르기 — 단계가 문구 수를 넘으면 마지막 문구(빈 글이 되지 않는다)", () => {
  expect(stageLine(["a", "b"], 0)).toBe("a");
  expect(stageLine(["a", "b"], 5)).toBe("b");
  expect(stageLine([], 0)).toBe("");
});
