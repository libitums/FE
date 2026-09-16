import type {
  MessengerCompletionStatus,
  MessengerConversation,
  MessengerExitOutcome,
  MessengerMessage,
  MessengerSessionAction,
  MessengerSessionState,
  MessengerUnitId,
  SelfMessage,
} from "./messenger.contract";

const conversations: Record<MessengerUnitId, MessengerConversation> = {
  "appointment-confirmation": {
    id: "appointment-confirmation",
    title: "약속 확인 메시지",
    participantName: "지민",
    messages: [
      { id: "jimin-schedule", sender: "jimin", text: "토요일 오후 2시에 역 앞 카페에서 만나요." },
      { id: "self-accept", sender: "self", text: "네, 좋아요. 토요일에 봬요!" },
      { id: "jimin-directions", sender: "jimin", text: "카페는 2번 출구 오른쪽에 있어요." },
      { id: "self-thanks", sender: "self", text: "네, 고마워요!" },
      { id: "jimin-goodbye", sender: "jimin", text: "그럼 토요일에 봬요!" },
    ],
  },
};
export const messengerConversationFor = (id: MessengerUnitId): MessengerConversation =>
  conversations[id];

export const initialMessengerSessionState = (
  status: MessengerCompletionStatus,
): MessengerSessionState =>
  status === "completed" ? { mode: "completed" } : { mode: "active", replyIndex: 0 };

export const messengerSessionReducer = (
  state: MessengerSessionState,
  action: MessengerSessionAction,
): MessengerSessionState => {
  if (action.type === "replay")
    return state.mode === "completed" ? { mode: "active", replyIndex: 0 } : state;
  if (state.mode === "completed") return state;
  return state.replyIndex === 0 ? { mode: "active", replyIndex: 1 } : { mode: "completed" };
};

export const visibleMessengerMessages = (
  conversation: MessengerConversation,
  state: MessengerSessionState,
): readonly MessengerMessage[] => {
  const count = state.mode === "completed" ? 5 : state.replyIndex === 0 ? 1 : 3;
  return conversation.messages.slice(0, count);
};

export const currentMessengerReply = (
  conversation: MessengerConversation,
  state: MessengerSessionState,
): SelfMessage | null => {
  return state.mode === "completed" ? null : conversation.messages[state.replyIndex === 0 ? 1 : 3];
};

export const messengerProgressLabel = (state: MessengerSessionState): string =>
  state.mode === "completed" ? "대화 완료" : state.replyIndex === 0 ? "대화 1 / 2" : "대화 2 / 2";

export const messengerExitOutcome = (state: MessengerSessionState): MessengerExitOutcome =>
  state.mode === "completed" ? "completed" : "incomplete";

export const completeMessengerUnit = (
  completedIds: readonly MessengerUnitId[],
  id: MessengerUnitId,
): readonly MessengerUnitId[] => (completedIds.includes(id) ? completedIds : [...completedIds, id]);

export const messengerCompletionStatus = (
  completedIds: readonly MessengerUnitId[],
  id: MessengerUnitId,
): MessengerCompletionStatus => (completedIds.includes(id) ? "completed" : "available");

// LIB-255 계약 §2.7: 롤플레이 출처의 시작 입력 — 여정 상태를 읽을 매개변수가 없다
// (계약 §6 ①). 연습은 늘 처음부터 선다.
export const practiceMessengerCompletionStatus = (): MessengerCompletionStatus => "available";
