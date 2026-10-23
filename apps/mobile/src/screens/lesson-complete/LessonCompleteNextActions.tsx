import type { ReactNode } from "@lynx-js/react";

import map from "@libitums/icons/lynx/map";
import fivePointedStar from "@libitums/icons/lynx/five-pointed-star";
import { color } from "@libitums/design-tokens";

import { ticketIcon } from "../../components/ticket-icon";
import { useUiCopy } from "../../lib/ui-copy";

import "./lesson-complete-next.css";
import "../tickets/tickets.css";

/** 결과 화면의 「다음 학습」입니다 — 통과했고 같은 에피소드에 다음 유닛이 있을 때만 섭니다. */
export type LessonCompleteNext = {
  /** 다음이 레슨 · 문화면 `lesson`(「Next lesson」), 최종 테스트면 `final`(별 + 「Final test」). */
  readonly kind: "lesson" | "final";
  /** 시작하면 쓰는 티켓 수 — 1이면 버튼에 티켓 태그가 섭니다. 이미 연 · 끝낸 유닛은 0. */
  readonly ticketCost: 0 | 1;
  readonly onStart: () => void;
};

export type LessonCompleteNextActionsProps = {
  readonly next: LessonCompleteNext;
  /** 맵으로 가는 길 — 왼쪽 지도 버튼의 이름이자 동작입니다. */
  readonly exitLabel: string;
  readonly onExit: () => void;
};

// 시안 D(2026-10-23): 왼쪽 지도 버튼 + 남은 폭의 주황 버튼. 눌림은 색으로만 보입니다 — 위치를 옮기는 눌림은
// Android Lynx가 누르는 사이 탭을 취소합니다(유닛 표식에서 겪었습니다).
export function LessonCompleteNextActions({
  next,
  exitLabel,
  onExit,
}: LessonCompleteNextActionsProps): ReactNode {
  const copy = useUiCopy();
  const label =
    next.kind === "final" ? copy.lessonComplete.nextFinal : copy.lessonComplete.nextLesson;
  const handleExit = () => {
    "background only";
    onExit();
  };
  const handleStart = () => {
    "background only";
    next.onStart();
  };
  return (
    <view className="lesson-complete-next" data-testid="lesson-complete-screen-next-actions">
      <view
        className="lesson-complete-next-map"
        data-testid="lesson-complete-screen-exit"
        accessibility-element={true}
        accessibility-label={exitLabel}
        accessibility-traits="button"
        bindtap={handleExit}
      >
        <svg
          className="lesson-complete-next-map-icon"
          content={map}
          current-color={color.fg["neutral-muted"]}
        />
      </view>
      <view
        className="lesson-complete-next-start"
        data-testid="lesson-complete-screen-next"
        accessibility-element={true}
        accessibility-label={next.ticketCost === 1 ? `${label}. ${copy.tickets.startCost}` : label}
        accessibility-traits="button"
        bindtap={handleStart}
      >
        {next.kind === "final" ? (
          <svg
            className="lesson-complete-next-star"
            content={fivePointedStar}
            current-color={color.white}
          />
        ) : null}
        <text className="lesson-complete-next-label">{label}</text>
        {next.ticketCost === 1 ? (
          <view className="ticket-cost-tag" data-testid="lesson-complete-screen-next-ticket">
            <svg className="ticket-cost-icon" content={ticketIcon} current-color={color.white} />
            <text className="ticket-cost-label">1</text>
          </view>
        ) : null}
      </view>
    </view>
  );
}
