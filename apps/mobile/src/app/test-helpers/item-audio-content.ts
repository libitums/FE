// 문항 음성 integration 테스트의 내장 에피소드 변형입니다. 제품 코드가 import하지 않습니다.
// 내장 u01~u03에는 문항 `audio_url`이 없어, 같은 구조에 문항마다 음성 id를 싣은 사본을 만듭니다.
// 이름에 `.test.`를 넣지 않습니다.

const ITEM_TYPES_WITH_SOUND: ReadonlySet<string> = new Set([
  "LISTEN_SELECT",
  "MIN_PAIR_AB",
  "REPLY_SELECT",
  "LISTEN_BUILD",
  "DICTATION",
  "SHADOW",
  "TRANSLATE_TO_KO",
  "TRANSLATE_TO_EN",
  "WORD_ORDER",
  "SYLLABLE_BUILD",
  "SPEAK_WORD",
  "IMG_MATCH",
]);

type WireItem = { id?: string; type?: string; stimulus?: Record<string, unknown> };
type WireEpisode = { steps?: { items?: WireItem[] }[] };

/** 문항 음성 id는 `<에피소드>/<문항 id 소문자>`입니다 — 재생 주소는 `audio/<id>.m4a`가 됩니다. */
export const itemAudioId = (episodeId: string, itemId: string): string =>
  `${episodeId}/${itemId.toLowerCase()}`;

/** 열두 유형의 문항에 `stimulus.audio_url`을 싣은 사본을 돌려줍니다. 원본은 바꾸지 않습니다. */
export function withItemAudioIds(episode: unknown, episodeId: string): unknown {
  const copy = JSON.parse(JSON.stringify(episode)) as WireEpisode;
  for (const step of copy.steps ?? []) {
    for (const item of step.items ?? []) {
      if (item.id === undefined || item.type === undefined) continue;
      if (!ITEM_TYPES_WITH_SOUND.has(item.type)) continue;
      item.stimulus = { ...(item.stimulus ?? {}), audio_url: itemAudioId(episodeId, item.id) };
    }
  }
  return copy;
}
