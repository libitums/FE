import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import { PlanCard } from "./PlanCard";
import { plansTestIds as ids, type PlanOfferWiring } from "./plans.contract";

import "./plans.css";

// 막힌 자리의 요금제 카드(ADR-0144, 시안 ① ②) — 두 자리가 동작이 달라 변형을 둘로 나눕니다.
// 1단계는 어느 단추든 그 요금제를 강조한 Plans 화면을 엽니다(구매는 Plans 화면 한 곳).

type OfferProps = { readonly offer: PlanOfferWiring };

/** 카드가 처음 보일 때 한 번 알립니다(plans_viewed offer). */
function useShownOnce(offer: PlanOfferWiring): void {
  useEffect(() => {
    offer.onShown();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** 티켓 다 씀 대화상자 — 무제한 티켓 카드 하나 + 「Go unlimited」 + 「Compare plans」. */
export function TicketsPlanOffer({ offer }: OfferProps): ReactNode {
  const copy = useUiCopy().plans;
  useShownOnce(offer);
  const card = offer.cards[0];
  if (card === undefined) return null;
  return (
    <view className="plan-offer" data-testid={ids.offer}>
      <PlanCard
        card={card}
        period="monthly"
        testId={ids.offerCard(card.id)}
        onPress={() => offer.onSelect(card.id)}
      />
      <view
        data-testid={ids.offerGo}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.goUnlimited}
        bindtap={() => {
          "background only";
          offer.onSelect(card.id);
        }}
      >
        <view accessibility-elements-hidden={true}>
          <Button label={copy.goUnlimited} variant="brand" size="l" width="fill" />
        </view>
      </view>
      <view
        data-testid={ids.offerCompare}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.compare}
        bindtap={() => {
          "background only";
          offer.onCompare();
        }}
      >
        <view accessibility-elements-hidden={true}>
          <Button label={copy.compare} variant="text" size="l" width="fill" />
        </view>
      </view>
    </view>
  );
}

/** 메신저 무료 다 씀 판 — Chat Plus · Premium 카드(누르면 그 요금제). 엽전으로 계속은 판의 기존 단추가 집니다. */
export function ChatPlanOffer({ offer }: OfferProps): ReactNode {
  useShownOnce(offer);
  if (offer.cards.length === 0) return null;
  return (
    <view className="plan-offer" data-testid={ids.offer}>
      {offer.cards.map((card) => (
        <PlanCard
          key={card.id}
          card={card}
          period="monthly"
          testId={ids.offerCard(card.id)}
          onPress={() => offer.onSelect(card.id)}
        />
      ))}
    </view>
  );
}
