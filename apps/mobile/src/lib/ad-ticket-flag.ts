// 광고 보고 티켓 실험 플래그(ADR-0208 D6) — PostHog 피처 플래그 `ad-ticket`, 회원(distinct id = Supabase 사용자 id) 단위 50/50.
// 분석 클라이언트는 원격 플래그를 끈 채로 둡니다(`disableRemoteFeatureFlags`) — 이 플래그 하나만 `/flags/?v=2`로 따로 묻습니다.
// **기본 꺼짐**: 설정 · 전송이 없거나, 읽지 못하거나, 플래그가 없으면 대조군(`control`). 사용자마다 10분 동안 기억합니다.

import { adTicketArmFrom } from "./ad-ticket";
import type { AnalyticsConfig, AnalyticsTransport } from "./analytics.contract";
import { analyticsConfig } from "./analytics-config";

export const adTicketFlagKey = "ad-ticket";
const cacheMs = 10 * 60_000;

export type AdTicketFlag = { readonly arm: (userId: string) => Promise<"test" | "control"> };

export function createAdTicketFlag(deps: {
  readonly config: AnalyticsConfig | null;
  readonly transport: AnalyticsTransport | null;
  readonly nowMs: () => number;
}): AdTicketFlag {
  const cache = new Map<string, { arm: "test" | "control"; at: number }>();
  return {
    arm: async (userId) => {
      const { config, transport } = deps;
      if (config === null || transport === null) return "control";
      const hit = cache.get(userId);
      if (hit !== undefined && deps.nowMs() - hit.at <= cacheMs) return hit.arm;
      try {
        const response = await transport(`${config.host}/flags/?v=2`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: config.projectKey, distinct_id: userId }),
        });
        const arm =
          response.status === 200
            ? adTicketArmFrom(await response.text(), adTicketFlagKey)
            : "control";
        cache.set(userId, { arm, at: deps.nowMs() });
        return arm;
      } catch {
        return "control";
      }
    },
  };
}

/** `globalThis.fetch` → `lynx.fetch` → 없음. 분석 클라이언트(`posthog-client`, background only)를 값으로 가져오지 않으려고 따로 둡니다. */
function resolveTransport(): AnalyticsTransport | null {
  const globalFetch = (globalThis as unknown as { fetch?: AnalyticsTransport }).fetch;
  if (typeof globalFetch === "function")
    return (url, init) => globalFetch.call(globalThis, url, init);
  if (typeof lynx !== "undefined" && typeof lynx.fetch === "function") {
    const lynxFetch = lynx.fetch.bind(lynx) as unknown as AnalyticsTransport;
    return (url, init) => lynxFetch(url, init);
  }
  return null;
}

let appFlag: AdTicketFlag | null = null;

/** 앱 결선 — 분석 설정(PostHog 키)과 전송을 처음 물을 때 한 번 읽습니다. background 스레드에서만 부릅니다. */
export function adTicketFlag(): AdTicketFlag {
  if (appFlag === null) {
    appFlag = createAdTicketFlag({
      config: analyticsConfig(),
      transport: resolveTransport(),
      nowMs: () => Date.now(),
    });
  }
  return appFlag;
}

/** 테스트만 부릅니다 — 앱 결선의 기억(사용자별 실험군)을 비웁니다. */
export function resetAdTicketFlagForTests(): void {
  appFlag = null;
}
