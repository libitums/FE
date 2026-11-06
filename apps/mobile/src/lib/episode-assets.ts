import "background-only";

// 에피소드 본문에서 받아 둘 자산 경로를 뽑는 순수 함수입니다. 오프라인에서도 그림 · 소리가 나오도록 받아
// 둘 목록이고, 주소는 화면이 쓰는 규칙과 같습니다 — 이미지는 `imageUrlOf`처럼 선두 `content/`를 뗀 버킷
// 상대 경로, 음성은 `contentAudioPathOf`의 `audio/<id>.m4a`입니다.
//
// 스키마를 따라 걷지 않고 **키 이름**으로 고릅니다(`…image_url` · `…audio_url`). 자리가 늘어도(표지 배경 ·
// 마무리 그림 · 예시 음성 …) 이 함수를 고치지 않기 위해서입니다 — 대가는 이 접미사를 다른 뜻으로 쓰는 키가
// 생기면 그것도 받는다는 것이고, 그런 키는 지금 없습니다.
import type { CatalogUnitKey } from "./catalog-progress";
import { contentAudioPathOf } from "./content-audio";
import { counterpartAvatarPathOf, resolveContentUrlSafe } from "./episode-remote";

const IMAGE_KEY = /image_url$/;
const AUDIO_KEY = /audio_url$/;
const AVATAR_KEY = "counterpart_avatar";

function assetPathOf(key: string, value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  if (key === AVATAR_KEY) {
    const avatar = counterpartAvatarPathOf(value);
    return avatar.kind === "path" ? resolveContentUrlSafe("", avatar.path) : null;
  }
  if (IMAGE_KEY.test(key)) return resolveContentUrlSafe("", value);
  if (AUDIO_KEY.test(key)) return contentAudioPathOf(value);
  return null;
}

function collect(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, found);
    return;
  }
  if (node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const path = assetPathOf(key, value);
    if (path !== null) found.add(path);
    else collect(value, found);
  }
}

/** 본문 와이어에서 나온 순서대로, 겹치지 않게 자산 경로를 냅니다. 객체가 아니면 빈 목록입니다. */
export function episodeAssetPaths(episode: unknown): string[] {
  const found = new Set<string>();
  collect(episode, found);
  return [...found];
}

export type EpisodeAssetGroup = {
  readonly key: CatalogUnitKey;
  readonly paths: readonly string[];
};
export type EpisodeAssetGroups = {
  /** `steps[]` 밖의 모든 자산 — 중복 없음, 걷는 순서. */
  readonly common: readonly string[];
  /** `steps[i]` 서브트리의 자산 — 스텝 순서. 같은 id가 두 번 나오면 앞 자리에 합칩니다. */
  readonly units: readonly EpisodeAssetGroup[];
};

function unitIdOf(step: unknown): string | null {
  if (step === null || typeof step !== "object" || Array.isArray(step)) return null;
  const id = (step as Record<string, unknown>).id;
  return typeof id === "string" && id !== "" ? id : null;
}

/** `episodeAssetPaths`와 같은 키-이름 규칙으로 걷되 최상위 `steps[i]`만 유닛으로 뗍니다. */
export function episodeAssetGroups(episode: unknown): EpisodeAssetGroups {
  if (episode === null || typeof episode !== "object" || Array.isArray(episode)) {
    return { common: [], units: [] };
  }
  const common = new Set<string>();
  const units = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(episode as Record<string, unknown>)) {
    if (key === "steps" && Array.isArray(value)) {
      for (const step of value) {
        const id = unitIdOf(step);
        if (id === null) {
          collect(step, common);
          continue;
        }
        const own = units.get(id) ?? new Set<string>();
        units.set(id, own);
        collect(step, own);
      }
      continue;
    }
    const path = assetPathOf(key, value);
    if (path !== null) common.add(path);
    else collect(value, common);
  }
  return {
    common: [...common],
    units: [...units].map(([unitKey, paths]) => ({ key: unitKey, paths: [...paths] })),
  };
}
