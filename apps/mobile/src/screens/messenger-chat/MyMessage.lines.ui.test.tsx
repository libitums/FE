import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { MyMessageRow } from "./MyMessage";
import { myMessageTestIds as ids } from "./my-message.contract";
import type { MyBubbleView } from "./my-message-state";

// `ui` 계층(ML1 · ML2, ADR-0188 개정 D8): 내 말풍선 해석 펼침 — [한국어 / 로마자] 묶음 → 구분선 → 뜻.
// 스켈레톤도 같은 자리(로마자 막대 → 구분선 → 뜻 막대)라 뜻이 도착할 때 줄이 자리를 바꾸지 않습니다.

afterEach(cleanup);

const mount = (view: MyBubbleView) =>
  render(
    <MyMessageRow
      messageId="m1"
      ko="안녕하세요"
      speaker="나"
      view={view}
      tools={{ meaning: "on", fix: { kind: "hidden" } }}
      motion="standard"
      onToggle={() => {}}
      onResend={null}
    />,
  );

/** root 안에서 classes 중 하나를 가진 요소를 문서 순서대로 — 각 요소가 가진 그 클래스 이름입니다. */
const order = (root: Element, classes: readonly string[]): string[] =>
  Array.from(root.querySelectorAll(classes.map((c) => `.${c}`).join(", "))).map(
    (el) => classes.find((c) => el.className.split(" ").includes(c)) ?? "",
  );

test("ML1. 해석: 한국어 → 로마자 → 구분선 → 뜻", () => {
  mount({ kind: "meaning", meaning: { romanization: "annyeonghaseyo", meaning: "Hello" } });

  const lines = [
    "my-message-ko",
    "my-message-roman",
    "my-message-divider",
    "my-message-meaning-text",
  ];
  expect(order(screen.getByTestId(ids.bubble), lines)).toEqual(lines);
});

test("ML2. 해석 스켈레톤: 로마자 막대 → 구분선 → 뜻 막대", () => {
  mount({ kind: "meaning-loading" });

  const lines = ["my-message-bar-roman", "my-message-divider", "my-message-bar-meaning"];
  expect(order(screen.getByTestId(ids.meaningSkeleton), lines)).toEqual(lines);
});
