import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import diamond from "@libitums/icons/lynx/diamond";
import fire from "@libitums/icons/lynx/fire";
import tick from "@libitums/icons/lynx/tick";
import trophy from "@libitums/icons/lynx/trophy";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { StatChip, statChipDiamondColor } from "../../components/StatChip";
import { announce } from "../../lib/accessibility";
import type { AnswerResult } from "../../lib/answer-result";
import {
  lessonCompleteAnnouncement,
  lessonCompleteSubtitle,
  lessonCompleteTitle,
  lessonMistakeCount,
  lessonStreakLabel,
  type LessonReward,
} from "./lesson-complete";

import "./lesson-complete-screen.css";

// 학습 유닛을 통과하면 뜨는 화면입니다(Figma 65-466). 미통과는 이 화면이 아니라 평가
// 화면이 받습니다 — 갈림은 `render-screen.tsx`가 집니다.
//
// **DOM 순서가 곧 낭독 순서입니다** — 지표 → 판정 → 보상 → `Check`. 상태가 없습니다.
export type LessonCompleteScreenProps = {
  readonly results: readonly AnswerResult[];
  /** 상단 지표 셋입니다. 화면이 세지 않고 받습니다. */
  readonly streakDays: number;
  readonly trophyCount: number;
  readonly diamondCount: number;
  readonly reward: LessonReward;
  readonly onExit: () => void;
};

export function LessonCompleteScreen({
  results,
  streakDays,
  trophyCount,
  diamondCount,
  reward,
  onExit,
}: LessonCompleteScreenProps): ReactNode {
  const mistakeCount = lessonMistakeCount(results);

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
    announce(lessonCompleteAnnouncement(mistakeCount));
  }, [mistakeCount]);

  return (
    <view className="lesson-complete-screen" data-testid="lesson-complete-screen">
      {/* [고정] 머리 — 지표 칩 셋. 읽기 전용입니다. */}
      <view className="lesson-complete-screen-stats">
        <StatChip
          tone="streak"
          value={streakDays}
          accessibilityLabel={`연속 학습 ${streakDays}일`}
          testId="lesson-complete-screen-streak"
        />
        <StatChip
          tone="trophy"
          value={trophyCount}
          accessibilityLabel={`트로피 ${trophyCount}개`}
          testId="lesson-complete-screen-trophy"
        />
        <StatChip
          tone="diamond"
          value={diamondCount}
          accessibilityLabel={`다이아 ${diamondCount}개`}
          testId="lesson-complete-screen-diamond"
        />
      </view>

      <view className="lesson-complete-screen-spacer-top" />

      {/* 완료 표식 — 장식입니다. 판정은 아래 제목과 낭독이 말합니다. */}
      <view className="lesson-complete-screen-badge" accessibility-elements-hidden={true}>
        <svg
          className="lesson-complete-screen-badge-icon"
          content={tick}
          current-color={color.white}
        />
      </view>

      <view className="lesson-complete-screen-summary">
        <text
          className="lesson-complete-screen-title"
          data-testid="lesson-complete-screen-title"
          accessibility-traits="header"
        >
          {lessonCompleteTitle(mistakeCount)}
        </text>
        {/* 연속이 없으면(0일) 알약을 세우지 않습니다 — 「0 Day Streak」은 축하가 아닙니다. */}
        {streakDays > 0 ? (
          <view
            className="lesson-complete-screen-streak"
            data-testid="lesson-complete-screen-streak-pill"
            accessibility-element={true}
            accessibility-label={`연속 학습 ${streakDays}일`}
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

      {/* 보상 카드 둘 — 읽기 전용입니다. 카드마다 한 요소로 묶어 이름을 답니다. */}
      <view className="lesson-complete-screen-rewards">
        <view
          className="lesson-complete-screen-reward lesson-complete-screen-reward-diamond"
          data-testid="lesson-complete-screen-reward-diamond"
          accessibility-element={true}
          accessibility-label={`보상 다이아 ${reward.diamondAmount}개`}
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
          accessibility-label={`등급 ${reward.grade}`}
        >
          <svg
            className="lesson-complete-screen-reward-icon"
            content={trophy}
            current-color={color.feedback.warning}
          />
          <text className="lesson-complete-screen-reward-label">{reward.grade}</text>
        </view>
      </view>

      <view className="lesson-complete-screen-spacer" />

      {/* [고정] 액션 — 나가는 수단 하나. 목적지는 맵입니다(평가 화면의 `맵으로`와 같습니다). */}
      <view className="lesson-complete-screen-action" data-testid="lesson-complete-screen-exit">
        <Button label="Check →" variant="neutral" size="xl" width="fill" bindtap={onExit} />
      </view>
    </view>
  );
}
