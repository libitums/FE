// 가짜 대화 씨앗(한국어 학습 내용)입니다. 한글은 이 한 선언에만 둡니다(ui-copy 정책 허용 대상).
// 사람 · 그림은 기존 에피소드 콘텐츠가 이미 쓰는 것만 씁니다(spec §5.1). 영어 시점 제목은 1단계 자리 표시입니다.

import { chatFixtureCorrections } from "./chat-fixture-corrections";
import type {
  ChatFixtureMeaning,
  ChatFixtureRoom,
  ChatFixtureSeed,
  ChatStoryPoint,
} from "./chat-source.contract";

const profileImage = (name: string) => `content/images/profiles/${name}.webp`;

const storyPointsFor = (prefix: string, unlockedUpTo: number): readonly ChatStoryPoint[] => [
  {
    id: `${prefix}-sp-1`,
    episodeNumber: 1,
    title: "Buying water",
    relation: "just-met",
    unlocked: unlockedUpTo >= 1,
  },
  {
    id: `${prefix}-sp-2`,
    episodeNumber: 2,
    title: "Checking in",
    relation: "getting-to-know",
    unlocked: unlockedUpTo >= 2,
  },
  {
    id: `${prefix}-sp-3`,
    episodeNumber: 3,
    title: "Meeting Mina",
    relation: "friends",
    unlocked: unlockedUpTo >= 3,
  },
];

export const chatFixtureSeed: ChatFixtureSeed = (() => {
  const { questionFix, coffeeFix, politeFix, englishFix } = chatFixtureCorrections;
  const rooms: readonly ChatFixtureRoom[] = [
    {
      roomId: "mina",
      counterpart: {
        id: "mina",
        name: "미나",
        avatarPath: profileImage("mina-casual"),
      },
      access: { kind: "locked", unlockEpisode: 3 },
      unread: 0,
      messages: [],
      opening: {
        ko: "안녕하세요! 저는 미나예요. 만나서 반가워요.",
        en: "Hi! I'm Mina. Nice to meet you.",
      },
      storyPoints: storyPointsFor("mina", 3),
      settings: { autoIdeas: true, storyPointId: "mina-sp-3" },
      ideaSets: [
        [
          { ko: "좋아요, 같이 가요.", roman: "joayo, gachi gayo.", en: "Sure, let's go together." },
          { ko: "언제 시간 있어요?", roman: "eonje sigan isseoyo?", en: "When are you free?" },
          { ko: "어느 카페가 좋아요?", roman: "eoneu kape-ga joayo?", en: "Which cafe is good?" },
        ],
        [
          { ko: "주말에 어때요?", roman: "jumare eottaeyo?", en: "How about the weekend?" },
          {
            ko: "저는 라테를 좋아해요.",
            roman: "jeoneun latereul joahaeyo.",
            en: "I like lattes.",
          },
          { ko: "내일도 괜찮아요.", roman: "naeildo gwaenchanayo.", en: "Tomorrow is fine too." },
        ],
        [
          { ko: "사진 보내 주세요.", roman: "sajin bonae juseyo.", en: "Please send a photo." },
          { ko: "거기 멀어요?", roman: "geogi meoreoyo?", en: "Is it far from there?" },
          { ko: "기대돼요!", roman: "gidaedwaeyo!", en: "I'm looking forward to it!" },
        ],
      ],
      cannedReplies: [
        { ko: "좋아요! 토요일 어때요?", en: "Great! How about Saturday?" },
        { ko: "저는 조용한 카페가 좋아요.", en: "I like quiet cafes." },
        { ko: "그럼 그때 만나요.", en: "Then let's meet then." },
      ],
      photoPath: profileImage("mina-casual"),
      voiceLine: {
        durationMs: 4200,
        text: { ko: "내일 만나요. 기대돼요!", en: "See you tomorrow. I'm looking forward to it!" },
      },
    },
    {
      roomId: "owner",
      counterpart: {
        id: "owner",
        name: "사장님",
        avatarPath: profileImage("yunkyung-casual"),
      },
      access: { kind: "open" },
      unread: 0,
      messages: [
        {
          kind: "text",
          from: "them",
          text: { ko: "예약 확인했어요.", en: "I checked your booking." },
          minutesAgo: 1500,
        },
      ],
      storyPoints: storyPointsFor("owner", 2),
      settings: { autoIdeas: true, storyPointId: "owner-sp-2" },
      ideaSets: [
        [
          {
            ko: "몇 시에 체크인해요?",
            roman: "myeot sie chekeuinhaeyo?",
            en: "What time is check-in?",
          },
          { ko: "와이파이 있어요?", roman: "waipai isseoyo?", en: "Is there Wi-Fi?" },
          {
            ko: "짐을 맡길 수 있어요?",
            roman: "jimeul matgil su isseoyo?",
            en: "Can I leave my bags?",
          },
        ],
        [
          {
            ko: "아침 식사가 있어요?",
            roman: "achim siksaga isseoyo?",
            en: "Is breakfast included?",
          },
          {
            ko: "열쇠는 어디에 있어요?",
            roman: "yeolsoeneun eodie isseoyo?",
            en: "Where is the key?",
          },
          { ko: "고맙습니다.", roman: "gomapseumnida.", en: "Thank you." },
        ],
        [
          {
            ko: "근처에 식당이 있어요?",
            roman: "geuncheoe sikdangi isseoyo?",
            en: "Is there a restaurant nearby?",
          },
          { ko: "택시를 부탁해요.", roman: "taeksireul butakhaeyo.", en: "Please call a taxi." },
          { ko: "잘 알겠어요.", roman: "jal algesseoyo.", en: "Got it." },
        ],
      ],
      cannedReplies: [
        { ko: "네, 오후 세 시부터예요.", en: "Yes, from three in the afternoon." },
        { ko: "와이파이는 무료예요.", en: "The Wi-Fi is free." },
      ],
      photoPath: profileImage("yunkyung-casual"),
      voiceLine: {
        durationMs: 3600,
        text: { ko: "어서 오세요. 편하게 쉬세요.", en: "Welcome. Make yourself at home." },
      },
    },
    {
      roomId: "guesthouse",
      counterpart: {
        id: "guesthouse",
        name: "익선 게스트하우스",
        avatarPath: profileImage("yunkyung-casual"),
      },
      access: { kind: "open" },
      unread: 1,
      messages: [
        {
          kind: "text",
          from: "me",
          text: { ko: questionFix.original, en: "What time is check-out?" },
          minutesAgo: 360,
          correction: questionFix,
        },
        {
          kind: "text",
          from: "them",
          text: { ko: "내일 체크아웃은 열한 시예요.", en: "Tomorrow's check-out is at eleven." },
          minutesAgo: 300,
        },
      ],
      storyPoints: storyPointsFor("guesthouse", 2),
      settings: { autoIdeas: false, storyPointId: "guesthouse-sp-1" },
      ideaSets: [
        [
          { ko: "알겠습니다.", roman: "algesseumnida.", en: "Understood." },
          {
            ko: "조금 늦어도 돼요?",
            roman: "jogeum neujeodo dwaeyo?",
            en: "Can I be a little late?",
          },
          {
            ko: "짐은 어디에 둬요?",
            roman: "jimeun eodie dwoyo?",
            en: "Where do I leave my bags?",
          },
        ],
        [
          {
            ko: "하루 더 묵고 싶어요.",
            roman: "haru deo mukgo sipeoyo.",
            en: "I want to stay one more day.",
          },
          {
            ko: "수건이 더 필요해요.",
            roman: "sugeoni deo piryohaeyo.",
            en: "I need more towels.",
          },
          { ko: "방이 아주 좋아요.", roman: "bangi aju joayo.", en: "The room is very nice." },
        ],
      ],
      cannedReplies: [
        { ko: "네, 괜찮아요.", en: "Yes, that's fine." },
        { ko: "프런트에 말씀해 주세요.", en: "Please tell the front desk." },
      ],
      photoPath: profileImage("yunkyung-casual"),
      voiceLine: {
        durationMs: 3000,
        text: { ko: "안녕히 가세요.", en: "Goodbye." },
      },
    },
    {
      roomId: "clerk",
      counterpart: { id: "clerk", name: "점원", avatarPath: null },
      access: { kind: "locked", unlockEpisode: 4 },
      unread: 0,
      messages: [],
      storyPoints: storyPointsFor("clerk", 0),
      settings: { autoIdeas: true, storyPointId: "clerk-sp-1" },
      ideaSets: [
        [
          { ko: "아메리카노 주세요.", roman: "amerikano juseyo.", en: "An americano, please." },
          { ko: "얼마예요?", roman: "eolmayeyo?", en: "How much is it?" },
          { ko: "여기에서 먹을게요.", roman: "yeogieseo meogeulgeyo.", en: "I'll have it here." },
        ],
      ],
      cannedReplies: [],
      photoPath: null,
      voiceLine: { durationMs: 2000, text: { ko: "어서 오세요.", en: "Welcome." } },
    },
  ];
  // 뜻 표 — 보기 세트 문장은 그 로마자 · 영어를 그대로 쓰고, 씨앗 내 글 · 교정 표 글을 더합니다.
  const meanings: readonly ChatFixtureMeaning[] = [
    ...rooms.flatMap((room) =>
      room.ideaSets.flatMap((set) =>
        set.map((idea) => ({ ko: idea.ko, romanization: idea.roman, meaning: idea.en })),
      ),
    ),
    {
      ko: questionFix.original,
      romanization: "jeo chekeuaut myeot siyeyo?",
      meaning: "What time is check-out?",
    },
    {
      ko: coffeeFix.original,
      romanization: "jeo keopi joahaeyo.",
      meaning: "I like coffee.",
    },
  ];
  return {
    rooms,
    meanings,
    corrections: [questionFix, coffeeFix, politeFix, englishFix],
    fallbackMeaning: { romanization: "…", meaning: "Meaning coming soon" },
    // 대화 설정(ADR-0126)의 기억 화면 1단계 가짜 데이터입니다 — 서버가 들어오면 서버 기억으로 바뀝니다.
    memories: {
      shared: [
        "You're from Manila and moved to Seoul in October.",
        "You're preparing for TOPIK II.",
      ],
      byCharacter: {
        mina: [
          "You like iced americano and want to try a hanok café.",
          "Your Korean test is on December 14.",
        ],
        owner: ["You're staying near Ikseon-dong this week."],
      },
    },
  };
})();
