import { useEffect, useGlobalProps, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import cross from "@libitums/icons/lynx/cross";
import { Dialog } from "@libitums/ui-lynx/dialog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { coinIcon } from "../../components/coin-icon";
import { PurchasePill } from "../../components/PurchasePill";
import { SkeletonValue } from "../../components/SkeletonValue";
import type { PlanId } from "../../lib/plans-api";
import { chipUpdating, idleWait, pillOf } from "../../lib/purchase-wait";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useLayerBack } from "../../lib/use-back-handler";
import { useCountUp } from "../../lib/use-count-up";
import { useUiCopy } from "../../lib/ui-copy";
import { PlansPanel } from "../plans/PlansPanel";
import { YourPlanChip } from "../plans/YourPlanChip";
import { currentPlanOf } from "../plans/plan-change";
import type { PlanPlacement } from "../plans/plans-model";
import { formatCoinCount } from "./coin-shop";
import { CoinShopPanel } from "./CoinShopPanel";
import { shopPromoOf, type ShopFrom, type ShopTab } from "./shop-model";
import { useShopPlans } from "./shop-plans";
import { ShopTabs } from "./ShopTabs";

import "./coin-shop-screen.css";
import "./shop.css";

// 하나의 상점(ADR-0116 · ADR-0160 시안 S1 · S2) — 엽전 | Plans 두 탭의 짙은 겹침 레이어입니다. 지표 · 티켓 모달과 같은 겹침이라 셸 밖에
// 떠 바텀 네비게이션까지 덮습니다 — 화면 전환(`Nav`)이 아닙니다. 입구가 첫 탭을 정하고(엽전 칩 · 대화 엽전 부족 → 엽전, 요금제 칩 ·
// 티켓 흐름 → Plans), 오른쪽 위 칩이 탭을 따라 「You have」 · 「Your plan」으로 바뀝니다. 요금제 결선(`ShopPlansContext`)이 없으면
// (플래그 꺼짐 · 로그아웃) 탭 · 요금제 줄 없이 엽전만 보입니다.

export type CoinShopScreenProps = {
  /** 지금 가진 엽전 수입니다. */
  readonly coinBalance: number;
  readonly onClose: () => void;
  /**
   * 시스템 뒤로가기를 이 화면이 직접 올릴지입니다(기본 켬). 채팅방 안처럼 뒤로가기 주인이 따로 있으면 끕니다 —
   * 한 겹침에 층이 둘 올라가지 않게 합니다.
   */
  readonly ownsBack?: boolean;
  /** 연 자리 — 머리 엽전 칩은 학습(기본), 채팅방 겹침은 대화. 구매 의향 · 탭 전환 이벤트의 `surface`입니다. */
  readonly surface?: "learning" | "chat";
  /** 처음 탭(기본 엽전). 요금제 결선이 없으면 언제나 엽전입니다. */
  readonly initialTab?: ShopTab;
  /** Plans 탭으로 열렸을 때의 지표 자리 · 처음 고를 요금제. */
  readonly placement?: PlanPlacement;
  readonly focus?: PlanId | null;
  /** 대화 동작 — 메시지 전송에서 엽전이 모자라 열렸으면 send(요금제 줄이 Chat Plus). */
  readonly from?: ShopFrom;
};

export function CoinShopScreen({
  coinBalance,
  onClose,
  ownsBack = true,
  surface = "learning",
  initialTab = "coins",
  placement = "coin_shop",
  focus = null,
  from = null,
}: CoinShopScreenProps): ReactNode {
  const copy = useUiCopy();
  const shop = copy.coinShop;
  const plans = useShopPlans();
  const noticeActions = [{ id: "close", label: copy.common.ok }] as const;
  // 이 레이어는 셸 밖(`position: fixed`)이라 셸의 safe area 여백을 받지 못합니다 — 스스로 읽습니다.
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [tab, setTab] = useState<ShopTab>(plans === undefined ? "coins" : initialTab);
  // 엽전 탭에서 넘어오면 자리는 엽전 상점(대화 전송이면 chat_send)입니다.
  const shopPlacement: PlanPlacement = from === "send" ? "chat_send" : "coin_shop";
  const [entry, setEntry] = useState({
    placement: initialTab === "plans" ? placement : shopPlacement,
    focus: initialTab === "plans" ? focus : null,
  });
  // 결제 준비 중 안내입니다. 이 화면 위에 겹칠 뿐 화면 전환이 아닙니다.
  const [noticeOpen, setNoticeOpen] = useState(false);
  const current = currentPlanOf(plans?.current ?? null);
  const promo = plans === undefined ? null : shopPromoOf(from, current, plans.catalog);
  const showPlans = plans !== undefined && tab === "plans";
  // 구매 뒤 서버 확인 대기(ADR-0163) — 위 알약 · 바뀔 칩 스켈레톤 · 잔액 오름. 구독은 서버에 닿으면 상점을 닫아 머리 아래 알림이 곧바로 뜹니다.
  const wait = plans?.wait ?? idleWait;
  const pill = pillOf(wait);
  const coinsUpdating = chipUpdating(wait, "coins");
  const shownBalance = useCountUp(coinBalance);
  const balanceLabel = shop.balance(coinBalance, formatCoinCount(coinBalance));
  // 이 상점에서 구독 결제가 끝났을 때만 닫습니다 — 다른 자리(설정)의 대기가 끝난 위에 새로 연 상점이 곧바로 닫히지 않게. 웹훅이 이미 닿아
  // 대기가 한 번에 done이 되어도(그리는 사이 waiting을 못 봄) 결제가 끝났다는 표시로 닫힙니다. 늦으면(late) 열린 채 안내를 봅니다.
  const [planBought, setPlanBought] = useState(false);
  useEffect(() => {
    if (!planBought || wait.phase === "waiting" || wait.phase === "idle") return;
    setPlanBought(false);
    if (wait.phase === "done" && wait.target === "plan") onClose();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [wait, planBought]);

  // Plans 탭으로 열렸으면 처음 한 번 보기 이벤트(탭을 바꿀 때는 아래 `switchTo`가 냅니다).
  useEffect(() => {
    if (plans !== undefined && tab === "plans") plans.onViewed(entry.placement);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTo = (next: ShopTab, pick: PlanId | null = null) => {
    "background only";
    if (plans === undefined || next === tab) return;
    plans.onTabSwitched(tab, next, surface);
    if (next === "plans") {
      setEntry({ placement: shopPlacement, focus: pick });
      plans.onViewed(shopPlacement);
    }
    setTab(next);
  };
  const handleClose = () => {
    "background only";
    onClose();
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
      <view className="coin-shop-screen-top" accessibility-elements-hidden={noticeOpen}>
        <view data-testid="coin-shop-screen-close" accessibility-elements-hidden={noticeOpen}>
          <RoundButton
            icon={cross}
            size="l"
            accessibilityLabel={copy.common.close}
            bindtap={handleClose}
          />
        </view>
        {pill === null ? null : (
          <view className="coin-shop-screen-pill">
            <PurchasePill pill={pill} theme="dark" />
          </view>
        )}
        {showPlans ? (
          <YourPlanChip current={current} updating={chipUpdating(wait, "plan")} />
        ) : (
          <view
            className="coin-shop-screen-balance"
            data-testid="coin-shop-screen-balance"
            flatten={false}
            accessibility-element={true}
            accessibility-label={
              coinsUpdating ? `${shop.purchaseWait.updating}, ${balanceLabel}` : balanceLabel
            }
          >
            <svg className="coin-shop-screen-balance-icon" content={coinIcon} />
            <view className="coin-shop-screen-balance-text">
              <text className="coin-shop-screen-balance-label">{shop.balanceLabel}</text>
              {coinsUpdating ? (
                <SkeletonValue
                  width={56}
                  lineHeight={22}
                  testId="coin-shop-screen-balance-updating"
                />
              ) : (
                <text
                  className="coin-shop-screen-balance-value"
                  data-testid="coin-shop-screen-balance-value"
                >
                  {formatCoinCount(shownBalance)}
                </text>
              )}
            </view>
          </view>
        )}
      </view>
      {plans === undefined ? null : (
        <view accessibility-elements-hidden={noticeOpen}>
          <ShopTabs tab={tab} onChange={(next) => switchTo(next)} />
        </view>
      )}
      {showPlans ? (
        <view className="coin-shop-screen-plans">
          <PlansPanel
            key={`${entry.placement}:${entry.focus ?? ""}`}
            {...plans}
            onSelect={(plan, period, productId) =>
              plans.onSelect(entry.placement, plan, period, productId)
            }
            focus={entry.focus}
            placement={entry.placement}
            theme="dark"
            // 엽전 탭 바닥(인셋 + 24)과 같은 높이에서 끝나게 합니다 — 판은 인셋 + 16을 더합니다.
            bottomInset={insets.bottom + 8}
            onPurchased={() => setPlanBought(true)}
          />
        </view>
      ) : (
        <CoinShopPanel
          surface={surface}
          bottomInset={insets.bottom}
          obscured={noticeOpen}
          onUnavailable={() => setNoticeOpen(true)}
          promo={promo}
          onPromo={() => switchTo("plans", promo?.plan ?? null)}
          wait={wait}
        />
      )}
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
