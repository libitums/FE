// 서버 인물의 앱 쪽 표입니다(ADR-0137, 통합 결정 4) — 서버 목록에 이름 · 아바타 · 해금 조건 · 프로필이 없어 앱이 가집니다. 순수.
// 이야기 인물 다섯(에피소드 해금)과 추천 친구 넷(스토리 밖, 정본 docs/content/companion-friends.json)입니다.
// 이름 · 직업 · 소개 · 첫 말은 학습 내용(인물 데이터)이라 한글 그대로 둡니다(ui-copy 정책 허용 선언). 번역은 `companion-profile-l10n.ts`.

import type { CompanionAge } from "./chat-friends.contract";
import type { ChatFixtureRoom, ChatFixtureSeed } from "./chat-source.contract";

export type { CompanionAge };

export type CompanionProfile = {
  readonly age: CompanionAge;
  readonly job: { readonly ko: string; readonly en: string };
  readonly mbti: string;
  /** 한 줄 소개(인물이 직접 하는 말). 나머지 화면 언어 번역은 `companion-profile-l10n.ts`. */
  readonly bio: { readonly ko: string; readonly en: string };
};

export type CompanionCharacter = {
  readonly id: string;
  readonly name: string;
  /** story = 이야기 인물(에피소드 해금), friend = 추천 친구(서버가 보이게 한 인물만, 기기에서 추가). */
  readonly kind: "story" | "friend";
  readonly avatarPath: string | null;
  /** 이 에피소드를 끝내고 뒤 컷까지 보면 열립니다(해금 JSON, ADR-0141). null = 처음부터(추천 친구는 늘 null). */
  readonly unlockEpisodeId: string | null;
  readonly unlockEpisode: number | null;
  /**
   * 새 친구 시트의 첫 말(ADR-0137) — 해금 선톡이 서버에서 오기 전에도 시트가 서야 해서 앱이 그 첫 말풍선을 가집니다.
   * 정본은 해금 JSON(추천 친구는 친구 JSON)의 `firstMessage` 첫 줄이고 서버가 저장하는 말과 같습니다(ADR-0152).
   */
  readonly sheetOpening: { readonly ko: string; readonly en: string } | null;
  /**
   * 첫 인사 첫 줄(한국어) — 아직 메시지가 없는 방의 목록 미리보기입니다(ADR-0113 추가 2026-11-17). 정본은 `firstMessage`
   * 첫 줄이고, 방을 처음 열면 서버가 그 말을 저장합니다(ADR-0152 D3). 기본 인물(덕수쌤)도 있습니다(시트는 없음).
   */
  readonly firstLine: string | null;
  /** 추천 친구의 로맨스 등급(친구 JSON). 실제 적용은 서버가 정합니다(성인 · 성인 확인). 이야기 인물은 null. */
  readonly romanceTier: "open" | "standard" | null;
  readonly profile: CompanionProfile;
};

const profile = (name: string) => `content/images/profiles/${name}.webp`;
const years = (value: number): CompanionAge => ({ kind: "years", value });

export const COMPANION_CHARACTERS: readonly CompanionCharacter[] = [
  {
    id: "duksu",
    name: "덕수쌤",
    kind: "story",
    avatarPath: profile("ducksoo-casual"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: null,
    firstLine: "안녕하세요! 덕수쌤이에요.",
    romanceTier: null,
    profile: {
      age: { kind: "decade", value: 30 },
      job: { ko: "한국어 선생님", en: "Korean teacher" },
      mbti: "ENFJ",
      bio: {
        ko: "밖에서 한국어를 가르쳐요. 낱말 퀴즈 좋아해요!",
        en: "I teach Korean outdoors. I love word quizzes!",
      },
    },
  },
  {
    id: "yoonkyung",
    name: "정윤경",
    kind: "story",
    avatarPath: profile("yoonkyung-casual"),
    unlockEpisodeId: "u01-water",
    unlockEpisode: 1,
    sheetOpening: {
      ko: "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
      en: "Did you get here okay? This is Jung Yoonkyung from Ikseon Guesthouse.",
    },
    firstLine: "잘 도착했어요? 익선 게스트하우스 정윤경이에요.",
    romanceTier: null,
    profile: {
      age: years(69),
      job: { ko: "익선 게스트하우스 사장", en: "Owner of Ikseon Guesthouse" },
      mbti: "ISFJ",
      bio: {
        ko: "익선동에서 게스트하우스를 해요. 밥은 먹었어요?",
        en: "I run a guesthouse in Ikseon-dong. Have you eaten?",
      },
    },
  },
  {
    id: "mina",
    name: "미나",
    kind: "story",
    avatarPath: profile("mina-casual"),
    unlockEpisodeId: "u03-mina",
    unlockEpisode: 3,
    sheetOpening: { ko: "안녕하세요! 같은 방 미나예요.", en: "Hi! It's Mina, your roommate." },
    firstLine: "안녕하세요! 같은 방 미나예요.",
    romanceTier: null,
    profile: {
      age: { kind: "range", from: 25, to: 26 },
      job: { ko: "배낭여행자 (스위스)", en: "Backpacker from Switzerland" },
      mbti: "ESFJ",
      bio: {
        ko: "스위스에서 한국어 배우러 왔어요. 같이 다녀요!",
        en: "I came from Switzerland to learn Korean. Let's explore together!",
      },
    },
  },
  {
    id: "doyun",
    name: "한도윤",
    kind: "story",
    avatarPath: profile("doyun-casual"),
    unlockEpisodeId: "u12-cafe-missed",
    unlockEpisode: 12,
    sheetOpening: {
      ko: "안녕하세요! 카페 끌림 도윤이에요.",
      en: "Hi! It's Doyun from Cafe Kkeullim.",
    },
    firstLine: "안녕하세요! 카페 끌림 도윤이에요.",
    romanceTier: null,
    profile: {
      age: years(22),
      job: { ko: "카페 아르바이트 · 아이돌 연습생", en: "Café part-timer & idol trainee" },
      mbti: "ENFP",
      bio: {
        ko: "카페 끌림에서 일해요. 궁금한 게 많아요!",
        en: "I work at Cafe Kkeullim. I'm curious about everything!",
      },
    },
  },
  {
    id: "jaemin",
    name: "서재민",
    kind: "story",
    avatarPath: profile("jaemin-casual"),
    unlockEpisodeId: "u17-samgyeopsal",
    unlockEpisode: 17,
    sheetOpening: { ko: "서재민이에요.", en: "It's Seo Jaemin." },
    firstLine: "서재민이에요.",
    romanceTier: null,
    profile: {
      age: years(29),
      job: { ko: "테크 회사 B2B 영업", en: "B2B sales at a tech company" },
      mbti: "INTJ",
      bio: {
        ko: "테크 회사에 다녀요. 카페 창가 자리를 좋아해요.",
        en: "I work at a tech company. I like the window seat at the café.",
      },
    },
  },
  {
    id: "seoyeon",
    name: "차서연",
    kind: "friend",
    avatarPath: profile("seoyeon"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: { ko: "안녕하세요, 차서연이에요.", en: "Hi, I'm Cha Seoyeon." },
    firstLine: "안녕하세요, 차서연이에요.",
    romanceTier: "open",
    profile: {
      age: years(28),
      job: { ko: "타투이스트 · 일러스트레이터", en: "Tattoo artist & illustrator" },
      mbti: "ENTP",
      bio: {
        ko: "성수동에서 타투 해요. 그림 얘기, 아무 얘기 다 좋아요.",
        en: "I do tattoos in Seongsu. Art talk, any talk — all good.",
      },
    },
  },
  {
    id: "haejun",
    name: "권해준",
    kind: "friend",
    avatarPath: profile("haejun"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: { ko: "안녕하세요, 권해준이에요.", en: "Hi, I'm Kwon Haejun." },
    firstLine: "안녕하세요, 권해준이에요.",
    romanceTier: "open",
    profile: {
      age: years(31),
      job: { ko: "LP 바 사장", en: "LP bar owner" },
      mbti: "ESFJ",
      bio: {
        ko: "망원동에서 작은 LP 바 해요. 좋은 노래 알려 줄게요.",
        en: "I run a small LP bar in Mangwon. I'll share good songs with you.",
      },
    },
  },
  {
    id: "daeun",
    name: "송다은",
    kind: "friend",
    avatarPath: profile("daeun"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: { ko: "안녕하세요! 송다은이에요.", en: "Hello! I'm Song Daeun." },
    firstLine: "안녕하세요! 송다은이에요.",
    romanceTier: "standard",
    profile: {
      age: years(23),
      job: {
        ko: "대학생 (컴퓨터공학과 3학년)",
        en: "University student (Computer Science, 3rd year)",
      },
      mbti: "INFP",
      bio: {
        ko: "컴공 3학년이에요. 게임이랑 아이돌 좋아해요. 외국인 친구 사귀고 싶어요!",
        en: "CS junior. I love games and idols. I want to make a foreign friend!",
      },
    },
  },
  {
    id: "geonwoo",
    name: "임건우",
    kind: "friend",
    avatarPath: profile("geonwoo"),
    unlockEpisodeId: null,
    unlockEpisode: null,
    sheetOpening: { ko: "안녕하세요! 임건우예요.", en: "Hello! I'm Lim Geonwoo." },
    firstLine: "안녕하세요! 임건우예요.",
    romanceTier: "standard",
    profile: {
      age: years(24),
      job: {
        ko: "대학생 (경영학과 2학년, 복학생)",
        en: "University student (Business, 2nd year, back from military service)",
      },
      mbti: "ESTP",
      bio: {
        ko: "복학생이에요. 달리기랑 맛집 좋아해요. 같이 한국어 연습해요!",
        en: "Back at uni after the army. I like running and good food. Let's practise Korean together!",
      },
    },
  },
];

/** id로 인물 하나 — 없으면 null. */
export function companionCharacterOf(id: string): CompanionCharacter | null {
  return COMPANION_CHARACTERS.find((character) => character.id === id) ?? null;
}

/** 추천 친구(스토리 밖 인물)인가. */
export const isFriendCharacter = (id: string): boolean =>
  companionCharacterOf(id)?.kind === "friend";

const roomOf = (character: CompanionCharacter): ChatFixtureRoom => ({
  roomId: character.id,
  counterpart: { id: character.id, name: character.name, avatarPath: character.avatarPath },
  // 추천 친구는 추가하기 전까지 목록에 없습니다(addable) — 추가하면 열립니다(기기 기록, ADR-0117).
  access:
    character.kind === "friend"
      ? { kind: "addable" }
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

/** 서버 모드 출처의 씨앗입니다 — 대화는 서버가 주므로 방은 비어 있고 정해 둔 답이 없습니다. */
export function companionSeed(): ChatFixtureSeed {
  return { rooms: COMPANION_CHARACTERS.map(roomOf) };
}
