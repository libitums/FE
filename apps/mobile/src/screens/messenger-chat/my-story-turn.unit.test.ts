import { expect, test } from "vitest";

import { pinchSticker, turnSticker, type Placement } from "./my-story-editor";
import { foldRotation, SNAP_DEGREES, snapEntered, snapRotation } from "./my-story-turn";

// `unit` 계층(RT-U1 ~ U4, 2026-11-27): 두 손가락 회전 — 각도 접기 · 0° · ±90° · 180° 가까이 붙기 · 새로 붙을 때만 진동.

test("RT-U1. 각도 접기 — (−180, 180]", () => {
  expect(foldRotation(190)).toBe(-170);
  expect(foldRotation(-190)).toBe(170);
  expect(foldRotation(360)).toBe(0);
  expect(foldRotation(540)).toBe(180);
  expect(foldRotation(-180)).toBe(180);
  expect(foldRotation(-45)).toBe(-45);
});

test("RT-U2. 붙기 — 0° · ±90° · 180°에서 ±4° 안이면 그 각도, 밖이면 그대로", () => {
  expect(SNAP_DEGREES).toBe(4);
  expect(snapRotation(3)).toEqual({ rotation: 0, snap: 0 });
  expect(snapRotation(-4)).toEqual({ rotation: 0, snap: 0 });
  expect(snapRotation(87)).toEqual({ rotation: 90, snap: 90 });
  expect(snapRotation(-92.5)).toEqual({ rotation: -90, snap: -90 });
  expect(snapRotation(178)).toEqual({ rotation: 180, snap: 180 });
  expect(snapRotation(-177)).toEqual({ rotation: 180, snap: 180 });
  expect(snapRotation(362)).toEqual({ rotation: 0, snap: 0 });
  expect(snapRotation(10)).toEqual({ rotation: 10, snap: null });
  expect(snapRotation(-4.5)).toEqual({ rotation: -4.5, snap: null });
});

test("RT-U3. 두 손가락 — 크기와 회전을 함께, 회전은 접고 붙인다", () => {
  const start: Placement = { x: 0.5, y: 0.5, scale: 1, rotation: -4 };
  const from = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ] as const;
  // 거리 두 배 · 93° 돌림 → −4 + 93 = 89 → 90
  const rad = (93 * Math.PI) / 180;
  const turned = pinchSticker(start, from, [
    { x: 0, y: 0 },
    { x: 200 * Math.cos(rad), y: 200 * Math.sin(rad) },
  ]);
  expect(turned.scale).toBe(2);
  expect(turned.rotation).toBe(90);
  // 붙지 않는 각도는 그대로(소수 셋째 자리)
  const tilt = pinchSticker(start, from, [
    { x: 0, y: 0 },
    { x: 100 * Math.cos(0.5), y: 100 * Math.sin(0.5) },
  ]);
  expect(tilt.rotation).toBeCloseTo(-4 + (0.5 * 180) / Math.PI, 2);
  // 여러 바퀴 돌아도 접힌다
  const spun = pinchSticker({ ...start, rotation: 170 }, from, [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
  ]);
  expect(spun.rotation).toBe(-100);
  // 돌리지 않고 크기만(1° 미만) — 처음 기울기(−4°)를 붙이지 않고, 붙음도 없음(진동 없음)
  const resized = turnSticker(start, from, [
    { x: 0, y: 0 },
    { x: 300, y: 1 },
  ]);
  expect(resized.item.rotation).toBeCloseTo(-4 + (Math.atan2(1, 300) * 180) / Math.PI, 3);
  expect(resized.snap).toBeNull();
  expect(
    turnSticker(start, from, [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ]).snap,
  ).toBe(90);
});

test("RT-U4. 진동 — 새로 붙을 때만(붙은 채 머묾 · 떨어짐 · 다른 각도로 바로 옮김은 각자 판정)", () => {
  expect(snapEntered(null, 0)).toBe(true);
  expect(snapEntered(0, 0)).toBe(false);
  expect(snapEntered(0, null)).toBe(false);
  expect(snapEntered(null, null)).toBe(false);
  expect(snapEntered(90, 180)).toBe(true);
});
