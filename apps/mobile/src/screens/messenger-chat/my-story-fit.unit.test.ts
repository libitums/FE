import { expect, test } from "vitest";

import { rotatedBounds, STORY_EDGE, STORY_VISIBLE, TOOL_COLUMN } from "./my-story-fit";
import { stickerBoxPx, stickerFit, stickerSizeOf } from "./my-story-sticker-size";
import { textFit } from "./my-story-text";

// `unit` 계층(MS-U48 ~ U51): 끝단 세 가지(사용자 승인 2026-11-25) — 오른쪽 도구 열 앞에서 멈추기 · 회전한 상자의 외접 사각형으로 크기 · 자리
// 제한 · 단어 스티커도 글 상자와 같은 방식(글자 크기로 확정, 끄는 동안만 transform). 편집 · 보기가 같은 함수를 씁니다.

const canvas = { width: 390, height: 700 };
const ko = "오늘 처음 김치찌개 만들었어"; // 상자 크기 s: 폭 213.2s + 4, 높이 72s + 4 (s ≥ 1.17)

test("MS-U48. 회전 — 외접 사각형 |w·cosθ| + |h·sinθ|로 크기 상한 · 자리를 재고, 돌려서 넘치면 안쪽으로 민다", () => {
  expect(STORY_EDGE).toBe(36);
  expect(TOOL_COLUMN).toBe(64);
  expect(rotatedBounds({ width: 100, height: 40 }, 0)).toEqual({ width: 100, height: 40 });
  const right = rotatedBounds({ width: 100, height: 40 }, 90);
  expect(right.width).toBeCloseTo(40, 6);
  expect(right.height).toBeCloseTo(100, 6);
  const tilt = rotatedBounds({ width: 100, height: 40 }, -30);
  expect(tilt.width).toBeCloseTo(100 * Math.cos(Math.PI / 6) + 20, 6);
  expect(tilt.height).toBeCloseTo(50 + 40 * Math.cos(Math.PI / 6), 6);
  // 0°: 폭 254에 걸려 1.172 / 90°: 상자 폭이 세로로 — 213.2s + 4 ≤ 700 − 72 → 2.926 / 45°: (285.2s + 8)·0.7071 ≤ 254 → 1.231
  expect(textFit(ko, { scale: 3, x: 0.5, y: 0.5, rotation: 0 }, canvas).scale).toBe(1.172);
  expect(textFit(ko, { scale: 3, x: 0.5, y: 0.5, rotation: 90 }, canvas).scale).toBe(2.926);
  expect(textFit(ko, { scale: 3, x: 0.5, y: 0.5, rotation: 45 }, canvas).scale).toBe(1.231);
  // 자리는 가운데가 화면 안이면 그대로(2026-11-27, MS-U52) — 돌려도 안쪽으로 밀지 않음
  const upright = { scale: 1, x: 0.64, y: 0.5, rotation: 90 };
  expect(textFit(ko, upright, canvas).x).toBe(0.64);
  expect(textFit(ko, { ...upright, rotation: 45 }, canvas).x).toBe(0.64);
  expect(textFit(ko, { ...upright, rotation: 0 }, canvas).x).toBe(0.64);
});

test("MS-U49. 끄는 중 — 확정 크기(settled)의 상자를 transform으로 키운 크기도 재어, 놓기 전에도 도구 열 앞에서 멈춤", () => {
  // settled 0.5의 상자(최소 여백 14)를 키우면 여백도 같이 커짐: 126.6 × s/0.5 ≤ 254 → 1.003
  expect(textFit(ko, { scale: 3, x: 0.5, y: 0.5 }, canvas, 0.5).scale).toBe(1.003);
  // 확정 크기에서 시작하면 그 크기의 규칙 그대로
  expect(textFit(ko, { scale: 3, x: 0.5, y: 0.5 }, canvas, 1.172).scale).toBe(1.172);
});

test("MS-U50. 단어 스티커 크기 — 글자 셋(22/28 · 11/16 · 12/16) · 사이 2 · 안쪽 여백 8/16에 확정 크기를 곱하고, 끄는 동안은 비만 transform", () => {
  expect(stickerSizeOf(1, 1)).toEqual({
    ko: { fontSize: "22px", lineHeight: "28px" },
    roman: { fontSize: "11px", lineHeight: "16px" },
    meaning: { fontSize: "12px", lineHeight: "16px" },
    gap: "2px",
    padding: "8px 16px",
    live: 1,
  });
  expect(stickerSizeOf(2, 1)).toMatchObject({ ko: { fontSize: "22px" }, live: 2 });
  expect(stickerSizeOf(2, 2)).toMatchObject({
    ko: { fontSize: "44px", lineHeight: "56px" },
    meaning: { fontSize: "24px" },
    padding: "16px 32px",
    live: 1,
  });
  // 작게 해도 안쪽 여백은 최소값(×·손잡이가 글자와 겹치지 않게)
  expect(stickerSizeOf(0.5, 0.5)).toMatchObject({
    ko: { fontSize: "11px" },
    gap: "1px",
    padding: "8px 14px",
    live: 1,
  });
  // 「찌개」 44 · 「jjigae」 39.6 · 「stew」 28.8 → 폭 44 + 32 + 4, 높이 28 + 16 + 16 + 2·2 + 16 + 4
  expect(stickerBoxPx({ ko: "찌개", roman: "jjigae", meaning: "stew" }, 1)).toEqual({
    width: 80,
    height: 84,
  });
  // 로마자 · 뜻이 비면 그 줄은 없음
  expect(stickerBoxPx({ ko: "찌개", roman: "", meaning: "" }, 1)).toEqual({
    width: 80,
    height: 48,
  });
});

test("MS-U51. 단어 스티커 끝단 — 글 상자와 같은 규칙(도구 열 앞 · 회전 외접 사각형 · 서버 범위 0.5 ~ 3)", () => {
  const long = { ko: "맛있다", roman: "masitda", meaning: "to be delicious" }; // 뜻 8.4칸 × 12 = 100.8
  const at = (scale: number, x: number, rotation = 0) => ({ scale, x, y: 0.5, rotation });
  // (100.8 + 32)s + 4 ≤ 254 → 1.882
  expect(stickerFit(long, at(3, 0.5), canvas).scale).toBe(1.882);
  // 좌우 끝 — 가운데가 화면 끝까지(도구 열 · 가장자리 여백은 크기 상한에만, MS-U52)
  expect(stickerFit(long, at(1, 1), canvas).x).toBe(1);
  expect(stickerFit(long, at(1, 0), canvas).x).toBe(0);
  // 45°: 폭 76s + 4 · 높이 80s + 4 → (156s + 8)·0.7071 ≤ 254 → 2.251
  const short = { ko: "찌개", roman: "jjigae", meaning: "stew" };
  expect(stickerFit(short, at(3, 0.5, 45), canvas).scale).toBe(2.251);
  expect(stickerFit(short, at(3, 0.5, -4), canvas).scale).toBe(3);
  // 서버 범위 아래로는 줄이지 않음 · 바탕 크기를 모르면 그대로
  expect(stickerFit(short, at(0.2, 0.5), canvas).scale).toBe(0.5);
  expect(stickerFit(short, at(3, 0.95), { width: 0, height: 0 })).toEqual({
    scale: 3,
    x: 0.95,
    y: 0.5,
  });
});

test("MS-U52. 옮길 수 있는 곳(인스타그램 감각, 2026-11-27) — 가운데가 화면 안이면 되고 상자 일부는 밖으로 나가도 되지만, 위 · 아래 줄 밖으로 적어도 32px은 남김", () => {
  expect(STORY_VISIBLE).toBe(32);
  const screen = { width: 390, height: 844, top: 100, bottom: 150 };
  const short = { ko: "찌개", roman: "jjigae", meaning: "stew" }; // 80 × 84
  const at = (x: number, y: number) => ({ scale: 1, x, y, rotation: 0 });
  // 좌우 — 가운데가 화면 끝(0 · 1)까지, 도구 열 위로도
  expect(stickerFit(short, at(-0.2, 0.5), screen).x).toBe(0);
  expect(stickerFit(short, at(1.3, 0.5), screen).x).toBe(1);
  expect(stickerFit(short, at(0.97, 0.5), screen).x).toBe(0.97);
  // 위 — 상자 아래 끝이 위 줄(100) 아래 32px까지: (100 + 32 − 42) / 844
  expect(stickerFit(short, at(0.5, 0), screen).y).toBeCloseTo(90 / 844, 3);
  expect(stickerFit(short, at(0.5, 0.12), screen).y).toBe(0.12);
  // 아래 — 상자 위 끝이 아래 줄(150) 위 32px까지: (844 − 150 − 32 + 42) / 844
  expect(stickerFit(short, at(0.5, 1), screen).y).toBeCloseTo(704 / 844, 3);
  // 큰 상자(세운 글 상자)는 위 줄 위로 더 올라감 — 아래 끝만 위 줄 아래 32px에 남으면 됨
  const big = textFit(ko, { scale: 1, x: 0.5, y: 0, rotation: 90 }, screen);
  expect(big.y).toBeLessThan(90 / 844);
  // 위 줄이 없으면(보기와 같은 화면 전체) 가운데가 화면 위 끝까지
  expect(textFit(ko, { scale: 1, x: 0.5, y: 0, rotation: 90 }, { width: 390, height: 844 }).y).toBe(
    0,
  );
});
