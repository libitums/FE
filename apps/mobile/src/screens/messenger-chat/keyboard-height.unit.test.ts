import { describe, expect, test } from "vitest";

import {
  chatKeyboardSlotHeight,
  chatSlotContent,
  resolveChatKeyboardHeight,
  type ChatSlot,
  type PhoneFocus,
} from "./keyboard-height";
import type { ComposerKeyboard } from "./keyboard-plan";

// `unit` 계층(MC-U2 · U3 · U4): 키보드 높이 · 슬롯 높이 · 슬롯 내용(spec §5.3).

describe("resolveChatKeyboardHeight (MC-U2)", () => {
  test("MC-U2. 저장된 유한한 양수는 그대로다", () => {
    expect(resolveChatKeyboardHeight({ stored: 291, screenHeight: 667, bottomInset: 0 })).toBe(291);
  });

  test.each([[0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY], [null]] as const)(
    "MC-U2. 저장값 %s 는 화면 높이 표로 간다",
    (stored) => {
      expect(resolveChatKeyboardHeight({ stored, screenHeight: 844, bottomInset: 0 })).toBe(300);
    },
  );

  test.each([
    [667, 260],
    [844, 300],
    [932, 320],
  ] as const)("MC-U2. 화면 높이 %s → %s", (screenHeight, expected) => {
    expect(resolveChatKeyboardHeight({ stored: null, screenHeight, bottomInset: 0 })).toBe(
      expected,
    );
  });

  test("MC-U2. 표 경계 — 700 미만만 260, 870 미만만 300, 그 위는 320", () => {
    const at = (screenHeight: number) =>
      resolveChatKeyboardHeight({ stored: null, screenHeight, bottomInset: 0 });
    expect(at(699)).toBe(260);
    expect(at(700)).toBe(300);
    expect(at(869)).toBe(300);
    expect(at(870)).toBe(320);
  });

  test("MC-U2. 화면 높이를 모르면(NaN) 첫 칸 260이다", () => {
    expect(
      resolveChatKeyboardHeight({ stored: null, screenHeight: Number.NaN, bottomInset: 0 }),
    ).toBe(260);
  });

  test("MC-U2. 하한 — 200 + 아래 인셋보다 작으면 그 값으로 올린다(stored 120, inset 34 → 234)", () => {
    expect(resolveChatKeyboardHeight({ stored: 120, screenHeight: 667, bottomInset: 34 })).toBe(
      234,
    );
  });

  test("MC-U2. 음수 인셋은 0으로 본다", () => {
    expect(resolveChatKeyboardHeight({ stored: 120, screenHeight: 667, bottomInset: -10 })).toBe(
      200,
    );
  });
});

const keyboardSlot: ChatSlot = { kind: "keyboard" };
const ideasSlot: ChatSlot = { kind: "ideas", picked: null };
const closedSlot: ChatSlot = { kind: "closed" };

const slotHeight = (
  over: Partial<{
    keyboard: ComposerKeyboard;
    slot: ChatSlot;
    phoneFocus: PhoneFocus;
    underlay: "none" | "learning";
  }>,
): number =>
  chatKeyboardSlotHeight({
    keyboard: "learning",
    slot: keyboardSlot,
    phoneFocus: "blurred",
    underlay: "none",
    height: 300,
    bottomInset: 34,
    ...over,
  });

describe("chatKeyboardSlotHeight (MC-U3)", () => {
  test("MC-U3(사용자 결정). 닫힌 자리는 어떤 키보드여도 바닥 인셋만 남는다", () => {
    expect(slotHeight({ slot: closedSlot, keyboard: "learning" })).toBe(34);
    expect(slotHeight({ slot: closedSlot, keyboard: "phone", phoneFocus: "focused" })).toBe(34);
  });

  test("MC-U3. 보기 패널은 늘 height다", () => {
    expect(slotHeight({ slot: ideasSlot })).toBe(300);
    expect(slotHeight({ slot: ideasSlot, keyboard: "phone" })).toBe(300);
  });

  test("MC-U3. 학습 키보드는 height다", () => {
    expect(slotHeight({ keyboard: "learning" })).toBe(300);
  });

  test("MC-U3(리뷰 #5로 바뀜). 휴대폰 키보드가 올라와 있으면(focused) height다", () => {
    expect(slotHeight({ keyboard: "phone", phoneFocus: "focused" })).toBe(300);
  });

  test("MC-U3(리뷰 #5로 바뀜). 휴대폰 + 키보드를 내린(blurred) 뒤에는 토글이 있어도 자리가 바닥 인셋만 남는다", () => {
    expect(slotHeight({ keyboard: "phone", phoneFocus: "blurred" })).toBe(34);
  });

  test("MC-U3. 학습 → 휴대폰으로 바꾸는 동안(깔개 learning)은 blurred여도 height를 지켜 뛰지 않는다", () => {
    expect(slotHeight({ keyboard: "phone", phoneFocus: "blurred", underlay: "learning" })).toBe(
      300,
    );
  });
});

describe("chatSlotContent (MC-U4)", () => {
  test("MC-U4(사용자 결정). 닫힌 자리는 비어 있다(closed)", () => {
    expect(
      chatSlotContent({ keyboard: "learning", underlay: "none", slot: { kind: "closed" } }),
    ).toBe("closed");
  });

  test("MC-U4. 보기 슬롯이 가장 앞선다 — 키보드 · 깔개와 상관없이", () => {
    expect(chatSlotContent({ keyboard: "learning", underlay: "none", slot: ideasSlot })).toBe(
      "ideas",
    );
    expect(chatSlotContent({ keyboard: "phone", underlay: "learning", slot: ideasSlot })).toBe(
      "ideas",
    );
  });

  test("MC-U4. 학습 키보드면 학습 키보드다", () => {
    expect(chatSlotContent({ keyboard: "learning", underlay: "none", slot: keyboardSlot })).toBe(
      "learning-keyboard",
    );
  });

  test("MC-U4. 휴대폰 + 깔개 learning 이면 아직 학습 키보드다", () => {
    expect(chatSlotContent({ keyboard: "phone", underlay: "learning", slot: keyboardSlot })).toBe(
      "learning-keyboard",
    );
  });

  test("MC-U4. 그 밖(휴대폰 · 깔개 없음)은 휴대폰 자리 채움이다", () => {
    expect(chatSlotContent({ keyboard: "phone", underlay: "none", slot: keyboardSlot })).toBe(
      "phone-spacer",
    );
  });
});
