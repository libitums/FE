import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { ticketIcon } from "../../components/ticket-icon";
import { ticketClock } from "../../lib/learning-tickets";
import type { TicketStatus } from "../../lib/learning-tickets";
import { playSound } from "../../lib/sound-effects";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { TicketMoreAction } from "./TicketMoreAction";
import { ticketRingSvg } from "./ticket-ring";
import type { TicketMoreResult } from "./tickets.contract";

import "./tickets.css";

// 티켓이 없는데 새 레슨을 열려 하면 화면 가운데 뜨는 대화상자입니다(시안 E6m). ui-lynx `Dialog`는 제목 · 설명 ·
// 버튼만 받아 원형 카운트다운을 넣을 수 없어, 같은 딤(`Overlay`) 위에 앱 쪽 상자를 짓습니다. 「Get more tickets」로
// 한 장을 받으면 그 자리에 「Start lesson」이 서서 막혔던 레슨을 바로 엽니다.

export type OutOfTicketsDialogProps = {
  readonly status: TicketStatus;
  readonly more: TicketMoreResult;
  readonly onGetMore: () => void;
  readonly onStartLesson: () => void;
  readonly onClose: () => void;
};

export function OutOfTicketsDialog({
  status,
  more,
  onGetMore,
  onStartLesson,
  onClose,
}: OutOfTicketsDialogProps): ReactNode {
  const copy = useUiCopy().tickets;
  const canStart = status.available > 0;
  const charging = status.slots.find((slot) => slot.kind === "charging");
  const clock = ticketClock(status.nextInMs ?? 0, false);

  const handleClose = () => {
    "background only";
    onClose();
  };
  const handleStart = () => {
    "background only";
    playSound("button");
    onStartLesson();
  };
  useLayerBack(handleClose);

  return (
    <view className="ticket-dialog" data-testid="out-of-tickets" event-through={false}>
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view className="ticket-dialog-container" accessibility-role-description="dialog">
        <text className="ticket-dialog-title" accessibility-traits="header">
          {copy.outOfTickets.title}
        </text>
        <view
          className="ticket-ring"
          data-testid="out-of-tickets-ring"
          data-progress={String(charging?.kind === "charging" ? charging.progress : 1)}
        >
          <svg
            className="ticket-ring-art"
            content={ticketRingSvg(status.slots, {
              track: color.gray[300],
              fill: color.brand.primary,
            })}
          />
          <view
            className="ticket-ring-center"
            data-testid="out-of-tickets-clock"
            accessibility-element={true}
            accessibility-label={copy.outOfTickets.clockLabel(clock)}
          >
            <svg
              className="ticket-ring-icon"
              content={ticketIcon}
              current-color={color.brand.primary}
            />
            <text className="ticket-ring-clock">{clock}</text>
            <text className="ticket-ring-caption">{copy.outOfTickets.untilNext}</text>
          </view>
        </view>
        <text className="ticket-dialog-message">{copy.outOfTickets.message}</text>
        <view className="ticket-dialog-actions">
          {canStart ? (
            <view
              className="ticket-button ticket-button-brand"
              data-testid="out-of-tickets-start"
              accessibility-element={true}
              accessibility-label={copy.outOfTickets.startLesson}
              accessibility-traits="button"
              bindtap={handleStart}
            >
              <text className="ticket-button-label ticket-button-label-brand">
                {copy.outOfTickets.startLesson}
              </text>
            </view>
          ) : null}
          <TicketMoreAction
            testIdPrefix="out-of-tickets"
            more={more}
            onGetMore={onGetMore}
            tone="light"
            hideButton={canStart}
          />
          <view
            className="ticket-button ticket-button-text"
            data-testid="out-of-tickets-back"
            accessibility-element={true}
            accessibility-label={copy.outOfTickets.backToMap}
            accessibility-traits="button"
            bindtap={handleClose}
          >
            <text className="ticket-button-label ticket-button-label-text">
              {copy.outOfTickets.backToMap}
            </text>
          </view>
        </view>
      </view>
    </view>
  );
}
