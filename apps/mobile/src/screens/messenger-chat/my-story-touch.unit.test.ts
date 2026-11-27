import { expect, test } from "vitest";

import { fingersOf, heldPoints, holdFingers, liftFingers } from "./my-story-touch";

// `unit` 계층(ST-U1 ~ U4, 버그 수정 2026-11-27): 스티커 · 글 상자를 잡은 손가락만 따라가기. 여러 손가락을 켠 뒤(#653) Lynx의
// `touches`는 페이지 전체 목록이고, 끝 이벤트를 받지 않는 요소(지도 등)에 닿았던 손가락이 남아 섞여 온다 — 기기에서 한 손가락 끌기가
// 남은 손가락을 축으로 한 크기 · 회전이 되던 원인.

const t = (identifier: number, pageX: number, pageY: number) => ({ identifier, pageX, pageY });

test("ST-U1. 손가락 목록 풀기 — identifier · pageX · pageY, id가 없으면 자리 번호, 좌표가 수가 아니면 버림", () => {
  expect(fingersOf([t(3, 10, 20)])).toEqual([{ id: 3, x: 10, y: 20 }]);
  expect(
    fingersOf([
      { pageX: 1, pageY: 2 },
      { pageX: 3, pageY: 4 },
    ]),
  ).toEqual([
    { id: 0, x: 1, y: 2 },
    { id: 1, x: 3, y: 4 },
  ]);
  expect(fingersOf([{ identifier: 1, pageX: "a", pageY: 2 }, null])).toEqual([]);
  expect(fingersOf(undefined)).toEqual([]);
});

test("ST-U2. 남은 손가락이 섞여도 잡은 손가락만 — 한 손가락 끌기는 한 점", () => {
  // 지도에 남은 손가락 1(255, 545)과 지금 스티커를 끄는 손가락 0
  const touches = fingersOf([t(0, 153, 445), t(1, 255, 545)]);
  const held = holdFingers([], fingersOf([t(0, 150, 440)]));
  expect(held).toEqual([0]);
  expect(heldPoints(held, touches)).toEqual([{ x: 153, y: 445 }]);
  // 남은 손가락이 앞에 있어도 같다
  expect(heldPoints(held, fingersOf([t(1, 255, 545), t(0, 153, 445)]))).toEqual([
    { x: 153, y: 445 },
  ]);
});

test("ST-U3. 둘째 손가락 — 둘까지 잡고, 하나를 떼면 남은 하나로 계속, 다른 손가락을 떼면 그대로, 옛 환경은 모두 놓음", () => {
  let held = holdFingers([], fingersOf([t(0, 0, 0)]));
  held = holdFingers(held, fingersOf([t(1, 100, 0)]));
  held = holdFingers(held, fingersOf([t(2, 50, 50)]));
  expect(held).toEqual([0, 1]);
  expect(heldPoints(held, fingersOf([t(1, 120, 0), t(0, 0, 10)]))).toEqual([
    { x: 0, y: 10 },
    { x: 120, y: 0 },
  ]);
  expect(
    liftFingers(held, fingersOf([t(0, 0, 10)]), fingersOf([t(0, 0, 10), t(1, 120, 0)])),
  ).toEqual([1]);
  // 다른 곳의 셋째 손가락을 뗌 — 잡은 둘은 그대로(touchend의 touches에 잡은 손가락이 있음)
  expect(
    liftFingers(held, fingersOf([t(5, 9, 9)]), fingersOf([t(0, 0, 10), t(1, 120, 0), t(5, 9, 9)])),
  ).toEqual([0, 1]);
  // 옛 환경 — id가 이벤트마다 달라 잡은 손가락이 하나도 안 보이면 모두 놓는다(끌기가 끝나지 않는 일 없음)
  expect(liftFingers([7], fingersOf([t(9, 0, 0)]), fingersOf([t(9, 0, 0)]))).toEqual([]);
});

test("ST-U4. 옛 환경(한 손가락 모드) — 잡은 id를 못 찾아도 손가락이 하나뿐이면 그 하나, 여럿이면 없음", () => {
  expect(heldPoints([7], fingersOf([t(9, 5, 6)]))).toEqual([{ x: 5, y: 6 }]);
  expect(heldPoints([7], fingersOf([t(8, 5, 6), t(9, 1, 1)]))).toEqual([]);
  expect(heldPoints([], fingersOf([t(9, 5, 6)]))).toEqual([]);
});
