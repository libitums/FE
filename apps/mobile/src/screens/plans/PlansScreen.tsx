import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { OptionSelector } from "@libitums/ui-lynx/option-selector";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { currentPlanIds } from "../../lib/plan-access";
import type { PlanId } from "../../lib/plans-api";
import { yearlySavingPercent } from "../../lib/provisional-prices";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { PlanCard } from "./PlanCard";
import { PlanTerms } from "./PlanTerms";
import { initialPlanSelection, planCardsFor, type PlanPeriod } from "./plans-model";
import { plansTestIds as ids, type PlansScreenProps } from "./plans.contract";
import { usePlanRequest } from "./use-plan-request";

import "./plans.css";

const periods: readonly PlanPeriod[] = ["monthly", "yearly"];

/**
 * 설정 → Plans(ADR-0144, 시안 ③) — 요금제 비교는 이 한 곳입니다. 카드를 눌러 고르고 기간(월 · 연)을 바꾼 뒤 「Continue with …」.
 * 구매 다리가 꺼져 있으면 계속 · 복원 모두 안내 한 줄로 끝납니다. 같은 요청이 겹치지 않게 진행 중에는 다시 누름을 무시하고,
 * 누른 단추는 로딩 · 다른 단추는 막힘으로 보입니다(ADR-0144 2단계).
 */
export function PlansScreen({
  catalog,
  offers,
  focus,
  onSelect,
  onRestore,
  onBack,
  region = "US",
  current = null,
  platform = null,
  onManageSubscription,
  onOpenLegal,
}: PlansScreenProps): ReactNode {
  useScreenBack(onBack);
  const copy = useUiCopy();
  const text = copy.plans;
  const [period, setPeriod] = useState<PlanPeriod>("monthly");
  const [picked, setPicked] = useState<PlanId | null>(null);
  const { notice, pending, run } = usePlanRequest(text.unavailable);
  const cardsFor = (of: PlanPeriod) =>
    catalog === null ? [] : planCardsFor(catalog, "settings", of, offers, region);
  // 월 · 연 카드를 한 번씩만 만듭니다 — 연간 할인 줄이 두 기간을 함께 봅니다.
  const both = { monthly: cardsFor("monthly"), yearly: cardsFor("yearly") };
  const cardsOf = (of: PlanPeriod) => both[of];
  const cards = cardsOf(period);
  const selectedId = picked ?? initialPlanSelection(cards, focus);
  const selected = cards.find((card) => card.id === selectedId);
  // 지금 요금제(서버 권한) — 그 카드에 배지, 고르면 계속 대신 구독 관리(해지 · 바꿈은 스토어 몫).
  const owned = currentPlanIds(current);
  const ownedProduct = (id: PlanId | undefined) => owned.find((row) => row.id === id)?.productId;
  const selectedOwned = ownedProduct(selected?.id);
  const manage = () => onManageSubscription?.(selectedOwned ?? owned[0]?.productId ?? null);
  // 연간 할인 줄 — 고른 요금제의 월 · 연 임시 가격으로 셉니다(지역마다 배수가 다름). 스토어 가격이면 일반 문구.
  const saving = yearlySavingPercent(
    cardsOf("monthly").find((card) => card.id === selectedId)?.shown ?? null,
    cardsOf("yearly").find((card) => card.id === selectedId)?.shown ?? null,
  );

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
                  current={ownedProduct(card.id) !== undefined}
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
              <text className="plans-screen-caption">{text.yearlyNote(saving)}</text>
              <view className="plans-screen-actions">
                {selectedOwned !== undefined ? (
                  <view
                    data-testid={ids.manage}
                    accessibility-element={true}
                    accessibility-traits="button"
                    accessibility-label={text.terms.manage}
                    bindtap={manage}
                  >
                    <view accessibility-elements-hidden={true}>
                      <Button label={text.terms.manage} variant="brand" size="xl" width="fill" />
                    </view>
                  </view>
                ) : selected === undefined ? null : (
                  <view
                    data-testid={ids.continue}
                    accessibility-element={true}
                    accessibility-traits="button"
                    accessibility-label={text.continueWith(text.names[selected.id])}
                    bindtap={() =>
                      run("purchase", () => onSelect(selected.id, period, selected.productId))
                    }
                  >
                    <view accessibility-elements-hidden={true}>
                      <Button
                        label={text.continueWith(text.names[selected.id])}
                        variant="brand"
                        size="xl"
                        width="fill"
                        disabled={pending === "restore"}
                        loading={pending === "purchase"}
                      />
                    </view>
                  </view>
                )}
                <view
                  data-testid={ids.restore}
                  accessibility-element={true}
                  accessibility-traits="button"
                  accessibility-label={text.restore}
                  bindtap={() => run("restore", onRestore)}
                >
                  <view accessibility-elements-hidden={true}>
                    <Button
                      label={text.restore}
                      variant="text"
                      size="l"
                      width="fill"
                      disabled={pending === "purchase"}
                      loading={pending === "restore"}
                    />
                  </view>
                </view>
                <PlanTerms
                  card={selected}
                  period={period}
                  platform={platform}
                  onOpenLegal={onOpenLegal}
                  onManage={owned.length > 0 && selectedOwned === undefined ? manage : undefined}
                />
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
