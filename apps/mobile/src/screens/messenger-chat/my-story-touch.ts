// 바탕 위 스티커 · 글 상자를 잡은 손가락 — 순수. Lynx의 `touches`는 페이지 전체 손가락 목록이라(여러 손가락을 켠 뒤, ADR-0112 개정),
// 끝 이벤트를 받지 않는 요소(지도 등)에 닿았던 손가락이 남아 섞여 옵니다. 이 요소에 닿은 손가락의 id만 따라갑니다.

import type { Point } from "./my-story-editor";

/** 손가락 하나 — `identifier`가 없으면(옛 환경 · 테스트) 목록 안 자리를 id로 씁니다. */
export type Finger = { readonly id: number; readonly x: number; readonly y: number };

/** 잡을 수 있는 손가락 수 — 끌기 하나, 크기 · 회전 둘. */
export const MAX_FINGERS = 2;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** 이벤트의 손가락 목록(`touches` · `changedTouches`) → Finger. 좌표가 수가 아니면 버립니다. */
export function fingersOf(list: unknown): Finger[] {
  if (!Array.isArray(list)) return [];
  const fingers: Finger[] = [];
  list.forEach((raw: unknown, index) => {
    if (typeof raw !== "object" || raw === null) return;
    const touch = raw as { identifier?: unknown; pageX?: unknown; pageY?: unknown };
    if (!isNumber(touch.pageX) || !isNumber(touch.pageY)) return;
    const id = isNumber(touch.identifier) ? touch.identifier : index;
    fingers.push({ id, x: touch.pageX, y: touch.pageY });
  });
  return fingers;
}

/** 새로 닿은 손가락을 잡습니다 — 이미 잡은 것은 그대로, 둘까지. */
export function holdFingers(held: readonly number[], landed: readonly Finger[]): number[] {
  const next = [...held];
  for (const finger of landed) {
    if (next.length >= MAX_FINGERS) break;
    if (!next.includes(finger.id)) next.push(finger.id);
  }
  return next;
}

/** 뗀 손가락을 놓습니다. 아는 손가락이 하나도 없으면(id가 이벤트마다 바뀌는 옛 환경) 모두 놓습니다. */
export function liftFingers(held: readonly number[], lifted: readonly Finger[]): number[] {
  const gone = new Set(lifted.map((finger) => finger.id));
  const next = held.filter((id) => !gone.has(id));
  return next.length === held.length ? [] : next;
}

/** 잡은 손가락의 지금 자리(잡은 순서). 하나도 못 찾았고 손가락이 하나뿐이면 그 하나(옛 환경). */
export function heldPoints(held: readonly number[], touches: readonly Finger[]): Point[] {
  const points: Point[] = [];
  for (const id of held) {
    const finger = touches.find((each) => each.id === id);
    if (finger !== undefined) points.push({ x: finger.x, y: finger.y });
  }
  const [only] = touches;
  if (points.length === 0 && held.length > 0 && touches.length === 1 && only !== undefined)
    return [{ x: only.x, y: only.y }];
  return points;
}
