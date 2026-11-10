import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import fire from "@libitums/icons/lynx/fire";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";

import { ticketIcon } from "../../components/ticket-icon";
import { announce } from "../../lib/accessibility";
import { playSound } from "../../lib/sound-effects";
import { useScreenBack } from "../../lib/use-back-handler";
import {
  lessonCompleteAnnouncement,
  lessonCompleteSubtitle,
  lessonCompleteTitle,
  lessonMistakeCount,
} from "./lesson-complete";
import {
  lessonCompleteChipBumpDelayMs,
  lessonCompleteCoinFlightDelayMs,
  lessonCompleteRiseClassName,
  rewardMotionFor,
} from "./lesson-complete-reward";
import { coinFlightValueAt } from "../../lib/coins";
import { LessonCompleteCoinFlight } from "./LessonCompleteCoinFlight";
import { LessonCompleteRewards } from "./LessonCompleteRewards";
import { LessonCompleteBadge } from "./LessonCompleteBadge";
import {
  LessonCompleteReviewSummary,
  lessonReviewAnnouncement,
  lessonReviewSubtitle,
  lessonReviewTitle,
} from "./LessonCompleteReviewSummary";
import { LessonCompleteNextActions } from "./LessonCompleteNextActions";
import { LessonCompleteStats } from "./LessonCompleteStats";
import { LessonCompleteUnlimitedLine } from "./LessonCompleteUnlimitedLine";
import { noStatBumps } from "../../lib/stat-bump";

import type { LessonCompleteScreenProps } from "./lesson-complete-screen-props";

import "./lesson-complete-screen.css";
import "../tickets/tickets.css";

export type { LessonCompleteScreenProps } from "./lesson-complete-screen-props";

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

export function LessonCompleteScreen({
  results,
  skippedCount,
  verdict,
  streakDays,
  trophyCount,
  reward,
  exitTo = "journey",
  continuesStory = false,
  onExit,
  onRetry,
  statBumps = noStatBumps,
  onStatBumped,
  ticketsLeft,
  ticketChip,
  coinCount,
  next,
  review,
}: LessonCompleteScreenProps): ReactNode {
  const copy = useUiCopy();
  const lc = copy.lessonComplete;
  const toStory = continuesStory && verdict !== "failed"; // 미통과면 이야기로 이어지지 않습니다(방어).
  const exitLabel = toStory ? lc.continueStory : copy.common.exitTo[exitTo];
  // `reward` prop(재화)과 이름이 겹치지 않도록 배지 모션은 `rewardMotion`으로 둡니다.
  const rewardMotion = rewardMotionFor(verdict, useMotion());
  const chipBumpDelayMs = lessonCompleteChipBumpDelayMs(rewardMotion);
  // 시스템 뒤로가기 = 하단 나가기와 같은 함수입니다(미통과의 `Try again`이 아닙니다).
  useScreenBack(onExit);
  const mistakeCount = lessonMistakeCount(results);
  // 엽전(ADR-0116) — 받은 엽전이 있으면 성취 모션에서는 하나씩 날아 칩이 1씩 오르고, 줄이기에서는 칩이 한 번 바뀝니다.
  const coinReward = verdict === "failed" ? 0 : reward.coinAmount;
  const coinsFly = coinCount !== undefined && coinReward > 0 && rewardMotion === "expressive";
  // 받기 전 엽전 수입니다. 보유가 아직 이번 보상을 담지 못했어도 칩이 음수에서 오르지 않게 0에서 멈춥니다.
  const coinStart = Math.max(0, (coinCount ?? 0) - coinReward);
  const [coinsLanded, setCoinsLanded] = useState(0);
  const [coinBumped, setCoinBumped] = useState(false);

  useEffect(() => {
    playSound(verdict === "failed" ? "failed_lesson" : "pass_lesson");
  }, [verdict]);

  // 이 화면이 사는 동안 정확히 한 번 발화합니다(ADR-0016 D11-2).
  // **dep이 `mistakeCount`입니다.** 빈 배열 + `eslint-disable`로 두면 「마운트 때 한 번」이
  // 규칙이 아니라 린트를 끈 결과가 되고, 나중에 이 값이 실제로 갈리는 날 발화가 조용히
  // 빠집니다. 값을 적어 두면 그날 `tsc`도 린트도 아닌 **화면이** 답합니다.
  //
  // 그래도 두 번 울리지 않습니다: `results`는 이 화면 인스턴스의 것이고 라우트에 실려
  // 와서 `back`과 함께 죽습니다(`nav-state.ts`) — 사는 동안 갈리지 않으므로 파생값인
  // `mistakeCount`도 갈리지 않습니다. 듣기 화면이 `[complete]`를 dep으로 두고 같은
  // 근거를 적는 것과 같은 자리입니다. `copy`는 언어별로 한 번 지은 같은 객체라 화면이 사는 동안 갈리지 않습니다.
  useEffect(() => {
    announce(
      review === undefined
        ? lessonCompleteAnnouncement(mistakeCount, verdict, skippedCount, copy)
        : lessonReviewAnnouncement(review, verdict, copy),
    );
  }, [mistakeCount, verdict, skippedCount, review, copy]);

  return (
    <view className="lesson-complete-screen" data-testid="lesson-complete-screen">
      <LessonCompleteStats
        streakDays={streakDays}
        trophyCount={trophyCount}
        ticketChip={ticketChip}
        coinChip={
          coinCount === undefined
            ? undefined
            : {
                count: coinCount,
                shown: coinsFly ? coinFlightValueAt(coinStart, coinsLanded, coinReward) : coinCount,
                bumpFrom:
                  rewardMotion === "fade" && coinReward > 0 && !coinBumped ? coinStart : null,
                onBumped: () => setCoinBumped(true),
                // 아이콘은 마지막 엽전이 닿을 때 한 번만 튑니다 — 닿을 때마다(50 ms 간격) 다시 튀면 떨림으로 보입니다.
                pulseKey: coinsFly && coinsLanded >= coinReward ? 1 : 0,
              }
        }
        statBumps={statBumps}
        bumpDelayMs={chipBumpDelayMs}
        onStatBumped={onStatBumped}
      />

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
          id="lesson-complete-screen-title"
          data-testid="lesson-complete-screen-title"
          accessibility-element={true}
          accessibility-traits="header"
        >
          {review === undefined
            ? lessonCompleteTitle(mistakeCount, verdict, skippedCount, copy)
            : lessonReviewTitle(verdict, copy)}
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
              {lc.streakLabel(streakDays)}
            </text>
          </view>
        ) : null}
        <text
          className="lesson-complete-screen-subtitle"
          data-testid="lesson-complete-screen-subtitle"
        >
          {review === undefined
            ? lessonCompleteSubtitle(mistakeCount, copy)
            : lessonReviewSubtitle(review, copy)}
        </text>
        {review === undefined ? null : (
          <LessonCompleteReviewSummary review={review} verdict={verdict} />
        )}
      </view>

      {/* 보상 카드 줄(엽전 · 등급) — **미통과에서는 아예 서지 않습니다**. 얻지 않은 것을 그리면 화면이 거짓말을
          합니다. 빈 상자도 두지 않습니다(ADR-0022 D1과 같은 근거). */}
      {verdict === "failed" ? null : (
        <LessonCompleteRewards reward={reward} rewardMotion={rewardMotion} />
      )}

      {/* 무제한이면 남은 장수 줄 자리에 「No ticket used · Unlimited」 알약입니다(ADR-0115). */}
      {ticketChip?.unlimited === true ? <LessonCompleteUnlimitedLine /> : null}
      {ticketsLeft === undefined ? null : (
        <view
          className="ticket-left-line"
          data-testid="lesson-complete-tickets"
          accessibility-element={true}
          accessibility-label={copy.tickets.ticketsLeft(ticketsLeft)}
        >
          <svg
            className="ticket-left-icon"
            content={ticketIcon}
            current-color={color.brand.primary}
          />
          <text className="ticket-left-label">{copy.tickets.ticketsLeft(ticketsLeft)}</text>
        </view>
      )}

      <view className="lesson-complete-screen-spacer" />

      {coinsFly ? (
        <LessonCompleteCoinFlight
          reward={coinReward}
          delayMs={lessonCompleteCoinFlightDelayMs(rewardMotion)}
          onLanded={setCoinsLanded}
        />
      ) : null}

      {/* [고정] 액션. **나가는 수단은 어느 경우에도 하나**입니다 — 맵(또는 이어지는 이야기)으로 가는 길입니다.
          미통과에서만 그 위에 `Try again`이 한 줄 더 섭니다. 그것은 나가는 수단이 아니라
          **나아가는 수단**입니다 — 뒤로 가는 것이 아니라 같은 유닛을 첫 문항부터 새로
          엽니다. 문화 학습의 `퀴즈 풀기`와 같은 갈래입니다(ADR-0022 D2 표의 아홉째 주).

          위에 두는 것은 미통과에서 사용자가 더 자주 고를 길이기 때문입니다. */}
      {verdict === "failed" && onRetry !== undefined ? (
        <view className="lesson-complete-screen-action" data-testid="lesson-complete-screen-retry">
          <Button label={lc.tryAgain} variant="brand" size="xl" width="fill" bindtap={onRetry} />
        </view>
      ) : null}
      {verdict !== "failed" && next !== undefined ? (
        <LessonCompleteNextActions next={next} exitLabel={exitLabel} onExit={onExit} />
      ) : (
        <view
          className={
            verdict === "failed"
              ? "lesson-complete-screen-action lesson-complete-screen-action-secondary"
              : "lesson-complete-screen-action"
          }
          data-testid="lesson-complete-screen-exit"
        >
          {/* 미통과에서는 `outline`입니다 — 주 동작은 위의 `Try again`이고, 둘 다 꽉 찬 면이면 주된 길이
              색으로만 갈립니다. 다음 학습이 없는 통과에서는 이것이 유일한 버튼이라 `neutral`입니다. */}
          <Button
            label={exitLabel}
            variant={verdict === "failed" ? "outline" : "neutral"}
            size="xl"
            width="fill"
            bindtap={onExit}
          />
        </view>
      )}
    </view>
  );
}
