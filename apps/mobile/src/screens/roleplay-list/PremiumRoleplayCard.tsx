import type { ReactNode } from "@lynx-js/react";
import crown from "@libitums/icons/lynx/crown";
import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { premiumRoleplayAccessibilityLabel } from "./roleplay-list";
import type { PremiumRoleplayCardProps } from "./roleplay-list.contract";

import "./premium-roleplay-card.css";

/**
 * 결제 롤플레이 하나의 카드입니다. 디자인이 없어 기본 카드(`RoleplayCard`)의 치수를
 * 그대로 쓰고, 눈에 띄어야 하는 자리라 면을 브랜드 색으로 칠하고 위쪽에 배지를 답니다.
 *
 * 막힌 까닭 둘을 다르게 그립니다. 에피소드 잠김은 기본 카드와 같은 어두운 막과
 * 자물쇠이고 누를 수 없습니다. 결제 잠김은 막 없이 카드가 온전히 보이고 누를 수
 * 있습니다 — 누르면 위가 안내를 띄웁니다.
 */
export function PremiumRoleplayCard({
  item,
  lock: lockKind,
  onSelect,
}: PremiumRoleplayCardProps): ReactNode {
  const copy = useUiCopy();
  const episodeLocked = lockKind === "episode";

  const handleTap = () => {
    "background only";
    onSelect(item);
  };

  return (
    <view
      className="premium-roleplay-card"
      data-testid={`roleplay-premium-card-${item.id}`}
      data-lock={lockKind}
      accessibility-element={true}
      accessibility-traits={episodeLocked ? "none" : "button"}
      accessibility-label={premiumRoleplayAccessibilityLabel(item, lockKind, copy)}
      bindtap={episodeLocked ? undefined : handleTap}
    >
      <view className="premium-roleplay-card-shade" />
      {/* 배지 — 순수 표식입니다. 같은 뜻을 카드의 이름이 이미 말합니다. */}
      <view
        className="premium-roleplay-card-badge"
        data-testid={`roleplay-premium-card-badge-${item.id}`}
        accessibility-elements-hidden={true}
      >
        <svg
          className="premium-roleplay-card-badge-icon"
          content={crown}
          current-color={color.brand.primary}
        />
        <text className="premium-roleplay-card-badge-label">PLUS</text>
      </view>
      <view className="premium-roleplay-card-text">
        <text
          className="premium-roleplay-card-title"
          data-testid={`roleplay-premium-card-title-${item.id}`}
          text-maxline="2"
        >
          {item.title}
        </text>
        <text
          className="premium-roleplay-card-situation"
          data-testid={`roleplay-premium-card-situation-${item.id}`}
          text-maxline="2"
        >
          {item.situation}
        </text>
      </view>
      {episodeLocked ? (
        <view
          className="premium-roleplay-card-lock"
          data-testid={`roleplay-premium-card-lock-${item.id}`}
          accessibility-elements-hidden={true}
        >
          <svg
            className="premium-roleplay-card-lock-icon"
            content={lock}
            current-color={color.white}
          />
        </view>
      ) : null}
    </view>
  );
}
