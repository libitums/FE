import type { Motion } from "@libitums/ui-lynx/motion";

import type { LessonPosition } from "./activity-finish";

/**
 * 완료 카드 표식의 모션 종류입니다(시안 A — 링 + 체크). 표준이면 링이 한 바퀴 차오르고 안쪽 원 · 체크 · 글이
 * 차례로 섭니다(`ring`). 움직임 줄이기면 처음부터 끝 모습입니다(`still`) — 회전 · 확대 · 이동은 정본 표에서
 * 즉시이고, 이 카드는 곧 결과 화면으로 넘어가는 자리라 불투명도만 남길 이유도 없습니다.
 */
export type ActivityCompleteMotion = "ring" | "still";

export function activityCompleteMotionOf(motion: Motion): ActivityCompleteMotion {
  return motion === "reduced" ? "still" : "ring";
}

/** 모션이 걸리는 부분입니다 — 링의 오른쪽 · 왼쪽 반쪽, 안쪽 원, 체크, 글 올라옴. */
export type ActivityCompletePart = "ring-right" | "ring-left" | "fill" | "check" | "rise";

/**
 * 부분의 클래스입니다. 링 모션이면 `-motion-ring` 변형이 붙고, 멈춘 모습이면 부분 클래스만입니다 — 변형이
 * 없으면 CSS에 animation이 없어 끝 모습이 그대로 섭니다.
 */
export function activityCompleteClassName(
  part: ActivityCompletePart,
  kind: ActivityCompleteMotion,
): string {
  const base = `learning-activity-complete-${part}`;
  return kind === "ring" ? `${base} ${base}-motion-ring` : base;
}

export type ActivityCompleteSummary = {
  /** 문항 타일의 수입니다. 레슨 안이면 레슨 전체(셸 카운터의 분모와 같다), 밖이면 그 활동의 문항 수입니다. */
  readonly questionCount: number;
  /** 활동 타일의 수입니다. 레슨이 모르면 `null`이고 타일이 서지 않습니다. */
  readonly activityCount: number | null;
  /** 칩의 `Lesson n`입니다. 레슨 역할의 유닛이 아니거나 모르면 `null`이고 칩이 서지 않습니다. */
  readonly lessonOrdinal: number | null;
};

/** 완료 카드가 보일 숫자입니다. 레슨이 준 값만 쓰고 모르는 값을 지어내지 않습니다. */
export function activityCompleteSummaryOf(
  questionCount: number,
  lesson: LessonPosition | undefined,
): ActivityCompleteSummary {
  if (lesson === undefined) {
    return { questionCount, activityCount: null, lessonOrdinal: null };
  }
  return {
    questionCount: lesson.total,
    activityCount: lesson.activityCount ?? null,
    lessonOrdinal: lesson.ordinal ?? null,
  };
}
