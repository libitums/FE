// 여정 맵 상단 지표 칩 둘(연속 학습 · 트로피)을 누르면 뜨는 모달의 순수 계산입니다.
// 화면은 이 결과를 그리기만 하고 세지 않습니다.

export type JourneyStatKind = "streak" | "trophy";

/** 모달 아래 진행 줄의 칸 수입니다 — 한 주 7일입니다(Figma 47-14057 · 74-419). */
export const journeyStatSlotCount = 7;

// 요일 약칭은 디자인 표기 그대로입니다. 인덱스는 `Date#getDay()`와 같습니다(0 = 일).
const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export type JourneyStatTrack = {
  /** 앞에서부터 채워진 칸 수입니다. 0 … `journeyStatSlotCount`. */
  readonly completedCount: number;
  /** 칸마다 붙는 요일 약칭입니다. 연속 학습만 가집니다. */
  readonly dayLabels?: readonly string[];
};

function wholeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/**
 * 연속 학습 모달의 주간 줄입니다. 줄은 **이번 연속 주간의 첫날**부터 시작합니다 —
 * 연속 1일째가 첫 칸이고 7일마다 새 줄이 됩니다. 그래서 채워진 칸의 마지막이 늘
 * 오늘입니다.
 *
 * 24일 연속 · 오늘 월요일이면 이번 주간은 3일째(토 · 일 · 월)라 `Sa`부터 시작하는
 * 줄에 세 칸이 찹니다 — 디자인 예시 그대로입니다.
 */
export function streakTrack(streakDays: number, todayWeekday: number): JourneyStatTrack {
  const days = wholeCount(streakDays);
  const completedCount = days === 0 ? 0 : ((days - 1) % journeyStatSlotCount) + 1;
  const today = ((Math.floor(todayWeekday) % 7) + 7) % 7;
  // 연속이 없으면 오늘부터 시작합니다 — 첫 칸이 「오늘 하면 찰 칸」입니다.
  const firstWeekday = completedCount === 0 ? today : (today - (completedCount - 1) + 7) % 7;
  const dayLabels = Array.from(
    { length: journeyStatSlotCount },
    (_, index) => weekdayLabels[(firstWeekday + index) % 7],
  );
  return { completedCount, dayLabels };
}

/** 트로피 모달의 줄입니다. 얻은 트로피 수만큼 앞에서부터 찹니다. 넘치면 가득입니다. */
export function trophyTrack(trophyCount: number): JourneyStatTrack {
  return { completedCount: Math.min(wholeCount(trophyCount), journeyStatSlotCount) };
}
