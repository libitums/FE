// 결과 화면의 props입니다 — `LessonCompleteScreen`이 300줄에 닿아 따로 둡니다(⟨2026-10-30⟩). 뜻은 화면 머리 주석과 함께 읽습니다.

import type { AnswerResult } from "../../lib/answer-result";
import type { SpecialUnitEntrySource } from "../../lib/special-unit-entry-source";
import type { StatBumpKind, StatBumps } from "../../lib/stat-bump";
import type { AssessmentVerdict } from "../assessment/assessment";
import type { LessonReward } from "./lesson-complete";
import type { LessonCompleteNext } from "./LessonCompleteNextActions";

/** 다시 푼 문항 하나의 결과입니다(푼 순서). */
export type LessonReviewOutcome = "fixed" | "missed";

/** 결과 화면에 싣는 다시 풀기 요약입니다. */
export type LessonReviewSummary = {
  readonly outcomes: readonly LessonReviewOutcome[];
  /** 다 풀고도 통과까지 모자란 수입니다 — 통과면 0입니다. */
  readonly remainingToPass: number;
};

export type LessonCompleteScreenProps = {
  readonly results: readonly AnswerResult[];
  /**
   * 건너뛴 말하기 문항 수입니다(D8). 통과 계산에는 이미 `results`를 통해 세어져
   * 있고, 이 값은 **만점 판정**에만 씁니다 — 실수가 없어도 이 값이 0이 아니면
   * 만점이 아닙니다. 제목(`lessonCompleteTitle`)과 낭독이 이 값을 보고, 부제는
   * 보지 않습니다 — 부제가 세는 것은 실수이고 건너뛴 것은 실수가 아닙니다.
   */
  readonly skippedCount: number;
  /** 통과 여부입니다. 화면이 계산하지 않고 받습니다 — 판정의 정본은 `judgeAssessment`입니다. */
  readonly verdict: AssessmentVerdict;
  /** 진행 지표입니다. 상단에는 연속 학습과 트로피만 표시합니다. */
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly reward: LessonReward;
  readonly exitTo?: SpecialUnitEntrySource;
  /** 나가면 맵이 아니라 에필로그(최종 통과 뒤 컷)로 이어지는가 — 참이면 나가는 버튼이 「Continue story」입니다. */
  readonly continuesStory?: boolean;
  readonly onExit: () => void;
  /**
   * 미통과에서만 씁니다 — 같은 유닛을 첫 문항부터 다시 엽니다.
   *
   * **나가는 수단이 아니라 나아가는 수단입니다**(ADR-0022 D1의 「나가는 수단은 어느
   * 시점에도 정확히 하나」와 부딪히지 않습니다). 뒤로 가는 것이 아니라 새 세션을 여는
   * 것이고, 뒤로 가는 길은 여전히 `onExit` 하나입니다.
   */
  readonly onRetry?: () => void;
  /**
   * 활동으로 오르기 전 지표 값입니다(ADR-0064). 머리 칩이 배지가 자리 잡은 뒤 그 값에서 지금 값으로 한 번
   * 굴리고 `onStatBumped`로 알립니다. 이 화면에서 굴리면 맵의 머리 칩은 다시 굴리지 않습니다.
   */
  readonly statBumps?: StatBumps;
  readonly onStatBumped?: (kind: StatBumpKind) => void;
  /** 남은 학습 티켓 수입니다(시안 E5). 넘기지 않으면 줄이 서지 않습니다 — 레슨이 아닌 결과 화면입니다. */
  readonly ticketsLeft?: number;
  /** 통과 뒤 이어 갈 다음 유닛(시안 D) — 있으면 지도 버튼 + 「다음 학습」 한 줄, 없으면 맵 버튼 하나. */
  readonly next?: LessonCompleteNext;
  /**
   * ⟨2026-10-30⟩ 틀린 문제를 다시 풀고 왔으면 그 요약입니다(ADR-0058). 있으면 설명 줄이 「YOU FIXED x OF y」로 바뀌고 문항별
   * 점 줄이 서며, 미통과 제목은 `SO CLOSE!` · 통과 제목은 만점 표기 없이 `LESSON COMPLETE!`입니다. `results`는 이미 고친 수를
   * 반영한 결과입니다.
   */
  readonly review?: LessonReviewSummary;
};
