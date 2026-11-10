import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { infinityHeroIcon } from "../../components/infinity-icon";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";

import "../journey-map/journey-stat-modal.css";
import "../journey-map/journey-stat-modal-motion.css";
import "./tickets.css";
import "./unlimited-ticket-modal.css";

export type UnlimitedIntroStateProps = {
  readonly onClose: () => void;
  /**
   * 시스템 뒤로가기를 이 화면이 직접 올릴지입니다(기본 켬). 채팅방 안처럼 뒤로가기 주인이 따로 있으면 끕니다 —
   * 한 겹침에 층이 둘 올라가지 않게 합니다.
   */
  readonly ownsBack?: boolean;
};

export const unlimitedIntroTestIds = {
  root: "unlimited-ticket-modal-intro",
  comingSoon: "unlimited-ticket-modal-intro-soon",
  gotIt: "unlimited-ticket-modal-intro-got-it",
} as const;

/**
 * 무료 사용자용 「무제한 소개」 판입니다(messenger-chat-1-5 spec §17 Q1 — #404 무제한 모달의 새 상태). 가진 사람의 상태 화면
 * (guest · renews · …)은 「이 계정은 모두 열림」이라 무료 사용자에게 거짓이라, 얻는 것 둘과 「Coming soon」(아직 결제 없음)을
 * 보이고 「Got it」 하나로 닫습니다. 뼈대는 무제한 모달과 같습니다(짙은 바탕 · 뒤 빛 · 큰 무한 기호).
 */
export function UnlimitedIntroState({
  onClose,
  ownsBack = true,
}: UnlimitedIntroStateProps): ReactNode {
  const copy = useUiCopy();
  const m = copy.tickets.unlimitedModal;
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const alive = useMotion() === "standard";

  const handleClose = () => {
    "background only";
    onClose();
  };
  useLayerBack(ownsBack ? handleClose : null);

  return (
    <view
      className="journey-stat-modal ticket-modal"
      data-testid={unlimitedIntroTestIds.root}
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
        <RoundButton
          icon={arrowLeft}
          size="xl"
          accessibilityLabel={copy.common.back}
          bindtap={handleClose}
        />
      </view>

      <view
        className={`ticket-modal-hero ${alive ? "journey-stat-modal-hero-enter" : "journey-stat-modal-hero-fade"}`}
        accessibility-element={true}
        accessibility-traits="header"
        accessibility-label={m.intro.title}
      >
        <svg
          className="unlimited-ticket-modal-infinity"
          content={infinityHeroIcon}
          current-color={color.brand.secondary}
        />
        <text className="journey-stat-modal-title ticket-modal-title">{m.intro.title}</text>
      </view>

      <view className="journey-stat-modal-spacer" />

      <view className="unlimited-intro-benefits">
        {[m.intro.benefitMessages, m.intro.benefitLessons].map((line) => (
          <view key={line} className="unlimited-intro-benefit">
            <svg
              className="unlimited-intro-benefit-icon"
              content={tick}
              current-color={color.brand.secondary}
              accessibility-elements-hidden={true}
            />
            <text className="unlimited-intro-benefit-text">{line}</text>
          </view>
        ))}
      </view>

      <view
        className="unlimited-intro-soon"
        data-testid={unlimitedIntroTestIds.comingSoon}
        accessibility-element={true}
        accessibility-label={`${m.intro.comingSoon}. ${m.intro.comingSoonNote}`}
      >
        <text className="unlimited-intro-soon-title">{m.intro.comingSoon}</text>
        <text className="unlimited-intro-soon-note">{m.intro.comingSoonNote}</text>
      </view>

      <view className="ticket-modal-footer unlimited-ticket-modal-footer">
        <view
          className="ticket-button unlimited-ticket-button-dark"
          data-testid={unlimitedIntroTestIds.gotIt}
          accessibility-element={true}
          accessibility-label={m.gotIt}
          accessibility-traits="button"
          bindtap={handleClose}
        >
          <text className="ticket-button-label unlimited-ticket-button-label-dark">{m.gotIt}</text>
        </view>
      </view>
    </view>
  );
}
