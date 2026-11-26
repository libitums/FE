// 스토리 보기의 인물 넘김 큐브(ADR-0178 D4 개정 ⟨큐브⟩, 시안 32번 Y2Swipe) — 손가락 · 시간에 따른 두 면의 변환과 놓았을 때의 판정(순수).
// 메인 스레드 제스처가 `with { runtime: "shared" }`로 가져다 쓰므로 이 파일은 아무것도 가져오지 않습니다.
// 지금 면은 넘어가는 쪽 모서리를 축으로 접혀 나가고(rotateY 0 → ∓90°, 어두워짐), 옆 인물 면은 맞닿은 모서리를 축으로 돌아 들어옵니다(±90° → 0).

/** 가로 넘김으로 볼 최소 거리(px) — 탭의 작은 떨림과 가르는 값(#611과 같음). */
export const CUBE_SWIPE_MIN = 48;
/** 손가락 방향을 정하는 거리(px) — 이만큼 움직이기 전에는 면을 돌리지 않습니다. */
export const CUBE_AXIS_SLOP = 8;
/** 「빠르게 밀었다」로 보는 마지막 속도(px/ms) — 반을 안 밀어도 넘어갑니다. */
export const CUBE_FLICK_SPEED = 0.5;
/** 다 돌았을 때 면의 그늘(검정 불투명도). */
export const CUBE_SHADE_MAX = 0.5;
/** 넘어갈 옆 인물이 없을 때 손가락을 따르는 몫 — 살짝만 돌고 되돌아옵니다. */
export const CUBE_EDGE_RESIST = 0.25;

export type CubeDirection = "next" | "prev";
export type CubeAxis = "undecided" | "horizontal" | "vertical";

export type CubeFaceStyle = {
  readonly transform: string;
  readonly transformOrigin: string;
  /** 면 위 그늘 층의 불투명도(0 ~ `CUBE_SHADE_MAX`). */
  readonly shade: number;
  /** 면 자체의 불투명도 — 다 돌아 옆으로 간 면(90°)은 0. iOS는 3D 면을 깊이로 겹쳐 그려, 쉬는 옆 면이 지금 면 그림이 아직 없을 때 비쳤습니다(2026-11-26 시뮬레이터). */
  readonly opacity: 0 | 1;
};

/** 손가락이 어느 쪽으로 움직이는가 — `CUBE_AXIS_SLOP` 안이면 아직 모름, 가로가 세로보다 커야 가로. */
export function cubeAxisOf(dx: number, dy: number): CubeAxis {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < CUBE_AXIS_SLOP) return "undecided";
  return Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
}

/** 왼쪽으로 밀면(dx < 0) 다음 인물, 오른쪽이면 이전 인물. */
export const cubeDirectionOf = (dx: number): CubeDirection => (dx < 0 ? "next" : "prev");

/** 손가락 거리 → 돈 몫(0 ~ 1). 옆 인물이 없으면 `CUBE_EDGE_RESIST`만큼만 따릅니다. */
export function cubeAmountOf(dx: number, width: number, hasNeighbor: boolean): number {
  if (!(width > 0)) return 0;
  const amount = Math.min(1, Math.abs(dx) / width);
  return hasNeighbor ? amount : amount * CUBE_EDGE_RESIST;
}

/** 놓았을 때 — 48px 넘게 가로로 밀었고, 반 넘게 밀었거나 같은 방향으로 빠르게 밀었으면 넘어갑니다. */
export function cubeReleaseOf(gesture: {
  readonly dx: number;
  readonly dy: number;
  /** 마지막 움직임의 가로 속도(px/ms, 부호 있음). */
  readonly velocity: number;
  readonly width: number;
}): "advance" | "back" {
  const { dx, dy, velocity, width } = gesture;
  if (Math.abs(dx) < CUBE_SWIPE_MIN || Math.abs(dx) <= Math.abs(dy)) return "back";
  if (Math.abs(dx) * 2 >= width) return "advance";
  const sameWay = Math.sign(velocity) === Math.sign(dx);
  return sameWay && Math.abs(velocity) >= CUBE_FLICK_SPEED ? "advance" : "back";
}

const round = (value: number): number => Math.round(value * 100) / 100;

const faceStyle = (
  shift: number,
  angle: number,
  origin: string,
  shade: number,
  shown: boolean,
): CubeFaceStyle => ({
  transform: `translateX(${round(shift)}px) rotateY(${round(angle)}deg)`,
  transformOrigin: origin,
  shade: round(shade),
  opacity: shown ? 1 : 0,
});

/**
 * 돈 몫 `amount`(0 ~ 1)에서 두 면의 변환. 다음(왼쪽으로 밂): 지금 면은 오른쪽 모서리 축으로 0 → −90°, 다음 면은 왼쪽 모서리 축으로
 * 90° → 0이고 두 면의 맞닿은 모서리가 손가락을 따라 옮겨 갑니다. 이전은 거울 반대입니다.
 */
export function cubeFacesOf(
  amount: number,
  direction: CubeDirection,
  width: number,
): { readonly leaving: CubeFaceStyle; readonly entering: CubeFaceStyle } {
  const t = Math.min(1, Math.max(0, amount));
  const sign = direction === "next" ? -1 : 1;
  const leaveOrigin = direction === "next" ? "right center" : "left center";
  const enterOrigin = direction === "next" ? "left center" : "right center";
  return {
    leaving: faceStyle(sign * t * width, sign * t * 90, leaveOrigin, t * CUBE_SHADE_MAX, t < 1),
    entering: faceStyle(
      -sign * (1 - t) * width,
      -sign * (1 - t) * 90,
      enterOrigin,
      (1 - t) * CUBE_SHADE_MAX,
      t > 0,
    ),
  };
}

/** 남은 몫을 도는 시간 — 다 돌면 `fullMs`, 남은 만큼 짧게(손가락을 뗀 자리에서 이어 감). */
export const cubeSettleMs = (from: number, to: number, fullMs: number): number =>
  Math.round(Math.abs(to - from) * fullMs);
