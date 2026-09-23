import { describe, expect, it } from "vitest";

import type { MessengerConversation, MessengerSessionState } from "./messenger.contract";
import {
  completeMessengerUnit,
  currentMessengerReply,
  initialMessengerSessionState,
  messengerCompletionStatus,
  messengerExitOutcome,
  messengerProgressLabel,
  messengerSessionReducer,
  visibleMessengerMessages,
} from "./messenger";

const id = "appointment-confirmation" as const;
const conversation = {
  id,
  title: "약속 확인 메시지",
  participantName: "지민",
  messages: [
    { id: "jimin-schedule", sender: "jimin", text: "첫 메시지" },
    { id: "self-accept", sender: "self", text: "첫 답장" },
    { id: "jimin-directions", sender: "jimin", text: "둘째 메시지" },
    { id: "self-thanks", sender: "self", text: "둘째 답장" },
    { id: "jimin-goodbye", sender: "jimin", text: "마지막 메시지" },
  ],
} as MessengerConversation;

const active0: MessengerSessionState = { mode: "active", replyIndex: 0 };
const active1: MessengerSessionState = { mode: "active", replyIndex: 1 };
const completed: MessengerSessionState = { mode: "completed" };

describe("messenger state pure functions", () => {
  it("available은 active 0, completed는 completed로 시작한다", () => {
    expect(initialMessengerSessionState("available")).toEqual(active0);
    expect(initialMessengerSessionState("completed")).toEqual(completed);
  });

  it("reply는 0에서 1을 거쳐 완료로 전이한다", () => {
    expect(messengerSessionReducer(active0, { type: "reply" })).toEqual(active1);
    expect(messengerSessionReducer(active1, { type: "reply" })).toEqual(completed);
  });

  it("replay와 적용 불가 action은 계약대로 동작한다", () => {
    expect(messengerSessionReducer(completed, { type: "replay" })).toEqual(active0);
    expect(messengerSessionReducer(active0, { type: "replay" })).toBe(active0);
    expect(messengerSessionReducer(completed, { type: "reply" })).toBe(completed);
  });

  it("공개 메시지 개수는 1/3/5다", () => {
    expect(visibleMessengerMessages(conversation, active0)).toHaveLength(1);
    expect(visibleMessengerMessages(conversation, active1)).toHaveLength(3);
    expect(visibleMessengerMessages(conversation, completed)).toHaveLength(5);
  });

  it("현재 답장은 두 답장이고 완료 상태에는 없다", () => {
    expect(currentMessengerReply(conversation, active0)?.id).toBe("self-accept");
    expect(currentMessengerReply(conversation, active1)?.id).toBe("self-thanks");
    expect(currentMessengerReply(conversation, completed)).toBeNull();
  });

  it("진행 문구와 나가기 결과를 상태별로 낸다", () => {
    expect(messengerProgressLabel(active0)).toBe("대화 1 / 2");
    expect(messengerProgressLabel(active1)).toBe("대화 2 / 2");
    expect(messengerProgressLabel(completed)).toBe("대화 완료");
    expect(messengerExitOutcome(active0)).toBe("incomplete");
    expect(messengerExitOutcome(completed)).toBe("completed");
  });

  it("완료 ID 기록은 멱등·단조이며 상태 조회는 포함 여부만 따른다", () => {
    const empty: readonly (typeof id)[] = [];
    const once = completeMessengerUnit(empty, id);
    expect(once).toEqual([id]);
    expect(completeMessengerUnit(once, id)).toBe(once);
    expect(messengerCompletionStatus(empty, id)).toBe("available");
    expect(messengerCompletionStatus(once, id)).toBe("completed");
  });
});
