// 재생용 턴 스트림입니다. 이벤트를 타입으로 적고 `formatSseEvent`로 글자를 만들어, fixture가 계약에서 어긋나면
// 타입 검사가 먼저 막습니다. 상담 기관은 실제 번호가 아닌 자리표시자입니다 — 실제 목록은 아직 정하지 않았습니다.
import { formatSseEvent } from "./sse-parse";
import type { TurnEvent } from "./sse-events";

const ids = {
  conversation: "5b1c7e2a-4c1d-4f7e-9a51-2d3f4b5c6d70",
  user: "8a2d9f10-6b3e-4c5a-8d7e-1f2a3b4c5d61",
  assistant: "c3e4f5a6-7b8c-4d9e-8f01-2a3b4c5d6e72",
} as const;

type Body<E> = E extends TurnEvent ? Omit<E, "id"> : never;

/** 이벤트 목록에 0부터 id를 붙입니다. */
export const numbered = (events: readonly Body<TurnEvent>[]): TurnEvent[] =>
  events.map((event, id) => ({ ...event, id }) as TurnEvent);

const start = (speechLevel: "polite" | "casual" = "polite"): Body<TurnEvent> => ({
  event: "start",
  data: {
    contractVersion: 1,
    conversationId: ids.conversation,
    userMessageId: ids.user,
    assistantMessageId: ids.assistant,
    speechLevel,
  },
});

const delta = (
  segment: number,
  kind: "speech" | "action" | "narration",
  text: string,
): Body<TurnEvent> => ({
  event: "delta",
  data: { segment, kind, text },
});

const state = (speechLevel: "polite" | "casual", speechLevelChanged = false): Body<TurnEvent> => ({
  event: "state",
  data: { speechLevel, speechLevelChanged },
});

const done = (creditsSpent = 0): Body<TurnEvent> => ({
  event: "done",
  data: { assistantMessageId: ids.assistant, creditsSpent, balance: null },
});

const emptyCard = { kind: null, corrected: null, items: [], better: null, meaning: null };
const noCorrection: Body<TurnEvent> = {
  event: "correction",
  data: { userMessageId: ids.user, status: "none", original: "오늘 시장에 갔어요.", ...emptyCard },
};

/** 픽스처 이름 → 이벤트 목록입니다. */
export const turnFixtureEvents = {
  "turn-normal": numbered([
    start(),
    { event: "notice", data: { kind: "ai_disclosure" } },
    delta(0, "action", "칠판 앞에서 분필을 내려놓으며"),
    delta(1, "speech", "어서 와요! "),
    delta(1, "speech", "오늘은 뭘 하고 지냈어요?"),
    delta(2, "narration", "창밖으로 익선동 골목의 저녁 불빛이 하나둘 켜진다."),
    noCorrection,
    state("polite"),
    done(),
  ]),
  "turn-with-correction": numbered([
    start(),
    delta(0, "speech", "마리아 씨, "),
    {
      event: "correction",
      data: {
        userMessageId: ids.user,
        status: "ok",
        kind: "correction",
        original: "저는 마리아 이에요. 학생 이에요.",
        corrected: "저는 마리아예요. 학생이에요.",
        items: [
          { original: "마리아 이에요", corrected: "마리아예요", reason: "Use 예요 after a vowel." },
          {
            original: "학생 이에요",
            corrected: "학생이에요",
            reason: "이에요 attaches to the noun.",
          },
        ],
        better: {
          text: "저는 마리아라고 해요.",
          meaning: "My name is Maria.",
          explanation: "A natural, polite way to introduce yourself.",
        },
        meaning: "I'm Maria. I'm a student.",
      },
    },
    delta(0, "speech", "반가워요. 한국어 공부한 지 얼마나 됐어요?"),
    state("polite"),
    done(),
  ]),
  "turn-l1-to-ko": numbered([
    start(),
    delta(0, "speech", "아, 배고프군요! 뭐 먹고 싶어요?"),
    {
      event: "correction",
      data: {
        userMessageId: ids.user,
        status: "ok",
        kind: "l1_to_ko",
        original: "I'm hungry",
        corrected: "배고파요.",
        items: [],
        better: null,
        meaning: "I'm hungry.",
      },
    },
    state("polite"),
    done(),
  ]),
  "turn-speech-level-up": numbered([
    start("polite"),
    delta(0, "speech", "우리 이제 말 편하게 할까? "),
    delta(0, "speech", "너랑 얘기하는 거 재밌어."),
    noCorrection,
    state("casual", true),
    done(),
  ]),
  "turn-correction-unavailable": numbered([
    start(),
    delta(0, "speech", "좋아요. 내일 또 얘기해요!"),
    {
      event: "correction",
      data: {
        userMessageId: ids.user,
        status: "unavailable",
        original: "내일 봐요!",
        ...emptyCard,
      },
    },
    state("polite"),
    done(),
  ]),
  "turn-guardrail-blocked": numbered([
    start(),
    { event: "error", data: { code: "guardrail_blocked", retryable: false } },
  ]),
  "turn-refusal": numbered([
    start(),
    delta(0, "action", "고개를 살짝 젓는다"),
    delta(1, "speech", "어이쿠, 그 얘기는 오늘 수업에 없어요! 대신 퀴즈 하나 갈게요."),
    { event: "translation", data: { segment: 0, text: "Shakes his head slightly." } },
    {
      event: "translation",
      data: { segment: 1, text: "Whoa, that's not in today's lesson! Here's a quiz instead." },
    },
    state("polite"),
    {
      event: "done",
      data: {
        assistantMessageId: ids.assistant,
        creditsSpent: 0,
        balance: null,
        refusal: { stage: "deflect" },
      },
    },
  ]),
  "turn-crisis": numbered([
    start(),
    {
      event: "crisis",
      data: {
        region: "PH",
        resources: [
          { name: "Example Crisis Line (placeholder)", phone: "000-0000", hours: "24/7" },
          { name: "Example Support Chat (placeholder)", url: "https://example.invalid/support" },
        ],
      },
    },
    done(0),
  ]),
  "turn-upstream-error": numbered([
    start(),
    delta(0, "speech", "음, 그건"),
    { event: "error", data: { code: "upstream_unavailable", retryable: true } },
  ]),
} satisfies Record<string, TurnEvent[]>;

export type TurnFixtureName = keyof typeof turnFixtureEvents;

/** 픽스처를 SSE 글자로 씁니다. 사이에 `: ping` 주석 줄을 하나 넣어, 받는 쪽이 주석을 건너뛰는지도 재생됩니다. */
export function turnFixtureText(name: TurnFixtureName): string {
  const [first, ...rest] = turnFixtureEvents[name].map(formatSseEvent);
  return [first, ": ping\n\n", ...rest].join("");
}
