// 콘텐츠 받기 정책(ADR-0095 D5) — 모바일 데이터에서 그림 · 녹음을 받을지 정하는 순수 판정과 그 설정의 저장입니다.
// 본문(텍스트)은 이 정책과 상관없이 늘 받습니다. 연결 종류를 모르면(옛 호스트) 지금처럼 받습니다.

import type { CatalogUnitKey } from "./catalog-progress";
import type { NetworkProperties } from "./network-status";
import { getItem, setItem } from "./storage";

export type MobileDataPolicy = "ask" | "always" | "wifi-only";

export const mobileDataPolicies: readonly MobileDataPolicy[] = ["ask", "always", "wifi-only"];

export const downloadPolicyStorageKey = "libitum.download.mobile-data";
export const downloadAllowedStorageKey = "libitum.download.allowed";

/** 받기 · 받음 판정의 대상 — 편 전체, 공통 묶음, 유닛 하나. */
export type AssetTarget =
  | { readonly kind: "episode" }
  | { readonly kind: "common" }
  | { readonly kind: "unit"; readonly unitKey: CatalogUnitKey };

/** 허락 목록의 원소 구분자 — `"<episodeId>#<unitKey>"`. */
export const DOWNLOAD_ALLOW_UNIT_SEPARATOR = "#";

export function unitAllowToken(episodeId: string, unitKey: CatalogUnitKey): string {
  return `${episodeId}${DOWNLOAD_ALLOW_UNIT_SEPARATOR}${unitKey}`;
}

/** 편 허락이면 모든 대상이 참. `common`은 그 편의 유닛 하나라도 허락이면 참. `unit`은 그 유닛 토큰이 있을 때. */
export function isDownloadAllowed(
  allowed: ReadonlySet<string>,
  episodeId: string,
  target: AssetTarget,
): boolean {
  if (allowed.has(episodeId)) return true;
  if (target.kind === "episode") return false;
  if (target.kind === "unit") return allowed.has(unitAllowToken(episodeId, target.unitKey));
  const prefix = `${episodeId}${DOWNLOAD_ALLOW_UNIT_SEPARATOR}`;
  for (const token of allowed) if (token.startsWith(prefix)) return true;
  return false;
}

export type AssetDownloadInput = {
  readonly network: NetworkProperties;
  readonly policy: MobileDataPolicy;
  readonly allowed: ReadonlySet<string>;
  readonly episodeId: string;
  readonly tutorialId: string;
  readonly target: AssetTarget;
};

/** 이 대상의 그림 · 음성을 지금 받아도 되는가입니다. */
export function assetDownloadAllowed(input: AssetDownloadInput): boolean {
  const cost = input.network.networkCost;
  // 요금 없는 연결 · 모르는 연결(옛 호스트 · 오프라인)은 지금처럼 받습니다 — 오프라인은 받기 자체가 실패합니다.
  if (cost !== "metered" && cost !== "constrained") return true;
  if (input.policy === "always") return true;
  if (input.episodeId === input.tutorialId) return true;
  return isDownloadAllowed(input.allowed, input.episodeId, input.target);
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

/** 유닛 토큰을 더합니다. 편이 이미 허락이면 쓰지 않고, 빈 키 · 빈 id는 버립니다. */
export function allowEpisodeUnits(episodeId: string, unitKeys: readonly CatalogUnitKey[]): void {
  if (episodeId === "") return;
  const next = new Set(loadAllowedEpisodes());
  if (next.has(episodeId)) return;
  for (const key of unitKeys) if (key !== "") next.add(unitAllowToken(episodeId, key));
  writeKey(downloadAllowedStorageKey, JSON.stringify([...next]));
}
