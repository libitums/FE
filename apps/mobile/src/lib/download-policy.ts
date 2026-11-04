// 콘텐츠 받기 정책(ADR-0095 D5) — 모바일 데이터에서 그림 · 녹음을 받을지 정하는 순수 판정과 그 설정의 저장입니다.
// 본문(텍스트)은 이 정책과 상관없이 늘 받습니다. 연결 종류를 모르면(옛 호스트) 지금처럼 받습니다.

import type { NetworkProperties } from "./network-status";
import { getItem, setItem } from "./storage";

export type MobileDataPolicy = "ask" | "always" | "wifi-only";

export const mobileDataPolicies: readonly MobileDataPolicy[] = ["ask", "always", "wifi-only"];

export const downloadPolicyStorageKey = "libitum.download.mobile-data";
export const downloadAllowedStorageKey = "libitum.download.allowed";

export type AssetDownloadInput = {
  readonly network: NetworkProperties;
  readonly policy: MobileDataPolicy;
  readonly allowed: ReadonlySet<string>;
  readonly episodeId: string;
  readonly tutorialId: string;
};

/** 이 에피소드의 그림 · 음성을 지금 받아도 되는가입니다. */
export function assetDownloadAllowed(input: AssetDownloadInput): boolean {
  const cost = input.network.networkCost;
  // 요금 없는 연결 · 모르는 연결(옛 호스트 · 오프라인)은 지금처럼 받습니다 — 오프라인은 받기 자체가 실패합니다.
  if (cost !== "metered" && cost !== "constrained") return true;
  if (input.policy === "always") return true;
  return input.episodeId === input.tutorialId || input.allowed.has(input.episodeId);
}

/** 저장값을 정책으로 읽습니다. 세 값과 정확히 같을 때만 받고, 나머지는 기본값 `ask`입니다. */
export function mobileDataPolicyFrom(stored: unknown): MobileDataPolicy {
  return mobileDataPolicies.find((policy) => policy === stored) ?? "ask";
}

/** 허락한 편 목록(JSON 문자열 배열)을 읽습니다. 깨졌으면 빈 집합 — 그 편들은 다시 물어봅니다. */
export function allowedEpisodesFrom(stored: unknown): ReadonlySet<string> {
  if (typeof stored !== "string") return new Set();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((id): id is string => typeof id === "string" && id !== ""));
}

// 저장소 접점 — `storage.ts`는 저장소가 없으면(Explorer · 테스트) 읽기 null · 쓰기 무시입니다. 던지지 않게 감쌉니다.
function readKey(key: string): string | null {
  try {
    return getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    setItem(key, value);
  } catch {
    // 쓰기 실패는 이번 실행의 선택만 잃습니다 — 다음에 다시 묻습니다.
  }
}

export function loadMobileDataPolicy(): MobileDataPolicy {
  return mobileDataPolicyFrom(readKey(downloadPolicyStorageKey));
}

export function saveMobileDataPolicy(policy: MobileDataPolicy): void {
  writeKey(downloadPolicyStorageKey, policy);
}

export function loadAllowedEpisodes(): ReadonlySet<string> {
  return allowedEpisodesFrom(readKey(downloadAllowedStorageKey));
}

/** 허락한 편에 더합니다(시트의 「지금 받기」 · 설정의 「모두 받기」). 이미 있으면 그대로입니다. */
export function allowEpisodes(ids: readonly string[]): void {
  const next = new Set(loadAllowedEpisodes());
  for (const id of ids) if (id !== "") next.add(id);
  writeKey(downloadAllowedStorageKey, JSON.stringify([...next]));
}
