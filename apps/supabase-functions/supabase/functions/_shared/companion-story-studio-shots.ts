// 친구 스토리의 컷 배정(ADR-0192 D9, 사용자 결정 2026-11-24) — 셀카 0.3 · 남이 찍어 준 컷 0.2 · 인물 없음(손까지) 0.5.
// 비율은 설정값(`settings.story_shot_mix`)이고, 모델에게 고르게 하지 않는다 — 초안을 쓸 때 코드가 그 인물의 최근 컷을 세어
// 「가장 모자란 컷」부터 배정한다(무작위가 아니라 결정적이라 적은 표본에서도 비율에 붙는다). 기준 그림 묶음이 없는 인물은 모두 인물 없음. 순수.

export const STORY_SHOTS = ["selfie", "other", "scene"] as const;
export type StoryShot = (typeof STORY_SHOTS)[number];
export const DEFAULT_SHOT_MIX: Readonly<Record<StoryShot, number>> = {
  selfie: 0.3,
  other: 0.2,
  scene: 0.5,
};
/**
 * 비율을 맞출 때 돌아보는 최근 컷의 수(인물마다). 길게 보면 비율을 바꾼 뒤나 묶음만 올리던 인물이 한쪽 컷으로 몰린다
 * (인물 없음만 스무 개였던 인물들의 다음 주가 셀카 18 · 남이 찍어 준 컷 6 · 인물 없음 0 — 2026-11-24 리뷰).
 */
export const SHOT_HISTORY = 6;
/** 같을 때 고르는 순서 — 인물 없는 컷이 가장 싸고(기준 그림 없음) 안전하다. */
const TIE_ORDER: readonly StoryShot[] = ["scene", "selfie", "other"];

export const isStoryShot = (value: unknown): value is StoryShot =>
  STORY_SHOTS.includes(value as StoryShot);

/** 설정값 → 합이 1인 비율. 숫자가 아니거나 음수인 칸은 0, 모두 0이면 기본값. */
export function shotMixFrom(raw: unknown): Record<StoryShot, number> {
  const value = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const weights = STORY_SHOTS.map((shot) => {
    const weight = value[shot];
    return typeof weight === "number" && Number.isFinite(weight) && weight > 0 ? weight : 0;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0 || !Number.isFinite(total)) return { ...DEFAULT_SHOT_MIX };
  return Object.fromEntries(
    STORY_SHOTS.map((shot, index) => [shot, weights[index]! / total]),
  ) as Record<StoryShot, number>;
}

/**
 * 빈 자리(날짜 순)마다 컷 하나. `recent`는 그 인물의 최근 컷들 — 거기에 이어서 비율을 맞춘다:
 * 자리마다 「비율 × (지금까지 수 + 1) − 그 컷의 수」가 가장 큰 컷.
 */
export function allocateShots(
  days: readonly string[],
  recent: readonly unknown[],
  mix: Readonly<Record<StoryShot, number>>,
  hasRef: boolean,
): Record<string, StoryShot> {
  const counts: Record<StoryShot, number> = { selfie: 0, other: 0, scene: 0 };
  for (const shot of recent.slice(0, SHOT_HISTORY)) if (isStoryShot(shot)) counts[shot] += 1;
  let total = counts.selfie + counts.other + counts.scene;
  const out: Record<string, StoryShot> = {};
  for (const day of [...days].sort()) {
    let pick: StoryShot = "scene";
    if (hasRef) {
      let best = -Infinity;
      for (const shot of TIE_ORDER) {
        const deficit = mix[shot] * (total + 1) - counts[shot];
        if (mix[shot] > 0 && deficit > best + 1e-9) [best, pick] = [deficit, shot];
      }
    }
    out[day] = pick;
    counts[pick] += 1;
    total += 1;
  }
  return out;
}

/**
 * 한 주 기획의 컷 배정 — 인물마다 따로 맞추면 한 주에 두세 번 올리는 인물이 모두 「인물 없음 → 셀카」부터 시작해 남이 찍어 준 컷이
 * 모자란다(2026-11-24 시험: 24개 중 셋). 그래서 **모든 인물을 합친 비율**을 먼저 맞추고, 그 인물의 비율은 절반 무게로 본다
 * (한 인물이 같은 컷만 받지 않게). 자리는 날짜 · 인물 순으로 돈다. 기준 그림 묶음이 없는 인물은 인물 없는 컷만.
 */
export function allocateWeek(
  entries: readonly {
    readonly id: string;
    readonly days: readonly string[];
    readonly recent: readonly unknown[];
    readonly hasRef: boolean;
  }[],
  mix: Readonly<Record<StoryShot, number>>,
): Record<string, Record<string, StoryShot>> {
  const zero = (): Record<StoryShot, number> => ({ selfie: 0, other: 0, scene: 0 });
  const all = zero();
  const own = new Map<string, Record<StoryShot, number>>();
  for (const entry of entries) {
    const counts = zero();
    for (const shot of entry.recent.slice(0, SHOT_HISTORY))
      if (isStoryShot(shot)) {
        counts[shot] += 1;
        all[shot] += 1;
      }
    own.set(entry.id, counts);
  }
  const sum = (counts: Record<StoryShot, number>) => counts.selfie + counts.other + counts.scene;
  const out: Record<string, Record<string, StoryShot>> = Object.fromEntries(
    entries.map((entry) => [entry.id, {}]),
  );
  const slots = entries
    .flatMap((entry) => entry.days.map((day) => ({ day, entry })))
    .sort((a, b) => a.day.localeCompare(b.day) || a.entry.id.localeCompare(b.entry.id));
  for (const { day, entry } of slots) {
    const mine = own.get(entry.id)!;
    let pick: StoryShot = "scene";
    if (entry.hasRef) {
      let best = -Infinity;
      for (const shot of TIE_ORDER) {
        if (mix[shot] <= 0) continue;
        const score =
          mix[shot] * (sum(all) + 1) - all[shot] + 0.5 * (mix[shot] * (sum(mine) + 1) - mine[shot]);
        if (score > best + 1e-9) [best, pick] = [score, shot];
      }
    }
    out[entry.id]![day] = pick;
    all[pick] += 1;
    mine[pick] += 1;
  }
  return out;
}

/** 초안 쓰기에 주는 컷의 뜻 — 그림 주문(`scene`)을 이 종류에 맞게 쓰게 한다. */
export const SHOT_MEANING: Readonly<Record<StoryShot, string>> = {
  selfie:
    "a selfie: the character holds the phone at arm's length and is in the frame from the chest or waist up, with the place or the thing they are showing behind or beside them",
  other:
    "a photo someone else took of the character: the character is in the frame doing something (not holding the camera), seen from a little distance",
  scene:
    "a photo the character took of what is in front of them: the food, object, street or view — the character is not in it, or only their hand at the edge of the frame holding or reaching for the thing",
};
