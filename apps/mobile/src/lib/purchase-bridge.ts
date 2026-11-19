// 스토어 구매 다리(ADR-0144) — 네이티브 모듈(RevenueCat SDK를 감쌈)이 이 계약을 구현합니다(`native-purchase-bridge.ts`).
// Lynx용 RevenueCat SDK가 없어 iOS · Android 호스트가 SDK를 들고 이 동작만 엽니다. 앱 사용자 id = Supabase 사용자 id.
// 호스트에 SDK 키가 없으면(모듈 없음) 꺼진 구현(`disabledPurchaseBridge`)과 같게 답합니다 — 가격은 임시 추천 가격으로 물러섭니다.

/** 스토어 상품 하나 — 가격 글은 스토어가 매긴 값 그대로(통화 · 지역 표기 포함). 금액 · 통화는 이벤트용으로, 모르면 null. */
export type StoreOffer = {
  readonly productId: string;
  readonly price: string;
  readonly amount?: number | null;
  readonly currency?: string | null;
};

export type PurchaseResult =
  | { readonly kind: "unavailable" }
  | { readonly kind: "cancelled" }
  | {
      readonly kind: "purchased";
      readonly productId: string;
      /** 스토어 거래 id(iOS transactionIdentifier · Play orderId) — 옛 호스트 · 모르면 없음(ADR-0063 Order Complete 중복 제거). */
      readonly transactionId?: string;
    }
  | { readonly kind: "failed" };

export type RestoreResult =
  | { readonly kind: "unavailable" }
  | { readonly kind: "restored"; readonly active: number }
  | { readonly kind: "failed" };

export type PurchaseBridge = {
  /** 이 기기에서 구매를 열 수 있는가 — SDK가 있고 결제 플래그(`purchasesEnabled`)가 켜졌을 때만 참. */
  readonly available: boolean;
  /** 로그인한 사용자로 SDK를 맞춥니다(RevenueCat logIn). 성공이면 참. */
  readonly configure: (userId: string) => Promise<boolean>;
  /** 로그아웃 · 계정 삭제 — SDK 사용자를 익명으로 되돌립니다(RevenueCat logOut). */
  readonly signOut: () => Promise<void>;
  /** 지금 판매 중인 상품과 스토어 가격. 못 읽으면 null. */
  readonly offerings: () => Promise<readonly StoreOffer[] | null>;
  /** 스토어 계정의 나라(ISO 3166-1 alpha-2, 대문자). 모르면 null. */
  readonly storefront: () => Promise<string | null>;
  readonly purchase: (productId: string) => Promise<PurchaseResult>;
  readonly restore: () => Promise<RestoreResult>;
};

export const disabledPurchaseBridge: PurchaseBridge = {
  available: false,
  configure: async () => false,
  signOut: async () => {},
  offerings: async () => null,
  storefront: async () => null,
  purchase: async () => ({ kind: "unavailable" }),
  restore: async () => ({ kind: "unavailable" }),
};
