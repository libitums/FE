import { describe, expect, it } from "vitest";
import type { PhoneCallConversation, PhoneCallSessionState } from "./phone-call.contract";
import {
  completePhoneCallUnit,
  currentPhoneCallReply,
  currentPhoneCallTurn,
  getPhoneCallConversation,
  initialPhoneCallSessionState,
  phoneCallCompletionStatus,
  phoneCallExitOutcome,
  phoneCallPlayLabel,
  phoneCallSessionReducer,
  phoneCallStatusLabel,
  visiblePhoneCallEntries,
} from "./phone-call";

// 제품 정본의 세 턴을 독립 literal로 고정해 helper 자기호출 oracle을 피한다.
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

const ready0: PhoneCallSessionState = { mode: "ready", turnIndex: 0 };

describe("약속 확인 전화 순수 계약", () => {
  it("고정 3턴의 ID·대사·답장·음원 순서가 정확하다", () => {
    expect(getPhoneCallConversation()).toEqual(conversation);
  });

  it("available/completed 초기화와 상태 label을 판정한다", () => {
    expect(initialPhoneCallSessionState("available")).toEqual(ready0);
    expect(initialPhoneCallSessionState("completed")).toEqual({ mode: "completed" });
    expect(phoneCallStatusLabel(ready0)).toBe("통화 준비");
    expect(phoneCallStatusLabel({ mode: "playing", turnIndex: 0 })).toBe("상대방이 말하는 중");
    expect(phoneCallStatusLabel({ mode: "reply-ready", turnIndex: 0 })).toBe("답장할 차례");
    expect(phoneCallStatusLabel({ mode: "completed" })).toBe("통화 완료");
    expect(phoneCallPlayLabel(ready0)).toBe("통화 시작");
    expect(phoneCallPlayLabel({ mode: "ready", turnIndex: 1 })).toBe("듣기");
    expect(phoneCallPlayLabel({ mode: "playing", turnIndex: 0 })).toBe("다시 듣기");
    expect(phoneCallPlayLabel({ mode: "completed" })).toBeNull();
  });

  it("정확한 3턴 전이와 잘못된 연속 action의 참조 불변성을 보장한다", () => {
    const playing = phoneCallSessionReducer(ready0, { type: "play" });
    const reply0 = phoneCallSessionReducer(playing, { type: "audio-unavailable" });
    const ready1 = phoneCallSessionReducer(reply0, { type: "reply" });
    const reply1 = phoneCallSessionReducer(phoneCallSessionReducer(ready1, { type: "play" }), {
      type: "audio-settled",
    });
    const ready2 = phoneCallSessionReducer(reply1, { type: "reply" });
    const reply2 = phoneCallSessionReducer(phoneCallSessionReducer(ready2, { type: "play" }), {
      type: "audio-settled",
    });
    expect(ready1).toEqual({ mode: "ready", turnIndex: 1 });
    expect(ready2).toEqual({ mode: "ready", turnIndex: 2 });
    expect(phoneCallSessionReducer(reply2, { type: "reply" })).toEqual({ mode: "completed" });
    for (const action of [{ type: "reply" }, { type: "audio-settled" }] as const) {
      const unchanged = phoneCallSessionReducer(ready0, action);
      expect(unchanged).toBe(ready0);
    }
    const completed = { mode: "completed" } as const;
    expect(phoneCallSessionReducer(completed, { type: "reply" })).toBe(completed);
    expect(phoneCallSessionReducer(completed, { type: "replay" })).toEqual(ready0);
  });

  it("visible transcript가 1·3·5·6개이고 현재 turn/reply를 선택한다", () => {
    expect(visiblePhoneCallEntries(conversation, ready0)).toHaveLength(1);
    const reply0 = { mode: "reply-ready", turnIndex: 0 } as const;
    expect(visiblePhoneCallEntries(conversation, reply0)).toHaveLength(1);
    expect(visiblePhoneCallEntries(conversation, { mode: "ready", turnIndex: 1 })).toHaveLength(3);
    expect(
      visiblePhoneCallEntries(conversation, { mode: "reply-ready", turnIndex: 1 }),
    ).toHaveLength(3);
    expect(visiblePhoneCallEntries(conversation, { mode: "ready", turnIndex: 2 })).toHaveLength(5);
    expect(
      visiblePhoneCallEntries(conversation, { mode: "reply-ready", turnIndex: 2 }),
    ).toHaveLength(5);
    expect(visiblePhoneCallEntries(conversation, { mode: "completed" })).toHaveLength(6);
    expect(currentPhoneCallTurn(conversation, ready0)?.id).toBe("confirm-time");
    expect(currentPhoneCallReply(conversation, reply0)?.id).toBe("confirm-time-reply");
    expect(currentPhoneCallReply(conversation, ready0)).toBeNull();
    expect(currentPhoneCallTurn(conversation, { mode: "completed" })).toBeNull();
  });

  it("exit outcome, 멱등 완료 기록, replay 완료 ID 보존을 판정한다", () => {
    const id = "appointment-confirmation-phone-call" as const;
    const once = completePhoneCallUnit([], id);
    expect(once).toEqual([id]);
    expect(completePhoneCallUnit(once, id)).toBe(once);
    expect(phoneCallCompletionStatus(once, id)).toBe("completed");
    expect(phoneCallCompletionStatus([], id)).toBe("available");
    expect(phoneCallExitOutcome(ready0)).toBe("incomplete");
    expect(phoneCallExitOutcome({ mode: "completed" })).toBe("completed");
    expect(phoneCallSessionReducer({ mode: "completed" }, { type: "replay" })).toEqual(ready0);
  });
});
