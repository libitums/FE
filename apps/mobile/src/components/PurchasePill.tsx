import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";

import { announce } from "../lib/accessibility";
import type { PurchasePillView } from "../lib/purchase-wait";
import { useUiCopy } from "../lib/ui-copy";
import { formatCoinCount } from "../screens/coin-shop/coin-shop";
import { coinIcon } from "./coin-icon";

import "./purchase-pill.css";

export type PurchasePillProps = {
  readonly pill: PurchasePillView;
  /** 상점(짙은 판) · 설정 → Plans(밝은 판). */
  readonly theme: "dark" | "light";
};

/**
 * 구매 뒤 확인 대기 알약(ADR-0163 D3 · D4) — 위 줄 가운데. 기다리는 동안 스피너 + 「Confirming your purchase…」, 60초 동안 서버가 그대로면
 * 조용한 안내, 엽전이 들어오면 「+N coins added」. 한 요소로 이름을 갖고, 뜰 때 · 글이 바뀔 때 한 번 낭독합니다(Lynx에 live region이 없어
 * polite 상태를 낭독 한 번으로 대신). 누를 것이 없어 단추가 아닙니다.
 */
export function PurchasePill({ pill, theme }: PurchasePillProps): ReactNode {
  const coinShop = useUiCopy().coinShop;
  const copy = coinShop.purchaseWait;
  const still = useMotion() === "reduced";
  const text =
    pill.kind === "waiting"
      ? copy.confirming
      : pill.kind === "late"
        ? copy.late
        : copy.added(pill.coins, formatCoinCount(pill.coins, coinShop.digitSeparator));
  useEffect(() => {
    announce(text);
  }, [text]);
  return (
    <view
      className={`purchase-pill purchase-pill-${theme}`}
      data-testid="purchase-pill"
      data-kind={pill.kind}
      data-theme={theme}
      flatten={false}
      accessibility-element={true}
      accessibility-label={text}
      user-interaction-enabled={false}
    >
      {pill.kind === "waiting" ? (
        <view
          className={
            still
              ? `purchase-pill-spinner purchase-pill-spinner-${theme}`
              : `purchase-pill-spinner purchase-pill-spinner-${theme} purchase-pill-spinner-spin`
          }
          data-testid="purchase-pill-spinner"
          data-still={String(still)}
        />
      ) : null}
      {pill.kind === "added" ? <svg className="purchase-pill-coin" content={coinIcon} /> : null}
      <text className={`purchase-pill-text purchase-pill-text-${theme}`} text-maxline="2">
        {text}
      </text>
    </view>
  );
}
