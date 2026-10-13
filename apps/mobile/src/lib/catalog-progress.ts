// 카탈로그 에피소드의 진행 — 에피소드 id → 끝낸 유닛 키 목록입니다(ADR-0035 적용 기록 2026-10-12).
// 유닛 키는 표지 "intro" 또는 스텝 id(S1 … S9 · 최종 테스트 "RP")입니다. 순수 함수만 둡니다.

export type CatalogUnitKey = string;
export type CatalogProgress = Readonly<Record<string, readonly CatalogUnitKey[]>>;

export const CATALOG_INTRO_KEY = "intro";
export const CATALOG_FINAL_KEY = "RP";

// 객체 기본 속성 이름 — 키로 쓰면 대입이 프로토타입을 바꾼다(JSON.parse는 자기 속성으로 만든다).
const UNSAFE_KEY = "__proto__";

// 자기 속성만 읽습니다 — `{}`에서 "toString" 같은 이름은 프로토타입의 함수를 돌려줍니다(id는 서버 매니페스트가 정한다).
function ownUnits(
  progress: CatalogProgress,
  episodeId: string,
): readonly CatalogUnitKey[] | undefined {
  return Object.prototype.hasOwnProperty.call(progress, episodeId)
    ? progress[episodeId]
    : undefined;
}

function isUsableId(id: string): boolean {
  return id !== "" && id !== UNSAFE_KEY;
}

/** 저장소 · 서버에서 읽은 값 → 진행. 잘못된 키 · 값 · 원소만 버리고 나머지는 남깁니다. 던지지 않습니다. */
export function catalogProgressFrom(raw: unknown): CatalogProgress {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const result: Record<string, CatalogUnitKey[]> = {};
  for (const [episodeId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isUsableId(episodeId) || !Array.isArray(value)) continue;
    const units: CatalogUnitKey[] = [];
    for (const unit of value) {
      if (typeof unit === "string" && unit !== "" && !units.includes(unit)) units.push(unit);
    }
    if (units.length > 0) result[episodeId] = units;
  }
  return result;
}

/** 에피소드별 합집합입니다 — `a`의 순서 뒤에 `b`의 새 것. 입력을 바꾸지 않습니다. */
export function mergeCatalogProgress(a: CatalogProgress, b: CatalogProgress): CatalogProgress {
  const result: Record<string, readonly CatalogUnitKey[]> = { ...a };
  for (const [episodeId, units] of Object.entries(b)) {
    if (!isUsableId(episodeId)) continue;
    const existing = ownUnits(result, episodeId);
    const own = existing ?? [];
    const added = units.filter((unit) => !own.includes(unit));
    if (added.length > 0 || existing === undefined) result[episodeId] = [...own, ...added];
  }
  return result;
}

export function isCatalogUnitDone(
  progress: CatalogProgress,
  episodeId: string,
  unit: CatalogUnitKey,
): boolean {
  return ownUnits(progress, episodeId)?.includes(unit) ?? false;
}

/** 끝낸 유닛을 더합니다. 이미 있으면 같은 참조를 돌려줘 상태가 바뀌지 않게 합니다. */
export function markCatalogUnitDone(
  progress: CatalogProgress,
  episodeId: string,
  unit: CatalogUnitKey,
): CatalogProgress {
  // 빈 값은 서버가 거절해 모든 진행의 저장이 멈추므로 기록하지 않습니다.
  if (!isUsableId(episodeId) || unit === "") return progress;
  if (isCatalogUnitDone(progress, episodeId, unit)) return progress;
  return { ...progress, [episodeId]: [...(ownUnits(progress, episodeId) ?? []), unit] };
}

/** 최종 테스트(RP)를 통과했는가 — 다음 에피소드가 열리는 조건입니다. */
export function isCatalogEpisodePassed(progress: CatalogProgress, episodeId: string): boolean {
  return isCatalogUnitDone(progress, episodeId, CATALOG_FINAL_KEY);
}

/** 최종 테스트(RP)를 통과한 에피소드 수입니다 — 트로피에 더합니다. */
export function passedCatalogEpisodeCount(progress: CatalogProgress): number {
  return Object.keys(progress).filter((episodeId) => isCatalogEpisodePassed(progress, episodeId))
    .length;
}
