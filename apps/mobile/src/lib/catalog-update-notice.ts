// 끝낸 에피소드 업데이트 안내의 판정 · 기록입니다. 닫을 때 바뀌어 있던 상태의 서명과 「다시 보지 않기」를 기기
// 저장소에 JSON으로 둡니다 — 서버로 가지 않고 로그아웃 · 계정 삭제에서도 지우지 않습니다(`storage.ts`).

import type { CatalogUpdateNoticeRecord } from "./catalog-update-notice.contract";
import { getItem, isStorageAvailable, setItem } from "./storage";

export const catalogUpdateNoticeStorageKey = "libitum.catalog-update-notice";

export const emptyCatalogUpdateNoticeRecord: CatalogUpdateNoticeRecord = { seen: [], muted: false };

// 서명이 끝없이 쌓이지 않게 최근 것만 남깁니다 — 에피소드 수보다 넉넉합니다.
const SEEN_LIMIT = 200;

/** 저장값 → 기록. 없거나 망가졌으면 빈 기록이고, 문자열이 아닌 원소 · 빈 값 · 중복은 버립니다. 던지지 않습니다. */
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
  const { seen, muted } = parsed as { seen?: unknown; muted?: unknown };
  const signatures: string[] = [];
  for (const value of Array.isArray(seen) ? (seen as unknown[]) : []) {
    if (typeof value === "string" && value !== "" && !signatures.includes(value))
      signatures.push(value);
  }
  return { seen: signatures, muted: muted === true };
}

/** 본 적 없는 서명이 하나라도 있으면 띄웁니다. 껐거나 저장소가 없으면(매번 뜨게 되므로) 띄우지 않습니다. */
export function shouldShowCatalogUpdateNotice(input: {
  readonly record: CatalogUpdateNoticeRecord;
  readonly signatures: readonly string[];
  readonly storageAvailable: boolean;
}): boolean {
  const { record, signatures, storageAvailable } = input;
  return (
    storageAvailable &&
    !record.muted &&
    signatures.some((signature) => !record.seen.includes(signature))
  );
}

/** 닫은 뒤 기록 — 지금 서명을 본 것으로 더하고, 체크했으면 끕니다. 끈 기록은 되돌리지 않습니다. */
export function withCatalogUpdateNoticeClosed(
  record: CatalogUpdateNoticeRecord,
  signatures: readonly string[],
  muted: boolean,
): CatalogUpdateNoticeRecord {
  const added = signatures.filter((signature) => !record.seen.includes(signature));
  return { seen: [...record.seen, ...added].slice(-SEEN_LIMIT), muted: record.muted || muted };
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
