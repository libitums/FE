import { describe, expect, test } from "vitest";

import { keysFromText } from "./composer-keys";
import {
  chatRoomReducer,
  focusOriginOf,
  initialChatRoomState,
  overlayParent,
  type ChatFocusOrigin,
  type ChatOverlay,
  type ChatRoomAction,
  type ChatRoomState,
} from "./chat-room-state";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import type { KeyboardPlan } from "./keyboard-plan";

// `unit` 계층(MC-U6 ~ U12): 방 UI 상태 리듀서(spec §5.4). 상태 전이 · 겹침 부모 · 초점 되돌림 표.

const learningPlan: KeyboardPlan = { initial: "learning", toggle: "shown" };
const phonePlan: KeyboardPlan = { initial: "phone", toggle: "hidden" };

// 방은 키보드가 닫힌 채 열립니다(사용자 결정 2026-11-09). 기존 시험은 키보드가 열린 상태를 출발로 하므로 열어 둔 상태를 씁니다.
const closedLearning = (): ChatRoomState => initialChatRoomState(learningPlan);
const closedPhone = (): ChatRoomState => initialChatRoomState(phonePlan);
const open = (state: ChatRoomState): ChatRoomState =>
  chatRoomReducer(state, { type: "open-keyboard" });
const learning = (): ChatRoomState => open(closedLearning());
const phone = (): ChatRoomState => open(closedPhone());

const run = (state: ChatRoomState, ...actions: readonly ChatRoomAction[]): ChatRoomState =>
  actions.reduce(chatRoomReducer, state);
const keys = (...list: readonly string[]): readonly ChatRoomAction[] =>
  list.map((key) => ({ type: "learning-key", key }));

describe("initialChatRoomState (MC-U6)", () => {
  test("MC-U6. 학습 계획 — 키보드 자리는 닫혀 있고 학습 키보드가 다음에 열린다, 나머지는 비어 있다", () => {
    expect(closedLearning()).toEqual({
      text: "",
      keys: [],
      shifted: false,
      keyboard: "learning",
      underlay: "none",
      slot: { kind: "closed" },
      phoneFocus: "blurred",
      inputEpoch: 0,
      overlay: { kind: "none" },
    });
  });

  test("MC-U6. 휴대폰 계획 — 키보드만 phone이다", () => {
    expect(closedPhone()).toEqual({ ...closedLearning(), keyboard: "phone" });
  });
});

describe("키보드 열기 · 닫기 (사용자 결정: 방은 키보드가 닫힌 채 열린다)", () => {
  test("open-keyboard 는 닫힌 자리를 키보드로 연다 — 키보드 종류는 계획 그대로", () => {
    expect(open(closedLearning()).slot).toEqual({ kind: "keyboard" });
    expect(open(closedLearning()).keyboard).toBe("learning");
    expect(open(closedPhone()).keyboard).toBe("phone");
  });

  test("open-keyboard 는 이미 열려 있거나 보기 패널이 열려 있으면 아무것도 바꾸지 않는다", () => {
    const opened = learning();
    expect(run(opened, { type: "open-keyboard" })).toBe(opened);
    const ideas = run(closedLearning(), { type: "open-ideas" });
    expect(run(ideas, { type: "open-keyboard" })).toBe(ideas);
  });

  test("close-keyboard 는 자리를 닫고 쓰던 글 · 키 열은 그대로 둔다", () => {
    const typed = run(learning(), ...keys("ㅇ", "ㅏ", "ㄴ"));
    const closed = run(typed, { type: "close-keyboard" });
    expect(closed.slot).toEqual({ kind: "closed" });
    expect(closed.text).toBe("안");
    expect(closed.keys).toEqual(["ㅇ", "ㅏ", "ㄴ"]);
    expect(run(closed, { type: "open-keyboard" }).text).toBe("안");
  });

  test("close-keyboard 는 보기 패널도 닫고, 휴대폰 초점 · 깔개 표시를 지운다", () => {
    const ideas = run(closedLearning(), { type: "open-ideas" });
    expect(run(ideas, { type: "close-keyboard" }).slot).toEqual({ kind: "closed" });
    const settling = run(
      learning(),
      { type: "switch-keyboard", to: "phone" },
      { type: "phone-focus", focus: "focused" },
      { type: "close-keyboard" },
    );
    expect(settling.underlay).toBe("none");
    expect(settling.phoneFocus).toBe("blurred");
  });

  test("닫힌 채로 open-ideas 는 보기 패널을 열고, 보낸 뒤에도 닫힌 채면 닫힌 채로 남는다", () => {
    expect(run(closedLearning(), { type: "open-ideas" }).slot).toEqual({
      kind: "ideas",
      picked: null,
    });
    const typed = run(learning(), ...keys("ㅇ", "ㅏ"), { type: "close-keyboard" });
    expect(run(typed, { type: "sent" }).slot).toEqual({ kind: "closed" });
    expect(run(learning(), ...keys("ㅇ"), { type: "sent" }).slot).toEqual({ kind: "keyboard" });
  });
});

describe("학습 키 (MC-U6)", () => {
  test("MC-U6. ㅇ ㅏ ㄴ 을 치면 text가 「안」이고 키 열이 쌓이며 epoch는 그대로다(리뷰 #6 — 입력 칸을 키마다 다시 만들지 않는다)", () => {
    const state = run(learning(), ...keys("ㅇ", "ㅏ", "ㄴ"));
    expect(state.text).toBe("안");
    expect(state.keys).toEqual(["ㅇ", "ㅏ", "ㄴ"]);
    expect(state.inputEpoch).toBe(0);
  });

  test("MC-U6. 윗글쇠 뒤 키는 쌍자음으로 한 번 적용되고 풀린다", () => {
    const shifted = run(learning(), { type: "learning-shift" });
    expect(shifted.shifted).toBe(true);
    const typed = run(shifted, ...keys("ㅂ"));
    expect(typed.text).toBe("ㅃ");
    expect(typed.shifted).toBe(false);
    expect(run(typed, ...keys("ㅂ")).text).not.toBe("ㅃㅃ");
  });

  test("MC-U6. 윗글쇠가 없는 키는 그대로다", () => {
    expect(run(learning(), ...keys("ㅂ")).text).toBe("ㅂ");
  });

  test("MC-U6. 윗글쇠는 뒤집힌다 — 두 번 누르면 꺼진다", () => {
    expect(run(learning(), { type: "learning-shift" }, { type: "learning-shift" }).shifted).toBe(
      false,
    );
  });

  test("MC-U6. 지우개는 키 열 끝 하나를 지우고 글을 다시 조합하며 epoch는 그대로다", () => {
    const typed = run(learning(), ...keys("ㅇ", "ㅏ", "ㄴ"));
    const back = run(typed, { type: "learning-backspace" });
    expect(back.keys).toEqual(["ㅇ", "ㅏ"]);
    expect(back.text).toBe("아");
    expect(back.inputEpoch).toBe(typed.inputEpoch);
    expect(run(back, { type: "learning-backspace" }, { type: "learning-backspace" }).text).toBe("");
  });

  test("MC-U6. 최대 길이를 넘기는 키는 아무것도 바꾸지 않는다", () => {
    const max = CHAT_PLACEHOLDERS.messageMaxLength;
    const full: ChatRoomState = {
      ...learning(),
      text: "a".repeat(max),
      keys: Array.from({ length: max }, () => "a"),
    };
    expect(run(full, ...keys("a"))).toEqual(full);
  });
});

describe("휴대폰 입력 · 초점 (MC-U8)", () => {
  test("MC-U8. phone-input 은 text를 바꾸고 epoch는 그대로다", () => {
    const state = run(phone(), { type: "phone-input", value: "안녕" });
    expect(state.text).toBe("안녕");
    expect(state.inputEpoch).toBe(0);
  });

  test("MC-U8. 최대 길이를 넘기면 코드 포인트 기준으로 자른다", () => {
    const max = CHAT_PLACEHOLDERS.messageMaxLength;
    const state = run(phone(), { type: "phone-input", value: "😀".repeat(max + 50) });
    expect([...state.text]).toHaveLength(max);
    expect(state.inputEpoch).toBe(0);
  });

  test("MC-U8. phone-focus 는 초점 상태를 갱신한다", () => {
    const focused = run(phone(), { type: "phone-focus", focus: "focused" });
    expect(focused.phoneFocus).toBe("focused");
    expect(run(focused, { type: "phone-focus", focus: "blurred" }).phoneFocus).toBe("blurred");
  });
});

describe("키보드 바꾸기 (MC-U7)", () => {
  test("MC-U7. 학습 → 휴대폰: 키보드 phone, 밑에 학습 키보드를 깔고, 슬롯은 keyboard다", () => {
    const state = run(learning(), { type: "switch-keyboard", to: "phone" });
    expect(state.keyboard).toBe("phone");
    expect(state.underlay).toBe("learning");
    expect(state.slot).toEqual({ kind: "keyboard" });
  });

  test("MC-U7. underlay-settled 가 깔개를 걷는다", () => {
    const state = run(
      learning(),
      { type: "switch-keyboard", to: "phone" },
      { type: "underlay-settled" },
    );
    expect(state.underlay).toBe("none");
    expect(state.keyboard).toBe("phone");
  });

  test("MC-U7. 같은 값으로 바꾸면 아무것도 바뀌지 않는다", () => {
    expect(run(learning(), { type: "switch-keyboard", to: "learning" })).toEqual(learning());
    const onPhone = run(learning(), { type: "switch-keyboard", to: "phone" });
    expect(run(onPhone, { type: "switch-keyboard", to: "phone" })).toEqual(onPhone);
  });

  test("MC-U7. 휴대폰 → 학습: 키 열이 글에서 되감기고 깔개가 없고 epoch는 그대로다", () => {
    const onPhone = run(phone(), { type: "phone-input", value: "안녕하" });
    const state = run(onPhone, { type: "switch-keyboard", to: "learning" });
    expect(state.keyboard).toBe("learning");
    expect(state.underlay).toBe("none");
    expect(state.keys).toEqual(keysFromText("안녕하"));
    expect(state.shifted).toBe(false);
    expect(state.text).toBe("안녕하");
    expect(state.inputEpoch).toBe(onPhone.inputEpoch);
  });

  test("MC-U7. 조합 중이던 자모가 보존된다 — 「안녕하ㅅ」 → 학습 → ㅔ → 「안녕하세」", () => {
    const state = run(
      phone(),
      { type: "phone-input", value: "안녕하ㅅ" },
      { type: "switch-keyboard", to: "learning" },
      ...keys("ㅔ"),
    );
    expect(state.text).toBe("안녕하세");
  });
});

describe("휴대폰으로 바꿀 때 epoch (리뷰 #6)", () => {
  test("학습에서 쓴 글을 휴대폰 입력 칸에 default-value로 넣도록 휴대폰으로 바꿀 때만 epoch가 오른다", () => {
    const typed = run(learning(), ...keys("ㅇ", "ㅏ", "ㄴ"));
    const state = run(typed, { type: "switch-keyboard", to: "phone" });
    expect(state.inputEpoch).toBe(typed.inputEpoch + 1);
  });
});

describe("보기 패널 (MC-U9)", () => {
  test("MC-U9. open-ideas 는 보기 슬롯을 열고 키보드 값은 돌아갈 곳으로 남는다", () => {
    const state = run(phone(), { type: "open-ideas" });
    expect(state.slot).toEqual({ kind: "ideas", picked: null });
    expect(state.keyboard).toBe("phone");
  });

  test("MC-U9. pick-idea 는 입력 칸을 채우고 picked를 표시하며 epoch를 올린다", () => {
    const opened = run(learning(), { type: "open-ideas" });
    const state = run(opened, { type: "pick-idea", index: 1, text: "물 주세요" });
    expect(state.text).toBe("물 주세요");
    expect(state.keys).toEqual(keysFromText("물 주세요"));
    expect(state.slot).toEqual({ kind: "ideas", picked: 1 });
    expect(state.inputEpoch).toBe(opened.inputEpoch + 1);
  });

  test("MC-U9. pick-idea 는 보내지 않는다 — 상태에 새 칸이 생기지 않고 보기 슬롯이 그대로다", () => {
    const state = run(
      learning(),
      { type: "open-ideas" },
      { type: "pick-idea", index: 0, text: "네" },
    );
    expect(Object.keys(state).sort()).toEqual(Object.keys(learning()).sort());
    expect(state.slot.kind).toBe("ideas");
  });

  test("MC-U9. 최대 길이를 넘는 보기는 자른다", () => {
    const max = CHAT_PLACEHOLDERS.messageMaxLength;
    const state = run(learning(), { type: "pick-idea", index: 0, text: "가".repeat(max + 5) });
    expect([...state.text]).toHaveLength(max);
  });

  test("MC-U9. type-myself 는 슬롯을 키보드로 돌리고 직전 키보드를 그대로 둔다", () => {
    const fromPhone = run(phone(), { type: "open-ideas" }, { type: "type-myself" });
    expect(fromPhone.slot).toEqual({ kind: "keyboard" });
    expect(fromPhone.keyboard).toBe("phone");
    const fromLearning = run(learning(), { type: "open-ideas" }, { type: "type-myself" });
    expect(fromLearning.slot).toEqual({ kind: "keyboard" });
    expect(fromLearning.keyboard).toBe("learning");
  });
});

describe("보낸 뒤 (MC-U10)", () => {
  const dirty = (base: ChatRoomState): ChatRoomState => ({
    ...base,
    text: "안녕",
    keys: keysFromText("안녕"),
    shifted: true,
    slot: { kind: "ideas", picked: 0 },
    inputEpoch: 4,
  });

  test("MC-U10. 학습 키보드: 글 · 키 열 · 윗글쇠를 비우고 슬롯이 키보드로 돌아오며 epoch +1", () => {
    const state = run(dirty(learning()), { type: "sent" });
    expect(state.text).toBe("");
    expect(state.keys).toEqual([]);
    expect(state.shifted).toBe(false);
    expect(state.slot).toEqual({ kind: "keyboard" });
    expect(state.inputEpoch).toBe(5);
  });

  test("MC-U10. 휴대폰 키보드: 비우되 epoch는 그대로다(clearPhoneInput이 비운다)", () => {
    const state = run(dirty(phone()), { type: "sent" });
    expect(state.text).toBe("");
    expect(state.slot).toEqual({ kind: "keyboard" });
    expect(state.inputEpoch).toBe(4);
  });
});

type OverlayRow = {
  readonly label: string;
  readonly overlay: Exclude<ChatOverlay, { kind: "none" }>;
  readonly parent: ChatOverlay;
  readonly origin: ChatFocusOrigin;
};

const overlayRows: readonly OverlayRow[] = [
  { label: "more-menu", overlay: { kind: "more-menu" }, parent: { kind: "none" }, origin: "more" },
  {
    label: "report",
    overlay: { kind: "report", reasons: [] },
    parent: { kind: "none" },
    origin: "more",
  },
  { label: "fix", overlay: { kind: "fix", text: "" }, parent: { kind: "none" }, origin: "more" },
  { label: "regen", overlay: { kind: "regen" }, parent: { kind: "none" }, origin: "more" },
  {
    label: "ask-media photo",
    overlay: { kind: "ask-media", media: "photo" },
    parent: { kind: "none" },
    origin: "snapshot-pill",
  },
  {
    label: "ask-media voice",
    overlay: { kind: "ask-media", media: "voice" },
    parent: { kind: "none" },
    origin: "voice-pill",
  },
  { label: "sidebar", overlay: { kind: "sidebar" }, parent: { kind: "none" }, origin: "settings" },
  {
    label: "story-point",
    overlay: { kind: "story-point", selected: "sp-1" },
    parent: { kind: "sidebar" },
    origin: "sidebar-story-point",
  },
  {
    label: "delete-confirm",
    overlay: { kind: "delete-confirm" },
    parent: { kind: "sidebar" },
    origin: "sidebar-delete",
  },
  {
    label: "coin-shop from sidebar",
    overlay: { kind: "coin-shop", from: "sidebar" },
    parent: { kind: "sidebar" },
    origin: "sidebar-coins",
  },
  {
    label: "coin-shop from ask-photo",
    overlay: { kind: "coin-shop", from: "ask-photo" },
    parent: { kind: "none" },
    origin: "snapshot-pill",
  },
  {
    label: "coin-shop from ask-voice",
    overlay: { kind: "coin-shop", from: "ask-voice" },
    parent: { kind: "none" },
    origin: "voice-pill",
  },
  {
    label: "coin-shop from send",
    overlay: { kind: "coin-shop", from: "send" },
    parent: { kind: "none" },
    origin: "send",
  },
];

describe("겹침 열기 · 닫기 (MC-U11)", () => {
  test.each(overlayRows.map((row) => [row.label, row] as const))(
    "MC-U11. %s: 열면 그 겹침이고, 닫으면 부모이며, 초점은 원래 단추로 돌아간다",
    (_label, row) => {
      const opened = run(learning(), { type: "open-overlay", overlay: row.overlay });
      expect(opened.overlay).toEqual(row.overlay);
      expect(run(opened, { type: "close-overlay" }).overlay).toEqual(row.parent);
      expect(overlayParent(row.overlay)).toEqual(row.parent);
      expect(focusOriginOf(row.overlay)).toBe(row.origin);
    },
  );

  test("MC-U11. 겹침은 늘 하나다 — 새로 열면 이전을 교체한다", () => {
    const state = run(
      learning(),
      { type: "open-overlay", overlay: { kind: "sidebar" } },
      { type: "open-overlay", overlay: { kind: "delete-confirm" } },
    );
    expect(state.overlay).toEqual({ kind: "delete-confirm" });
  });

  test("MC-U11. 신고는 사유 없이, 고쳐 주세요는 빈 글로 열린다", () => {
    expect(
      run(learning(), { type: "open-overlay", overlay: { kind: "report", reasons: [] } }).overlay,
    ).toEqual({ kind: "report", reasons: [] });
    expect(
      run(learning(), { type: "open-overlay", overlay: { kind: "fix", text: "" } }).overlay,
    ).toEqual({ kind: "fix", text: "" });
  });

  test("MC-U11. 겹침이 없을 때: 부모는 none이고 초점 자리는 null이다", () => {
    expect(overlayParent({ kind: "none" })).toEqual({ kind: "none" });
    expect(focusOriginOf({ kind: "none" })).toBeNull();
  });

  test("MC-U11. 겹침이 없을 때 닫아도 그대로 none이다", () => {
    expect(run(learning(), { type: "close-overlay" }).overlay).toEqual({ kind: "none" });
  });

  test("MC-U11. 겹침을 열고 닫아도 글 · 키보드 · 슬롯은 건드리지 않는다", () => {
    const typed = run(learning(), ...keys("ㅇ", "ㅏ"));
    const after = run(
      typed,
      { type: "open-overlay", overlay: { kind: "more-menu" } },
      { type: "close-overlay" },
    );
    expect(after).toEqual(typed);
  });
});

describe("신고 · 고쳐 주세요 · 이야기 시점 (MC-U12)", () => {
  const openReport = (): ChatRoomState =>
    run(learning(), { type: "open-overlay", overlay: { kind: "report", reasons: [] } });

  test("MC-U12. 사유는 다중 선택이고 순서는 reportReasons 순서다", () => {
    const state = run(
      openReport(),
      { type: "toggle-report-reason", id: "other" },
      { type: "toggle-report-reason", id: "rude" },
      { type: "toggle-report-reason", id: "hateful" },
    );
    expect(state.overlay).toEqual({ kind: "report", reasons: ["rude", "hateful", "other"] });
    const order = CHAT_PLACEHOLDERS.reportReasons;
    const picked = (state.overlay as { reasons: readonly string[] }).reasons;
    expect(picked).toEqual(order.filter((id) => picked.includes(id)));
  });

  test("MC-U12. 같은 사유를 두 번 누르면 해제된다", () => {
    const state = run(
      openReport(),
      { type: "toggle-report-reason", id: "rude" },
      { type: "toggle-report-reason", id: "rude" },
    );
    expect(state.overlay).toEqual({ kind: "report", reasons: [] });
  });

  test("MC-U12. fix-input 은 글을 채우고 200자(코드 포인트)를 넘으면 자른다", () => {
    const opened = run(learning(), { type: "open-overlay", overlay: { kind: "fix", text: "" } });
    expect(run(opened, { type: "fix-input", value: "어색해요" }).overlay).toEqual({
      kind: "fix",
      text: "어색해요",
    });
    const long = run(opened, { type: "fix-input", value: "😀".repeat(260) });
    expect(long.overlay.kind).toBe("fix");
    expect([...(long.overlay as { text: string }).text]).toHaveLength(
      CHAT_PLACEHOLDERS.fixMaxLength,
    );
  });

  test("MC-U12. select-story-point 는 고른 시점 id를 갱신한다", () => {
    const opened = run(learning(), {
      type: "open-overlay",
      overlay: { kind: "story-point", selected: "sp-1" },
    });
    expect(run(opened, { type: "select-story-point", id: "sp-2" }).overlay).toEqual({
      kind: "story-point",
      selected: "sp-2",
    });
  });
});
