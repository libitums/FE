import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { PlanId } from "../../lib/plans-api";
import { yearlySavingPercent } from "../../lib/provisional-prices";
import { useUiCopy } from "../../lib/ui-copy";
import type { PlansCopy } from "../../lib/ui-copy-plans";
import { PlanCard } from "./PlanCard";
import { PlanCta, planCtaText } from "./PlanCta";
import { PlanPeriodToggle } from "./PlanPeriodToggle";
import { PlanTerms } from "./PlanTerms";
import { currentPlanOf, dateParts, planChangeOf, type PlanChange } from "./plan-change";
import {
  initialPlanSelection,
  isCurrentCard,
  planCardsFor,
  type PlanPeriod,
} from "./plans-model";
import { plansTestIds as ids, type PlansPanelProps } from "./plans.contract";
import { usePlanRequest } from "./use-plan-request";

import "./plans.css";

/** 구독 중 다른 카드의 태그 — 올림은 지금, 내림 · 기간 바꿈은 갱신 날짜, 같은 수준 바꿈은 「Switch」. */
function tagOf(change: PlanChange, date: string | null, copy: PlansCopy): string | undefined {
  if (change === "upgrade") return copy.shop.tag.upgrade;
  if (change === "downgrade" || change === "period") return copy.shop.tag.switchAt(date);
  return change === "crossgrade" ? copy.shop.tag.switch : undefined;
}

/** 텍스트 단추(Restore · Manage subscription) — 판에 따라 색만 다릅니다. */
function TextAction(props: {
  readonly testId: string;
  readonly label: string;
  readonly className: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onTap: () => void;
}): ReactNode {
  const { testId, label, className, disabled = false, loading = false, onTap } = props;
  return (
    <view
      className="plans-text-action"
      data-testid={testId}
      data-disabled={String(disabled)}
      data-loading={String(loading)}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={() => {
        "background only";
        if (!disabled && !loading) onTap();
      }}
    >
      <text className={loading ? `${className} plans-text-action-busy` : className}>{label}</text>
    </view>
  );
}

/**
 * Plans 내용(ADR-0160) — 설정 → Plans(밝은 판)과 상점 Plans 탭(어두운 판)이 함께 씁니다. 머리(제목 · 부제 · 티켓 입구 태그) · 월/연 토글 ·
 * 카드 셋이 스크롤되고, 바닥에 두 줄 CTA · Manage subscription + Restore · 구독 고지가 섭니다. 구독 중이면 지금 카드는 고를 수 없고 처음 고름은
 * 위 등급, CTA · 태그 · 고지가 바꿈 종류(올림 · 내림 · 같은 수준 · 기간)를 따릅니다. 구매 · 복원은 한 번에 하나(ADR-0144 2단계).
 */
export function PlansPanel({
  catalog,
  offers,
  focus,
  placement,
  theme,
  onSelect,
  onRestore,
  region = "US",
  current: entitlements = null,
  platform = null,
  onManageSubscription,
  onOpenLegal,
  bottomInset = 0,
  onPurchased,
}: PlansPanelProps): ReactNode {
  const text = useUiCopy().plans;
  const shop = text.shop;
  const current = currentPlanOf(entitlements);
  const [period, setPeriod] = useState<PlanPeriod>(current?.period ?? "monthly");
  const [picked, setPicked] = useState<PlanId | null>(null);
  const { notice, pending, run } = usePlanRequest(text.unavailable);
  const cardsFor = (of: PlanPeriod) =>
    catalog === null ? [] : planCardsFor(catalog, placement, of, offers, region);
  const both = { monthly: cardsFor("monthly"), yearly: cardsFor("yearly") };
  const cards = both[period];
  // 고른 카드가 기간을 바꾸며 「지금」이 되면 고름이 풀립니다(CTA 막힘).
  const selectedId =
    picked === null
      ? initialPlanSelection(cards, focus, current)
      : isCurrentCard(picked, period, current)
        ? null
        : picked;
  const selected = cards.find((card) => card.id === selectedId);
  const parts = dateParts(current?.expiresAt ?? null);
  const date = parts === null ? null : shop.date(parts.month, parts.day);
  const change: PlanChange =
    selected === undefined ? "same" : planChangeOf(current, selected.id, period);
  const cta = planCtaText(selected, period, change, date, text);
  const savingOf = selectedId ?? cards.find((card) => card.best)?.id;
  const saving = yearlySavingPercent(
    both.monthly.find((card) => card.id === savingOf)?.shown ?? null,
    both.yearly.find((card) => card.id === savingOf)?.shown ?? null,
  );
  const store = text.terms.stores[platform ?? "unknown"];
  const fromName = current === null ? "" : text.names[current.id];
  const toName =
    selected === undefined
      ? ""
      : change === "period"
        ? `${text.names[selected.id]} (${text[period]})`
        : text.names[selected.id];
  const changeLine =
    current === null || selected === undefined
      ? null
      : change === "upgrade"
        ? shop.change.upgrade(fromName, toName, store)
        : change === "downgrade" || change === "period"
          ? shop.change.later(fromName, toName, date)
          : change === "crossgrade"
            ? shop.change.crossgrade(fromName, toName, store)
            : null;
  const tone = (base: string) => `${base} ${base}-${theme}`;

  return (
    <view className="plans-panel">
      <scroll-view className="plans-panel-scroll" scroll-orientation="vertical" scroll-bar-enable={false}>
        <view className="plans-panel-body">
          <view className="plans-panel-heading">
            <text className={tone("plans-panel-title")} accessibility-traits="header">
              {text.title}
            </text>
            <text className={tone("plans-panel-caption")}>{text.subtitle}</text>
            {placement === "tickets" || placement === "tickets_chip" ? (
              <view className={tone("plans-panel-tag")} data-testid={ids.ticketsTag}>
                <text className={tone("plans-panel-tag-label")}>{shop.outOfTickets}</text>
              </view>
            ) : null}
          </view>
          {catalog === null ? (
            <text className={tone("plans-panel-notice")} data-testid={ids.empty}>
              {text.loadFailed}
            </text>
          ) : (
            <view className="plans-panel-cards">
              <PlanPeriodToggle
                period={period}
                saving={saving}
                theme={theme}
                onChange={setPeriod}
              />
              {cards.map((card) => {
                const mine = isCurrentCard(card.id, period, current);
                return (
                  <PlanCard
                    key={card.id}
                    card={card}
                    period={period}
                    testId={ids.card(card.id)}
                    selected={card.id === selectedId}
                    {...(mine ? { current: shop.current(date, current?.willRenew ?? true) } : {})}
                    {...(mine || current === null
                      ? {}
                      : { tag: tagOf(planChangeOf(current, card.id, period), date, text) })}
                    onPress={() => setPicked(card.id)}
                  />
                );
              })}
            </view>
          )}
        </view>
      </scroll-view>
      {catalog === null ? null : (
        <view className="plans-panel-footer" style={{ paddingBottom: `${bottomInset + 16}px` }}>
          <PlanCta
            title={cta.title}
            detail={cta.detail}
            disabled={selected === undefined || pending === "restore"}
            loading={pending === "purchase"}
            onPress={() => {
              if (selected === undefined) return;
              run(
                "purchase",
                () => onSelect(selected.id, period, selected.productId),
                (result) => {
                  if (result.kind === "purchased") onPurchased?.();
                },
              );
            }}
          />
          <view className="plans-panel-actions">
            {current === null ? null : (
              <TextAction
                testId={ids.manage}
                label={text.terms.manage}
                className={tone("plans-text-action-manage")}
                onTap={() => onManageSubscription?.(current.productId)}
              />
            )}
            <TextAction
              testId={ids.restore}
              label={text.restore}
              className={tone("plans-text-action-label")}
              disabled={pending === "purchase"}
              loading={pending === "restore"}
              onTap={() => run("restore", onRestore)}
            />
          </view>
          <PlanTerms
            card={selected}
            period={period}
            platform={platform}
            onOpenLegal={onOpenLegal}
            changeLine={changeLine}
            theme={theme}
          />
          {notice === null ? null : (
            <text
              className={tone("plans-panel-notice")}
              data-testid={ids.notice}
              accessibility-element={true}
            >
              {notice}
            </text>
          )}
        </view>
      )}
    </view>
  );
}
