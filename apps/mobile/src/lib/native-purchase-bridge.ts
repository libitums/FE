// 호스트 구매 모듈(`PurchasesModule`, RevenueCat SDK를 감쌈)의 JS 접점 — 구매 다리 계약(`purchase-bridge.ts`)을 구현합니다(ADR-0144 2단계).
// 호스트는 SDK 키가 있을 때만 이 모듈을 등록합니다. 없으면 `NativeModules`에 이름이 없고, 다리는 꺼진 다리와 같게 답합니다.
// 상품 · 스토어 나라는 결제 플래그와 상관없이 읽습니다(스토어 가격 표시). 구매 · 복원은 결제 플래그(`purchasesEnabled`)가 켜졌을 때만.
// 페이로드는 브리지를 건너온 값이라 좁히고, 던지지 않습니다. 호스트가 답하지 않으면 상품 · 나라는 기다림 상한 뒤 null입니다.

import { purchasesEnabled } from "./plans-flag";
import {
  disabledPurchaseBridge,
  type PurchaseBridge,
  type PurchaseResult,
  type RestoreResult,
  type StoreOffer,
} from "./purchase-bridge";

type Callback = (payload: unknown) => void;

/** 호스트 모듈(iOS `PurchasesModule.swift` · Android `PurchasesModule.java`). 모든 동작은 콜백 하나로 답합니다. */
export type PurchasesModule = {
  readonly configure: (userId: string, callback: Callback) => void;
  readonly signOut: (callback: Callback) => void;
  readonly offerings: (callback: Callback) => void;
  readonly storefront: (callback: Callback) => void;
  readonly purchase: (productId: string, callback: Callback) => void;
  readonly restore: (callback: Callback) => void;
};

const moduleName = "PurchasesModule";
const READ_TIMEOUT_MS = 15_000;

const recordOf = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Play 구독은 `구독id:기본요금제id`로 옵니다 — 앞부분이 우리 상품 id(ADR-0144 D4). */
const baseProductId = (id: string): string => id.split(":")[0] ?? id;

/** `offerings` 답 → 상품 목록. 실패 · 모르는 모양이면 null. 가격 글이 없는 상품은 버립니다. 순수. */
export function storeOffersFrom(payload: unknown): StoreOffer[] | null {
  const record = recordOf(payload);
  if (record?.["status"] !== "ok" || !Array.isArray(record["products"])) return null;
  const offers: StoreOffer[] = [];
  for (const item of record["products"]) {
    const product = recordOf(item);
    const id = product?.["productId"];
    const price = product?.["price"];
    if (typeof id !== "string" || id === "" || typeof price !== "string" || price === "") continue;
    const amount = product?.["amount"];
    const currency = product?.["currency"];
    offers.push({
      productId: baseProductId(id),
      price,
      amount: typeof amount === "number" && Number.isFinite(amount) ? amount : null,
      currency: typeof currency === "string" && currency !== "" ? currency.toUpperCase() : null,
    });
  }
  return offers;
}

// iOS StoreKit의 스토어 나라는 세 글자(ISO 3166-1 alpha-3)입니다 — 가격 지역에 쓰는 나라만 두 글자로 맞춥니다.
const alpha3: Readonly<Record<string, string>> = {
  VNM: "VN",
  IDN: "ID",
  PHL: "PH",
  THA: "TH",
  MYS: "MY",
  USA: "US",
};

/** `storefront` 답 → 나라 코드(대문자). 비었거나 실패면 null. 순수. */
export function storefrontFrom(payload: unknown): string | null {
  const record = recordOf(payload);
  const country = record?.["status"] === "ok" ? record["country"] : null;
  if (typeof country !== "string" || country.trim() === "") return null;
  const code = country.trim().toUpperCase();
  return alpha3[code] ?? code;
}

function purchaseResultFrom(payload: unknown, requested: string): PurchaseResult {
  const record = recordOf(payload);
  switch (record?.["status"]) {
    case "purchased": {
      const id = record["productId"];
      const transaction = record["transactionId"];
      return {
        kind: "purchased",
        productId: typeof id === "string" ? baseProductId(id) : requested,
        ...(typeof transaction === "string" && transaction !== ""
          ? { transactionId: transaction }
          : {}),
      };
    }
    // Play 보류 결제(현금 · 편의점 결제) — 스토어 시트가 안내하고, 결제가 끝나면 웹훅이 서버를 바꿉니다. 실패로 보이지 않습니다.
    case "cancelled":
    case "pending":
      return { kind: "cancelled" };
    default:
      return { kind: "failed" };
  }
}

function restoreResultFrom(payload: unknown): RestoreResult {
  const record = recordOf(payload);
  if (record?.["status"] !== "restored") return { kind: "failed" };
  const active = record["active"];
  return { kind: "restored", active: typeof active === "number" ? active : 0 };
}

// `NativeModules`가 없거나 모듈이 없으면 undefined입니다(`apple-sign-in.ts`와 같은 가드). import 시점에 읽지 않습니다.
function hostModule(): PurchasesModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as unknown as Record<string, unknown>)[moduleName];
  return module === undefined || module === null ? undefined : (module as PurchasesModule);
}

/** 호스트 동작 하나를 약속으로 — 던지면 `fallback`, `timeoutMs`가 있으면 그 뒤에도 답이 없을 때 `fallback`. */
function ask<T>(
  call: (callback: Callback) => void,
  read: (payload: unknown) => T,
  fallback: T,
  timeoutMs?: number,
): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: T) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    if (timeoutMs !== undefined) setTimeout(() => finish(fallback), timeoutMs);
    try {
      call((payload) => finish(read(payload)));
    } catch {
      finish(fallback);
    }
  });
}

/** 앱이 쓰는 다리 — 부를 때마다 호스트 모듈을 읽습니다(import 시점이 아님, 값싼 조회). */
export function nativePurchaseBridge(): PurchaseBridge {
  return createNativePurchaseBridge();
}

export function createNativePurchaseBridge(
  moduleOf: () => PurchasesModule | undefined = hostModule,
  enabled: () => boolean = purchasesEnabled,
): PurchaseBridge {
  const module = moduleOf();
  if (module === undefined) return disabledPurchaseBridge;
  const canBuy = enabled();
  return {
    available: canBuy,
    configure: (userId) =>
      ask(
        (callback) => module.configure(userId, callback),
        (p) => recordOf(p)?.["status"] === "ok",
        false,
      ),
    signOut: () =>
      ask(
        (callback) => module.signOut(callback),
        () => undefined,
        undefined,
      ),
    offerings: () =>
      ask((callback) => module.offerings(callback), storeOffersFrom, null, READ_TIMEOUT_MS),
    storefront: () =>
      ask((callback) => module.storefront(callback), storefrontFrom, null, READ_TIMEOUT_MS),
    purchase: async (productId) =>
      canBuy
        ? ask(
            (callback) => module.purchase(productId, callback),
            (p) => purchaseResultFrom(p, productId),
            { kind: "failed" } as PurchaseResult,
          )
        : { kind: "unavailable" },
    restore: async () =>
      canBuy
        ? ask((callback) => module.restore(callback), restoreResultFrom, {
            kind: "failed",
          } as RestoreResult)
        : { kind: "unavailable" },
  };
}
