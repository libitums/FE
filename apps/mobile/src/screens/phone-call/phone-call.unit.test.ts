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
  practicePhoneCallCompletionStatus,
  visiblePhoneCallEntries,
} from "./phone-call";
import { uiCopyEn } from "../../lib/ui-copy-en";

// 제품 정본의 세 턴을 독립 literal로 고정해 helper 자기호출 oracle을 피합니다.
const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "Appointment call",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "Jimin",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "Jimin",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "Jimin",
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
    expect(phoneCallStatusLabel(ready0, uiCopyEn)).toBe("Ready to call");
    expect(phoneCallStatusLabel({ mode: "playing", turnIndex: 0 }, uiCopyEn)).toBe("Speaking…");
    expect(phoneCallStatusLabel({ mode: "reply-ready", turnIndex: 0 }, uiCopyEn)).toBe(
      "Your turn to reply",
    );
    expect(phoneCallStatusLabel({ mode: "completed" }, uiCopyEn)).toBe("Call ended");
    expect(phoneCallPlayLabel(ready0, uiCopyEn)).toBe("Start call");
    expect(phoneCallPlayLabel({ mode: "ready", turnIndex: 1 }, uiCopyEn)).toBe("Listen");
    expect(phoneCallPlayLabel({ mode: "playing", turnIndex: 0 }, uiCopyEn)).toBe("Listen again");
    expect(phoneCallPlayLabel({ mode: "completed" }, uiCopyEn)).toBeNull();
  });

  it("CE4 제목 · 화자 이름이 영어다 — 대사 · 답장은 불변", () => {
    const live = getPhoneCallConversation();
    expect(live.title).toBe("Appointment call");
    expect(live.turns.map((turn) => turn.speakerName)).toEqual(["Jimin", "Jimin", "Jimin"]);
    expect(live.turns.map((turn) => turn.transcript)).toEqual([
      "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      "좋아요. 그럼 토요일에 봐요!",
    ]);
    expect(live.turns.map((turn) => turn.reply.text)).toEqual([
      "네, 토요일 오후 2시에 만나요.",
      "네, 2번 출구 오른쪽 카페예요.",
      "네, 토요일에 봐요!",
    ]);
  });

  it("RL17 보이는 항목: jimin 갈래는 Jimin, self 갈래는 speakerName 키가 없다", () => {
    const entries = visiblePhoneCallEntries(getPhoneCallConversation(), {
      mode: "ready",
      turnIndex: 1,
    });
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      if (entry.speaker === "jimin") {
        expect(entry.speakerName).toBe("Jimin");
      } else {
        expect(entry).not.toHaveProperty("speakerName");
      }
    }
    expect(entries.map((entry) => entry.speaker)).toEqual(["jimin", "self", "jimin"]);
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

// -------------------------------------------------------------- 롤플레이 연습 입력

describe("practicePhoneCallCompletionStatus", () => {
  // P1 — 연습 시작 입력이 initialPhoneCallSessionState와 합성해 처음 ready 상태를
  // 만듭니다. 합성이 깨지면 여기서 잡힙니다.
  it("P1. 연습 시작 입력이 처음 ready 상태를 만든다 — 통화 준비·통화 시작·transcript 1개", () => {
    const state = initialPhoneCallSessionState(practicePhoneCallCompletionStatus());

    expect(state).toEqual({ mode: "ready", turnIndex: 0 });
    expect(phoneCallStatusLabel(state, uiCopyEn)).toBe("Ready to call");
    expect(phoneCallPlayLabel(state, uiCopyEn)).toBe("Start call");
    expect(visiblePhoneCallEntries(conversation, state)).toHaveLength(1);
  });
});
