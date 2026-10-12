import type { AnswerResult } from "../../lib/answer-result";

/**
 * 학습 활동이 끝났을 때 결과를 올리는 콜백입니다. 어느 스텝·유닛의 활동인지는 활동이
 * 모르고, 부르는 쪽(튜토리얼 어댑터 · 카탈로그 결선)이 압니다. 건너뛴 수는 건너뛰기가
 * 없는 활동에서 늘 0입니다.
 */
export type ActivityFinish = (results: readonly AnswerResult[], skippedCount: number) => void;
