import type { ReactNode } from "@lynx-js/react";

import type { AppPlatform } from "../lib/app-version";
import { openLegalDocument } from "../lib/legal-document";
import { openManageSubscription } from "../lib/manage-subscription";
import { CoinShopScreen } from "../screens/coin-shop/CoinShopScreen";
import { ShopPlansContext, type ShopPlans } from "../screens/coin-shop/shop-plans";
import type { TicketSignIn } from "./use-learning-tickets";
import type { ShopControl } from "./use-shop";
import type { PlansWiring } from "./use-plans";

/**
 * 세션 층의 상점(ADR-0160) — 요금제 결선을 `ShopPlansContext`로 내려 어디서 열린 상점이든(세션 층 · 채팅방 겹침) Plans 탭을 그리게 하고,
 * 세션 층 요청(머리 칩 · 티켓 모달 · 티켓 다 씀 대화상자 · 메신저 판)이 있으면 상점을 셸 위에 띄웁니다. 구독 관리 · 약관 링크는 여기서 잇습니다.
 */
export function ShopLayer({
  plans,
  shop,
  coinBalance,
  platform,
  signIn = null,
  children,
}: {
  readonly plans: PlansWiring | undefined;
  readonly shop: ShopControl;
  readonly coinBalance: number;
  readonly platform: AppPlatform | null;
  /** 비회원의 로그인 흐름(ADR-0166) — 있으면 상점의 사기가 로그인 권유로 가고, 로그인을 고르면 상점을 닫고 로그인 화면을 엽니다. */
  readonly signIn?: TicketSignIn | null;
  readonly children: ReactNode;
}): ReactNode {
  const value: ShopPlans | undefined =
    plans === undefined
      ? undefined
      : {
          ...plans.shop,
          platform,
          onManageSubscription: (productId) => {
            openManageSubscription(platform, productId);
          },
          onOpenLegal: (document) => {
            openLegalDocument(document);
          },
        };
  const request = shop.request;
  return (
    <ShopPlansContext.Provider value={value}>
      {children}
      {request === null ? null : (
        <CoinShopScreen
          coinBalance={coinBalance}
          onClose={shop.close}
          initialTab={request.tab}
          placement={request.placement}
          focus={request.focus}
          surface={request.placement === "messenger" ? "chat" : "learning"}
          signIn={
            signIn === null
              ? null
              : {
                  sink: signIn.sink,
                  onSignIn: () => {
                    shop.close();
                    signIn.onSignIn();
                  },
                }
          }
        />
      )}
    </ShopPlansContext.Provider>
  );
}
