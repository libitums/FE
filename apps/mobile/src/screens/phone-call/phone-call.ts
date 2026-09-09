import type {
  PhoneCallCompletionStatus,
  PhoneCallConversation,
  PhoneCallExitOutcome,
  PhoneCallPlayLabel,
  PhoneCallSessionAction,
  PhoneCallSessionState,
  PhoneCallStatusLabel,
  PhoneCallTranscriptEntry,
  PhoneCallTurn,
  PhoneCallUnitId,
} from "./phone-call.contract";

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "좋아요. 그럼 토요일에 봐요!",
      audioSource: "phone-call-confirm-03",
      reply: { id: "goodbye-reply", text: "네, 토요일에 봐요!" },
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
  const count =
    state.mode === "completed"
      ? 3
      : state.mode === "ready" || state.mode === "playing"
        ? state.turnIndex + 1
        : state.turnIndex + 1;
  const entries: PhoneCallTranscriptEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const turn = value.turns[index];
    entries.push({ speaker: "jimin", speakerName: "지민", turnId: turn.id, text: turn.transcript });
    if (
      state.mode === "completed" ||
      ((state.mode === "ready" || state.mode === "playing" || state.mode === "reply-ready") &&
        index < state.turnIndex)
    ) {
      entries.push({
        speaker: "self",
        speakerName: "나",
        replyId: turn.reply.id,
        text: turn.reply.text,
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

export const phoneCallStatusLabel = (state: PhoneCallSessionState): PhoneCallStatusLabel =>
  state.mode === "ready"
    ? "통화 준비"
    : state.mode === "playing"
      ? "상대방이 말하는 중"
      : state.mode === "reply-ready"
        ? "답장할 차례"
        : "통화 완료";

export const phoneCallPlayLabel = (state: PhoneCallSessionState): PhoneCallPlayLabel | null =>
  state.mode === "completed"
    ? null
    : state.mode === "ready" && state.turnIndex === 0
      ? "통화 시작"
      : state.mode === "ready"
        ? "듣기"
        : "다시 듣기";

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
