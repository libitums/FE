import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { infinityHeroIcon } from "../../components/infinity-icon";
import { ticketIcon } from "../../components/ticket-icon";
import type { UnlimitedPassView } from "../../lib/unlimited-pass";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { UnlimitedPassPeriod } from "./UnlimitedPassPeriod";

import "../journey-map/journey-stat-modal.css";
import "../journey-map/journey-stat-modal-motion.css";
import "./tickets.css";
import "./unlimited-ticket-modal.css";

// 무제한일 때 머리의 티켓 칩을 누르면 뜨는 전체 화면 모달입니다(ADR-0115). 티켓 모달(`TicketStatModal`)과 같은 뼈대 —
// 짙은 바탕 · 뒤로 버튼 · 큰 값과 제목 · 아래 · 문구 · 버튼 — 에서 큰 숫자가 주황 무한 기호, 충전 칸이 기간 카드,
// 「Get more tickets」가 상태별 버튼입니다. 상태는 `unlimitedPassView`가 정합니다.
//
// - guest(시험 계정): GUEST PASS 알약 · 안내 문구 · 「Got it」(닫기). 기간 카드 없음.
// - renews · ends(구독): 요금제 이름 알약(있을 때) · 기간 카드 · 「Manage subscription」.
// - ending-soon(갱신 꺼짐 · 7일 이하): 노랑 기간 카드 · 「Keep unlimited」 + 「Manage subscription」 링크.
//
// 지금은 시험 계정만 결선합니다 — 구독 판의 두 콜백은 결제가 붙을 때 이어집니다.

export type UnlimitedTicketModalProps = {
  readonly view: UnlimitedPassView;
  readonly onClose: () => void;
  /** 스토어 구독 관리로 보냅니다. 구독 판에서만 씁니다(아직 결선 없음). */
  readonly onManageSubscription?: () => void;
  /** 곧 끝남 판의 주 버튼입니다(아직 결선 없음). */
  readonly onKeepUnlimited?: () => void;
};

type ModalButtonProps = {
  readonly testId: string;
  readonly label: string;
  readonly tone: "brand" | "dark" | "link";
  readonly onTap: () => void;
};

function ModalButton({ testId, label, tone, onTap }: ModalButtonProps): ReactNode {
  const handleTap = () => {
    "background only";
    onTap();
  };
  return (
    <view
      className={`ticket-button unlimited-ticket-button-${tone}`}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={label}
      accessibility-traits="button"
      bindtap={handleTap}
    >
      <text className={`ticket-button-label unlimited-ticket-button-label-${tone}`}>{label}</text>
    </view>
  );
}

export function UnlimitedTicketModal({
  view,
  onClose,
  onManageSubscription,
  onKeepUnlimited,
}: UnlimitedTicketModalProps): ReactNode {
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const alive = useMotion() === "standard";
  const copy = useUiCopy();
  const m = copy.tickets.unlimitedModal;
  const plan = view.kind === "guest" ? m.guestPass : view.planLabel;
  const message =
    view.kind === "guest"
      ? m.guestMessage
      : view.kind === "ending-soon"
        ? m.endingMessage
        : m.activeMessage;
  const manage = () => onManageSubscription?.();

  const handleClose = () => {
    "background only";
    onClose();
  };
  // 시스템 뒤로가기 = 보이는 닫기와 같은 함수입니다. 모달이 서 있는 동안만 등록됩니다.
  useLayerBack(handleClose);

  return (
    <view
      className="journey-stat-modal ticket-modal"
      data-testid="unlimited-ticket-modal"
      data-statusbar={lightStatusBarIcons}
      event-through={false}
      style={{
        paddingTop: `${insets.top}px`,
        paddingBottom: `${insets.bottom}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <view className="unlimited-ticket-modal-glow" />
      <view className="journey-stat-modal-header">
        <view data-testid="unlimited-ticket-modal-back">
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
        accessibility-label={
          plan === null ? copy.tickets.unlimited : `${copy.tickets.unlimited}, ${plan}`
        }
      >
        <view className="journey-stat-modal-value-box">
          <svg
            className="unlimited-ticket-modal-infinity"
            content={infinityHeroIcon}
            current-color={color.brand.secondary}
          />
          <view className="ticket-modal-icon unlimited-ticket-modal-ticket">
            <svg
              className="ticket-modal-icon-art unlimited-ticket-modal-ticket-art"
              content={ticketIcon}
              current-color={color.brand.primary}
            />
          </view>
        </view>
        <text
          className="journey-stat-modal-title ticket-modal-title"
          data-testid="unlimited-ticket-modal-title"
        >
          {copy.tickets.unlimited}
        </text>
        {plan === null ? null : (
          <view
            className={`unlimited-ticket-modal-plan unlimited-ticket-modal-plan-${view.kind === "guest" ? "guest" : "paid"}`}
            data-testid="unlimited-ticket-modal-plan"
          >
            <text className="unlimited-ticket-modal-plan-label">{plan}</text>
          </view>
        )}
      </view>

      <view className="journey-stat-modal-spacer" />

      {view.kind === "guest" ? null : <UnlimitedPassPeriod view={view} />}

      <text className="ticket-modal-message" data-testid="unlimited-ticket-modal-message">
        {message}
      </text>

      <view className="ticket-modal-footer unlimited-ticket-modal-footer">
        {view.kind === "guest" ? (
          <ModalButton
            testId="unlimited-ticket-modal-got-it"
            label={m.gotIt}
            tone="dark"
            onTap={onClose}
          />
        ) : view.kind === "ending-soon" ? (
          <>
            <ModalButton
              testId="unlimited-ticket-modal-keep"
              label={m.keep}
              tone="brand"
              onTap={() => onKeepUnlimited?.()}
            />
            <ModalButton
              testId="unlimited-ticket-modal-manage"
              label={m.manage}
              tone="link"
              onTap={manage}
            />
          </>
        ) : (
          <ModalButton
            testId="unlimited-ticket-modal-manage"
            label={m.manage}
            tone="dark"
            onTap={manage}
          />
        )}
      </view>
    </view>
  );
}
