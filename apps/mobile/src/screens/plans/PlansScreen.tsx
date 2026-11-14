import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import type { PlanId } from "../../lib/plans-api";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { PlanCard } from "./PlanCard";
import { initialPlanSelection, planCardsFor, type PlanPeriod } from "./plans-model";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { usePlanRequest } from "./use-plan-request";

import "./plans.css";

const periods: readonly PlanPeriod[] = ["monthly", "yearly"];

/**
 * 설정 → Plans(ADR-0144, 시안 ③) — 요금제 비교는 이 한 곳입니다. 카드를 눌러 고르고 기간(월 · 연)을 바꾼 뒤 「Continue with …」.
 * 1단계는 구매 다리가 꺼져 있어 계속 · 복원 모두 안내 한 줄로 끝납니다. 같은 요청이 겹치지 않게 진행 중에는 다시 누름을 무시합니다.
 */
export function PlansScreen({
  catalog,
  offers,
  focus,
  onSelect,
  onRestore,
  onBack,
}: PlansScreenProps): ReactNode {
  useScreenBack(onBack);
  const copy = useUiCopy();
  const text = copy.plans;
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [picked, setPicked] = useState<PlanId | null>(null);
  const { notice, run } = usePlanRequest(text.unavailable);
  const cards = catalog === null ? [] : planCardsFor(catalog, "settings", period, offers);
  const selectedId = picked ?? initialPlanSelection(cards, focus);
  const selected = cards.find((card) => card.id === selectedId);

  return (
    <view className="plans-screen" data-testid={ids.screen}>
      <view className="plans-screen-header" data-testid={ids.back}>
        <RoundButton
          accessibilityLabel={copy.common.back}
          icon={arrowLeft}
          variant="neutral"
          size="xl"
          bindtap={onBack}
        />
      </view>
      <scroll-view
        className="plans-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="plans-screen-content">
          <view className="plans-screen-heading">
            <text className="plans-screen-title" accessibility-traits="header">
              {text.title}
            </text>
            <text className="plans-screen-caption">{text.subtitle}</text>
          </view>
          {catalog === null ? (
            <text className="plans-screen-notice" data-testid={ids.empty}>
              {text.loadFailed}
            </text>
          ) : (
            <view className="plans-screen-content">
              {cards.map((card) => (
                <PlanCard
                  key={card.id}
                  card={card}
                  period={period}
                  testId={ids.card(card.id)}
                  selected={card.id === selectedId}
                  onPress={() => setPicked(card.id)}
                />
              ))}
              <OptionSelector
                groupLabel={text.periodLabel}
                options={periods.map((id) => ({ id, label: text[id] }))}
                selectedIds={[period]}
                variant="outlined"
                size="m"
                selection="single"
                commit="deferred"
                onChange={(next) => {
                  const value = periods.find((id) => id === next[0]);
                  if (value !== undefined) setPeriod(value);
                }}
              />
              <text className="plans-screen-caption">{text.yearlyNote}</text>
              <view className="plans-screen-actions">
                {selected === undefined ? null : (
                  <view
                    data-testid={ids.continue}
                    accessibility-element={true}
                    accessibility-traits="button"
                    accessibility-label={text.continueWith(text.names[selected.id])}
                    bindtap={() => run(() => onSelect(selected.id, period, selected.productId))}
                  >
                    <view accessibility-elements-hidden={true}>
                      <Button
                        label={text.continueWith(text.names[selected.id])}
                        variant="brand"
                        size="xl"
                        width="fill"
                      />
                    </view>
                  </view>
                )}
                <view
                  data-testid={ids.restore}
                  accessibility-element={true}
                  accessibility-traits="button"
                  accessibility-label={text.restore}
                  bindtap={() => run(onRestore)}
                >
                  <view accessibility-elements-hidden={true}>
                    <Button label={text.restore} variant="text" size="l" width="fill" />
                  </view>
                </view>
                {notice === null ? null : (
                  <text
                    className="plans-screen-notice"
                    data-testid={ids.notice}
                    accessibility-element={true}
                  >
                    {notice}
                  </text>
                )}
              </view>
            </view>
          )}
        </view>
      </scroll-view>
    </view>
  );
}
