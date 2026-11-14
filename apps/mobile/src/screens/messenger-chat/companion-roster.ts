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
  /** 새 친구 시트의 첫 말(ADR-0137) — 서버 방은 열기 전엔 비어 있어 시트가 쓸 말이 없습니다. 방을 열면 서버 인사가 옵니다. */
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
    sheetOpening: { ko: "어서 와요. 오늘도 수고했어요.", en: "Welcome back. You did well today." },
  },
  {
    id: "mina",
    name: "미나",
    avatarPath: profile("mina-casual"),
    unlockEpisodeId: "u03-mina",
    unlockEpisode: 3,
    sheetOpening: { ko: "안녕! 나 미나야. 우리 문자하자!", en: "Hi! It's Mina. Let's text!" },
  },
  {
    id: "doyun",
    name: "한도윤",
    avatarPath: profile("doyun-casual"),
    unlockEpisodeId: "u12-cafe-missed",
    unlockEpisode: 12,
    sheetOpening: {
      ko: "안녕하세요! 저 도윤이에요. 반가워요!",
      en: "Hi! I'm Doyun. Nice to meet you!",
    },
  },
  {
    id: "jaemin",
    name: "서재민",
    avatarPath: profile("jaemin-casual"),
    unlockEpisodeId: "u17-samgyeopsal",
    unlockEpisode: 17,
    sheetOpening: {
      ko: "안녕하세요, 서재민입니다. 반갑습니다.",
      en: "Hello, this is Jaemin. Nice to meet you.",
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
