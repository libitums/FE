import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import type { PlanPeriod } from "./plans-model";
import { plansTestIds as ids } from "./plans.contract";

import "./plans.css";

const periods: readonly PlanPeriod[] = ["monthly", "yearly"];

export type PlanPeriodToggleProps = {
  readonly period: PlanPeriod;
  /** 연간 할인율(정수 %) — 셀 수 없으면(스토어 금액 없음) null이라 배지가 없습니다. */
  readonly saving: number | null;
  readonly theme: "light" | "dark";
  readonly onChange: (period: PlanPeriod) => void;
};

/** 월 · 연 전환(ADR-0160 · 시안 S2) — 짧은 이름(「Yearly」)과 「-17%」 배지. 긴 언어에서도 한 줄입니다. */
export function PlanPeriodToggle({
  period,
  saving,
  theme,
  onChange,
}: PlanPeriodToggleProps): ReactNode {
  const copy = useUiCopy();
  const text = copy.plans;
  return (
    <view className={`plans-segments plans-segments-${theme}`}>
      {periods.map((id) => {
        const on = id === period;
        const badge = id === "yearly" && saving !== null ? text.shop.saving(saving) : null;
        const name = `${text.periodLabel}: ${text[id]}${badge === null ? "" : `, ${badge}`}`;
        return (
          <view
            key={id}
            className={on ? "plans-segment plans-segment-on" : "plans-segment"}
            data-testid={ids[id]}
            data-selected={String(on)}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={on ? copy.common.selected(name) : name}
            bindtap={() => {
              "background only";
              onChange(id);
            }}
          >
            <text
              className={
                on
                  ? "plans-segment-label plans-segment-label-on"
                  : `plans-segment-label plans-segment-label-${theme}`
              }
              text-maxline="1"
            >
              {text[id]}
            </text>
            {badge === null ? null : (
              <view className="plans-segment-badge" data-testid="plans-period-saving">
                <text className="plans-segment-badge-label">{badge}</text>
              </view>
            )}
          </view>
        );
      })}
    </view>
  );
}
