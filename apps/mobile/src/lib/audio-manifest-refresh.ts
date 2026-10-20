import "background-only";

// 음성 정보 파일(audio/manifest.json)을 한 번 받아 기기에 두는 한 차례입니다.
import { AUDIO_MANIFEST_PATH, parseAudioManifest } from "./audio-manifest";
import { ABSENT_HTTP_CODES } from "./episode-asset-sync";
import { CONTENT_AUDIO_MANIFEST_KEY } from "./episode-cache";
import type { ContentStore } from "./episode-cache";
import type { FetchText, FetchTextResult } from "./episode-remote";

/** 한 차례의 결과. 바뀐 것은 `updated` · `removed`뿐입니다. */
export type AudioManifestRefresh =
  | "updated"
  | "unchanged"
  | "removed"
  | "absent"
  | "unavailable"
  | "invalid";

export type AudioManifestDeps = { readonly fetchText: FetchText; readonly store: ContentStore };

function storeAvailable(store: ContentStore): boolean {
  try {
    return store.available();
  } catch {
    return false;
  }
}

/** 전송 호출이 reject하면 연결 실패로 봅니다. */
async function safeFetch(fetchText: FetchText): Promise<FetchTextResult> {
  try {
    return await fetchText(AUDIO_MANIFEST_PATH);
  } catch {
    return { ok: false, reason: "network" };
  }
}

function safeGet(store: ContentStore, key: string): string | null {
  try {
    return store.get(key);
  } catch {
    return null;
  }
}

function trySet(store: ContentStore, key: string, value: string): boolean {
  try {
    store.set(key, value);
    return true;
  } catch {
    return false;
  }
}

/** 서버에 없을 때 - 저장본이 있으면 지우고(`removed`), 원래 없었으면 `absent`입니다. */
function dropStored(store: ContentStore): AudioManifestRefresh {
  if (safeGet(store, CONTENT_AUDIO_MANIFEST_KEY) === null) return "absent";
  try {
    store.remove(CONTENT_AUDIO_MANIFEST_KEY);
    return "removed";
  } catch {
    return "unavailable";
  }
}

/**
 * `audio/manifest.json`을 한 번 받습니다. 유효하면 원문을 저장하고(같으면 그대로), 서버에 없으면(400 · 403 ·
 * 404 · 410) 저장본을 지우며, 그 밖 실패 · 형식 틀림은 저장본을 둡니다. 던지지 않습니다.
 */
export async function refreshAudioManifest(deps: AudioManifestDeps): Promise<AudioManifestRefresh> {
  const { fetchText, store } = deps;
  if (!storeAvailable(store)) return "unavailable";
  const reply = await safeFetch(fetchText);
  if (!reply.ok) return "unavailable";
  if (ABSENT_HTTP_CODES.has(reply.status)) return dropStored(store);
  if (reply.status !== 200) return "unavailable";
  if (parseAudioManifest(reply.text) === null) return "invalid";
  if (safeGet(store, CONTENT_AUDIO_MANIFEST_KEY) === reply.text) return "unchanged";
  return trySet(store, CONTENT_AUDIO_MANIFEST_KEY, reply.text) ? "updated" : "unavailable";
}

/** 다시 읽어야 하는가 - `updated` · `removed`. */
export function changesAudioTiming(result: AudioManifestRefresh): boolean {
  return result === "updated" || result === "removed";
}
