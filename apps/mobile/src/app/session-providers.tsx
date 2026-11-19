import type { ReactNode } from "@lynx-js/react";

import { FirstUnitGuideProvider } from "../components/first-unit-guide";
import type { AppPlatform } from "../lib/app-version";
import type { EntryLanguage } from "../lib/entry-language";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { ErrorBoundary } from "./ErrorBoundary";
import { ShopLayer } from "./shop-layer";
import type { ShopControl } from "./use-shop";
import type { PlansWiring } from "./use-plans";

/**
 * 세션의 프로바이더 묶음 — 문구표(UI 언어) · 첫 유닛 안내 · 에러 경계 · 하나의 상점(ADR-0160 `ShopLayer`). `AppSession`이 한 번 감쌉니다.
 * 상점은 문구표 안 · 에러 경계 안에 서고, 요금제 결선을 채팅방 겹침까지 내립니다.
 */
export function SessionProviders({
  language,
  guideEnabled,
  plans,
  shop,
  coinBalance,
  platform,
  children,
}: {
  readonly language: EntryLanguage;
  readonly guideEnabled: boolean;
  readonly plans: PlansWiring | undefined;
  readonly shop: ShopControl;
  readonly coinBalance: number;
  readonly platform: AppPlatform | null;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <UiCopyContext.Provider value={uiCopyFor(language)}>
      <FirstUnitGuideProvider enabled={guideEnabled}>
        <ErrorBoundary>
          <ShopLayer plans={plans} shop={shop} coinBalance={coinBalance} platform={platform}>
            {children}
          </ShopLayer>
        </ErrorBoundary>
      </FirstUnitGuideProvider>
    </UiCopyContext.Provider>
  );
}
