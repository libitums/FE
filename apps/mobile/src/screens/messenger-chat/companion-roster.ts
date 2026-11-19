// 서버 인물 다섯의 앱 쪽 표입니다(ADR-0137, 통합 결정 4) — 서버 목록에 이름 · 아바타 · 해금 조건이 없어 앱이 가집니다. 순수.
// 이름은 학습 내용(인물 이름)이라 한글 그대로 둡니다(ui-copy 정책 허용 선언).

import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";
import type { FriendCatalog, FriendProfile } from "./friend-catalog.contract";

/**
 * 인물 한 명 — 친구 카탈로그의 모양(ADR-0162: 종류 · 소개 · 태그 · 카테고리 · 먼저 만나기)에 목록 미리보기 첫 줄을 더합니다.
 * `unlockEpisodeId`: 이 에피소드를 끝내고 뒤 컷까지 보면 열립니다(해금 JSON, ADR-0141). null = 처음부터(덕수쌤 · 일반 인물).
 * `sheetOpening`: 새 친구 시트의 첫 말(ADR-0137) — 해금 선톡이 서버에서 오기 전에도 시트가 서야 해서 앱이 그 첫 말풍선을 가집니다.
 * 정본은 해금 JSON의 `firstMessage` 첫 줄이고 서버가 저장하는 말과 같습니다(ADR-0152) — 시트와 대화방이 다른 말을 하지 않습니다.
 */
export type CompanionCharacter = FriendProfile & {
  /**
   * 첫 인사 첫 줄(한국어) — 아직 메시지가 없는 방의 목록 미리보기입니다(ADR-0113 추가 2026-11-17). 정본은 해금 JSON의 `firstMessage`
   * 첫 줄이고, 방을 처음 열면 서버가 그 말을 저장합니다(ADR-0152 D3). 기본 인물(덕수쌤)도 있습니다(시트는 없음).
   */
  readonly firstLine: string | null;
};

const profile = (name: string) => `content/images/profiles/${name}.webp`;

/** 이야기 인물의 카탈로그 칸 — 태그 · 카테고리 없음, 먼저 만나기 제안 없음(운영에 가짜 제안을 싣지 않습니다, ADR-0162). */
const storyProfile = (intro: FriendProfile["intro"]) =>
  ({ kind: "story", intro, tags: [], category: null, earlyAccess: null }) as const;

export const COMPANION_CHARACTERS: readonly CompanionCharacter[] = [
  {
    id: "duksu",
    name: "덕수쌤",
    avatarPath: profile("ducksoo-casual"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: null,
    firstLine: "안녕하세요! 덕수쌤이에요.",
    ...storyProfile({
      en: "Your Korean teacher",
      es: "Tu profesor de coreano",
      id: "Guru bahasa Korea-mu",
      ja: "あなたの韓国語の先生",
      vi: "Thầy dạy tiếng Hàn của bạn",
    }),
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
    firstLine: "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
    ...storyProfile({
      en: "Owner of Ikseon Guesthouse",
      es: "Dueña de Ikseon Guesthouse",
      id: "Pemilik Ikseon Guesthouse",
      ja: "益善ゲストハウスのオーナー",
      vi: "Chủ nhà nghỉ Ikseon",
    }),
  },
  {
    id: "mina",
    name: "미나",
    avatarPath: profile("mina-casual"),
    unlockEpisodeId: "u03-mina",
    unlockEpisode: 3,
    sheetOpening: { ko: "안녕하세요! 같은 방 미나예요.", en: "Hi! It's Mina, your roommate." },
    firstLine: "안녕하세요! 같은 방 미나예요.",
    ...storyProfile({
      en: "Your roommate at the guesthouse",
      es: "Tu compañera de cuarto en el hostal",
      id: "Teman sekamarmu di guesthouse",
      ja: "ゲストハウスのルームメイト",
      vi: "Bạn cùng phòng ở nhà nghỉ",
    }),
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
    firstLine: "안녕하세요! 카페 끌림 도윤이에요.",
    ...storyProfile({
      en: "Met at Cafe Kkeullim",
      es: "Lo conociste en Cafe Kkeullim",
      id: "Bertemu di Cafe Kkeullim",
      ja: "カフェ・クルリムで出会った",
      vi: "Gặp ở quán cà phê Kkeullim",
    }),
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
    firstLine: "서재민이에요.",
    ...storyProfile({
      en: "Met by the guesthouse alley",
      es: "Lo conociste junto al callejón del hostal",
      id: "Bertemu di gang dekat guesthouse",
      ja: "ゲストハウスの路地で出会った",
      vi: "Gặp ở con hẻm gần nhà nghỉ",
    }),
  },
];

const roomOf = (character: CompanionCharacter): ChatFixtureRoom => ({
  roomId: character.id,
  counterpart: { id: character.id, name: character.name, avatarPath: character.avatarPath },
  // 일반 인물은 에피소드가 없는 잠긴 방(0)으로 섭니다 — 목록은 잠긴 방을 보이지 않고, 「Start chatting」이 해금과 같은 길로 엽니다(ADR-0162 D4).
  access:
    character.kind === "general"
      ? { kind: "locked", unlockEpisode: 0 }
      : character.unlockEpisode === null
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

/** 지금의 친구 카탈로그 — 이야기 인물 다섯, 카테고리 없음. 서버 인물 목록이 생기면 포트가 그것으로 바꿉니다(ADR-0162). */
export const COMPANION_CATALOG: FriendCatalog = {
  characters: COMPANION_CHARACTERS,
  categories: [],
};

/** 서버 모드 출처의 씨앗입니다 — 대화는 서버가 주므로 방은 비어 있고 정해 둔 답이 없습니다. */
export function companionSeed(
  characters: readonly CompanionCharacter[] = COMPANION_CHARACTERS,
): ChatFixtureSeed {
  return { rooms: characters.map(roomOf) };
}
