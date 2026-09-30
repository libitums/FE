import type { UiCopy } from "../../lib/ui-copy.contract";
import type {
  PhoneCallCompletionStatus,
  PhoneCallConversation,
  PhoneCallExitOutcome,
  PhoneCallSessionAction,
  PhoneCallSessionState,
  PhoneCallTranscriptEntry,
  PhoneCallTurn,
  PhoneCallUnitId,
} from "./phone-call.contract";

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "A Call from Minseo",
  introduction: "I imagine Minseo calling before our café visit. I listen, then choose a reply.",
  completion: "You’re meeting Minseo at a café tomorrow.",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "안녕하세요",
      translation: "Hello.",
      romanization: "annyeonghaseyo",
      audioSource: "phone-call-confirm-01",
      reply: {
        id: "confirm-time-reply",
        text: "네, 안녕하세요.",
        translation: "Oh, hello!",
        romanization: "ne, annyeonghaseyo",
      },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "저는 민서예요.",
      translation: "I’m Minseo.",
      romanization: "jeoneun minseoyeyo",
      audioSource: "phone-call-confirm-02",
      reply: {
        id: "confirm-place-reply",
        text: "아, 민서 씨! 내일 카페에서 봬요.",
        translation: "Oh, Minseo! See you at the café tomorrow.",
        romanization: "a, minseo ssi! naeil kapeeseo bwaeyo",
      },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "내일 만나요",
      translation: "See you tomorrow.",
      romanization: "naeil mannayo",
      audioSource: "phone-call-confirm-03",
      reply: {
        id: "goodbye-reply",
        text: "네, 내일 만나요!",
        translation: "Yes, see you tomorrow!",
        romanization: "ne, naeil mannayo",
      },
    },
  ],
};

export const getPhoneCallConversation = (): PhoneCallConversation => conversation;

export const initialPhoneCallSessionState = (
  status: PhoneCallCompletionStatus,
): PhoneCallSessionState =>
  status === "completed" ? { mode: "completed" } : { mode: "ready", turnIndex: 0 };

export const phoneCallSessionReducer = (
  state: PhoneCallSessionState,
  action: PhoneCallSessionAction,
): PhoneCallSessionState => {
  if (action.type === "replay") {
    return state.mode === "completed" ? { mode: "ready", turnIndex: 0 } : state;
  }
  if (state.mode === "completed") return state;
  if (action.type === "play") {
    return state.mode === "ready" || state.mode === "reply-ready"
      ? { mode: "playing", turnIndex: state.turnIndex }
      : state;
  }
  if (action.type === "audio-settled" || action.type === "audio-unavailable") {
    return state.mode === "playing" ? { mode: "reply-ready", turnIndex: state.turnIndex } : state;
  }
  if (action.type === "reply" && state.mode === "reply-ready") {
    return state.turnIndex === 2
      ? { mode: "completed" }
      : { mode: "ready", turnIndex: (state.turnIndex + 1) as 1 | 2 };
  }
  return state;
};

export const visiblePhoneCallEntries = (
  value: PhoneCallConversation,
  state: PhoneCallSessionState,
): readonly PhoneCallTranscriptEntry[] => {
  const count = state.mode === "completed" ? 3 : state.turnIndex + 1;
  const entries: PhoneCallTranscriptEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const turn = value.turns[index];
    entries.push({
      speaker: "jimin",
      speakerName: turn.speakerName,
      turnId: turn.id,
      text: turn.transcript,
      ...(turn.translation ? { translation: turn.translation } : {}),
      ...(turn.romanization ? { romanization: turn.romanization } : {}),
    });
    if (
      state.mode === "completed" ||
      ((state.mode === "ready" || state.mode === "playing" || state.mode === "reply-ready") &&
        index < state.turnIndex)
    ) {
      entries.push({
        speaker: "self",
        replyId: turn.reply.id,
        text: turn.reply.text,
        ...(turn.reply.translation ? { translation: turn.reply.translation } : {}),
        ...(turn.reply.romanization ? { romanization: turn.reply.romanization } : {}),
      });
    }
  }
  return entries;
};

export const currentPhoneCallTurn = (
  value: PhoneCallConversation,
  state: PhoneCallSessionState,
): PhoneCallTurn | null => (state.mode === "completed" ? null : value.turns[state.turnIndex]);

export const currentPhoneCallReply = (
  value: PhoneCallConversation,
  state: PhoneCallSessionState,
): PhoneCallTurn["reply"] | null =>
  state.mode === "reply-ready" ? value.turns[state.turnIndex].reply : null;

export const phoneCallStatusLabel = (state: PhoneCallSessionState, copy: UiCopy): string =>
  copy.phoneCall.status[state.mode === "ready" && state.turnIndex === 0 ? "incoming" : state.mode];

export const phoneCallPlayLabel = (state: PhoneCallSessionState, copy: UiCopy): string | null =>
  state.mode === "completed"
    ? null
    : state.mode === "ready" && state.turnIndex === 0
      ? copy.phoneCall.play.start
      : state.mode === "ready"
        ? copy.phoneCall.play.listen
        : copy.phoneCall.play["listen-again"];

export const phoneCallExitOutcome = (state: PhoneCallSessionState): PhoneCallExitOutcome =>
  state.mode === "completed" ? "completed" : "incomplete";

export const completePhoneCallUnit = (
  ids: readonly PhoneCallUnitId[],
  id: PhoneCallUnitId,
): readonly PhoneCallUnitId[] => (ids.includes(id) ? ids : [...ids, id]);

export const phoneCallCompletionStatus = (
  ids: readonly PhoneCallUnitId[],
  id: PhoneCallUnitId,
): PhoneCallCompletionStatus => (ids.includes(id) ? "completed" : "available");

/** 롤플레이 출처의 시작 입력입니다 — 여정 상태를 읽을 매개변수가 없습니다. 연습은 늘 처음부터 섭니다. */
export const practicePhoneCallCompletionStatus = (): PhoneCallCompletionStatus => "available";
