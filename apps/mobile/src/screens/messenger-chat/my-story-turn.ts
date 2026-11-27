// 두 손가락 회전의 각도 — 순수. 각도를 −180 ~ 180으로 접고, 0° · ±90° · 180° 가까이(±SNAP_DEGREES)면 그 각도에 붙입니다.

/** 붙는 범위(도) — 이 안이면 바로 그 각도. */
export const SNAP_DEGREES = 4;

/** 각도를 (−180, 180]으로 접습니다. */
export function foldRotation(rotation: number): number {
  const turn = rotation % 360;
  const folded = turn > 180 ? turn - 360 : turn <= -180 ? turn + 360 : turn;
  // −0 · 아주 작은 소수 오차는 0으로.
  return Math.round(folded * 1000) / 1000 + 0;
}

/** 붙는 각도 — 180은 −180과 같은 자리. */
const SNAPS = [0, 90, -90, 180] as const;

/** 붙은 각도와 결과 — 붙지 않았으면 `snap` null. */
export type Turn = { readonly rotation: number; readonly snap: number | null };

export function snapRotation(rotation: number): Turn {
  const folded = foldRotation(rotation);
  for (const snap of SNAPS) {
    const gap = Math.abs(foldRotation(folded - snap));
    if (gap <= SNAP_DEGREES) return { rotation: snap, snap };
  }
  return { rotation: folded, snap: null };
}

/** 새로 붙었는가 — 진동 한 번. 붙은 채로 머물거나 떨어질 때는 아님. */
export function snapEntered(before: number | null, now: number | null): boolean {
  return now !== null && now !== before;
}
