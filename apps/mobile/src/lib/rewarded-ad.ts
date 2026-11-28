// 보상형 광고의 호스트 접점(ADR-0209 · ADR-0017 D3) — `RewardedAdModule`(Google Mobile Ads)을 감쌉니다. 접점은 모듈마다 파일 하나입니다.
// 호스트는 AdMob 값 파일(앱 ID · 광고 단위)이 있을 때만 모듈을 등록합니다 — 없으면(Explorer · 테스트 · 값 없는 빌드)
// `rewardedAdAvailable()`이 거짓이고 광고 줄이 서지 않습니다. 광고는 비개인화(npa=1)로 요청합니다(호스트).
// 보여 줄 때 SSV 옵션에 Supabase 사용자 id(user_id)와 서버 요청 id(custom_data)를 싣습니다. 던지지 않습니다.

import { isRewardedUnitId } from "./ad-ticket";
import type { RewardedAdLoad, RewardedAdShow } from "./ad-ticket.contract";

interface RewardedAdModule {
  loadRewarded(unitId: string, callback: (payload: unknown) => void): void;
  showRewarded(userId: string, customData: string, callback: (payload: unknown) => void): void;
}

const statusOf = (payload: unknown): unknown =>
  typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>).status
    : undefined;

/** `{status: "loaded"}`만 불러옴 — 광고 없음(no_fill) · 오류 · 모르는 값은 모두 `unavailable`입니다. */
export function rewardedAdLoadOf(payload: unknown): RewardedAdLoad {
  return statusOf(payload) === "loaded" ? "loaded" : "unavailable";
}

/** `earned`(끝까지 봐 보상) · `dismissed`(일찍 닫음) · 그 밖은 `failed`입니다. */
export function rewardedAdShowOf(payload: unknown): RewardedAdShow {
  const status = statusOf(payload);
  return status === "earned" || status === "dismissed" ? status : "failed";
}

function nativeModule(): RewardedAdModule | undefined {
  if (typeof NativeModules === "undefined" || NativeModules === null) return undefined;
  const module = (NativeModules as Record<string, unknown>)["RewardedAdModule"] as
    | RewardedAdModule
    | undefined;
  return module ?? undefined;
}

export function rewardedAdAvailable(): boolean {
  return nativeModule() !== undefined;
}

/** 서버가 내린 광고 단위 ID로 불러옵니다(ADR-0209 D10). 꼴이 틀리면 호스트를 부르지 않습니다. */
export function loadRewardedAd(unitId: string): Promise<RewardedAdLoad> {
  const host = nativeModule();
  if (host === undefined || !isRewardedUnitId(unitId)) return Promise.resolve("unavailable");
  return new Promise((resolve) => {
    try {
      host.loadRewarded(unitId, (payload) => resolve(rewardedAdLoadOf(payload)));
    } catch {
      resolve("unavailable");
    }
  });
}

export function showRewardedAd(userId: string, customData: string): Promise<RewardedAdShow> {
  const host = nativeModule();
  if (host === undefined) return Promise.resolve("failed");
  return new Promise((resolve) => {
    try {
      host.showRewarded(userId, customData, (payload) => resolve(rewardedAdShowOf(payload)));
    } catch {
      resolve("failed");
    }
  });
}
