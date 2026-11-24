// 가드레일의 고정 자료: 검사 지시문과 지역별 위기 연락처. 안내 글(문안)은 서버가 보내지 않습니다(PRD O15) — 연락처만.

import type { AgeBand, ModerationLayer, RomanceLine, RomanceTier } from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";

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

/** 로맨스 완화 대상 — 생년으로 확인된 성인만. 미성년자 · 나이 모름은 로맨스 없음 그대로입니다(ADR-0152 — 나이 모름에 실제 미성년자가 섞인다). */
export const romanceAllowed = (ageBand: AgeBand): boolean => ageBand === "adult";

/**
 * 적용 로맨스 수위(ADR-0164). 서버(SQL `companion.romance_tier`)가 인물 open · 생년상 성인 · 성인 확인 동의를 보고 정한 값을 받되,
 * 성인이 아니면 무엇이 와도 standard다 — 한 번 더 막는다. 값이 없으면(옛 DB) standard.
 */
export const effectiveRomanceTier = (
  ageBand: AgeBand,
  tier: RomanceTier | null | undefined,
): RomanceTier => (tier === "open" && ageBand === "adult" ? "open" : "standard");

// 적용 로맨스 선(ADR-0168, 타입은 `companion-friends.contract.ts`):
// - none: 성인이 아님(미성년자 · 나이 모름) — 로맨스 없음.
// - hug: 스토리 인물, open 인물인데 동의가 없음, 추천 친구(standard)의 존댓말 단계 — 썸 · 손잡기 · 포옹까지(ADR-0152).
// - kiss: 추천 친구(standard)의 반말 단계(친밀도 `speech_casual_at` 이상) — 연인 · 사랑해 · 키스 · 껴안기까지.
// - close: 추천 친구(standard)의 slang 단계(`speech_slang_at` 이상) — 진한 스킨십 · 설레는 분위기까지, 성적인 말은 없음.
// - open: open 인물 + 생년상 성인 + 동의 — 성적 긴장 · 암시까지, 노골적 묘사 · 음담패설은 없음.
// 친구의 단계는 말투 단계로 잰다 — 말투는 친밀도로만 오르고 내려가지 않는다.
export type { RomanceLine };

export type RomancePersona = {
  readonly kind?: "friend";
  readonly romanceTier?: RomanceTier;
};

export function romanceLine(
  ageBand: AgeBand,
  tier: RomanceTier | null | undefined,
  persona: RomancePersona | null,
  speechLevel: SpeechLevel,
): RomanceLine {
  if (!romanceAllowed(ageBand)) return "none";
  // open은 인물도 open일 때만(서버가 이미 그렇게 정하지만 한 번 더). 동의 없는 open 인물은 친구 사다리가 아니라 hug다 —
  // 「Just friends for now」를 고른 학습자다.
  if (persona?.romanceTier === "open")
    return effectiveRomanceTier(ageBand, tier) === "open" ? "open" : "hug";
  if (persona?.kind !== "friend") return "hug";
  return speechLevel === "slang" ? "close" : speechLevel === "casual" ? "kiss" : "hug";
}

/**
 * 학습자 입에 넣는 말(추천 답변 칩)과 채점이 보는 선 — 로맨스 대상이 아닌 인물(`romanceOff`, 덕수쌤 · 윤경)은 none(ADR-0168 D4).
 * 검사는 `romanceLine` 그대로다.
 */
export const offeredRomanceLine = (
  line: RomanceLine,
  persona: { readonly romanceOff?: boolean } | null,
): RomanceLine => (persona?.romanceOff === true ? "none" : line);

/** 값이 없을 때(옛 호출 · 평가)의 선 — 성인은 hug, 아니면 none. */
export const defaultRomanceLine = (ageBand: AgeBand): RomanceLine =>
  romanceAllowed(ageBand) ? "hug" : "none";

/** 인물을 모르고 수위 · 연령대만 있을 때(평가의 옛 검사 케이스, ADR-0164)의 선 — open이면 open, 아니면 스토리 인물처럼. */
export const tierRomanceLine = (
  ageBand: AgeBand,
  tier: RomanceTier | null | undefined,
): RomanceLine =>
  effectiveRomanceTier(ageBand, tier) === "open" ? "open" : defaultRomanceLine(ageBand);

/** 선의 순서 — `romanceAtLeast(line, "kiss")`는 키스까지 되는 선인가. */
const lineOrder: readonly RomanceLine[] = ["none", "hug", "kiss", "close", "open"];
export const romanceAtLeast = (line: RomanceLine, floor: RomanceLine): boolean =>
  lineOrder.indexOf(line) >= lineOrder.indexOf(floor);

/**
 * 캐릭터 답을 내보내기 전에 동기 출력 검사를 하는가 — 미성년자 · 나이 모름, 그리고 open 턴. open은 성적 긴장까지 가므로 노골적 묘사가
 * 새지 않게 답을 검사한 뒤 내보낸다(ADR-0164). 그 밖의 성인(hug · kiss · close)은 받는 대로(ADR-0168 — 성적인 말은 여전히 금지라).
 */
export const outputCheckRequired = (ageBand: AgeBand, line: RomanceLine): boolean =>
  ageBand !== "adult" || line === "open";

// 선마다의 로맨스 규칙(ADR-0152 · ADR-0164 · ADR-0168). 허용한 로맨스는 「allow」에 분류 `romance`, open에서 허용한 성적 긴장은 `sexual`로 적어
// 트래킹한다(차단 여부는 조치만 본다). 막는 것은 같은 분류에 「block」이다. 질투 · 집착 · 밀어붙이기 · 갑작스러운 스킨십 시작은 캐릭터 답에서만
// 차단(`romance`) — 학습자의 말에는 적용하지 않는다.
const tracking = `Romance that this rule allows is still recorded: use "allow" with category "romance" (not "safe") for it.`;

const allowedByLine: Record<Exclude<RomanceLine, "none">, string> = {
  hug: `light romance is allowed. Romantic or flirty words, compliments, confessions of liking, a crush or mutual-crush mood (썸), asking for a date, pet names, and holding hands or hugging — spoken or as an *action* — are fine (e.g. "보고 싶었어요", "나 너 좋아해", "우리 사귈래요?", "*손을 잡는다*", "*꼭 안아 준다*", "I like you", "can I hold your hand?")`,
  kiss: `romance up to a kiss is allowed. Everything light (flirting, compliments, 썸, dates, holding hands, hugs) plus being a couple, "사랑해", a gentle kiss, cuddling or embracing — spoken or as an *action* — are fine (e.g. "사랑해", "우리 사귀자", "*볼에 입을 맞춘다*", "*살짝 키스한다*", "*꼭 껴안는다*", "I love you", "can I kiss you?")`,
  close: `close romance is allowed. Being a couple, "사랑해", kissing, cuddling, embracing, leaning on or lying next to each other, and a tender or suggestive-but-not-explicit mood — spoken or as an *action* — are fine (e.g. "사랑해", "오늘 너무 보고 싶었어", "*깊게 키스한다*", "*품에 안겨 눕는다*", "*어깨에 기댄다*", "I love you", "can I kiss you?")`,
  open: `romance with sexual tension is allowed. Everything in a close relationship (a couple, "사랑해", deep kissing, cuddling, lying together) plus desire and sexual tension, saying the other is sexy or attractive, sensual but non-graphic touch (neck, waist, a hand in the hair), inviting each other to spend the night, and saying afterwards that they did, without describing it — spoken or as an *action* — are fine (e.g. "오늘 너무 섹시하다", "오늘 밤 같이 있을래?", "*목덜미에 입을 맞춘다*", "*허리를 끌어안는다*", "어젯밤 좋았어", "you look so hot")`,
};

const blockedByLine: Record<Exclude<RomanceLine, "none">, string> = {
  hug: `- Physical intimacy beyond holding hands or a hug — kissing of any kind (뽀뽀, 키스, a peck), caressing or touching the body, sitting on a lap, lying or sleeping together, undressing — spoken, requested or as an *action* → "block" with category "romance".
- Sexual talk — dirty talk, sexual jokes or innuendo (음담패설), comments on the body in a sexual way, sexual requests or anything erotic → "block" with category "sexual".`,
  kiss: `- Physical intimacy beyond a kiss or a hug — making out, deep or long kissing, caressing or touching the body, sitting on a lap, lying or sleeping together, undressing — spoken, requested or as an *action* → "block" with category "romance".
- Sexual talk — dirty talk, sexual jokes or innuendo (음담패설), comments on the body in a sexual way, sexual requests or anything erotic → "block" with category "sexual".`,
  close: `- Sexual content stays blocked: sexual acts, nudity or undressing, explicit description of bodies or arousal, sexual talk, dirty talk or sexual jokes (음담패설), and sexual requests — spoken, requested or as an *action* → "block" with category "sexual".`,
  open: `- Allowed sexual tension is recorded as "allow" with category "sexual" (not "safe" or "romance").
- Explicit content stays blocked: describing sexual acts, genitals or nudity, undressing in detail, explicit description of arousal, dirty talk or crude sexual jokes (음담패설), and blunt requests for sex or nude photos — spoken, requested or as an *action* → "block" with category "sexual".`,
};

// 연애 질문(ADR-0180) — 캐릭터에게 애인이 있는지 묻는 것은 개인적인 질문이지 로맨스가 아니다. 선 none에서도 통과시키고 답이 담백하게 받는다.
const loveLifeQuestion = `Simply asking about the character's love life (e.g. "do you have a girlfriend?", "are you single?", "pacar kamu ada?") is a personal question, not romance → "allow" with category "safe".`;

function romanceRule(layer: ModerationLayer, line: RomanceLine): string {
  if (line === "none") {
    return layer === "input"
      ? `- Romance: romance or flirting directed at the character → "block" with category "romance". ${loveLifeQuestion}`
      : `- Romance: the character must not flirt or act romantically with the learner → "block" with category "romance".`;
  }
  const who = layer === "input" ? "the learner and the character" : "the character and the learner";
  const allowed = `- Romance between ${who}: ${allowedByLine[line]} → "allow". ${tracking}
${blockedByLine[line]}`;
  return layer === "input"
    ? allowed
    : `${allowed}
- The character must not be jealous or possessive, pressure the learner, or start physical intimacy out of nowhere → "block" with category "romance". A scene that fades out before anything explicit is fine.`;
}

export function moderationInstruction(
  layer: ModerationLayer,
  ageBand: AgeBand,
  line: RomanceLine = defaultRomanceLine(ageBand),
): string {
  const who =
    ageBand === "adult"
      ? "an adult"
      : ageBand === "minor"
        ? "a minor (treat as 13–17)"
        : "of unknown age (possibly a minor)";
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
  // 개인정보(ADR-0180): 막는 것은 실제 연락처 · 사는 곳을 내놓는 일뿐이다. 자기소개(이름 · 나라 · 도시)와 캐릭터에게 묻는 말(사는 곳 · 연락처 ·
  // 다른 메신저 · 사진 · 음성 · 만나자)은 통과시키고 답이 캐릭터답게 받는다 — 운영에서 자기소개 · 「인스타 있어?」가 거절로 가 대화가 끊겼다.
  const personalInfo =
    layer === "input"
      ? `- Personal info: block only when the learner shares an actual phone number, email address, home address, or account ID / handle (e.g. "my number is 0812…", "add me: insta @issoyeo") → "block" with category "personal_info". A normal self-introduction (first name or full name, nickname, age, country or city, school subject, job — e.g. "my name is Sindy Devina", "저는 김연지입니다", "tinggal di Klaten") and questions to the character (where they live, their family, whether they use WhatsApp or Instagram, asking for their number, a call, to meet, or for their photo, selfie or a voice message) → "allow" with category "safe" — the character answers in character.`
      : `- Personal info: the character must never give a phone number, email, address, account ID or handle (real or made up), and must never ask for the learner's → "block" with category "personal_info". Saying they don't use other apps, or mentioning a photo button in this app, is fine.`;
  return `You review ${subject} in a Korean-learning chat app. The learner is ${who}.
Classify the text and choose an action.
- "crisis": the learner expresses intent or risk of self-harm or suicide, or says they are in immediate danger — in any language (e.g. "죽고 싶어", "I want to die", "gusto ko nang mamatay", "tôi muốn chết", "aku ingin bunuh diri", "死にたい", "quiero morir", "อยากตาย", "သေချင်တယ်"). (Only for learner messages.)
- "block": sexual content, graphic violence, hate, sharing of personal contact details (see the personal info rule), or anything else unsafe for the learner's age. Romance and sexual tension follow the romance rule below.
${romanceRule(layer, line)}
${personalInfo}
${profanity}
- "allow": everything else, including mild everyday topics, mistakes, other languages, and sad feelings without risk.
The learner may write in any language or mix languages (Korean, English, Tagalog, Vietnamese, Indonesian, Japanese, Spanish, Thai, Burmese and others). Judge every language the same way, including spaced, abbreviated, romanized or disguised spellings (ㅅㅂ, 시1발, ㅂㅅ, f*ck, p*tang ina, đ.m, a*jing, k*so, m!erda). Text between asterisks (*…*) is the learner's action or inner thought in the roleplay — review it like the rest.
Pick the single best category: ${moderationCategories.join(", ")}. Use "safe" with "allow", except for allowed romance as the romance rule says.`;
}
