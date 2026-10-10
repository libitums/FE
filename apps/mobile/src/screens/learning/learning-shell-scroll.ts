import { useEffect } from "@lynx-js/react";

import type { LearningShellArrangement } from "./learning-shell.contract";

/** 껍데기 스크롤의 id입니다. `data-testid`와 같은 문자열입니다. */
export const learningShellScrollId = "learning-shell-scroll";

/** 껍데기 스크롤을 맨 위로 옮깁니다(모션 없이). 못 옮겨도 던지지 않습니다. */
export function scrollLearningShellToTop(): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${learningShellScrollId}`)
      .invoke({ method: "scrollTo", params: { offset: 0, smooth: false } })
      .exec();
  } catch {
    // 못 옮겨도 화면은 그대로 쓸 수 있습니다.
  }
}

export type LearningShellScrollResetInput = {
  readonly arrangement: LearningShellArrangement;
  readonly questionIndex: number;
  readonly complete: boolean;
  /** 넘김 걸음이 있는가 — 껍데기의 `advance !== undefined`입니다. */
  readonly answered: boolean;
};

/**
 * 합친 스크롤은 문항이 바뀌어도 같은 요소라, 내려 둔 자리가 남으면 다음 문항이 보기부터
 * 보입니다. 답한 순간(넘김 걸음이 생길 때)에도 맨 위로 보내 판정 배지가 보이게 합니다.
 *
 * 의존에 배치를 넣지 않습니다 — 합쳐지는 순간(새로 선 스크롤은 0)에는 부르지 않습니다.
 * 효과는 하나입니다: 넘김이 끝나면 문항(또는 완료)과 `answered`가 같은 렌더에서 함께
 * 바뀌는데, 효과가 둘이면 그 렌더에서 두 번 부릅니다.
 */
export function useLearningShellScrollReset({
  arrangement,
  questionIndex,
  complete,
  answered,
}: LearningShellScrollResetInput): void {
  useEffect(() => {
    if (arrangement === "merged") {
      scrollLearningShellToTop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, complete, answered]);
}
