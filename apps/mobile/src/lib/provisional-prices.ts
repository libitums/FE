// 보이는 가격(ADR-0144) — 스토어 상품 가격(RevenueCat offerings)이 있으면 언제나 그것, 없으면 임시 추천 가격표(추가 2026-11-17)입니다.
// 사용자 결정(2026-11-17): 동남아 시장가(지역 가격) · 그 밖은 미국 달러. 호스트에 SDK 키가 없거나 스토어 상품이 아직 승인 전이면 표가 보입니다.
// 스토어 상품이 모두 붙으면 표는 지워도 됩니다 — 가격의 정본은 스토어입니다.
//
// 지역은 스토어 계정의 나라(2단계, 2026-11-17)가 먼저, 모르면 학습자 프로필의 나라(`LearnerProfileRecord.countryCode`)입니다(`pricingRegionFor`).
// 표에 없는 나라 · 모름은 미국 달러입니다. `Intl`은 Lynx 백그라운드 런타임에 있다고 기댈 수 없어 통화 표기를 손으로 씁니다.

import type { StoreOffer } from "./purchase-bridge";

export type PricingRegion = "VN" | "ID" | "PH" | "TH" | "MY" | "US";

export type Currency = "VND" | "IDR" | "PHP" | "THB" | "MYR" | "USD";

export type ShownPrice = {
  /** 화면에 보이는 금액(그 통화의 기본 단위 — 동 · 루피아 · 페소 · 바트 · 링깃 · 달러). 스토어가 금액을 주지 않았으면 null. */
  readonly amount: number | null;
  /** 통화 코드(ISO 4217). 스토어가 통화를 주지 않았으면 빈 문자열. */
  readonly currency: string;
  /** 통화 표기를 붙인 글(예: 「49.000 ₫」 · 「Rp 29.000」 · 「RM9.90」 · 「$3.99」). 스토어 가격이면 스토어 글 그대로. */
  readonly text: string;
  /** 스토어 상품 가격인가, 임시 추천 가격인가 — 구매 의향 이벤트의 `priceSource`. */
  readonly source: "store" | "provisional";
};

const currencies: Readonly<Record<PricingRegion, Currency>> = {
  VN: "VND",
  ID: "IDR",
  PH: "PHP",
  TH: "THB",
  MY: "MYR",
  US: "USD",
};

type Row = Readonly<Record<PricingRegion, number | null>>;

// 상품 id(ADR-0144 D4) → 나라별 세금 포함 표시가. null이면 그 나라에서 보이지 않습니다.
const table: Readonly<Record<string, Row>> = {
  "duru.tickets.monthly.v1": { VN: 49000, ID: 29000, PH: 99, TH: 79, MY: 9.9, US: 3.99 },
  "duru.tickets.yearly.v1": { VN: 399000, ID: 249000, PH: 799, TH: 690, MY: 89.9, US: 39.99 },
  "duru.chatplus.monthly.v1": { VN: 99000, ID: 65000, PH: 199, TH: 139, MY: 16.9, US: 6.99 },
  "duru.chatplus.yearly.v1": { VN: 799000, ID: 549000, PH: 1690, TH: 1190, MY: 149.9, US: 69.99 },
  "duru.premium.monthly.v1": { VN: 179000, ID: 119000, PH: 349, TH: 249, MY: 27.9, US: 11.99 },
  "duru.premium.yearly.v1": { VN: 1490000, ID: 990000, PH: 2890, TH: 1990, MY: 239.9, US: 119.99 },
  "duru.coins.500.v1": { VN: 79000, ID: 49000, PH: 169, TH: 99, MY: 14.9, US: 4.99 },
  "duru.coins.1200.v1": { VN: 149000, ID: 99000, PH: 339, TH: 199, MY: 29.9, US: 9.99 },
  "duru.coins.3000.v1": { VN: 299000, ID: 199000, PH: 679, TH: 399, MY: 59.9, US: 19.99 },
};

/** 가격 지역 — 스토어 나라가 있으면 그것(표에 없으면 US — 그 계정은 그 나라 통화로 냅니다), 없을 때만 프로필 나라. 순수. */
export function pricingRegionFor(
  storefront: string | null | undefined,
  profileCountry: string | null | undefined,
): PricingRegion {
  return pricingRegionOf(storefront ?? profileCountry);
}

/** 학습자 나라 코드 → 가격 지역. 표에 없거나 모르면 US. 순수. */
export function pricingRegionOf(countryCode: string | null | undefined): PricingRegion {
  switch (countryCode) {
    case "VN":
    case "ID":
    case "PH":
    case "TH":
    case "MY":
      return countryCode;
    default:
      return "US";
  }
}

const grouped = (whole: number, separator: string): string =>
  String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, separator);

/** 그 통화의 표기 — 동 · 루피아는 소수 없이 「.」로 묶고, 링깃 · 달러는 소수 둘. 순수. */
export function formatMoney(amount: number, currency: Currency): string {
  switch (currency) {
    case "VND":
      return `${grouped(Math.round(amount), ".")} ₫`;
    case "IDR":
      return `Rp ${grouped(Math.round(amount), ".")}`;
    case "PHP":
      return `₱${grouped(Math.round(amount), ",")}`;
    case "THB":
      return `฿${grouped(Math.round(amount), ",")}`;
    case "MYR":
      return `RM${amount.toFixed(2)}`;
    case "USD":
      return `$${amount.toFixed(2)}`;
  }
}

/** 그 상품의 이 지역 임시 가격. 표에 없거나 그 지역에서 팔지 않으면 null. 순수. */
export function provisionalPrice(productId: string, region: PricingRegion): ShownPrice | null {
  const amount = table[productId]?.[region] ?? null;
  if (amount === null) return null;
  const currency = currencies[region];
  return { amount, currency, text: formatMoney(amount, currency), source: "provisional" };
}

/** 그 상품의 보이는 가격 — 스토어 목록에 있으면 스토어 값, 없으면(목록 없음 · 승인 전) 이 지역 임시 가격. 순수. */
export function shownPriceFor(
  productId: string,
  offers: readonly StoreOffer[] | null,
  region: PricingRegion,
): ShownPrice | null {
  const offer = offers?.find((item) => item.productId === productId);
  if (offer !== undefined) {
    return {
      amount: offer.amount ?? null,
      currency: offer.currency ?? "",
      text: offer.price,
      source: "store",
    };
  }
  return provisionalPrice(productId, region);
}

/** 연간이 월간 열두 번보다 얼마나 싼지(정수 %). 둘 중 하나라도 없거나 싸지 않으면 null. 순수. */
export function yearlySavingPercent(
  monthly: ShownPrice | null,
  yearly: ShownPrice | null,
): number | null {
  if (monthly === null || yearly === null || monthly.currency !== yearly.currency) return null;
  if (monthly.amount === null || yearly.amount === null || monthly.currency === "") return null;
  const full = monthly.amount * 12;
  if (full <= 0 || yearly.amount >= full) return null;
  return Math.round((1 - yearly.amount / full) * 100);
}
