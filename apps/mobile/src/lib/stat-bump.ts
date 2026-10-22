// 지표 칩(연속 학습 · 트로피)의 「올랐다」 표식입니다(ADR-0064). 칩은 값이 **활동으로** 오른 순간에만
// 움직입니다 — 앱을 켜거나 저장본 뒤에 서버 값이 들어와 숫자가 맞춰질 때는 움직이지 않습니다. 그래서 칩이
// 직전 값을 스스로 기억하지 않고, 활동을 아는 쪽(`useJourneyProgress`)이 「오르기 전 값」을 남깁니다.
//
// 표식은 재생할 때까지 남습니다 — 오른 순간에 칩이 화면에 없어도(학습 완료 화면이 떠 있거나 모달이 덮고 있어도)
// 다음에 칩이 보일 때 한 번 재생하고 지웁니다.

export type StatBumpKind = "streak" | "trophy";

/** 칩마다 오르기 전 값입니다. `null`이면 재생할 것이 없습니다. */
export type StatBumps = { readonly streak: number | null; readonly trophy: number | null };

export const noStatBumps: StatBumps = { streak: null, trophy: null };

/**
 * 활동으로 `previous` → `next`가 됐을 때 표식을 남깁니다. 오르지 않았으면 그대로 돌려줍니다. 아직 재생하지 않은
 * 표식이 있으면 더 오래된 값을 지킵니다 — 두 번 오른 뒤 한 번 재생하면 처음 값에서 지금 값으로 굴러갑니다.
 */
export function recordStatBump(
  bumps: StatBumps,
  kind: StatBumpKind,
  previous: number,
  next: number,
): StatBumps {
  if (next <= previous || bumps[kind] !== null) return bumps;
  return { ...bumps, [kind]: previous };
}

/** 재생을 마친 칩의 표식을 지웁니다. 이미 없으면 같은 객체를 돌려줍니다(다시 그리지 않게). */
export function clearStatBump(bumps: StatBumps, kind: StatBumpKind): StatBumps {
  return bumps[kind] === null ? bumps : { ...bumps, [kind]: null };
}

/**
 * 칩이 굴릴 시작 값입니다. 표식이 지금 값보다 작을 때만 그 값이고, 아니면 `null`입니다 — 오른 뒤 다른 경로로
 * 값이 내려갔거나(계정 전환 · 서버 정정) 같아졌으면 굴릴 것이 없습니다.
 */
export function statBumpStart(bumpFrom: number | null, value: number): number | null {
  return bumpFrom !== null && bumpFrom < value ? bumpFrom : null;
}

/**
 * 학습 티켓 칩이 줄어들 시작 값입니다(시안 E4). 오름과 반대로, 표식이 지금 값보다 **클** 때만 그 값이고 아니면
 * `null`입니다 — 쓴 뒤 다른 경로로 장수가 다시 찼으면(충전 · 무료 1장) 굴릴 것이 없습니다.
 */
export function ticketDropStart(dropFrom: number | null, value: number): number | null {
  return dropFrom !== null && dropFrom > value ? dropFrom : null;
}
