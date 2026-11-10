// FE가 네트워크 없이 재생하는 mock fixture의 입구입니다(`@libitums/companion-contract/fixtures`).
// 턴 스트림은 SSE 글자, 사전 오류는 HTTP 상태 + 본문, 메시지 목록은 창구 함수 반환입니다.
import type { PreStreamErrorBody } from "./chat-send";
import { PRE_STREAM_ERRORS, type PreStreamErrorCode } from "./error-codes";
import type { CompanionMessage, CompanionMessagesPage } from "./rpc";

export { turnFixtureEvents, turnFixtureText, type TurnFixtureName } from "./fixtures-streams";

export type PreStreamErrorFixture = { status: number; body: PreStreamErrorBody };

const errorOf = (
  error: PreStreamErrorCode,
  detail?: Record<string, unknown>,
): PreStreamErrorFixture => ({
  status: PRE_STREAM_ERRORS[error].status,
  body: { error, retryable: PRE_STREAM_ERRORS[error].retryable, ...(detail ? { detail } : {}) },
});

/** 스트림을 열기 전에 나는 오류들입니다. */
export const errorFixtures = {
  "error-insufficient-credits": errorOf("insufficient_credits", { required: 1, balance: 0 }),
  "error-trial-exhausted": errorOf("trial_exhausted", { characterId: "duksu" }),
  "error-usage-time-limit": errorOf("usage_time_limit", {
    limit: "daily",
    resetsAt: "2026-11-09T00:00:00+09:00",
  }),
  "error-age-restricted": errorOf("age_restricted", { reason: "guardian_consent_required" }),
} satisfies Record<string, PreStreamErrorFixture>;

export type ErrorFixtureName = keyof typeof errorFixtures;

const base: Pick<
  CompanionMessage,
  "hidden" | "text" | "inputMode" | "segments" | "notice" | "feedback"
> = {
  hidden: false,
  text: null,
  inputMode: null,
  segments: [],
  notice: null,
  feedback: null,
};

/** `companion_list_messages` 한 쪽입니다. 최신이 앞이고, 숨김 · 위기 · 선톡 · 고지 줄을 모두 담습니다. */
export const messagesPageFixture: CompanionMessagesPage = {
  hasMore: true,
  messages: [
    {
      ...base,
      id: "0d4e5f60-1a2b-4c3d-8e4f-5a6b7c8d9e01",
      role: "assistant",
      origin: "proactive",
      status: "complete",
      segments: [{ kind: "speech", text: "오늘 수업 어땠어요? 생각나서 연락했어요." }],
      suggestions: [
        {
          text: "오늘 수업 재미있었어요. 발음 연습을 많이 했어요.",
          meaning: "Class was fun today. I practiced pronunciation a lot.",
          intent: "elaborate",
        },
        { text: "쌤은 오늘 뭐 했어요?", meaning: "What did you do today?", intent: "ask" },
      ],
      rating: { value: "down", reasons: ["too_hard"], note: null },
      createdAt: "2026-11-08T12:00:00+09:00",
    },
    {
      ...base,
      id: "1e5f6a70-2b3c-4d4e-9f50-6b7c8d9e0f12",
      role: "assistant",
      origin: "turn",
      status: "complete",
      hidden: true,
      createdAt: "2026-11-08T11:02:00+09:00",
    },
    {
      ...base,
      id: "2f6a7b80-3c4d-4e5f-a061-7c8d9e0f1a23",
      role: "assistant",
      origin: "crisis",
      status: "crisis",
      createdAt: "2026-11-08T11:01:00+09:00",
    },
    {
      ...base,
      id: "3a7b8c90-4d5e-4f60-b172-8d9e0f1a2b34",
      role: "user",
      origin: "turn",
      status: "complete",
      text: "저는 마리아 이에요",
      inputMode: "voice",
      feedback: {
        userMessageId: "3a7b8c90-4d5e-4f60-b172-8d9e0f1a2b34",
        status: "ok",
        kind: "correction",
        original: "저는 마리아 이에요",
        corrected: "저는 마리아예요",
        items: [
          { original: "마리아 이에요", corrected: "마리아예요", reason: "Use 예요 after a vowel." },
        ],
        better: null,
        meaning: null,
      },
      createdAt: "2026-11-08T11:00:00+09:00",
    },
    {
      ...base,
      id: "4b8c9da0-5e6f-4071-8283-9e0f1a2b3c45",
      role: "notice",
      origin: "turn",
      status: "complete",
      notice: { kind: "ai_disclosure" },
      createdAt: "2026-11-08T10:59:59+09:00",
    },
  ],
};
