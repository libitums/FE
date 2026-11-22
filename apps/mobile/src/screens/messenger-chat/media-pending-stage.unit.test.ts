import { expect, test } from "vitest";

import {
  nextStageDelay,
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

test("MPS-U4 문구 고르기 — 단계가 문구 수를 넘으면 마지막 문구(빈 글이 되지 않는다)", () => {
  expect(stageLine(["a", "b"], 0)).toBe("a");
  expect(stageLine(["a", "b"], 5)).toBe("b");
  expect(stageLine([], 0)).toBe("");
});
