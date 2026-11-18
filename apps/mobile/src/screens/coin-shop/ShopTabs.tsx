import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";

import { coinIcon } from "../../components/coin-icon";
import { crownIcon } from "../../components/plan-icons";
import { useUiCopy } from "../../lib/ui-copy";
import type { ShopTab } from "./shop-model";

import "../plans/plans.css";
import "./shop.css";

const tabs: readonly ShopTab[] = ["coins", "plans"];

/** 상점 위 전환(ADR-0160 · 시안 S1 · S2) — Yeopjeon | Plans. 월/연 토글과 같은 알약 묶음(어두운 판)입니다. */
export function ShopTabs({
  tab,
  onChange,
}: {
  readonly tab: ShopTab;
  readonly onChange: (next: ShopTab) => void;
}): ReactNode {
  const copy = useUiCopy();
  const names = copy.plans.shop.tabs;
  return (
    <view className="plans-segments plans-segments-dark shop-tabs">
      {tabs.map((id) => {
        const on = id === tab;
        return (
          <view
            key={id}
            className={on ? "plans-segment plans-segment-on" : "plans-segment"}
            data-testid={`shop-tab-${id}`}
            data-selected={String(on)}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={on ? copy.common.selected(names[id]) : names[id]}
            bindtap={() => {
              "background only";
              onChange(id);
            }}
          >
            {id === "coins" ? (
              <svg className="shop-tab-icon" content={coinIcon} />
            ) : (
              <svg
                className="shop-tab-icon shop-tab-icon-crown"
                content={crownIcon}
                current-color={color.brand.primary}
              />
            )}
            <text
              className={
                on
                  ? "plans-segment-label plans-segment-label-on"
                  : "plans-segment-label plans-segment-label-dark"
              }
            >
              {names[id]}
            </text>
          </view>
        );
      })}
    </view>
  );
}
