import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { ticketIcon } from "../../components/ticket-icon";
import { ticketCapacity, ticketClock } from "../../lib/learning-tickets";
import type { TicketSlot, TicketStatus } from "../../lib/learning-tickets";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { TicketMoreAction } from "./TicketMoreAction";
import type { TicketMoreResult } from "./tickets.contract";

import "../journey-map/journey-stat-modal.css";
import "../journey-map/journey-stat-modal-motion.css";
import "./tickets.css";

// 머리의 티켓 칩을 누르면 맵 위에 뜨는 전체 화면 모달입니다(시안 E1). 연속 학습 · 트로피 모달
// (`JourneyStatModal`)과 같은 뼈대 — 짙은 바탕 · 뒤로 버튼 · 큰 숫자와 제목 · 아래 칸 줄 · 문구 · 버튼 — 를 쓰고,
// 칸 줄이 티켓 셋이며 버튼이 「Get more tickets」입니다. 남은 시간은 부르는 쪽이 1초마다 새 `status`로 넘깁니다.

export type TicketStatModalProps = {
  readonly status: TicketStatus;
  readonly more: TicketMoreResult;
  readonly onGetMore: () => void;
  readonly onClose: () => void;
};

function slotTime(slot: TicketSlot, readyLabel: string): string {
  return slot.kind === "ready" ? readyLabel : ticketClock(slot.readyInMs, false);
}

export function TicketStatModal({
  status,
  more,
  onGetMore,
  onClose,
}: TicketStatModalProps): ReactNode {
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const alive = useMotion() === "standard";
  const copy = useUiCopy();
  const nextClock = status.nextInMs === null ? null : ticketClock(status.nextInMs, true);

  const handleClose = () => {
    "background only";
    onClose();
  };
  // 시스템 뒤로가기 = 보이는 닫기와 같은 함수입니다. 모달이 서 있는 동안만 등록됩니다.
  useLayerBack(handleClose);

  return (
    <view
      className="journey-stat-modal ticket-modal"
      data-testid="ticket-modal"
      data-statusbar={lightStatusBarIcons}
      event-through={false}
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <view className="journey-stat-modal-header">
        <view data-testid="ticket-modal-back">
          <RoundButton
            icon={arrowLeft}
            size="xl"
            accessibilityLabel={copy.common.exitTo.journey}
            bindtap={handleClose}
          />
        </view>
      </view>

      <view
        className={`ticket-modal-hero ${alive ? "journey-stat-modal-hero-enter" : "journey-stat-modal-hero-fade"}`}
        accessibility-element={true}
        accessibility-traits="header"
        accessibility-label={copy.tickets.ticketsLeft(status.available)}
      >
        <view className="journey-stat-modal-value-box">
          <text
            className="journey-stat-modal-value ticket-modal-value"
            data-testid="ticket-modal-value"
          >
            {String(status.available)}
          </text>
          <view className="ticket-modal-icon">
            <svg
              className="ticket-modal-icon-art"
              content={ticketIcon}
              current-color={color.brand.primary}
            />
          </view>
        </view>
        <text
          className="journey-stat-modal-title ticket-modal-title"
          data-testid="ticket-modal-title"
        >
          {copy.tickets.modal.title(status.available)}
        </text>
        {nextClock === null ? null : (
          <view className="ticket-modal-next" data-testid="ticket-modal-next">
            <text className="ticket-modal-next-label">
              {`${copy.tickets.modal.nextTicketIn} `}
              <text className="ticket-modal-next-clock">{nextClock}</text>
            </text>
          </view>
        )}
      </view>

      <view className="journey-stat-modal-spacer" />

      {/* 칸 셋 — 왼쪽부터 지금 차는 칸 · 그 뒤에 찰 칸 · 찬 칸입니다. 줄 전체를 한 문장으로 읽습니다. */}
      <view
        className="ticket-modal-slots"
        data-testid="ticket-modal-slots"
        accessibility-element={true}
        accessibility-label={copy.tickets.modal.slotsLabel(
          status.available,
          ticketCapacity,
          nextClock,
        )}
      >
        {status.slots.map((slot, index) => (
          <view className="ticket-modal-slot-column" key={index}>
            <view
              className={`ticket-slot ticket-slot-${slot.kind}`}
              data-testid={`ticket-modal-slot-${String(index)}`}
              data-kind={slot.kind}
            >
              {slot.kind === "charging" ? (
                <view
                  className="ticket-slot-fill"
                  data-testid={`ticket-modal-slot-fill-${String(index)}`}
                  style={{ width: `${String(Math.round(slot.progress * 100))}%` }}
                />
              ) : null}
            </view>
            <text
              className={`ticket-slot-time ticket-slot-time-${slot.kind}`}
              data-testid={`ticket-modal-slot-time-${String(index)}`}
            >
              {slotTime(slot, copy.tickets.modal.slotReady)}
            </text>
          </view>
        ))}
      </view>

      <text className="ticket-modal-message">{copy.tickets.modal.message}</text>

      <view className="ticket-modal-footer">
        <TicketMoreAction
          testIdPrefix="ticket-modal"
          more={more}
          onGetMore={onGetMore}
          tone="dark"
        />
      </view>
    </view>
  );
}
