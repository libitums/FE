import "background-only";

// 에피소드 본문에서 받아 둘 자산 경로를 뽑는 순수 함수입니다. 오프라인에서도 그림 · 소리가 나오도록 받아
// 둘 목록이고, 주소는 화면이 쓰는 규칙과 같습니다 — 이미지는 `imageUrlOf`처럼 선두 `content/`를 뗀 버킷
// 상대 경로, 음성은 `contentAudioPathOf`의 `audio/<id>.m4a`입니다.
//
// 스키마를 따라 걷지 않고 **키 이름**으로 고릅니다(`…image_url` · `…audio_url`). 자리가 늘어도(표지 배경 ·
// 마무리 그림 · 예시 음성 …) 이 함수를 고치지 않기 위해서입니다 — 대가는 이 접미사를 다른 뜻으로 쓰는 키가
// 생기면 그것도 받는다는 것이고, 그런 키는 지금 없습니다.
import { contentAudioPathOf } from "./content-audio";
import { counterpartAvatarPathOf } from "./episode-avatar";
import { resolveContentUrlSafe } from "./episode-remote";

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

/** 본문 와이어에서 나온 순서대로, 겹치지 않게 자산 경로를 냅니다. 객체가 아니면 빈 목록입니다. */
export function episodeAssetPaths(episode: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const path = assetPathOf(key, value);
      if (path !== null) found.add(path);
      else walk(value);
    }
  };
  walk(episode);
  return [...found];
}
