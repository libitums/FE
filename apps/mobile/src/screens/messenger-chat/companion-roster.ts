// 서버 인물 다섯의 앱 쪽 표입니다(ADR-0137, 통합 결정 4) — 서버 목록에 이름 · 아바타 · 해금 조건이 없어 앱이 가집니다. 순수.
// 이름은 학습 내용(인물 이름)이라 한글 그대로 둡니다(ui-copy 정책 허용 선언).

import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";
import { COMPANION_FRIENDS } from "./companion-friends-roster";
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

/**
 * 이야기 인물의 카탈로그 칸 — 태그는 MBTI 하나(정본 `docs/content/companion-friends.json`의 `storyProfiles`, ADR-0164), 카테고리 없음,
 * 먼저 만나기 제안 없음(운영에 가짜 제안을 싣지 않습니다, ADR-0162). 수위는 다섯 모두 standard입니다.
 */
const storyProfile = (mbti: string, intro: FriendProfile["intro"]) =>
  ({
    kind: "story",
    intro,
    tags: [{ en: mbti }],
    category: null,
    earlyAccess: null,
    romanceTier: "standard",
  }) as const;

export const COMPANION_CHARACTERS: readonly CompanionCharacter[] = [
  {
    id: "duksu",
    name: "덕수쌤",
    avatarPath: profile("ducksoo-casual"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: null,
    firstLine: "안녕하세요! 덕수쌤이에요.",
    ...storyProfile("ENFJ", {
      en: "Your Korean teacher",
      es: "Tu profesor de coreano",
      id: "Guru bahasa Korea-mu",
      ja: "あなたの韓国語の先生",
      vi: "Thầy dạy tiếng Hàn của bạn",
      th: "ครูสอนภาษาเกาหลีของคุณ",
      my: "သင့်ရဲ့ ကိုရီးယားစာ ဆရာ",
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
      es: "¿Llegó bien? Soy Jung Yoonkyung, de Ikseon Guesthouse.",
      id: "Sudah sampai dengan selamat? Saya Jung Yoonkyung dari Ikseon Guesthouse.",
      ja: "無事に着きましたか？益善ゲストハウスのチョン・ユンギョンです。",
      vi: "Bạn đến nơi an toàn chứ? Tôi là Jung Yoonkyung ở nhà nghỉ Ikseon.",
      th: "เดินทางมาถึงเรียบร้อยไหม? นี่ Jung Yoonkyung จากเกสต์เฮาส์ Ikseon",
      my: "ချောချောမောမော ရောက်ရဲ့လား။ Ikseon တည်းခိုခန်းက Jung Yoonkyung ပါ။",
    },
    firstLine: "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
    ...storyProfile("ISFJ", {
      en: "Owner of Ikseon Guesthouse",
      es: "Dueña de Ikseon Guesthouse",
      id: "Pemilik Ikseon Guesthouse",
      ja: "益善ゲストハウスのオーナー",
      vi: "Chủ nhà nghỉ Ikseon",
      th: "เจ้าของเกสต์เฮาส์ Ikseon",
      my: "Ikseon တည်းခိုခန်း ပိုင်ရှင်",
    }),
  },
  {
    id: "mina",
    name: "미나",
    avatarPath: profile("mina-casual"),
    unlockEpisodeId: "u03-mina",
    unlockEpisode: 3,
    sheetOpening: {
      ko: "안녕하세요! 같은 방 미나예요.",
      en: "Hi! It's Mina, your roommate.",
      es: "¡Hola! Soy Mina, tu compañera de cuarto.",
      id: "Hai! Aku Mina, teman sekamarmu.",
      ja: "こんにちは！同じ部屋のミナです。",
      vi: "Chào bạn! Mình là Mina, bạn cùng phòng.",
      th: "สวัสดี! เรา Mina รูมเมตของคุณเอง",
      my: "မင်္ဂလာပါ။ အခန်းဖော် Mina ပါ။",
    },
    firstLine: "안녕하세요! 같은 방 미나예요.",
    ...storyProfile("ESFJ", {
      en: "Your roommate at the guesthouse",
      es: "Tu compañera de cuarto en el hostal",
      id: "Teman sekamarmu di guesthouse",
      ja: "ゲストハウスのルームメイト",
      vi: "Bạn cùng phòng ở nhà nghỉ",
      th: "รูมเมตที่เกสต์เฮาส์",
      my: "တည်းခိုခန်းက အခန်းဖော်",
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
      es: "¡Hola! Soy Doyun, de Cafe Kkeullim.",
      id: "Hai! Ini Doyun dari Cafe Kkeullim.",
      ja: "こんにちは！カフェ・クルリムのドユンです。",
      vi: "Chào bạn! Mình là Doyun ở quán cà phê Kkeullim.",
      th: "สวัสดี! เรา Doyun จากคาเฟ่ Kkeullim",
      my: "မင်္ဂလာပါ။ Kkeullim ကော်ဖီဆိုင်က Doyun ပါ။",
    },
    firstLine: "안녕하세요! 카페 끌림 도윤이에요.",
    ...storyProfile("ENFP", {
      en: "Met at Cafe Kkeullim",
      es: "Lo conociste en Cafe Kkeullim",
      id: "Bertemu di Cafe Kkeullim",
      ja: "カフェ・クルリムで出会った",
      vi: "Gặp ở quán cà phê Kkeullim",
      th: "เจอกันที่คาเฟ่ Kkeullim",
      my: "Kkeullim ကော်ဖီဆိုင်မှာ တွေ့ခဲ့",
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
      es: "Soy Seo Jaemin.",
      id: "Ini Seo Jaemin.",
      ja: "ソ・ジェミンです。",
      vi: "Tôi là Seo Jaemin.",
      th: "นี่ Seo Jaemin",
      my: "Seo Jaemin ပါ။",
    },
    firstLine: "서재민이에요.",
    ...storyProfile("INTJ", {
      en: "Met by the guesthouse alley",
      es: "Lo conociste junto al callejón del hostal",
      id: "Bertemu di gang dekat guesthouse",
      ja: "ゲストハウスの路地で出会った",
      vi: "Gặp ở con hẻm gần nhà nghỉ",
      th: "เจอกันที่ซอยข้างเกสต์เฮาส์",
      my: "တည်းခိုခန်းနားက လမ်းကြားမှာ တွေ့ခဲ့",
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

/** 앱이 아는 인물 전부 — 이야기 인물 다섯 + 추천 친구 넷(ADR-0164). 서버 방 씨앗 · 카탈로그 · 목록 첫 줄이 씁니다. */
export const COMPANION_ROSTER: readonly CompanionCharacter[] = [
  ...COMPANION_CHARACTERS,
  ...COMPANION_FRIENDS,
];

/** 지금의 친구 카탈로그 — 이야기 인물 다섯 + 추천 친구 넷, 카테고리 없음. 보이는 친구는 서버가 정합니다(ADR-0164 D2). */
export const COMPANION_CATALOG: FriendCatalog = {
  characters: COMPANION_ROSTER,
  categories: [],
};

/** 서버 모드 출처의 씨앗입니다 — 대화는 서버가 주므로 방은 비어 있고 정해 둔 답이 없습니다. */
export function companionSeed(
  characters: readonly CompanionCharacter[] = COMPANION_ROSTER,
): ChatFixtureSeed {
  return { rooms: characters.map(roomOf) };
}

/** 첫 말 — 시트 첫 말과 같은 문장이면 그 영어 뜻을 같이 싣습니다(없으면 빈 뜻). */
const openingOf = (character: CompanionCharacter, firstLine: string) => ({
  ko: firstLine,
  en: character.sheetOpening?.ko === firstLine ? character.sheetOpening.en : "",
});

/** 비회원 출처의 씨앗입니다(ADR-0166) — 회원과 같은 방, 첫 인사 첫 줄을 열 때 놓을 첫 말로. 서버 요청 없이 앱 안에서만. */
export function guestCompanionSeed(
  characters: readonly CompanionCharacter[] = COMPANION_ROSTER,
): ChatFixtureSeed {
  return {
    rooms: characters.map((character) => ({
      ...roomOf(character),
      ...(character.firstLine === null
        ? {}
        : { opening: openingOf(character, character.firstLine) }),
    })),
  };
}
