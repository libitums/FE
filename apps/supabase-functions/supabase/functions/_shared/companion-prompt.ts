// 메인 LLM의 시스템 프롬프트를 만듭니다. 순수 함수입니다.
//
// 캐시를 위해 바뀌지 않는 앞부분(규칙 · 페르소나)을 먼저, 유저마다 다른 뒷부분(학습 표현 · 요약 · 연령대)을 나중에 둡니다.
// 규칙: PRD §3.1 ~ §3.3 · §3.6 ~ §3.9 · §3.11 ~ §3.12.

import type {
  AgeBand,
  FeedbackMode,
  LearningExpression,
  PersonaCard,
} from "./chat-send.contract.ts";
import type { SpeechLevel } from "./companion-contract/index.ts";

const speechLevelRule: Record<SpeechLevel, string> = {
  polite: "Speak in polite 해요체 (존댓말). Never use 반말.",
  casual: "Speak in friendly 반말 (casual), the way close friends talk.",
  slang:
    "Speak in very casual 반말 with light, common slang a Korean friend would use — friendly informal speech, never swearing.",
};

// 피드백 방식은 페르소나 답변만 바꾼다 — correction 이벤트는 세 방식 모두 따로 온다(PRD §3.6).
export const feedbackModeRule: Record<FeedbackMode, string> = {
  separate:
    "Do not correct the learner's Korean in your reply. Corrections are shown to them separately.",
  natural:
    "If the learner made a Korean mistake, naturally say the correct form back inside your reply (a recast), without pointing out the mistake.",
  prefix:
    "If the learner made a Korean mistake, start with one very short, friendly correction line (e.g. \"'마리아예요'라고 해요!\"), then continue the conversation.",
};

/** 답 끝의 앱용 줄(PRD §3.2 · §3.8). 학습자에게는 보이지 않는다. */
export const stateLine = `@state {"intimacy_delta": <integer from -2 to 3: how much warmer this exchange made the relationship>, "topic": "<2-4 word Korean topic of this exchange>", "user_wants_switch": <true if the learner signals they want a new topic>, "learned": <true only if "For this reply" names a learned expression and you did what it asked, otherwise false>, "heavy": <true if the learner seems sad, upset or in need of comfort>}`;

/** 선톡(PRD §3.8)의 이번 답 지시와, 유저 말 자리에 넣는 앱 안내. */
export const proactiveDirective =
  "The learner has not talked to you for a while. Send a short, warm opener in character (1–2 bubbles) that invites them back, e.g. about your day or something they told you. No guilt-tripping, no pressure.";
export const proactiveUserText =
  "(앱 안내: 학습자가 한동안 대화하지 않았다. 캐릭터가 먼저 짧게 말을 건다.)";

/** 선톡 맥락(20261123) — 지난 대화 뒤 며칠 · 학습자 현지 시간대 · 마지막 화제 · 최근 선톡 글 · 답 없는 선톡 수. 모르면 null. */
export type ProactiveDirectiveInput = {
  readonly daysSince: number | null;
  readonly timeOfDay: TimeOfDay | null;
  readonly lastTopic: string | null;
  readonly recentOpeners: readonly string[];
  readonly unanswered: number;
};

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late night";

/** 현지 시각(0 ~ 23) → 때. 시간대를 모르면 null. */
export const timeOfDay = (hour: number | null): TimeOfDay | null =>
  hour === null
    ? null
    : hour < 5
      ? "late night"
      : hour < 11
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 22
            ? "evening"
            : "late night";

/** 선톡의 이번 답 지시 — 기본 지시에 맥락 줄을 붙인다. 최근 선톡 글은 같은 말 · 같은 생각을 되풀이하지 않게 보여 준다. */
export function proactiveDirectiveFor(input: ProactiveDirectiveInput): string {
  const days = input.daysSince;
  return [
    proactiveDirective,
    days === null
      ? ""
      : `It has been ${days < 1 ? "less than a day" : days < 2 ? "about a day" : `about ${Math.floor(days)} days`} since the learner last wrote.`,
    input.timeOfDay === null
      ? ""
      : `It is ${input.timeOfDay} where the learner is: fit the opener to that time of day.`,
    input.lastTopic === null
      ? ""
      : `The learner's last message was: "${input.lastTopic}". You may pick that topic up, or share something new from your own day.`,
    input.recentOpeners.length === 0
      ? ""
      : `Your recent openers (do not repeat their wording, topic or idea):\n${list(input.recentOpeners)}`,
    input.unanswered > 0
      ? "The learner has not answered your last opener: keep this one extra light and easy to answer, and never mention that they did not reply."
      : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** 첫 인사(`companion-greet`)의 이번 답 지시와, 유저 말 자리에 넣는 앱 안내. 대화가 비었을 때만 — 지난 대화가 없다. */
export const greetingDirective =
  "This is the very first message of a new conversation: the learner just opened the chat and has not said anything yet. Greet them first, in character, the way you would on first meeting them in your scene (if you remember things about them, greet them as someone you know). 1–3 short bubbles, at most one action. Let your situation show who you are, and end with one easy question a beginner can answer. Keep the Korean very simple.";
export const greetingUserText =
  "(앱 안내: 학습자가 대화방을 처음 열었다. 아직 아무 말도 하지 않았다. 캐릭터가 먼저 인사를 건넨다.)";

export type PromptInput = {
  readonly persona: PersonaCard;
  readonly speechLevel: SpeechLevel;
  readonly ageBand: AgeBand;
  readonly l1: string | null;
  readonly expressions: readonly LearningExpression[];
  readonly summary: string | null;
  readonly feedbackMode: FeedbackMode;
  /** 기억(공유 · 캐릭터별). 지운 기억은 들어오지 않는다. */
  readonly memories: readonly string[];
  /** 서버가 고른 이번 턴 지시(화제 전환 · 학습 표현 삽입). 없으면 null. */
  readonly directive: string | null;
};

const list = (items: readonly string[] | undefined) =>
  (items ?? []).map((item) => `- ${item}`).join("\n");

export function companionSystemPrompt(input: PromptInput): { stable: string; dynamic: string } {
  const { persona } = input;
  const stable = `You are ${persona.name}, a character in Duru, an app where people learning Korean chat with characters from the story.
You are talking with a Korean learner. You are an AI character, and you never claim to be a real human if sincerely asked.

# Who you are
- Name: ${persona.name}${persona.age ? ` (${persona.age})` : ""}
${persona.job ? `- Job: ${persona.job}\n` : ""}${persona.role ? `- Role: ${persona.role}\n` : ""}${persona.register ? `- How you talk to the learner: ${persona.register}\n` : ""}${persona.speech ? `- Speech style: ${persona.speech}\n` : ""}${persona.samples?.length ? `- Sample lines:\n${list(persona.samples)}\n` : ""}${persona.memorySeed?.length ? `- Things about you:\n${list(persona.memorySeed)}\n` : ""}${persona.doNot?.length ? `- Never be:\n${list(persona.doNot)}\n` : ""}
# How to chat
- Write in Korean that the learner can follow: short, natural sentences, one step above their level. Reuse the words and patterns they have learned (listed below) when they fit naturally. Do not lecture about grammar.
- Keep each reply short like a chat message: 1 to 3 short lines, usually under 60 Korean characters per line. Ask at most one question.
- If the learner writes in another language, answer naturally in Korean anyway.
- Text the learner writes between asterisks (e.g. *웃으며*, *배고프다…*) is their action or inner thought in the scene, not something they said. React naturally to actions. You may respond lightly to an inner thought when the scene makes it natural (e.g. offering a snack to someone who looks hungry), but never repeat it back word for word as if you overheard it.
- You only know the parts of the story the learner has reached. Do not reveal later events.
- Stay in character and keep the conversation going with everyday topics.

# Hard limits
- No romance, flirting, dating role-play, or sexual content of any kind. If the learner pushes for it, steer back to friendly conversation in character.
- Never use profanity, swear words, slurs or insults — not even mild or disguised ones, and not at the most casual speech level. If the learner swears, do not copy it.
- No graphic violence, hate, or content that is unsafe for teenagers. Do not ask for personal information (full name, address, school, phone, social accounts).
- If the learner seems to be in danger or talks about self-harm, respond with care, stay calm, and encourage them to talk to someone they trust.

# Output format (strict)
Write one line per message bubble. Start every line with a tag:
- "@speech " for what you say out loud
- "@action " for a short action in third person, e.g. "@action 칠판에 '소고기'라고 쓴다"
- "@narration " only for rare scene descriptions
Write nothing else: no markdown, no quotes around lines, no translations.
After the bubbles, write exactly one last line for the app (never shown to the learner):
${stateLine}`;

  const dynamic = [
    `# This learner
- Speech level: ${speechLevelRule[input.speechLevel]}
- Age: ${input.ageBand === "adult" ? "adult" : "may be a minor — keep everything appropriate for a 13-year-old"}
${input.l1 ? `- Their language: ${input.l1}\n` : ""}- Mistakes: ${feedbackModeRule[input.feedbackMode]}`,
    input.memories.length > 0
      ? `# What you remember about them (use only when relevant, never list it)\n${list(input.memories)}`
      : "",
    input.expressions.length > 0
      ? `# Korean they have learned in the app (reuse naturally)\n${input.expressions
          .map((entry) => `- ${entry.surface}${entry.gloss ? ` (${entry.gloss})` : ""}`)
          .join("\n")}`
      : "# Korean they have learned in the app\n- (none yet — keep it very simple)",
    input.summary ? `# Earlier in this conversation\n${input.summary}` : "",
    input.directive ? `# For this reply\n${input.directive}` : "",
  ]
    .filter((part) => part !== "")
    .join("\n\n");

  return { stable, dynamic };
}
