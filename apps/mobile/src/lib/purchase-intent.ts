// 구매 의향(ADR-0144 추가 2026-11-17) — 결제가 붙기 전에도 요금제 · 엽전 팩의 구매 단추를 누른 수를 잽니다.
// 요금제 결선(`usePlans`)이 지역과 이벤트 sink를 이곳에 적고, 결선 밖에서 열리는 엽전 상점(머리 엽전 칩 · 채팅방 겹침)이 읽습니다.
// 2단계(네이티브 구매 다리)에서 엽전 상점도 결선을 받게 되면 이 모듈을 지웁니다.

import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { CompanionEventInput } from "./companion-event.contract";
import { emitCompanionEvent } from "./companion-events";
import type { PricingRegion, ShownPrice } from "./provisional-prices";

type PurchaseIntentInput = Extract<CompanionEventInput, { readonly name: "purchase_intent" }>;

/** 이벤트에 싣는 값 — 금액은 10진 문자열(이벤트 속성은 문자열 · 불리언뿐). 스토어 가격이면 금액 · 통화가 빈 문자열입니다. */
export function purchaseIntentOf(input: {
  readonly surface: PurchaseIntentInput["surface"];
  readonly placement: PurchaseIntentInput["placement"];
  readonly kind: PurchaseIntentInput["kind"];
  readonly product: string;
  readonly period: PurchaseIntentInput["period"];
  readonly shown: ShownPrice | null;
  readonly region: PricingRegion;
  /** 실제 결제를 열지 못하고 「곧」 안내로 끝났는가(결제 준비 중). */
  readonly preview: boolean;
}): PurchaseIntentInput {
  return {
    name: "purchase_intent",
    surface: input.surface,
    placement: input.placement,
    kind: input.kind,
    product: input.product,
    period: input.period,
    price: input.shown === null ? "" : String(input.shown.amount),
    currency: input.shown?.currency ?? "",
    country: input.region,
    preview: input.preview,
  };
}

let region: PricingRegion = "US";
let sink: EpisodeIntroEventSink = null;

/** 요금제 결선이 학습자 나라 · sink가 바뀔 때마다 적습니다. */
export function setPurchaseContext(next: {
  readonly region: PricingRegion;
  readonly sink: EpisodeIntroEventSink;
}): void {
  region = next.region;
  sink = next.sink;
}

/** 엽전 상점이 가격을 고를 지역 — 결선이 아직 적지 않았으면 US. */
export function purchaseRegion(): PricingRegion {
  return region;
}

/** 결선 밖(엽전 상점)의 구매 의향 — sink가 없으면 아무것도 하지 않습니다. */
export function reportPurchaseIntent(event: PurchaseIntentInput): void {
  emitCompanionEvent(sink, event);
}

/** 테스트 전용: 모듈 상태를 처음으로. */
export function resetPurchaseContextForTests(): void {
  region = "US";
  sink = null;
}
