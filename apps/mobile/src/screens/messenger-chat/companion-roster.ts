// 서버 인물 다섯의 앱 쪽 표입니다(ADR-0137, 통합 결정 4) — 서버 목록에 이름 · 아바타 · 해금 조건이 없어 앱이 가집니다. 순수.
// 이름은 학습 내용(인물 이름)이라 한글 그대로 둡니다(ui-copy 정책 허용 선언).

import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";

export type CompanionCharacter = {
  readonly id: string;
  readonly name: string;
  readonly avatarPath: string | null;
  /** 이 에피소드를 끝내고 뒤 컷까지 보면 열립니다(해금 JSON, ADR-0141). null = 처음부터. */
  readonly unlockEpisodeId: string | null;
  readonly unlockEpisode: number | null;
  /**
   * 새 친구 시트의 첫 말(ADR-0137) — 해금 선톡이 서버에서 오기 전에도 시트가 서야 해서 앱이 그 첫 말풍선을 가집니다.
   * 정본은 해금 JSON의 `firstMessage` 첫 줄이고 서버가 저장하는 말과 같습니다(ADR-0152) — 시트와 대화방이 다른 말을 하지 않습니다.
   */
  readonly sheetOpening: { readonly ko: string; readonly en: string } | null;
};

const profile = (name: string) => `content/images/profiles/${name}.webp`;

export const COMPANION_CHARACTERS: readonly CompanionCharacter[] = [
  {
    id: "duksu",
    name: "덕수쌤",
    avatarPath: profile("ducksoo-casual"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: null,
  },
  {
    id: "yoonkyung",
    name: "정윤경",
    avatarPath: profile("yoonkyung-casual"),
    unlockEpisodeId: "u01-water",
    unlockEpisode: 1,
    sheetOpening: {
      ko: "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
      en: "Did you get here okay? This is Jung Yoonkyung from Ikseon Guesthouse.",
    },
  },
  {
    id: "mina",
    name: "미나",
    avatarPath: profile("mina-casual"),
    unlockEpisodeId: "u03-mina",
    unlockEpisode: 3,
    sheetOpening: { ko: "안녕하세요! 같은 방 미나예요.", en: "Hi! It's Mina, your roommate." },
  },
  {
    id: "doyun",
    name: "한도윤",
    avatarPath: profile("doyun-casual"),
    unlockEpisodeId: "u12-cafe-missed",
    unlockEpisode: 12,
    sheetOpening: {
      ko: "안녕하세요! 카페 끌림 도윤이에요.",
      en: "Hi! It's Doyun from Cafe Kkeullim.",
    },
  },
  {
    id: "jaemin",
    name: "서재민",
    avatarPath: profile("jaemin-casual"),
    unlockEpisodeId: "u17-samgyeopsal",
    unlockEpisode: 17,
    sheetOpening: {
      ko: "서재민이에요.",
      en: "It's Seo Jaemin.",
    },
  },
];

const roomOf = (character: CompanionCharacter): ChatFixtureRoom => ({
  roomId: character.id,
  counterpart: { id: character.id, name: character.name, avatarPath: character.avatarPath },
  access:
    character.unlockEpisode === null
      ? { kind: "open" }
      : { kind: "locked", unlockEpisode: character.unlockEpisode },
  unread: 0,
  messages: [],
  // 이야기 시점은 서버가 아직 받지 않습니다 — 방 사이드바 줄은 앱 안에서만 바뀝니다(2026-11-12 결정).
  storyPoints: [],
  settings: { autoIdeas: true, storyPointId: "" },
  ideaSets: [],
  cannedReplies: [],
  photoPath: character.avatarPath,
  voiceLine: { durationMs: 3000, text: { ko: "", en: "" } },
});

/** 서버 모드 출처의 씨앗입니다 — 대화는 서버가 주므로 방은 비어 있고 정해 둔 답이 없습니다. */
export function companionSeed(): ChatFixtureSeed {
  return { rooms: COMPANION_CHARACTERS.map(roomOf) };
}
