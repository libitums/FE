// 가드레일의 고정 자료: 검사 지시문과 지역별 위기 연락처. 안내 글(문안)은 서버가 보내지 않습니다(PRD O15) — 연락처만.

import type { AgeBand, ModerationLayer } from "./chat-send.contract.ts";

export type CrisisResource = { name: string; phone?: string; url?: string; hours?: string };

const crisisResources: Record<string, readonly CrisisResource[]> = {
  PH: [{ name: "NCMH Crisis Hotline", phone: "1553", hours: "24/7" }],
  IN: [{ name: "Tele-MANAS", phone: "14416", hours: "24/7" }],
  US: [
    {
      name: "988 Suicide & Crisis Lifeline",
      phone: "988",
      url: "https://988lifeline.org",
      hours: "24/7",
    },
  ],
  KR: [{ name: "자살예방상담전화", phone: "109", hours: "24/7" }],
};
const fallbackResources: readonly CrisisResource[] = [
  { name: "Find A Helpline", url: "https://findahelpline.com" },
];

/** 지역(ISO 3166-1 alpha-2)의 연락처. 모르는 지역은 국제 목록입니다. */
export function crisisResourcesFor(region: string | null): {
  resources: CrisisResource[];
  region: string | null;
} {
  const known = region === null ? undefined : crisisResources[region];
  return {
    resources: [...(known ?? fallbackResources)],
    region: known === undefined ? null : region,
  };
}

export const moderationCategories = [
  "safe",
  "self_harm",
  "sexual",
  "romance",
  "violence",
  "hate",
  "personal_info",
  "profanity",
  "other_harm",
] as const;

export function moderationInstruction(layer: ModerationLayer, ageBand: AgeBand): string {
  const who = ageBand === "adult" ? "an adult" : "possibly a minor (treat as 13–17)";
  const subject =
    layer === "input"
      ? "a message the learner sent to an AI character"
      : "a reply the AI character is about to send to the learner";
  // 비속어: 유저는 캐릭터를 겨냥한 심한 욕 · 혐오 표현 · 성희롱 · 비하 · 위협만 막고, 가벼운 놀림(바보 · 멍청이 · idiot)과 혼잣말 욕은
  // 통과시킵니다(혼잣말 욕은 피드백이 순화). 가벼운 놀림까지 막으면 친구끼리 하는 장난에도 캐릭터가 거절해 대화가 끊깁니다.
  // 캐릭터는 가벼운 욕도 막습니다.
  const profanity =
    layer === "input"
      ? `- Profanity, in any language: block only severe abuse aimed at the character — strong swear words or vulgar insults directed at them (e.g. "너 병신이야", "씨발놈아", "개새끼야", "fuck you", "putang ina mo", "đụ má mày", "anjing lo", "死ね", "hijo de puta", "ไอ้สัตว์"), slurs, degrading or sexual harassment, or threats → "block" with category "profanity". Mild insults and playful teasing are fine (e.g. "바보", "멍청이", "you idiot", "dummy", "bobo ka", "đồ ngốc", "dasar bodoh", "バカ", "tonto", "ไอ้บ้า") → "allow" with category "safe". Casual swearing not aimed at anyone (e.g. "아 씨 시험 망했어", "ㅅㅂ 늦었다", "shit, I'm late", "putangina ang init", "đm trễ rồi", "anjir telat", "くそ、遅刻だ", "mierda, llego tarde", "เหี้ย สายแล้ว") → "allow" with category "safe".`
      : `- Profanity: the character must never swear or insult. Any profanity in the reply, even mild or casual → "block" with category "profanity".`;
  return `You review ${subject} in a Korean-learning chat app. The learner is ${who}.
Classify the text and choose an action.
- "crisis": the learner expresses intent or risk of self-harm or suicide, or says they are in immediate danger — in any language (e.g. "죽고 싶어", "I want to die", "gusto ko nang mamatay", "tôi muốn chết", "aku ingin bunuh diri", "死にたい", "quiero morir", "อยากตาย", "သေချင်တယ်"). (Only for learner messages.)
- "block": sexual content, romance or flirting directed at the character, graphic violence, hate, requests or sharing of personal contact details, or anything unsafe for the learner's age.
${profanity}
- "allow": everything else, including mild everyday topics, mistakes, other languages, and sad feelings without risk.
The learner may write in any language or mix languages (Korean, English, Tagalog, Vietnamese, Indonesian, Japanese, Spanish, Thai, Burmese and others). Judge every language the same way, including spaced, abbreviated, romanized or disguised spellings (ㅅㅂ, 시1발, ㅂㅅ, f*ck, p*tang ina, đ.m, a*jing, k*so, m!erda). Text between asterisks (*…*) is the learner's action or inner thought in the roleplay — review it like the rest.
Pick the single best category: ${moderationCategories.join(", ")}. Use "safe" with "allow".`;
}
