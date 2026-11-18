// 구매 다리의 사용자 맞춤(ADR-0144 2단계, 2026-11-17) — RevenueCat app user id = Supabase user id(토큰의 `sub`, PostHog · Airbridge와 같은 id).
// 세션이 바뀔 때마다(`use-tester-access` — 앱 시작 · 로그인 · 로그아웃 · 계정 삭제가 모두 지남) 맞춥니다. 같은 사용자면 다시 부르지 않고,
// 토큰이 없어지면 익명으로 되돌립니다. 시험 계정도 같습니다(구매 기록은 계정에 붙어야 함). 실패는 화면을 막지 않습니다.

import { authUserIdFrom } from "./auth-user-id";
import { nativePurchaseBridge } from "./native-purchase-bridge";
import type { PurchaseBridge } from "./purchase-bridge";

export function createPurchaseUserSync(
  bridgeOf: () => PurchaseBridge = nativePurchaseBridge,
): (accessToken: string | null) => void {
  let last: string | null = null;
  return (accessToken) => {
    const next = accessToken === null ? null : authUserIdFrom(accessToken);
    if (next === last) return;
    const previous = last;
    last = next;
    const bridge = bridgeOf();
    if (next !== null) void bridge.configure(next).catch(() => false);
    else if (previous !== null) void bridge.signOut().catch(() => undefined);
  };
}
