import { describe, expect, test } from "vitest";

import {
  bubbleAnnouncementOf,
  bubbleToolRowOf,
  myBubbleLabelOf,
  myBubbleViewOf,
  toggleBubbleTool,
  toolRequestOf,
  type BubbleToolsState,
  type MyBubbleView,
} from "./my-message-state";
import {
  NO_NOTES,
  type ChatCorrection,
  type ChatCorrectionNote,
  type ChatLoad,
  type ChatMeaning,
  type ChatMyNotes,
} from "./chat-source.contract";

// `unit` 계층(MC2-U9 ~ U13): 내 말풍선 도구 상태 · 보이는 모양 · 아이콘 줄 · 요청 판정 · 낭독
// (messenger-chat-1-5 spec §4.3).

const MEANING: ChatMeaning = { romanization: "annyeong", meaning: "Hi" };
const CORRECTION: ChatCorrection = {
  corrected: "저는 주말에 카페에 갔어요.",
  changes: [
    { start: 1, end: 2 },
    { start: 9, end: 10 },
  ],
  kind: "correction",
  items: [{ original: "저", corrected: "저는", reason: "Add 는 after 저." }],
  better: null,
  meaning: null,
};

const idle = { status: "idle" } as const;
const loading = { status: "loading" } as const;
function ready<T>(value: T): ChatLoad<T> {
  return { status: "ready", value };
}

const notes = (
  meaning: ChatLoad<ChatMeaning> = idle,
  correction: ChatCorrectionNote = { kind: "none" },
): ChatMyNotes => ({ meaning, correction });
const available = (detail: ChatLoad<ChatCorrection> = idle, seen = false): ChatCorrectionNote => ({
  kind: "available",
  seen,
  detail,
});

describe("toggleBubbleTool (MC2-U9)", () => {
  test("MC2-U9. 열린 것이 없으면 그 도구가 열린다", () => {
    expect(toggleBubbleTool({}, "m1", "meaning")).toEqual({ m1: "meaning" });
    expect(toggleBubbleTool({}, "m1", "fix")).toEqual({ m1: "fix" });
  });

  test("MC2-U9. 같은 도구를 다시 누르면 그 id 키가 사라진다(접힘)", () => {
    const next = toggleBubbleTool({ m1: "meaning" }, "m1", "meaning");
    expect(next).toEqual({});
    expect("m1" in next).toBe(false);
  });

  test("MC2-U9. 다른 도구를 누르면 그 말풍선은 전환된다(하나만 열림)", () => {
    expect(toggleBubbleTool({ m1: "meaning" }, "m1", "fix")).toEqual({ m1: "fix" });
    expect(toggleBubbleTool({ m1: "fix" }, "m1", "meaning")).toEqual({ m1: "meaning" });
  });

  test("MC2-U9. 다른 말풍선의 상태에는 영향이 없다", () => {
    const state: BubbleToolsState = { m2: "fix", m3: "meaning" };
    expect(toggleBubbleTool(state, "m1", "meaning")).toEqual({
      m1: "meaning",
      m2: "fix",
      m3: "meaning",
    });
    expect(toggleBubbleTool({ m1: "meaning", m2: "fix" }, "m1", "meaning")).toEqual({
      m2: "fix",
    });
  });

  test("MC2-U9. 입력 객체를 바꾸지 않는다", () => {
    const state: BubbleToolsState = Object.freeze({ m1: "meaning" });
    const next = toggleBubbleTool(state, "m1", "fix");
    expect(state).toEqual({ m1: "meaning" });
    expect(next).not.toBe(state);
    expect(next).toEqual({ m1: "fix" });
  });
});

describe("myBubbleViewOf (MC2-U10)", () => {
  test("MC2-U10. 열린 도구가 없으면 closed 다 — 뜻이 있어도", () => {
    expect(
      myBubbleViewOf(undefined, notes(ready(MEANING), available(ready(CORRECTION), true))),
    ).toEqual({
      kind: "closed",
    });
  });

  test("MC2-U10. meaning: idle · loading → meaning-loading, ready → meaning", () => {
    expect(myBubbleViewOf("meaning", notes(idle))).toEqual({ kind: "meaning-loading" });
    expect(myBubbleViewOf("meaning", notes(loading))).toEqual({ kind: "meaning-loading" });
    expect(myBubbleViewOf("meaning", notes(ready(MEANING)))).toEqual({
      kind: "meaning",
      meaning: MEANING,
    });
  });

  test("MC2-U10. fix + 교정 없음 → closed(방어)", () => {
    expect(myBubbleViewOf("fix", NO_NOTES)).toEqual({ kind: "closed" });
  });

  test("MC2-U10. fix + 교정 있음: idle · loading → fix-loading, ready → fix", () => {
    expect(myBubbleViewOf("fix", notes(idle, available(idle)))).toEqual({ kind: "fix-loading" });
    expect(myBubbleViewOf("fix", notes(idle, available(loading, true)))).toEqual({
      kind: "fix-loading",
    });
    expect(myBubbleViewOf("fix", notes(idle, available(ready(CORRECTION), true)))).toEqual({
      kind: "fix",
      correction: CORRECTION,
    });
  });

  test("MC2-U10. fix 를 열면 뜻이 ready 여도 뜻 모양이 아니다", () => {
    expect(
      myBubbleViewOf("fix", notes(ready(MEANING), available(ready(CORRECTION), true))).kind,
    ).toBe("fix");
  });
});

describe("bubbleToolRowOf (MC2-U11)", () => {
  test("MC2-U11. 교정 없음 → 연필 hidden, 뜻 단추는 늘 있다(off)", () => {
    expect(bubbleToolRowOf(undefined, NO_NOTES)).toEqual({
      meaning: "off",
      fix: { kind: "hidden" },
    });
  });

  test("MC2-U11. 교정 있음 · 아직 안 봄 → 점 shown", () => {
    expect(bubbleToolRowOf(undefined, notes(idle, available(idle, false)))).toEqual({
      meaning: "off",
      fix: { kind: "shown", state: "off", dot: "shown" },
    });
  });

  test("MC2-U11. 교정 있음 · 봄 → 점 hidden", () => {
    expect(bubbleToolRowOf(undefined, notes(idle, available(ready(CORRECTION), true)))).toEqual({
      meaning: "off",
      fix: { kind: "shown", state: "off", dot: "hidden" },
    });
  });

  test("MC2-U11. fix 가 열려 있으면 연필만 on", () => {
    expect(bubbleToolRowOf("fix", notes(idle, available(loading, true)))).toEqual({
      meaning: "off",
      fix: { kind: "shown", state: "on", dot: "hidden" },
    });
  });

  test("MC2-U11. meaning 이 열려 있으면 뜻만 on, 연필은 off", () => {
    expect(bubbleToolRowOf("meaning", notes(loading, available(idle, false)))).toEqual({
      meaning: "on",
      fix: { kind: "shown", state: "off", dot: "shown" },
    });
    expect(bubbleToolRowOf("meaning", NO_NOTES)).toEqual({
      meaning: "on",
      fix: { kind: "hidden" },
    });
  });
});

describe("toolRequestOf (MC2-U12)", () => {
  test("MC2-U12. meaning idle → request-meaning, loading · ready → none", () => {
    expect(toolRequestOf("meaning", notes(idle))).toBe("request-meaning");
    expect(toolRequestOf("meaning", notes(loading))).toBe("none");
    expect(toolRequestOf("meaning", notes(ready(MEANING)))).toBe("none");
  });

  test("MC2-U12. fix + 교정 있음 + detail idle → open-correction", () => {
    expect(toolRequestOf("fix", notes(idle, available(idle, false)))).toBe("open-correction");
    expect(toolRequestOf("fix", notes(idle, available(idle, true)))).toBe("open-correction");
  });

  test("MC2-U12. fix + detail ready 인데 아직 안 봄 → open-correction(본 표시를 남긴다)", () => {
    expect(toolRequestOf("fix", notes(idle, available(ready(CORRECTION), false)))).toBe(
      "open-correction",
    );
  });

  test("MC2-U12. fix + detail ready + 봄 → none", () => {
    expect(toolRequestOf("fix", notes(idle, available(ready(CORRECTION), true)))).toBe("none");
  });

  test("MC2-U12. fix + 불러오는 중 + 봄 → none", () => {
    expect(toolRequestOf("fix", notes(idle, available(loading, true)))).toBe("none");
  });

  test("MC2-U12. fix + 교정 없음 → none", () => {
    expect(toolRequestOf("fix", NO_NOTES)).toBe("none");
  });
});

describe("bubbleAnnouncementOf · myBubbleLabelOf (MC2-U13)", () => {
  const closed: MyBubbleView = { kind: "closed" };
  const meaningLoading: MyBubbleView = { kind: "meaning-loading" };
  const meaning: MyBubbleView = { kind: "meaning", meaning: MEANING };
  const fixLoading: MyBubbleView = { kind: "fix-loading" };
  const fix: MyBubbleView = { kind: "fix", correction: CORRECTION };

  test("MC2-U13. closed → meaning-loading 은 loading-meaning", () => {
    expect(bubbleAnnouncementOf(closed, meaningLoading)).toEqual({ kind: "loading-meaning" });
  });

  test("MC2-U13. meaning-loading → meaning 은 뜻을 낭독한다", () => {
    expect(bubbleAnnouncementOf(meaningLoading, meaning)).toEqual({
      kind: "meaning",
      meaning: MEANING,
    });
  });

  test("MC2-U13. closed → fix-loading 은 loading-fix, fix-loading → fix 는 교정을 낭독한다", () => {
    expect(bubbleAnnouncementOf(closed, fixLoading)).toEqual({ kind: "loading-fix" });
    expect(bubbleAnnouncementOf(fixLoading, fix)).toEqual({ kind: "fix", correction: CORRECTION });
  });

  test("MC2-U13. 이미 읽은 뜻을 다시 열면(closed → meaning) 바로 뜻을 낭독한다", () => {
    expect(bubbleAnnouncementOf(closed, meaning)).toEqual({ kind: "meaning", meaning: MEANING });
  });

  test("MC2-U13. 같은 kind 로는 낭독이 없다", () => {
    for (const view of [closed, meaningLoading, meaning, fixLoading, fix]) {
      expect(bubbleAnnouncementOf(view, view)).toBeNull();
    }
  });

  test("MC2-U13. 닫힘으로 가면 낭독이 없다", () => {
    for (const view of [meaningLoading, meaning, fixLoading, fix]) {
      expect(bubbleAnnouncementOf(view, closed)).toBeNull();
    }
  });

  test("MC2-U13. 닫힌 말풍선 라벨은 「화자: 한국어」다", () => {
    expect(myBubbleLabelOf("나", "안녕", closed)).toBe("나: 안녕");
  });

  test("MC2-U13. 뜻이 열리면 로마자와 뜻이 쉼표로 이어진다", () => {
    expect(myBubbleLabelOf("나", "안녕", meaning)).toBe("나: 안녕, annyeong, Hi");
  });

  test("MC2-U13. 교정 스켈레톤 · 교정 카드는 말풍선 라벨에 덧붙지 않는다(따로 읽힌다)", () => {
    for (const view of [fixLoading, fix]) {
      expect(myBubbleLabelOf("나", "안녕", view, "Loading the meaning…")).toBe("나: 안녕");
    }
  });

  // 접근성 M6: 뜻 스켈레톤은 말풍선 접근성 요소의 자식이라 따로 닿지 않는다 — 불러오는 중이라는 사실은 말풍선 라벨이 전한다.
  test("M6. 뜻을 불러오는 중이면 말풍선 라벨 꼬리에 불러오는 중 문장이 붙는다", () => {
    expect(myBubbleLabelOf("나", "안녕", meaningLoading, "Loading the meaning…")).toBe(
      "나: 안녕, Loading the meaning…",
    );
  });
});
