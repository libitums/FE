// 목록(매니페스트) 확인 시각 — 「준비 중」과 「확인을 못 함」을 가르는 근거입니다(ADR-0095 D9). 순수 함수만 둡니다.

export const MANIFEST_CHECKED_AT_KEY = "libitum.content.manifest.checked-at";

/** 이만큼 지나면 오래된 확인입니다(D9 — 3일). */
export const MANIFEST_STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type CatalogFreshness = {
  /** 한 번도 확인 못 했거나 3일이 지났으면 참입니다. */
  readonly stale: boolean;
  /** 마지막 확인이 며칠 전인가(내림). 확인한 적이 없으면 `null`. */
  readonly daysAgo: number | null;
};

/** 저장값(epoch ms 문자열)을 읽습니다. 숫자가 아니거나 0 이하이면 `null`. */
export function manifestCheckedAtFrom(stored: string | null): number | null {
  if (stored === null || !/^[0-9]+$/.test(stored)) return null;
  const value = Number(stored);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function catalogFreshness(checkedAt: number | null, now: number): CatalogFreshness {
  if (checkedAt === null) return { stale: true, daysAgo: null };
  const elapsed = Math.max(0, now - checkedAt);
  return { stale: elapsed >= MANIFEST_STALE_AFTER_MS, daysAgo: Math.floor(elapsed / DAY_MS) };
}
