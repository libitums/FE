import "background-only";

// 음성 정보 파일(audio/manifest.json)을 한 번 받아 기기에 두는 한 차례입니다.
import type { ContentStore } from "./episode-cache";
import type { FetchText } from "./episode-remote";

/** 한 차례의 결과. 바뀐 것은 `updated` · `removed`뿐입니다. */
export type AudioManifestRefresh =
  | "updated"
  | "unchanged"
  | "removed"
  | "absent"
  | "unavailable"
  | "invalid";

export type AudioManifestDeps = { readonly fetchText: FetchText; readonly store: ContentStore };

/**
 * `audio/manifest.json`을 한 번 받습니다. 유효하면 원문을 저장하고(같으면 그대로), 서버에 없으면(400 · 403 ·
 * 404 · 410) 저장본을 지우며, 그 밖 실패 · 형식 틀림은 저장본을 둡니다. 던지지 않습니다.
 */
export async function refreshAudioManifest(deps: AudioManifestDeps): Promise<AudioManifestRefresh> {
  void deps;
  return "unavailable";
}

/** 다시 읽어야 하는가 - `updated` · `removed`. */
export function changesAudioTiming(result: AudioManifestRefresh): boolean {
  void result;
  return false;
}
