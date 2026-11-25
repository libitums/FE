// 스토리 보기의 인물 넘김 큐브(ADR-0178 D4 개정 ⟨큐브⟩) — 손가락을 따라 면을 매 프레임 돌리는 일은 화면 쪽 스레드(main thread)가 합니다.
// 백그라운드 스레드로 프레임마다 보내면 몰아서 반영돼 손가락을 따르지 못합니다(ADR-0022 맵 스크롤과 같은 이유). 판정 · 변환 값은
// `story-cube`(순수, shared로 가져옴)가 정하고, 놓을 때 한 번 백그라운드에 알립니다(`release`). 모션 줄이기(`still`)면 돌리지 않고 바로 넘깁니다.

import {
  runOnBackground,
  runOnMainThread,
  useEffect,
  useMainThreadRef,
  useRef,
} from "@lynx-js/react";
import type { RefObject } from "@lynx-js/react";
import type { MainThread } from "@lynx-js/types";

import {
  cubeAmountOf,
  cubeAxisOf,
  cubeDirectionOf,
  cubeFacesOf,
  cubeReleaseOf,
  cubeSettleMs,
} from "./story-cube" with { runtime: "shared" };
import type { CubeAxis, CubeDirection, CubeFaceStyle } from "./story-cube";
import type { CubeTurn } from "./story-cube-neighbors";

type Gesture = {
  x0: number;
  y0: number;
  x: number;
  t: number;
  velocity: number;
  axis: CubeAxis;
  /** 큐브가 다 도는 시각(ms) — 그 전에 닿은 새 손가락은 무시합니다(돌기를 마친 뒤 · 프레임이 멈췄어도 그 뒤엔 받음). */
  until: number;
  generation: number;
};

type Point = { readonly detail?: { readonly x?: unknown; readonly y?: unknown } };

/** 돌기 모드 — 넘어감 · 되돌아옴(옆 인물이 없으면 넘김 판정이어도) · 탭으로 바뀐 인물 전환. */
type Settle = "advance" | "back" | "turn";

/** 마지막 움직임에서 이만큼(ms) 지나 놓으면 속도는 0으로 봅니다. */
const STALE_MS = 100;
/** 메인 스레드가 마지막 프레임을 그린 뒤에 넘김을 반영하도록 두는 여유(ms, 두 프레임). */
const LAG_MS = 34;

export type StoryCube = {
  readonly prevRef: RefObject<MainThread.Element>;
  readonly currentRef: RefObject<MainThread.Element>;
  readonly nextRef: RefObject<MainThread.Element>;
  readonly touchStart: (event: MainThread.TouchEvent) => void;
  readonly touchMove: (event: MainThread.TouchEvent) => void;
  readonly touchEnd: (event: MainThread.TouchEvent) => void;
};

export function useStoryCube({
  width,
  still,
  locked,
  hasPrev,
  hasNext,
  turn,
  fullMs,
  onTouch,
  onDrag,
  onSwipe,
  onTurnEnd,
}: {
  readonly width: number;
  readonly still: boolean;
  /** 답장을 쓰는 중 — 끌어도 돌지 않고 넘기지 않습니다. */
  readonly locked: boolean;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly turn: CubeTurn | null;
  /** 한 면을 다 돌리는 시간(page 토큰). */
  readonly fullMs: number;
  readonly onTouch: () => void;
  readonly onDrag: (on: boolean) => void;
  readonly onSwipe: (direction: CubeDirection) => void;
  readonly onTurnEnd: (id: number) => void;
}): StoryCube {
  const prevRef = useMainThreadRef<MainThread.Element>(null);
  const currentRef = useMainThreadRef<MainThread.Element>(null);
  const nextRef = useMainThreadRef<MainThread.Element>(null);
  const gesture = useMainThreadRef<Gesture>({
    x0: 0,
    y0: 0,
    x: 0,
    t: 0,
    velocity: 0,
    axis: "undecided",
    until: 0,
    generation: 0,
  });

  // 놓은 뒤(백그라운드) — 큐브가 다 돌 즈음 넘김을 반영하고 끌기를 풉니다. 그동안 6초 넘김은 멈춰 있습니다.
  const latest = useRef({ onSwipe, onDrag, onTurnEnd });
  latest.current = { onSwipe, onDrag, onTurnEnd };
  type Pending = { handle: ReturnType<typeof setTimeout>; finish: () => void };
  const pending = useRef<Pending | null>(null);
  const release = (direction: CubeDirection, commit: boolean, ms: number): void => {
    "background only";
    // 앞 손가락의 반영이 아직 남았으면 먼저 끝냅니다 — 버리면 넘김이 사라지고, 두면 타이머가 겹칩니다(리뷰 반영).
    const before = pending.current;
    if (before !== null) {
      clearTimeout(before.handle);
      before.finish();
    }
    const finish = () => {
      pending.current = null;
      if (commit) latest.current.onSwipe(direction);
      latest.current.onDrag(false);
    };
    if (ms <= 0) finish();
    else pending.current = { handle: setTimeout(finish, ms + LAG_MS), finish };
  };
  useEffect(
    () => () => {
      if (pending.current !== null) clearTimeout(pending.current.handle);
    },
    [],
  );

  const paint = (face: MainThread.Element | null | undefined, style: CubeFaceStyle): void => {
    "main thread";
    if (face === null || face === undefined) return;
    face.setStyleProperties({
      transform: style.transform,
      "transform-origin": style.transformOrigin,
      opacity: String(style.opacity),
    });
    face.querySelector(".story-face-shade")?.setStyleProperty("opacity", String(style.shade));
  };

  /**
   * 남은 몫을 돌립니다. 면은 시작할 때 붙잡아 둡니다 — 넘김을 백그라운드가 반영하면 ref가 새 역할로 옮겨 가기 때문입니다.
   * 끝은 백그라운드가 같은 길이의 타이머로 압니다(`release` · 전환 효과) — 프레임 안에서 스레드를 건너지 않습니다.
   */
  const settle = (mode: Settle, direction: CubeDirection, from: number): void => {
    "main thread";
    const state = gesture.current;
    state.generation += 1;
    const mine = state.generation;
    const to = mode === "advance" || mode === "turn" ? 1 : 0;
    const ms = cubeSettleMs(from, to, fullMs);
    const began = Date.now();
    state.until = began + ms;
    const toward = direction === "next" ? nextRef.current : prevRef.current;
    const away = direction === "next" ? prevRef.current : nextRef.current;
    const leaving = mode === "turn" ? away : currentRef.current;
    const entering = mode === "turn" ? currentRef.current : toward;
    const frame = (): void => {
      if (gesture.current.generation !== mine) return;
      const passed = Date.now() - began;
      const t = ms <= 0 || passed < 0 ? 1 : Math.min(1, passed / ms);
      // 빠르게 출발해 천천히 멈춥니다(ease-out cubic) — 손가락을 뗀 속도를 이어받는 느낌.
      const eased = 1 - Math.pow(1 - t, 3);
      const faces = cubeFacesOf(from + (to - from) * eased, direction, width);
      paint(leaving, faces.leaving);
      paint(entering, faces.entering);
      if (t < 1) requestAnimationFrame(frame);
    };
    frame();
  };

  const touchStart = (event: MainThread.TouchEvent): void => {
    "main thread";
    const state = gesture.current;
    if (locked || Date.now() < state.until) {
      state.axis = "vertical";
      return;
    }
    // 멈춘 돌기가 남아 있으면 거둡니다.
    state.generation += 1;
    const { x, y } = pointOf(event as Point);
    state.x0 = x;
    state.y0 = y;
    state.x = x;
    state.t = Date.now();
    state.velocity = 0;
    state.axis = "undecided";
    void runOnBackground(onTouch)();
  };

  const touchMove = (event: MainThread.TouchEvent): void => {
    "main thread";
    const state = gesture.current;
    if (state.axis === "vertical") return;
    const { x, y } = pointOf(event as Point);
    const now = Date.now();
    if (now > state.t) state.velocity = (x - state.x) / (now - state.t);
    state.x = x;
    state.t = now;
    const dx = x - state.x0;
    if (state.axis === "undecided") {
      state.axis = cubeAxisOf(dx, y - state.y0);
      if (state.axis === "horizontal") void runOnBackground(onDrag)(true);
    }
    if (state.axis !== "horizontal" || still) return;
    const direction = cubeDirectionOf(dx);
    const has = direction === "next" ? hasNext : hasPrev;
    const faces = cubeFacesOf(cubeAmountOf(dx, width, has), direction, width);
    paint(currentRef.current, faces.leaving);
    if (has) paint((direction === "next" ? nextRef : prevRef).current, faces.entering);
    // 손가락이 방향을 바꾸면 반대쪽 면은 제자리(보이지 않음)로.
    const other = direction === "next" ? "prev" : "next";
    paint((other === "next" ? nextRef : prevRef).current, cubeFacesOf(0, other, width).entering);
  };

  const touchEnd = (event: MainThread.TouchEvent): void => {
    "main thread";
    const state = gesture.current;
    if (state.axis === "vertical") {
      state.axis = "undecided";
      return;
    }
    const { x, y } = pointOf(event as Point);
    const dx = x - state.x0;
    const dy = y - state.y0;
    const axis = state.axis === "undecided" ? cubeAxisOf(dx, dy) : state.axis;
    state.axis = "undecided";
    if (axis !== "horizontal") return;
    const velocity = Date.now() - state.t > STALE_MS ? 0 : state.velocity;
    const decision = cubeReleaseOf({ dx, dy, velocity, width });
    const direction = cubeDirectionOf(dx);
    const commit = decision === "advance";
    if (still) {
      void runOnBackground(release)(direction, commit, 0);
      return;
    }
    const has = direction === "next" ? hasNext : hasPrev;
    const amount = cubeAmountOf(dx, width, has);
    // 옆 인물이 없으면(마지막 인물의 다음 · 첫 인물의 이전) 되돌아온 뒤 넘김을 반영합니다(닫힘 · 그 인물의 처음).
    const mode: Settle = commit && has ? "advance" : "back";
    settle(mode, direction, amount);
    void runOnBackground(release)(
      direction,
      commit,
      cubeSettleMs(amount, mode === "advance" ? 1 : 0, fullMs),
    );
  };

  // 탭 · 6초 넘김으로 인물이 바뀌면 한 번 돌고, page 길이 뒤에 전환을 거둡니다.
  const turnId = turn?.id ?? 0;
  useEffect(() => {
    "background only";
    if (turn === null) return undefined;
    void runOnMainThread(settle)("turn", turn.direction, 0);
    const handle = setTimeout(() => latest.current.onTurnEnd(turn.id), fullMs + LAG_MS);
    return () => clearTimeout(handle);
  }, [turnId]);

  return { prevRef, currentRef, nextRef, touchStart, touchMove, touchEnd };
}

function pointOf(event: Point): { x: number; y: number } {
  "main thread";
  const x = event.detail?.x;
  const y = event.detail?.y;
  return { x: typeof x === "number" ? x : 0, y: typeof y === "number" ? y : 0 };
}
