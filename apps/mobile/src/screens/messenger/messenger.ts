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
    title: "A Message from Minseo",
    participantName: "Minseo",
    introduction:
      "Still in my airplane seat, I imagine a message from Minseo. I try the words I just learned.",
    completion: "We have a plan for tomorrow. In my imagination, Minseo calls next.",
    messages: [
      {
        id: "jimin-schedule",
        sender: "jimin",
        text: "안녕하세요",
        translation: "Hello.",
      },
      {
        id: "self-accept",
        sender: "self",
        text: "안녕하세요",
        translation: "Hello.",
        romanization: "annyeonghaseyo",
        choices: ["안녕하세요"],
      },
      {
        id: "jimin-directions",
        sender: "jimin",
        text: "내일 만나요",
        translation: "See you tomorrow.",
      },
      {
        id: "self-thanks",
        sender: "self",
        text: "내일 만나요",
        translation: "See you tomorrow.",
        romanization: "naeil mannayo",
        choices: ["내일 만나요"],
      },
      {
        id: "jimin-goodbye",
        sender: "jimin",
        text: "내일 만나요",
        translation: "See you tomorrow!",
      },
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

/** 롤플레이 출처의 시작 입력입니다 — 여정 상태를 읽을 매개변수가 없습니다. 연습은 늘 처음부터 섭니다. */
export const practiceMessengerCompletionStatus = (): MessengerCompletionStatus => "available";
