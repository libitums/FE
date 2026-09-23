import { describe, expect, it } from "vitest";

import type {
  MessengerConversation,
  MessengerSessionState,
  SelfMessage,
} from "./messenger.contract";
import {
  completeMessengerUnit,
  currentMessengerReply,
  initialMessengerSessionState,
  messengerCompletionStatus,
  messengerConversationFor,
  messengerExitOutcome,
  messengerProgressLabel,
  messengerSessionReducer,
  practiceMessengerCompletionStatus,
  visibleMessengerMessages,
} from "./messenger";

const id = "appointment-confirmation" as const;
const expected = [
  ["jimin-schedule", "jimin", "토요일 오후 2시에 역 앞 카페에서 만나요."],
  ["self-accept", "self", "네, 좋아요. 토요일에 봬요!"],
  ["jimin-directions", "jimin", "카페는 2번 출구 오른쪽에 있어요."],
  ["self-thanks", "self", "네, 고마워요!"],
  ["jimin-goodbye", "jimin", "그럼 토요일에 봬요!"],
] as const;

describe("messengerConversationFor", () => {
  it("승인된 5개 메시지를 고정 순서·리터럴 대사로 낸다", () => {
    const conversation = messengerConversationFor(id);
    expect(conversation.id).toBe(id);
    expect(conversation.title).toBe("약속 확인 메시지");
    expect(conversation.participantName).toBe("지민");
    expect(
      conversation.messages.map(({ id: messageId, sender, text }) => [messageId, sender, text]),
    ).toEqual(expected);
  });
});

describe("messenger session pure functions", () => {
  it("현재 답장은 타입 단언 없이 자기 메시지 또는 null로 소비한다", () => {
    const conversation = messengerConversationFor(id);
    const first: SelfMessage | null = currentMessengerReply(conversation, {
      mode: "active",
      replyIndex: 0,
    });
    const second: SelfMessage | null = currentMessengerReply(conversation, {
      mode: "active",
      replyIndex: 1,
    });
    const done: SelfMessage | null = currentMessengerReply(conversation, { mode: "completed" });
    expect(first).toEqual(conversation.messages[1]);
    expect(second).toEqual(conversation.messages[3]);
    expect(done).toBeNull();
  });

  const conversation = {
    id,
    title: "약속 확인 메시지",
    participantName: "지민",
    messages: expected.map(([messageId, sender, text]) => ({
      id: messageId,
      sender,
      text,
    })) as unknown as MessengerConversation["messages"],
  } as MessengerConversation;

  it("available은 0번 활성에서 1→3→5개를 공개하고 completed는 5개다", () => {
    const first = initialMessengerSessionState("available");
    const second = messengerSessionReducer(first, { type: "reply" });
    const done = messengerSessionReducer(second, { type: "reply" });
    expect(first).toEqual({ mode: "active", replyIndex: 0 });
    expect(visibleMessengerMessages(conversation, first)).toHaveLength(1);
    expect(visibleMessengerMessages(conversation, second)).toHaveLength(3);
    expect(done).toEqual({ mode: "completed" });
    expect(visibleMessengerMessages(conversation, done)).toHaveLength(5);
  });

  it("현재 답장·진행 문구·나가기 결과를 각 상태의 리터럴로 낸다", () => {
    const first = initialMessengerSessionState("available");
    const second = messengerSessionReducer(first, { type: "reply" });
    const done = messengerSessionReducer(second, { type: "reply" });
    expect(currentMessengerReply(conversation, first)?.id).toBe("self-accept");
    expect(currentMessengerReply(conversation, second)?.id).toBe("self-thanks");
    expect(currentMessengerReply(conversation, done)).toBeNull();
    expect(messengerProgressLabel(first)).toBe("대화 1 / 2");
    expect(messengerProgressLabel(second)).toBe("대화 2 / 2");
    expect(messengerProgressLabel(done)).toBe("대화 완료");
    expect(messengerExitOutcome(first)).toBe("incomplete");
    expect(messengerExitOutcome(done)).toBe("completed");
  });

  it("replay는 완료 세션만 0번 활성으로 되돌리고 적용 불가 action은 동일 참조다", () => {
    const active = initialMessengerSessionState("available");
    const done = messengerSessionReducer(messengerSessionReducer(active, { type: "reply" }), {
      type: "reply",
    });
    expect(messengerSessionReducer(done, { type: "replay" })).toEqual({
      mode: "active",
      replyIndex: 0,
    });
    expect(messengerSessionReducer(active, { type: "replay" })).toBe(active);
    expect(messengerSessionReducer(done, { type: "reply" })).toBe(done);
  });

  it("완료 ID 기록은 멱등·단조이고 상태 조회는 포함 여부만 따른다", () => {
    const empty: readonly (typeof id)[] = [];
    const completed = completeMessengerUnit(empty, id);
    expect(completed).toEqual([id]);
    expect(completeMessengerUnit(completed, id)).toBe(completed);
    expect(messengerCompletionStatus(empty, id)).toBe("available");
    expect(messengerCompletionStatus(completed, id)).toBe("completed");
  });
});

// -------------------------------------------------------------- 롤플레이 연습 입력

describe("practiceMessengerCompletionStatus", () => {
  // M1 — 시작 입력이 여정 상태를 읽지 않고도 initialMessengerSessionState와 합성해
  // 처음 상태를 만듭니다. 합성이 깨지면 여기서 잡힙니다.
  it("M1. 연습 시작 입력이 처음 활성 상태를 만든다 — 공개 1개·대화 1 / 2·답장 self-accept", () => {
    const conversation = messengerConversationFor(id);
    const state = initialMessengerSessionState(practiceMessengerCompletionStatus());

    expect(state).toEqual({ mode: "active", replyIndex: 0 });
    expect(visibleMessengerMessages(conversation, state)).toHaveLength(1);
    expect(messengerProgressLabel(state)).toBe("대화 1 / 2");
    expect(currentMessengerReply(conversation, state)?.id).toBe("self-accept");
  });
});
