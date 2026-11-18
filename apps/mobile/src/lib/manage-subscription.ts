// 스토어 구독 관리로 보내는 접점(ADR-0144 2단계 후속). 해지 · 갱신 · 요금제 바꿈은 스토어가 하므로 앱은 그 화면을 열기만
// 합니다. 새 호스트 메서드 없이 위기 카드가 쓰는 `ExternalLinkModule`(https만 엶)로 엽니다 — iOS는 App Store 앱의 계정 구독 화면,
// Android는 Play 앱의 구독 화면이 그 주소를 받습니다. 던지지 않습니다.

import type { AppPlatform } from "./app-version";
import { openExternalLink } from "./external-link";

/** Android `applicationId` — Play 구독 화면이 이 앱의 구독을 고르게 합니다(호스트 `build.gradle`과 같은 값). */
export const ANDROID_PACKAGE = "libitum.duru.android";
const APPLE_SUBSCRIPTIONS = "https://apps.apple.com/account/subscriptions";
const PLAY_SUBSCRIPTIONS = "https://play.google.com/store/account/subscriptions";

/** 플랫폼을 모르면(Explorer · 테스트) null. Play 구독 상품은 `구독id:기본요금제id`로 올 수 있어 앞부분만 씁니다. */
export function manageSubscriptionUrl(
  platform: AppPlatform | null,
  productId: string | null,
): string | null {
  if (platform === "ios") return APPLE_SUBSCRIPTIONS;
  if (platform !== "android") return null;
  const sku = productId?.split(":")[0] ?? "";
  return sku === ""
    ? PLAY_SUBSCRIPTIONS
    : `${PLAY_SUBSCRIPTIONS}?sku=${encodeURIComponent(sku)}&package=${ANDROID_PACKAGE}`;
}

/** 스토어 구독 관리를 엽니다. 주소를 못 만들거나 모듈이 없으면 false. */
export function openManageSubscription(
  platform: AppPlatform | null,
  productId: string | null,
): boolean {
  const url = manageSubscriptionUrl(platform, productId);
  return url === null ? false : openExternalLink(url);
}
