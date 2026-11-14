// 스토어 구매 다리(ADR-0144) — 2단계의 네이티브 모듈(RevenueCat SDK를 감쌈)이 이 계약을 구현합니다.
// Lynx용 RevenueCat SDK가 없어 iOS · Android 호스트가 SDK를 들고 이 네 동작만 엽니다. 앱 사용자 id = Supabase 사용자 id.
// 1단계는 꺼진 구현(`disabledPurchaseBridge`)만 있습니다 — 화면 · 테스트를 지금 짓고, 구매는 「아직 안 됨」으로 끝납니다.

/** 스토어가 매긴 값 그대로의 가격 글(통화 · 지역 표기 포함). */
export type StoreOffer = { readonly productId: string; readonly price: string };

export type PurchaseResult =
  | { readonly kind: "unavailable" }
  | { readonly kind: "cancelled" }
  | { readonly kind: "purchased"; readonly productId: string }
  | { readonly kind: "failed" };

export type RestoreResult =
  | { readonly kind: "unavailable" }
  | { readonly kind: "restored"; readonly active: number }
  | { readonly kind: "failed" };

export type PurchaseBridge = {
  /** 이 기기에서 구매를 열 수 있는가 — 꺼진 구현은 거짓. */
  readonly available: boolean;
  /** 로그인한 사용자로 SDK를 맞춥니다(RevenueCat logIn). 성공이면 참. */
  readonly configure: (userId: string) => Promise<boolean>;
  /** 지금 판매 중인 상품과 스토어 가격. 못 읽으면 null. */
  readonly offerings: () => Promise<readonly StoreOffer[] | null>;
  readonly purchase: (productId: string) => Promise<PurchaseResult>;
  readonly restore: () => Promise<RestoreResult>;
};

export const disabledPurchaseBridge: PurchaseBridge = {
  available: false,
  configure: async () => false,
  offerings: async () => null,
  purchase: async () => ({ kind: "unavailable" }),
  restore: async () => ({ kind: "unavailable" }),
};
