// 끝낸 에피소드 업데이트 안내의 판정 · 기록입니다. 마지막으로 본 에피소드 버전과 「다시 보지 않기」를 기기 저장소에 JSON으로
// 둡니다 — 서버로 가지 않고 로그아웃 · 계정 삭제에서도 지우지 않습니다(`storage.ts`). 버전이 바뀐(업데이트된) 에피소드에
// 새 유닛이 있을 때만 뜨므로, 유닛을 끝내거나 에피소드를 클리어해 진행이 바뀌어도 다시 뜨지 않습니다(ADR-0089 D3).

import type { CatalogUpdateNoticeRecord } from "./catalog-update-notice.contract";
import { getItem, isStorageAvailable, setItem } from "./storage";

export const catalogUpdateNoticeStorageKey = "libitum.catalog-update-notice";

export const emptyCatalogUpdateNoticeRecord: CatalogUpdateNoticeRecord = {
  versions: null,
  muted: false,
};

// 객체 기본 속성 이름 — 키로 쓰면 대입이 프로토타입을 바꿉니다.
const UNSAFE_KEY = "__proto__";

function versionsFrom(value: unknown): Readonly<Record<string, string>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const versions: Record<string, string> = {};
  for (const [id, version] of Object.entries(value as Record<string, unknown>)) {
    if (id !== "" && id !== UNSAFE_KEY && typeof version === "string") versions[id] = version;
  }
  return versions;
}

/** 저장값 → 기록. 없거나 망가졌으면 빈 기록, 옛 모양(`seen`)은 버전 기록 없음으로 읽습니다. 던지지 않습니다. */
export function catalogUpdateNoticeRecordFrom(raw: string | null): CatalogUpdateNoticeRecord {
  if (raw === null || raw === "") return emptyCatalogUpdateNoticeRecord;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyCatalogUpdateNoticeRecord;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return emptyCatalogUpdateNoticeRecord;
  }
  const { versions, muted } = parsed as { versions?: unknown; muted?: unknown };
  return { versions: versionsFrom(versions), muted: muted === true };
}

/**
 * 새 유닛이 있는 에피소드(`freshIds`) 가운데 기록의 버전과 지금 버전이 다른 것이 있으면 띄웁니다. 기록이 없으면 새 유닛만으로
 * 띄웁니다 — 새로 깐 사람은 끝낸 에피소드가 없어 뜨지 않고, 이 기능 전 앱에서 올라온 사람에게는 한 번 뜹니다. 껐거나 저장소가
 * 없으면(매번 뜨게 되므로) 띄우지 않습니다.
 */
export function shouldShowCatalogUpdateNotice(input: {
  readonly record: CatalogUpdateNoticeRecord;
  readonly versions: Readonly<Record<string, string>>;
  readonly freshIds: readonly string[];
  readonly storageAvailable: boolean;
}): boolean {
  const { record, versions, freshIds, storageAvailable } = input;
  if (!storageAvailable || record.muted) return false;
  const seen = record.versions;
  return freshIds.some((id) => seen === null || seen[id] !== versions[id]);
}

/** 지금 버전과 기록이 다르거나 기록이 없으면 참 — 띄울 것 없이 지도에 닿았을 때 조용히 맞춥니다. */
export function catalogUpdateNoticeNeedsSync(
  record: CatalogUpdateNoticeRecord,
  versions: Readonly<Record<string, string>>,
): boolean {
  const seen = record.versions;
  if (seen === null) return true;
  const ids = Object.keys(versions);
  return ids.length !== Object.keys(seen).length || ids.some((id) => seen[id] !== versions[id]);
}

/** 지금 버전을 통째로 적습니다. 체크했으면 끄고, 끈 기록은 되돌리지 않습니다. */
export function withCatalogUpdateNoticeVersions(
  record: CatalogUpdateNoticeRecord,
  versions: Readonly<Record<string, string>>,
  muted: boolean,
): CatalogUpdateNoticeRecord {
  return { versions: { ...versions }, muted: record.muted || muted };
}

export function isCatalogUpdateNoticeStorageAvailable(): boolean {
  return isStorageAvailable();
}

export function loadCatalogUpdateNotice(): CatalogUpdateNoticeRecord {
  try {
    return catalogUpdateNoticeRecordFrom(getItem(catalogUpdateNoticeStorageKey));
  } catch {
    return emptyCatalogUpdateNoticeRecord;
  }
}

export function saveCatalogUpdateNotice(record: CatalogUpdateNoticeRecord): void {
  try {
    setItem(catalogUpdateNoticeStorageKey, JSON.stringify(record));
  } catch {
    // 저장이 실패하면 다음 실행에 한 번 더 뜰 뿐입니다 — 흐름을 막지 않습니다.
  }
}
