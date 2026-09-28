import { useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsGroup } from "@libitums/ui-lynx/settings-cell";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import {
  bonusSummary,
  findGemPack,
  formatGemCount,
  formatPrice,
  formatPricePerGem,
  gemPacks,
  initialGemPackId,
  packCaption,
  totalGemsOf,
  type GemPack,
  type GemPackId,
} from "./gem-purchase";
import { gemIcon } from "./gem-icon";

import "./gem-purchase-screen.css";

// 상단 바의 젬 칩을 누르면 뜨는 구매 화면입니다(Figma 597-992). 지표 모달과 같은
// 겹침 레이어라 셸 밖에 떠 바텀 네비게이션까지 덮습니다 — 화면 전환(`Nav`)이 아닙니다.
// 문구는 디자인 표기(영문) 그대로입니다.
//
// 디자인에는 닫는 수단이 없습니다. 레이어가 화면 전체를 덮으므로 나갈 길이 없으면
// 갇히는 화면이 됩니다 — 지표 모달과 같은 자리(왼쪽 위)에 원형 닫기 버튼을 둡니다.

export type GemPurchaseScreenProps = {
  /** 지금 가진 젬 수입니다. */
  readonly gemBalance: number;
  /** `Pay`를 누르면 고른 팩을 올립니다. 결제와 적립은 부르는 쪽이 집니다. */
  readonly onPurchase: (pack: GemPack) => void;
  /** 결제 수단 줄을 누르면 부릅니다. */
  readonly onChangePaymentMethod: () => void;
  readonly onClose: () => void;
};

// 결제 수단은 결제 연동이 없어 디자인 표기를 그대로 적어 둡니다.
const paymentMethod = { title: "Visa •••• 4242", description: "Default payment method" };

const assurances = ["Secure payment", "Instant delivery", "VAT included"] as const;

export function GemPurchaseScreen({
  gemBalance,
  onPurchase,
  onChangePaymentMethod,
  onClose,
}: GemPurchaseScreenProps): ReactNode {
  // 이 레이어는 셸 밖(`position: fixed`)이라 셸의 safe area 여백을 받지 못합니다 —
  // 지표 모달과 같이 스스로 읽습니다(lib/safe-area.ts).
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [selectedId, setSelectedId] = useState<GemPackId>(initialGemPackId);
  const selected = findGemPack(selectedId);
  const bonus = bonusSummary(selected);

  const handleClose = () => {
    "background only";
    onClose();
  };
  const handlePay = () => {
    "background only";
    onPurchase(selected);
  };

  return (
    <view
      className="gem-purchase-screen"
      data-testid="gem-purchase-screen"
      // 뒤쪽 화면으로 가는 탭을 가로챕니다 — 레이어가 떠 있는 동안 뒤는 조작 대상이 아닙니다.
      event-through={false}
      style={{
        paddingTop: `${insets.top}px`,
        paddingLeft: `${insets.left}px`,
        paddingRight: `${insets.right}px`,
      }}
    >
      <view className="gem-purchase-screen-close" data-testid="gem-purchase-screen-close">
        <RoundButton icon={cross} size="l" accessibilityLabel="닫기" bindtap={handleClose} />
      </view>
      <scroll-view
        className="gem-purchase-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        <view className="gem-purchase-screen-body">
          <view className="gem-purchase-screen-head">
            <text
              className="gem-purchase-screen-title"
              accessibility-element={true}
              accessibility-traits="header"
            >
              Buy Gems
            </text>
            <view
              className="gem-purchase-screen-balance"
              data-testid="gem-purchase-screen-balance"
              accessibility-element={true}
              accessibility-label={`보유 젬 ${formatGemCount(gemBalance)}개`}
            >
              <svg className="gem-purchase-screen-gem" content={gemIcon} />
              <view className="gem-purchase-screen-balance-text">
                <text className="gem-purchase-screen-balance-label">Gem balance</text>
                <text
                  className="gem-purchase-screen-balance-value"
                  data-testid="gem-purchase-screen-balance-value"
                >
                  {formatGemCount(gemBalance)}
                </text>
              </view>
            </view>
          </view>

          <view className="gem-purchase-screen-section">
            <view className="gem-purchase-screen-section-head">
              <view className="gem-purchase-screen-section-titles">
                <text className="gem-purchase-screen-section-title" accessibility-traits="header">
                  Choose a gem pack
                </text>
                <text className="gem-purchase-screen-section-caption">
                  Pick the amount that works for you.
                </text>
              </view>
              <text className="gem-purchase-screen-member-bonus">Member bonus applied</text>
            </view>

            <view className="gem-purchase-screen-packs">
              {gemPacks.map((pack) => (
                <GemPackCard
                  key={pack.id}
                  pack={pack}
                  selected={pack.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </view>

            <view className="gem-purchase-screen-assurances">
              {assurances.map((label) => (
                <view className="gem-purchase-screen-assurance" key={label}>
                  <text className="gem-purchase-screen-assurance-tick">✓</text>
                  <text className="gem-purchase-screen-assurance-label">{label}</text>
                </view>
              ))}
            </view>
          </view>

          <view className="gem-purchase-screen-summary" data-testid="gem-purchase-screen-summary">
            <text className="gem-purchase-screen-summary-title" accessibility-traits="header">
              Order summary
            </text>
            <view className="gem-purchase-screen-summary-total-gems">
              <view className="gem-purchase-screen-gem-box">
                <svg className="gem-purchase-screen-gem" content={gemIcon} />
              </view>
              <view className="gem-purchase-screen-summary-gems-text">
                <text className="gem-purchase-screen-summary-gems-label">Total gems</text>
                <text
                  className="gem-purchase-screen-summary-gems-value"
                  data-testid="gem-purchase-screen-total-gems"
                >
                  {`${formatGemCount(totalGemsOf(selected))} GEM`}
                </text>
                {bonus === undefined ? null : (
                  <text
                    className="gem-purchase-screen-summary-bonus"
                    data-testid="gem-purchase-screen-bonus"
                  >
                    {bonus}
                  </text>
                )}
              </view>
            </view>
            <view className="gem-purchase-screen-payment-method">
              <SettingsGroup
                accessibilityLabel="결제 수단"
                items={[
                  {
                    id: "payment-method",
                    trailing: "navigation",
                    title: paymentMethod.title,
                    description: paymentMethod.description,
                    onNavigate: onChangePaymentMethod,
                  },
                ]}
              />
            </view>
            <view className="gem-purchase-screen-total">
              <text className="gem-purchase-screen-total-label">Total</text>
              <text
                className="gem-purchase-screen-total-value"
                data-testid="gem-purchase-screen-total-price"
              >
                {formatPrice(selected.priceCents)}
              </text>
            </view>
            <view className="gem-purchase-screen-pay" data-testid="gem-purchase-screen-pay">
              <Button
                label={`Pay ${formatPrice(selected.priceCents)}`}
                variant="neutral"
                size="l"
                width="fill"
                bindtap={handlePay}
              />
            </view>
            <text className="gem-purchase-screen-terms">
              By completing this purchase, you agree to our purchase terms and refund policy.
            </text>
          </view>
          {/* 홈 인디케이터 몫의 여백입니다 — 레이어가 화면 바닥까지 깔리므로 마지막 줄이
              그 뒤에 숨지 않게 스크롤 끝에 띄웁니다. */}
          <view style={{ height: `${insets.bottom}px` }} />
        </view>
      </scroll-view>
    </view>
  );
}

type GemPackCardProps = {
  readonly pack: GemPack;
  readonly selected: boolean;
  readonly onSelect: (id: GemPackId) => void;
};

// 팩 카드 하나입니다 — 카드 전체가 한 조작 단위(고르기)이고, 오른쪽 아래 동그라미는
// 고른 상태를 보이는 표식일 뿐 따로 누르는 자리가 아닙니다.
function GemPackCard({ pack, selected, onSelect }: GemPackCardProps): ReactNode {
  const handleTap = () => {
    "background only";
    onSelect(pack.id);
  };
  const spoken = [
    `${formatGemCount(pack.gems)} 젬`,
    packCaption(pack),
    formatPrice(pack.priceCents),
    pack.badge,
    selected ? "선택됨" : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <view
      className={selected ? "gem-purchase-pack gem-purchase-pack-selected" : "gem-purchase-pack"}
      data-testid={`gem-purchase-pack-${pack.id}`}
      data-selected={selected ? "true" : "false"}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={spoken}
      bindtap={handleTap}
    >
      <view className="gem-purchase-screen-gem-box">
        <svg className="gem-purchase-screen-gem" content={gemIcon} />
      </view>
      <view className="gem-purchase-pack-main">
        {/* 숫자와 단위는 크기가 다른 한 줄이라 안쪽 `<text>`로 잇습니다 — 기준선이 맞습니다. */}
        <text className="gem-purchase-pack-amount">
          <text className="gem-purchase-pack-gems">{formatGemCount(pack.gems)}</text>
          <text className="gem-purchase-pack-unit"> GEM</text>
        </text>
        <text
          className={
            pack.bonusGems > 0
              ? "gem-purchase-pack-caption gem-purchase-pack-caption-bonus"
              : "gem-purchase-pack-caption"
          }
        >
          {packCaption(pack)}
        </text>
      </view>
      <view className="gem-purchase-pack-price">
        <text className="gem-purchase-pack-price-value">{formatPrice(pack.priceCents)}</text>
        <text className="gem-purchase-pack-per-gem">{formatPricePerGem(pack)}</text>
      </view>
      <view
        className={
          selected
            ? "gem-purchase-pack-radio gem-purchase-pack-radio-selected"
            : "gem-purchase-pack-radio"
        }
      />
      {pack.badge === undefined ? null : (
        <view className="gem-purchase-pack-badge-anchor">
          <text className="gem-purchase-pack-badge">{pack.badge}</text>
        </view>
      )}
    </view>
  );
}
