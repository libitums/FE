// 바탕 위에 놓인 것 하나를 잡고 끌기 · 두 손가락 크기/회전 · 모서리 손잡이(ADR-0194 개정 ⟨두 손가락 회전⟩). 한 손가락 끌기는 그 요소에서
// 시작하고, 둘째 손가락은 바탕 어디에 닿아도 잡은 것에 붙습니다(바탕이 `CanvasGrip`으로 넘김 — 인스타그램 스토리 감각). 고른 것은 두
// 손가락이 둘 다 바탕에 닿아도 크기 · 회전을 따라갑니다(개정 3, 2026-11-27).

import { createContext, useContext, useEffect, useRef } from "@lynx-js/react";

import { createKeyHaptic } from "../../lib/sound-effects";
import {
  moveSticker,
  resizeSticker,
  turnSticker,
  type Placement,
  type Point,
} from "./my-story-editor";
import type { CanvasBox } from "./my-story-fit";
import {
  canvasPinch,
  dropLoose,
  fingersOf,
  heldPoints,
  holdFingers,
  liftFingers,
  looseFingers,
} from "./my-story-touch";
import { snapEntered, snapRotation } from "./my-story-turn";

export type TouchLists = { readonly touches?: unknown; readonly changedTouches?: unknown };

/** 잡은 것 하나의 손가락 처리 — 바탕이 둘째 손가락 · 움직임 · 뗌을 넘깁니다. */
export type Grip = {
  /** 새로 닿은 손가락을 잡습니다 — `before`는 먼저 바탕에 닿아 있던 손가락(id). */
  readonly add: (event: TouchLists, before?: readonly number[]) => void;
  /** 바탕 두 손가락으로 잡습니다 — 손가락이 하나로 줄면 놓습니다(바탕 한 손가락 끌기는 옮기지 않음). */
  readonly pinch: (held: readonly number[], event: TouchLists) => void;
  readonly move: (event: TouchLists) => void;
  readonly lift: (event: TouchLists) => void;
  readonly cancel: () => void;
  readonly holding: () => boolean;
  /** 잡은 손가락 수. */
  readonly count: () => number;
};

type GripRef = { readonly current: Grip };

/** 바탕이 들고 있는 손가락 상태 — 편집 화면 하나에 하나. */
export type GripHub = {
  /** 지금 잡힌 것(없으면 null). */
  current: GripRef | null;
  /** 고른 것(× · 손잡이가 선 것) — 바탕 두 손가락이 잡습니다. */
  selected: GripRef | null;
  /** 바탕에 닿아 아직 아무것도 잡지 않은 손가락(id). */
  loose: number[];
  /** 이번 손길에 손가락 둘이 닿았는가 — 그 손길의 바탕 누름은 고름을 풀지 않습니다. */
  multi: boolean;
};

export const emptyGripHub = (): GripHub => ({
  current: null,
  selected: null,
  loose: [],
  multi: false,
});
export const CanvasGrip = createContext<GripHub | null>(null);

/** 이 요소에서 막 닿거나 뗀 손가락 — `changedTouches`가 없으면(옛 환경 · 테스트) `touches`. */
const changedOf = (event: TouchLists) =>
  fingersOf(event.changedTouches === undefined ? event.touches : event.changedTouches);

/** 바탕의 손가락 처리 — 잡힌 것이 있으면 그것에 넘깁니다(요소에서 올라온 같은 이벤트를 다시 받아도 결과는 같음). */
export function canvasTouchHandlers(hub: GripHub) {
  const grip = () => hub.current?.current ?? null;
  return {
    bindtouchstart: (event: TouchLists) => {
      "background only";
      const now = grip();
      if (now?.holding() === true) {
        // 잡힌 것이 손가락을 들고 있으면 바탕 어디에 닿아도 그 둘째 손가락(요소에서 올라온 같은 이벤트면 그대로).
        now.add(event);
      } else {
        // 빈 바탕 — 손가락을 모아 두고, 고른 것이 있으면 둘째 손가락에서 그것을 잡습니다. 한 손가락으로는 아무것도 옮기지 않습니다.
        hub.loose = looseFingers(hub.loose, changedOf(event), fingersOf(event.touches));
        const held = canvasPinch(hub.loose, hub.selected !== null);
        if (held !== null && hub.selected !== null) {
          hub.current = hub.selected;
          hub.loose = [];
          hub.selected.current.pinch(held, event);
        }
      }
      hub.multi = (grip()?.count() ?? 0) + hub.loose.length >= 2;
    },
    bindtouchmove: (event: TouchLists) => {
      "background only";
      grip()?.move(event);
    },
    bindtouchend: (event: TouchLists) => {
      "background only";
      const now = grip();
      now?.lift(event);
      if (now !== null && !now.holding()) hub.current = null;
      hub.loose = dropLoose(hub.loose, changedOf(event));
    },
    bindtouchcancel: () => {
      "background only";
      grip()?.cancel();
      hub.current = null;
      hub.loose = [];
    },
  };
}

export function usePlacedGrip<T extends Placement>({
  item,
  canvas,
  selected,
  change,
  settle,
  onSelect,
}: {
  readonly item: T;
  readonly canvas: CanvasBox;
  readonly selected: boolean;
  readonly change: (next: T) => void;
  readonly settle: () => void;
  readonly onSelect: () => void;
}) {
  const hub = useContext(CanvasGrip);
  // 잡은 손가락(id) · 그 손가락들이 지금 모양이 된 때의 자리 · 점. 손가락 수가 바뀌면 그 자리부터 다시 잽니다. `pinch` — 바탕 두
  // 손가락으로 잡음(둘 아래로 줄면 놓음).
  const start = useRef<{ held: number[]; item: T; points: Point[]; pinch: boolean } | null>(null);
  const resize = useRef<{ id: number; item: T; point: Point } | null>(null);
  // 붙은 각도(진동 판정) · 진동(잡을 때 한 번 만듦 — 설정 · 모듈을 이벤트마다 읽지 않음).
  const snap = useRef<number | null>(null);
  const haptic = useRef<() => void>(() => {});
  const restart = (held: number[], event: TouchLists, pinch = false) => {
    start.current =
      held.length === 0
        ? null
        : { held, item, points: heldPoints(held, fingersOf(event.touches)), pinch };
    snap.current = snapRotation(item.rotation).snap === item.rotation ? item.rotation : null;
  };
  const grip = useRef<Grip>({
    add: () => {},
    pinch: () => {},
    move: () => {},
    lift: () => {},
    cancel: () => {},
    holding: () => false,
    count: () => 0,
  });
  grip.current = {
    add: (event, before = []) => {
      const now = start.current;
      restart(holdFingers(now?.held ?? [...before], changedOf(event)), event, now?.pinch);
    },
    pinch: (held, event) => {
      if (start.current === null) haptic.current = createKeyHaptic();
      restart([...held], event, true);
    },
    move: (event) => {
      const from = start.current;
      if (from === null) return;
      const now = heldPoints(from.held, fingersOf(event.touches));
      const [a0, b0] = from.points;
      const [a1, b1] = now;
      if (now.length !== from.points.length) {
        // 잡은 손가락이 사라짐(끝 이벤트를 못 받음) — 남은 손가락 자리부터 다시 잽니다.
        start.current = { ...from, item, points: now };
        return;
      }
      if (a0 === undefined || a1 === undefined) return;
      if (b0 !== undefined && b1 !== undefined) {
        const turned = turnSticker(from.item, [a0, b0], [a1, b1]);
        if (snapEntered(snap.current, turned.snap)) haptic.current();
        snap.current = turned.snap;
        return change(turned.item);
      }
      if (canvas.width <= 0 || canvas.height <= 0) return;
      change(moveSticker(from.item, (a1.x - a0.x) / canvas.width, (a1.y - a0.y) / canvas.height));
    },
    lift: (event) => {
      const pinch = start.current?.pinch === true;
      const left = liftFingers(
        start.current?.held ?? [],
        changedOf(event),
        fingersOf(event.touches),
      );
      // 두 손가락에서 하나를 뗌 — 남은 손가락 자리부터 이어 끕니다. 바탕 두 손가락이었으면 놓습니다(바탕 한 손가락은 옮기지 않음).
      const held = pinch && left.length < 2 ? [] : left;
      restart(held, event, pinch);
      if (held.length === 0) settle();
    },
    cancel: () => {
      start.current = null;
      settle();
    },
    holding: () => start.current !== null,
    count: () => start.current?.held.length ?? 0,
  };
  // 고른 것은 바탕 두 손가락이 잡도록 바탕에 알립니다 — 풀리거나 사라지면 거둡니다.
  if (hub !== null) {
    if (selected) hub.selected = grip;
    else if (hub.selected === grip) hub.selected = null;
  }
  useEffect(
    () => () => {
      if (hub !== null && hub.selected === grip) hub.selected = null;
    },
    [hub],
  );

  return {
    /** 이 요소에 닿은 손가락 — 다른 것을 이미 잡고 있으면 그것의 둘째 손가락으로. */
    begin: (event: TouchLists) => {
      "background only";
      const active = hub?.current ?? null;
      if (active !== null && active !== grip && active.current.holding()) {
        active.current.add(event);
        return;
      }
      // 먼저 바탕에 닿아 있던 손가락이 있으면 그것까지 두 손가락으로.
      const before = hub?.loose ?? [];
      if (hub !== null) {
        hub.current = grip;
        hub.loose = [];
      }
      if (start.current === null) haptic.current = createKeyHaptic();
      grip.current.add(event, before);
      onSelect();
    },
    /** 바탕이 없는 곳(테스트 · 다른 화면)에서는 요소가 직접 받습니다. */
    own: hub === null,
    move: (event: TouchLists) => {
      "background only";
      grip.current.move(event);
    },
    end: (event: TouchLists) => {
      "background only";
      grip.current.lift(event);
    },
    cancel: () => {
      "background only";
      grip.current.cancel();
    },
    resizeBegin: (event: TouchLists) => {
      "background only";
      const [finger] = changedOf(event);
      if (finger !== undefined) resize.current = { id: finger.id, item, point: finger };
    },
    resizeMove: (event: TouchLists) => {
      "background only";
      const from = resize.current;
      if (from === null) return;
      const [point] = heldPoints([from.id], fingersOf(event.touches));
      if (point === undefined) return;
      change(resizeSticker(from.item, point.x - from.point.x, point.y - from.point.y));
    },
    resizeEnd: () => {
      "background only";
      resize.current = null;
      settle();
    },
  };
}
