import { useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { coinIcon } from "../../components/coin-icon";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import {
  coinPacks,
  findCoinPack,
  formatCoinCount,
  formatPrice,
  initialCoinPackId,
  type CoinPackId,
} from "./coin-shop";
import { CoinPackCard } from "./CoinPackCard";

import "./coin-shop-screen.css";

// 머리 엽전 칩의 「+」를 누르면 뜨는 엽전 상점입니다(ADR-0116 · 시안 「엽전 상점」). 지표 · 티켓 모달과 같은
// 겹침 레이어라 셸 밖에 떠 바텀 네비게이션까지 덮습니다 — 화면 전환(`Nav`)이 아닙니다.
//
// 결제 서비스는 아직 없습니다. 사기 버튼은 「결제 준비 중」 안내를 띄우고 엽전은 늘어나지 않습니다(사용자 결정:
// 결제 전에도 모두에게 보인다).

export type CoinShopScreenProps = {
  /** 지금 가진 엽전 수입니다. */
  readonly coinBalance: number;
  readonly onClose: () => void;
  /**
   * 시스템 뒤로가기를 이 화면이 직접 올릴지입니다(기본 켬). 채팅방 안처럼 뒤로가기 주인이 따로 있으면 끕니다 —
   * 한 겹침에 층이 둘 올라가지 않게 합니다.
   */
  readonly ownsBack?: boolean;
};

export function CoinShopScreen({
  coinBalance,
  onClose,
  ownsBack = true,
}: CoinShopScreenProps): ReactNode {
  const copy = useUiCopy();
  const shop = copy.coinShop;
  const noticeActions = [{ id: "close", label: copy.common.ok }] as const;
  // 이 레이어는 셸 밖(`position: fixed`)이라 셸의 safe area 여백을 받지 못합니다 — 스스로 읽습니다.
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [selectedId, setSelectedId] = useState<CoinPackId>(initialCoinPackId);
  const selected = findCoinPack(selectedId);
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
  // 시스템 뒤로가기 — 안내가 떠 있으면 안내만 닫고, 아니면 상점을 닫습니다.
  useLayerBack(ownsBack ? (noticeOpen ? closeNotice : handleClose) : null);

  return (
    <view
      className="coin-shop-screen"
      data-testid="coin-shop-screen"
      data-statusbar={lightStatusBarIcons}
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
        className="coin-shop-screen-close"
        data-testid="coin-shop-screen-close"
        accessibility-elements-hidden={noticeOpen}
      >
        <RoundButton
          icon={cross}
          size="l"
          accessibilityLabel={copy.common.close}
          bindtap={handleClose}
        />
      </view>
      <scroll-view
        className="coin-shop-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        accessibility-elements-hidden={noticeOpen}
      >
        <view className="coin-shop-screen-body">
          <view className="coin-shop-screen-head">
            <view className="coin-shop-screen-titles">
              <text
                className="coin-shop-screen-title"
                accessibility-element={true}
                accessibility-traits="header"
              >
                {shop.title}
              </text>
              <text className="coin-shop-screen-subtitle">{shop.subtitle}</text>
            </view>
            <view
              className="coin-shop-screen-balance"
              data-testid="coin-shop-screen-balance"
              accessibility-element={true}
              accessibility-label={shop.balance(coinBalance, formatCoinCount(coinBalance))}
            >
              <svg className="coin-shop-screen-balance-icon" content={coinIcon} />
              <view className="coin-shop-screen-balance-text">
                <text className="coin-shop-screen-balance-label">{shop.balanceLabel}</text>
                <text
                  className="coin-shop-screen-balance-value"
                  data-testid="coin-shop-screen-balance-value"
                >
                  {formatCoinCount(coinBalance)}
                </text>
              </view>
            </view>
          </view>

          <view className="coin-shop-screen-pick">
            <text className="coin-shop-screen-pick-title" accessibility-traits="header">
              {shop.pickTitle}
            </text>
            <text className="coin-shop-screen-pick-caption">{shop.pickCaption}</text>
          </view>

          <view className="coin-shop-screen-packs">
            {coinPacks.map((pack) => (
              <CoinPackCard
                key={pack.id}
                pack={pack}
                selected={pack.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </view>
        </view>
      </scroll-view>
      <view
        className="coin-shop-screen-footer"
        style={{ paddingBottom: `${insets.bottom + 24}px` }}
        accessibility-elements-hidden={noticeOpen}
      >
        <view data-testid="coin-shop-screen-buy">
          <Button
            label={shop.buy(formatPrice(selected.priceCents))}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={openNotice}
          />
        </view>
        <text className="coin-shop-screen-store-note">{shop.storeNote}</text>
      </view>
      {noticeOpen ? (
        <view data-testid="coin-shop-screen-notice">
          <Dialog
            title={shop.notice.title}
            description={shop.notice.description}
            actions={noticeActions}
            phase="visible"
            bindaction={closeNotice}
          />
        </view>
      ) : null}
    </view>
  );
}
