import { useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { SettingsGroup } from "@libitums/ui-lynx/settings-cell";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import {
  bonusSummary,
  findGemPack,
  formatGemCount,
  formatPrice,
  gemPacks,
  gemPaymentNotice,
  initialGemPackId,
  totalGemsOf,
  type GemPackId,
} from "./gem-purchase";
import { gemIcon } from "./gem-icon";
import { GemPackCard } from "./GemPackCard";

import "./gem-purchase-screen.css";

// 상단 바의 젬 칩을 누르면 뜨는 구매 화면입니다(Figma 597-992). 지표 모달과 같은
// 겹침 레이어라 셸 밖에 떠 바텀 네비게이션까지 덮습니다 — 화면 전환(`Nav`)이 아닙니다.
// 문구는 디자인 표기(영문) 그대로입니다.
//
// 결제 서비스는 아직 없습니다. `Pay`와 결제 수단 줄은 「결제 준비 중」 안내를 띄우고, 젬은
// 늘어나지 않습니다(`gemPaymentNotice`).
//
// 디자인에는 닫는 수단이 없습니다. 레이어가 화면 전체를 덮으므로 나갈 길이 없으면
// 갇히는 화면이 됩니다 — 지표 모달과 같은 자리(왼쪽 위)에 원형 닫기 버튼을 둡니다.

export type GemPurchaseScreenProps = {
  /** 지금 가진 젬 수입니다. */
  readonly gemBalance: number;
  readonly onClose: () => void;
};

// 결제 수단은 결제 연동이 없어 디자인 표기를 그대로 적어 둡니다.
const paymentMethod = { title: "Visa •••• 4242", description: "Default payment method" };

const assurances = ["Secure payment", "Instant delivery", "VAT included"] as const;

// 안내의 버튼입니다. 바뀌지 않으므로 렌더마다 새로 만들지 않습니다.
const noticeActions = [{ id: "close", label: "확인" }] as const;

export function GemPurchaseScreen({ gemBalance, onClose }: GemPurchaseScreenProps): ReactNode {
  // 이 레이어는 셸 밖(`position: fixed`)이라 셸의 safe area 여백을 받지 못합니다 —
  // 지표 모달과 같이 스스로 읽습니다(lib/safe-area.ts).
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [selectedId, setSelectedId] = useState<GemPackId>(initialGemPackId);
  const selected = findGemPack(selectedId);
  const bonus = bonusSummary(selected);
  // 결제 준비 중 안내입니다. 이 화면 위에 겹칠 뿐 화면 전환이 아닙니다.
  const [noticeOpen, setNoticeOpen] = useState(false);

  const handleClose = () => {
    "background only";
    onClose();
  };
  const openNotice = () => {
    "background only";
    setNoticeOpen(true);
  };
  const closeNotice = () => {
    "background only";
    setNoticeOpen(false);
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
      {/* 안내가 떠 있는 동안 뒤쪽을 낭독에서 가립니다(ADR-0016 D9). */}
      <view
        className="gem-purchase-screen-close"
        data-testid="gem-purchase-screen-close"
        accessibility-elements-hidden={noticeOpen}
      >
        <RoundButton icon={cross} size="l" accessibilityLabel="닫기" bindtap={handleClose} />
      </view>
      <scroll-view
        className="gem-purchase-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
        accessibility-elements-hidden={noticeOpen}
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
                    onNavigate: openNotice,
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
                bindtap={openNotice}
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
      {noticeOpen ? (
        <view data-testid="gem-purchase-screen-notice">
          <Dialog
            title={gemPaymentNotice.title}
            description={gemPaymentNotice.description}
            actions={noticeActions}
            phase="visible"
            bindaction={closeNotice}
          />
        </view>
      ) : null}
    </view>
  );
}
