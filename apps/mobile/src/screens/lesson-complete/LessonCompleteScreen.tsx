import { useUiCopy } from "../../lib/ui-copy";
import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import diamond from "@libitums/icons/lynx/diamond";
import fire from "@libitums/icons/lynx/fire";
import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";

import { StatChip, statChipDiamondColor } from "../../components/StatChip";
import { announce } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import type { AnswerResult } from "../../lib/answer-result";
import type { SpecialUnitEntrySource } from "../../lib/special-unit-entry-source";
import type { AssessmentVerdict } from "../assessment/assessment";
import {
  lessonCompleteAnnouncement,
  lessonCompleteSubtitle,
  lessonCompleteTitle,
  lessonMistakeCount,
  lessonStreakLabel,
  type LessonReward,
} from "./lesson-complete";
import {
  lessonCompleteChipBumpDelayMs,
  lessonCompleteRiseClassName,
  rewardMotionFor,
} from "./lesson-complete-reward";
import { LessonCompleteBadge } from "./LessonCompleteBadge";
import { noStatBumps } from "../../lib/stat-bump";
import type { StatBumpKind, StatBumps } from "../../lib/stat-bump";

import "./lesson-complete-screen.css";

// 학습 유닛을 마치면 뜨는 화면입니다(Figma 65-466). ⟨2026-09-28⟩ **통과와 미통과가 이
// 화면 하나입니다** — 그전에는 통과만 여기였고 미통과는 옆의 평가 화면이라, 같은 순간의
// 두 결과가 전혀 다른 화면으로 보였습니다.
//
// 갈리는 것은 셋뿐입니다: 표식(✓ · ✗) · 제목 · 보상 카드의 유무. 나머지(지표 칩 · 실수
// 수 · 틀)는 같습니다 — **같은 일을 한 뒤의 두 결과**이기 때문입니다.
//
// **보상은 미통과에서 서지 않습니다.** 얻지 않은 것을 그리면 그 화면이 거짓말을 합니다.
//
// **DOM 순서가 곧 낭독 순서입니다** — 지표 → 판정 → 보상 → 액션. 상태가 없습니다.
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
};

export function LessonCompleteScreen({
  results,
  skippedCount,
  verdict,
  streakDays,
  trophyCount,
  reward,
  exitTo = "journey",
  onExit,
  onRetry,
  statBumps = noStatBumps,
  onStatBumped,
}: LessonCompleteScreenProps): ReactNode {
  const copy = useUiCopy();
  // `reward` prop(재화)과 이름이 겹치지 않도록 배지 모션은 `rewardMotion`으로 둡니다.
  const rewardMotion = rewardMotionFor(verdict, useMotion());
  const chipBumpDelayMs = lessonCompleteChipBumpDelayMs(rewardMotion);
  // 시스템 뒤로가기 = 하단 나가기와 같은 함수입니다(미통과의 `Try again`이 아닙니다).
  useScreenBack(onExit);
  const mistakeCount = lessonMistakeCount(results);

  useEffect(() => {
    playSound(verdict === "failed" ? "failed_lesson" : "pass_lesson");
  }, [verdict]);

  // 이 화면이 사는 동안 정확히 한 번 발화합니다(ADR-0016 D11-2).
  //
  // **dep이 `mistakeCount`입니다.** 빈 배열 + `eslint-disable`로 두면 「마운트 때 한 번」이
  // 규칙이 아니라 린트를 끈 결과가 되고, 나중에 이 값이 실제로 갈리는 날 발화가 조용히
  // 빠집니다. 값을 적어 두면 그날 `tsc`도 린트도 아닌 **화면이** 답합니다.
  //
  // 그래도 두 번 울리지 않습니다: `results`는 이 화면 인스턴스의 것이고 라우트에 실려
  // 와서 `back`과 함께 죽습니다(`nav-state.ts`) — 사는 동안 갈리지 않으므로 파생값인
  // `mistakeCount`도 갈리지 않습니다. 듣기 화면이 `[complete]`를 dep으로 두고 같은
  // 근거를 적는 것과 같은 자리입니다.
  useEffect(() => {
    announce(lessonCompleteAnnouncement(mistakeCount, verdict, skippedCount, copy));
  }, [mistakeCount, verdict, skippedCount]);

  return (
    <view className="lesson-complete-screen" data-testid="lesson-complete-screen">
      {/* [고정] 머리 — 연속 학습 · 트로피. 읽기 전용입니다. */}
      <view className="lesson-complete-screen-stats">
        <StatChip
          tone="streak"
          value={streakDays}
          accessibilityLabel={copy.common.count.streakDays(streakDays)}
          testId="lesson-complete-screen-streak"
          bumpFrom={statBumps.streak}
          bumpDelayMs={chipBumpDelayMs}
          onBumped={() => onStatBumped?.("streak")}
        />
        <StatChip
          tone="trophy"
          value={trophyCount}
          accessibilityLabel={copy.common.count.trophies(trophyCount)}
          testId="lesson-complete-screen-trophy"
          bumpFrom={statBumps.trophy}
          bumpDelayMs={chipBumpDelayMs}
          onBumped={() => onStatBumped?.("trophy")}
        />
      </view>

      <view className="lesson-complete-screen-spacer-top" />

      {/* 판정 표식과 통과 폭죽입니다(`LessonCompleteBadge`) — 장식이고 판정은 아래 제목과 낭독이 말합니다. */}
      <LessonCompleteBadge verdict={verdict} rewardMotion={rewardMotion} />

      <view
        className={[
          "lesson-complete-screen-summary",
          lessonCompleteRiseClassName(rewardMotion, "summary"),
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <text
          className="lesson-complete-screen-title"
          data-testid="lesson-complete-screen-title"
          accessibility-traits="header"
        >
          {lessonCompleteTitle(mistakeCount, verdict, skippedCount)}
        </text>
        {/* 연속이 없으면(0일) 알약을 세우지 않습니다 — 「0 Day Streak」은 축하가 아닙니다. */}
        {streakDays > 0 ? (
          <view
            className="lesson-complete-screen-streak"
            data-testid="lesson-complete-screen-streak-pill"
            accessibility-element={true}
            accessibility-label={copy.common.count.streakDays(streakDays)}
          >
            <svg
              className="lesson-complete-screen-streak-icon"
              content={fire}
              current-color={color.brand.primary}
            />
            <text className="lesson-complete-screen-streak-label">
              {lessonStreakLabel(streakDays)}
            </text>
          </view>
        ) : null}
        <text
          className="lesson-complete-screen-subtitle"
          data-testid="lesson-complete-screen-subtitle"
        >
          {lessonCompleteSubtitle(mistakeCount)}
        </text>
      </view>

      {/* 보상 카드 둘 — 읽기 전용입니다. 카드마다 한 요소로 묶어 이름을 답니다.

          **미통과에서는 아예 서지 않습니다** — 얻지 않은 것을 그리면 화면이 거짓말을
          합니다. 빈 상자도 두지 않습니다: 「자리는 있는데 비었다」와 「자리가 없다」가
          구분되지 않고, 다음 화면이 그 빈 상자를 복사합니다(ADR-0022 D1과 같은 근거). */}
      {verdict === "failed" ? null : (
        <view
          className={[
            "lesson-complete-screen-rewards",
            lessonCompleteRiseClassName(rewardMotion, "rewards"),
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <view
            className="lesson-complete-screen-reward lesson-complete-screen-reward-diamond"
            data-testid="lesson-complete-screen-reward-diamond"
            accessibility-element={true}
            accessibility-label={copy.lessonComplete.rewardDiamonds(reward.diamondAmount)}
          >
            <svg
              className="lesson-complete-screen-reward-icon"
              content={diamond}
              current-color={statChipDiamondColor}
            />
            <text className="lesson-complete-screen-reward-label">{`+ ${reward.diamondAmount} REWARD`}</text>
          </view>
          <view
            className="lesson-complete-screen-reward lesson-complete-screen-reward-grade"
            data-testid="lesson-complete-screen-reward-grade"
            accessibility-element={true}
            accessibility-label={copy.lessonComplete.grade(reward.grade)}
          >
            <svg
              className="lesson-complete-screen-reward-icon"
              content={trophy}
              current-color={color.feedback.warning}
            />
            <text className="lesson-complete-screen-reward-label">{reward.grade}</text>
          </view>
        </view>
      )}

      <view className="lesson-complete-screen-spacer" />

      {/* [고정] 액션. **나가는 수단은 어느 경우에도 하나**입니다 — 맵으로 가는 길입니다.

          미통과에서만 그 위에 `Try again`이 한 줄 더 섭니다. 그것은 나가는 수단이 아니라
          **나아가는 수단**입니다 — 뒤로 가는 것이 아니라 같은 유닛을 첫 문항부터 새로
          엽니다. 문화 학습의 `퀴즈 풀기`와 같은 갈래입니다(ADR-0022 D2 표의 아홉째 주).

          위에 두는 것은 미통과에서 사용자가 더 자주 고를 길이기 때문입니다. */}
      {verdict === "failed" && onRetry !== undefined ? (
        <view className="lesson-complete-screen-action" data-testid="lesson-complete-screen-retry">
          <Button label="Try again" variant="brand" size="xl" width="fill" bindtap={onRetry} />
        </view>
      ) : null}
      <view
        className={
          verdict === "failed"
            ? "lesson-complete-screen-action lesson-complete-screen-action-secondary"
            : "lesson-complete-screen-action"
        }
        data-testid="lesson-complete-screen-exit"
      >
        {/* 미통과에서는 `outline`입니다 — 그 화면의 주 동작은 위의 `Try again`이고, 둘 다
            꽉 찬 면이면 어느 것이 주된 길인지가 색으로만 갈립니다. 통과에서는 이것이
            유일한 버튼이라 `neutral` 그대로입니다. */}
        <Button
          label={copy.common.exitTo[exitTo]}
          variant={verdict === "failed" ? "outline" : "neutral"}
          size="xl"
          width="fill"
          bindtap={onExit}
        />
      </view>
    </view>
  );
}
