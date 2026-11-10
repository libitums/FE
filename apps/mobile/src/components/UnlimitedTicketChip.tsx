import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import { infinityIcon } from "./infinity-icon";
import { statChipClassName } from "./stat-chip-class";
import type { StatChipHeight } from "./stat-chip-class";
import { ticketIcon } from "./ticket-icon";

import "./stat-chip.css";
import "./unlimited-ticket-chip.css";
import "./unlimited-ticket-chip-motion.css";

// 무제한 티켓 칩입니다(ADR-0115 · 시안 O1 「입체 주황 면」). 머리 바와 결과 화면이 일반 티켓 칩 자리에 씁니다.
//
// 크기 · 여백은 지표 칩(`stat-chip`)과 같아 줄 배치가 바뀌지 않습니다. 면만 주황 세 단 그라데이션이고, 위쪽 빛 · 아래
// 짙은 단 · 안쪽 흰 테가 앱의 납작한 주황 버튼과 갈라 줍니다. 내용은 흰 티켓 아이콘 + 그린 무한 기호이고 숫자는
// 없습니다 — 이름(`accessibilityLabel`)이 「Unlimited tickets」를 말합니다.
//
// 빛 훑기는 몇 초에 한 번 지나가는 반복이고, 움직임 줄이기에서는 요소가 서지 않습니다. `onTap`이 있으면 버튼입니다.

export type UnlimitedTicketChipProps = {
  readonly testId: string;
  readonly accessibilityLabel: string;
  /** 머리 바는 `touch-target`(44), 결과 화면은 `hug`(40)입니다. 머리 바만 그림자를 띄웁니다. */
  readonly height: StatChipHeight;
  readonly onTap?: () => void;
};

export function UnlimitedTicketChip({
  testId,
  accessibilityLabel,
  height,
  onTap,
}: UnlimitedTicketChipProps): ReactNode {
  const alive = useMotion() === "standard";
  const handleTap = () => {
    "background only";
    onTap?.();
  };
  const raised = height === "touch-target" ? " unlimited-ticket-chip-raised" : "";

  return (
    <view
      className={`${statChipClassName("none", height)} unlimited-ticket-chip${raised}`}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={accessibilityLabel}
      accessibility-traits={onTap ? "button" : undefined}
      bindtap={onTap ? handleTap : undefined}
    >
      <view className="unlimited-ticket-chip-gloss" />
      <view className="unlimited-ticket-chip-base" />
      {alive ? (
        <view className="unlimited-ticket-chip-shine" data-testid={`${testId}-shine`}>
          <view className="unlimited-ticket-chip-shine-band" />
        </view>
      ) : null}
      <svg className="stat-chip-icon" content={ticketIcon} current-color={color.white} />
      <svg
        className="stat-chip-icon"
        data-testid={`${testId}-infinity`}
        content={infinityIcon}
        current-color={color.white}
      />
    </view>
  );
}
