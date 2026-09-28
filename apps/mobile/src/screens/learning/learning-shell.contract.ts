// 학습 껍데기의 세션 헤더가 내는 값들을 뽑습니다. 화면이 계산식을 들고 있지 않도록
// 여기 모읍니다 — 같은 수에서 낱말 셋(순번 · 백분율 · 접근성 이름)과 막대가 나옵니다.

import type { LearningForm } from "../../lib/learning-form";

/**
 * 세션 헤더에 서는 학습형 이름입니다. 영문인 것은 디자인(Figma 65-14)의 어휘이고,
 * 에피소드 헤더(`Episode 0.` · `Tutorial.`) · 말풍선(`Lesson 1:`)과 같은 갈래입니다 —
 * 메타 문구는 영문, 학습 내용은 한국어입니다.
 */
const formLabels: Record<LearningForm, string> = {
  listening: "Listening",
  "sentence-order": "Word order",
  "word-choice": "Word choice",
  culture: "Culture",
};

export type LearningSessionHeader = {
  /** `Chapter 4 / 12` — 유닛 안에서 지금 몇 번째 활동인가입니다. */
  readonly chapterLabel: string;
  readonly formLabel: string;
  readonly percentLabel: string;
  readonly fillPercent: number;
  readonly accessibilityLabel: string;
};

/**
 * 활동 순번(0부터)과 유닛의 전체 활동 수에서 세션 헤더의 값을 뽑습니다. 데이터 오류는
 * 숨기지 않고 던집니다 — 활동이 0개인 유닛이나 범위 밖 순번은 값으로 표현할 수 있는
 * 상태가 아닙니다.
 *
 * 백분율은 **끝낸 활동 수**를 셉니다. 지금 하는 활동은 아직 안 끝났으므로 순번이 곧
 * 끝낸 수입니다 — 첫 활동에서 0%, 마지막 활동에서 (N-1)/N입니다. 100%는 유닛을
 * 마쳤을 때만 나옵니다.
 */
export function learningSessionHeader(
  form: LearningForm,
  activityIndex: number,
  totalActivityCount: number,
): LearningSessionHeader {
  if (!Number.isInteger(totalActivityCount) || totalActivityCount <= 0) {
    throw new Error(`유닛의 활동 수는 1 이상의 정수여야 합니다: ${totalActivityCount}`);
  }
  if (!Number.isInteger(activityIndex) || activityIndex < 0) {
    throw new Error(`활동 순번은 0 이상의 정수여야 합니다: ${activityIndex}`);
  }
  if (activityIndex >= totalActivityCount) {
    throw new Error(`활동 순번이 활동 수를 넘습니다: ${activityIndex} / ${totalActivityCount}`);
  }

  const ordinal = activityIndex + 1;
  const percent = (activityIndex / totalActivityCount) * 100;

  return {
    chapterLabel: `Chapter ${String(ordinal)} / ${String(totalActivityCount)}`,
    formLabel: formLabels[form],
    percentLabel: `${String(Math.round(percent))}%`,
    fillPercent: percent,
    accessibilityLabel: `${formLabels[form]}, 활동 ${String(totalActivityCount)}개 중 ${String(ordinal)}번째`,
  };
}
