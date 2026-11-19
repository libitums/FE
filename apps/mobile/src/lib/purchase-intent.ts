// 구매 의향(ADR-0144 추가 2026-11-17) — 결제가 붙기 전에도 요금제 · 엽전 팩의 구매 단추를 누른 수를 잽니다.
// 요금제 결선(`usePlans`)이 지역 · 스토어 나라 · 스토어 상품 · 이벤트 sink를 이곳에 적고, 결선 밖에서 열리는 엽전 상점(머리 엽전 칩 ·
// 채팅방 겹침)이 읽습니다. 2단계부터는 실제 구매 동작(`purchasePack`)도 여기서 건넵니다. 엽전 상점도 결선을 받게 되면 이 모듈을 지웁니다.

import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { CompanionEventInput } from "./companion-event.contract";
import { emitCompanionEvent } from "./companion-events";
import type { PricingRegion, ShownPrice } from "./provisional-prices";
import type { PurchaseResult, StoreOffer } from "./purchase-bridge";

type PurchaseIntentInput = Extract<CompanionEventInput, { readonly name: "purchase_intent" }>;

/** 이벤트에 싣는 값 — 금액은 10진 문자열(이벤트 속성은 문자열 · 불리언뿐). 나라는 스토어 계정 나라가 있으면 그것, 없으면 가격 지역. */
export function purchaseIntentOf(input: {
  readonly surface: PurchaseIntentInput["surface"];
  readonly placement: PurchaseIntentInput["placement"];
  readonly kind: PurchaseIntentInput["kind"];
  readonly product: string;
  readonly period: PurchaseIntentInput["period"];
  readonly shown: ShownPrice | null;
  readonly region: PricingRegion;
  /** 스토어 계정의 나라(구매 다리) — 모르면 null이고 가격 지역을 싣습니다. */
  readonly storefront?: string | null;
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
    price: input.shown === null || input.shown.amount === null ? "" : String(input.shown.amount),
    currency: input.shown?.currency ?? "",
    country: input.storefront ?? input.region,
    priceSource: input.shown?.source ?? "",
    preview: input.preview,
  };
}

type PackPurchasedInput = Extract<CompanionEventInput, { readonly name: "pack_purchased" }>;

/** 엽전 팩 결제 성공 이벤트(ADR-0063 2026-11-19) — 금액 · 통화는 스토어 상품에서만(모르면 빈 문자열). 순수. */
export function packPurchasedOf(input: {
  readonly surface: PackPurchasedInput["surface"];
  readonly productId: string;
  readonly offers: readonly StoreOffer[] | null;
  readonly transactionId: string | null;
}): PackPurchasedInput {
  const offer = input.offers?.find((item) => item.productId === input.productId);
  const amount = offer?.amount ?? null;
  const currency = offer?.currency ?? null;
  const known = amount !== null && currency !== null;
  return {
    name: "pack_purchased",
    surface: input.surface,
    product: input.productId,
    price: known ? String(amount) : "",
    currency: known ? currency : "",
    transactionId: input.transactionId ?? "",
  };
}

let region: PricingRegion = "US";
let sink: EpisodeIntroEventSink = null;
let storefront: string | null = null;
let offers: readonly StoreOffer[] | null = null;
let canBuy = false;
let buy: (productId: string) => Promise<PurchaseResult> = async () => ({ kind: "unavailable" });

/** 요금제 결선이 지역 · 스토어 나라 · 스토어 상품 · sink가 바뀔 때마다 적습니다. */
export function setPurchaseContext(next: {
  readonly region: PricingRegion;
  readonly sink: EpisodeIntroEventSink;
  readonly storefront?: string | null;
  readonly offers?: readonly StoreOffer[] | null;
  /** 엽전 상점에서 실제 결제를 열 수 있는가(결제 플래그 · SDK · 로그인). 없으면 거짓. */
  readonly canBuy?: boolean;
  /** 엽전 팩 하나를 사는 동작(구매 다리 + 서버 따라잡기). 없으면 「아직 안 됨」. */
  readonly buy?: (productId: string) => Promise<PurchaseResult>;
}): void {
  region = next.region;
  sink = next.sink;
  storefront = next.storefront ?? null;
  offers = next.offers ?? null;
  canBuy = next.canBuy ?? false;
  buy = next.buy ?? (async () => ({ kind: "unavailable" }));
}

/** 엽전 상점의 구매 — 결선이 적은 동작을 부릅니다. `available` 거짓이면 화면은 「결제 준비 중」 안내로 끝냅니다. */
export function purchasePack(): {
  readonly available: boolean;
  readonly buy: (productId: string) => Promise<PurchaseResult>;
} {
  return { available: canBuy, buy };
}

/** 엽전 상점이 가격을 고를 지역 — 결선이 아직 적지 않았으면 US. */
export function purchaseRegion(): PricingRegion {
  return region;
}

/** 엽전 상점이 쓸 스토어 계정 나라 · 스토어 상품 — 모르면 null. */
export function purchaseStore(): {
  readonly storefront: string | null;
  readonly offers: readonly StoreOffer[] | null;
} {
  return { storefront, offers };
}

/** 결선 밖(엽전 상점)의 구매 의향 — sink가 없으면 아무것도 하지 않습니다. */
export function reportPurchaseIntent(event: PurchaseIntentInput): void {
  emitCompanionEvent(sink, event);
}

/** 결선 밖(엽전 상점)의 엽전 팩 결제 성공 — sink가 없으면 아무것도 하지 않습니다. */
export function reportPackPurchased(event: PackPurchasedInput): void {
  emitCompanionEvent(sink, event);
}

/** 테스트 전용: 모듈 상태를 처음으로. */
export function resetPurchaseContextForTests(): void {
  region = "US";
  sink = null;
  storefront = null;
  offers = null;
  canBuy = false;
  buy = async () => ({ kind: "unavailable" });
}
