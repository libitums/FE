import { describe, expect, test } from "vitest";

import type { MessengerComposerAction, MessengerComposerState } from "./messenger.contract";
import {
  composedText,
  initialMessengerComposerState,
  messengerComposerReducer,
} from "./messenger-composer";

const run = (actions: readonly MessengerComposerAction[]): MessengerComposerState =>
  actions.reduce(messengerComposerReducer, initialMessengerComposerState);

const press = (keys: string): MessengerComposerAction[] =>
  [...keys].map((key) => ({ type: "press", key }));

describe("messengerComposerReducer", () => {
  test("누른 자모가 조합되어 보인다", () => {
    expect(composedText(run(press("ㅈㅜㅅㅔㅇㅛ")))).toBe("주세요");
  });

  test("윗글쇠는 다음 키 하나에만 먹는다", () => {
    const state = run([{ type: "shift" }, ...press("ㄱㅏㄱㅏ")]);
    expect(composedText(state)).toBe("까가");
    expect(state.shifted).toBe(false);
  });

  test("지우기는 마지막 키 하나를 뺀다 — 조합 중 음절이 자모 하나만큼 되돌아간다", () => {
    const state = run([...press("ㅇㅏㄴ"), { type: "backspace" }]);
    expect(composedText(state)).toBe("아");
  });

  test("맞는 답을 보내면 correct, 틀린 답은 incorrect다", () => {
    expect(run([...press("ㅈㅗㅎㅇㅏㅇㅛ"), { type: "submit", answer: "좋아요!" }]).verdict).toBe(
      "correct",
    );
    expect(run([...press("ㅈㅗㅇㅏㅇㅛ"), { type: "submit", answer: "좋아요!" }]).verdict).toBe(
      "incorrect",
    );
  });

  test("빈 입력은 보내지지 않는다", () => {
    expect(run([{ type: "submit", answer: "좋아요!" }])).toBe(initialMessengerComposerState);
  });

  test("판정이 난 뒤에는 자판이 먹지 않는다", () => {
    const judged = run([...press("ㄱㅏ"), { type: "submit", answer: "나" }]);
    expect(messengerComposerReducer(judged, { type: "press", key: "ㄴ" })).toBe(judged);
    expect(messengerComposerReducer(judged, { type: "backspace" })).toBe(judged);
  });

  test("retry는 틀린 뒤에만 입력을 비운다", () => {
    const wrong = run([...press("ㄱㅏ"), { type: "submit", answer: "나" }]);
    expect(messengerComposerReducer(wrong, { type: "retry" })).toEqual(
      initialMessengerComposerState,
    );
    const typing = run(press("ㄱㅏ"));
    expect(messengerComposerReducer(typing, { type: "retry" })).toBe(typing);
  });

  test("clear는 어느 상태에서든 처음으로 돌린다", () => {
    const right = run([...press("ㄴㅏ"), { type: "submit", answer: "나" }]);
    expect(messengerComposerReducer(right, { type: "clear" })).toEqual(
      initialMessengerComposerState,
    );
  });
});
