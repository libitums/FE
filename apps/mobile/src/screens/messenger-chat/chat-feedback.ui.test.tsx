import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { ChatCorrection, ChatRatingReason } from "./chat-feedback.contract";
import { chatFeedbackTestIds as ids } from "./chat-feedback.contract";
import { CorrectionCard } from "./CorrectionCard";
import { RatingButtons, RatingResult } from "./RatingRow";
import { RatingSheet } from "./RatingSheet";
import { tapButtonIn } from "./chat-ui.test-support";

// `ui` 계층(CR-UI1 ~ UI8): 교정 카드 3종 · 다시 보내기 단추 · 👍 👎 · 👎 이유 시트(ADR-0129).

afterEach(cleanup);

const FIX: ChatCorrection = {
  kind: "correction",
  corrected: "저는 카페에 갔어요.",
  changes: [{ start: 1, end: 2 }],
  items: [{ original: "저", corrected: "저는", reason: "Add 는 to mark the topic." }],
  better: { text: "저는 카페에 다녀왔어요.", meaning: "I went to a café.", explanation: "" },
  meaning: "I went to a café.",
};
const BETTER: ChatCorrection = {
  kind: "better",
  corrected: "커피를 좋아합니다.",
  changes: [],
  items: [],
  better: {
    text: "저 커피 좋아해요.",
    meaning: "I like coffee.",
    explanation: "Casual sounds natural.",
  },
  meaning: "I like coffee.",
};
const IN_KOREAN: ChatCorrection = {
  kind: "l1_to_ko",
  corrected: "카페에 갔어요.",
  changes: [],
  items: [],
  better: null,
  meaning: "I went to a café.",
};

const text = (testId: string): string => screen.getByTestId(testId).textContent ?? "";
const tap = (testId: string): void => {
  fireEvent.tap(screen.getByTestId(testId), {});
};

test("CR-UI1. correction 카드: 제목 FIX · 고친 곳 줄 · 더 나은 표현 · 낭독 한 요소", () => {
  render(<CorrectionCard correction={FIX} onResend={null} />);
  expect(text(ids.cardTitle)).toBe("FIX");
  expect(text(ids.cardItem(0))).toContain("저");
  expect(text(ids.cardItem(0))).toContain("Add 는 to mark the topic.");
  expect(text(ids.cardBetter)).toContain("MORE NATURAL");
  expect(text(ids.cardBetter)).toContain("저는 카페에 다녀왔어요.");
  const content = screen.getByTestId(ids.cardContent);
  expect(content.getAttribute("accessibility-element")).toBe("true");
  expect(content.getAttribute("accessibility-label")).toContain("FIX: 저는 카페에 갔어요.");
});

test("CR-UI2. better 카드: 제목 MORE NATURAL · 더 나은 글 · 뜻 · 설명", () => {
  render(<CorrectionCard correction={BETTER} onResend={null} />);
  expect(text(ids.cardTitle)).toBe("MORE NATURAL");
  expect(text(ids.cardBetter)).toBe("저 커피 좋아해요.");
  expect(text(ids.cardMeaning)).toBe("I like coffee.");
  expect(text(ids.card)).toContain("Casual sounds natural.");
});

test("CR-UI3. l1_to_ko 카드: 제목 IN KOREAN · 한국어 글 · 뜻, 단추는 Send in Korean", () => {
  const onResend = vi.fn<() => void>();
  render(<CorrectionCard correction={IN_KOREAN} onResend={onResend} />);
  expect(text(ids.cardTitle)).toBe("IN KOREAN");
  expect(text(ids.card)).toContain("카페에 갔어요.");
  expect(text(ids.cardMeaning)).toBe("I went to a café.");
  expect(text(ids.resend)).toContain("Send in Korean");
  tapButtonIn(ids.resend);
  expect(onResend).toHaveBeenCalledTimes(1);
});

test("CR-UI4. 다시 보내기 단추는 onResend가 있을 때만, 낭독 요소 밖 형제로 선다", () => {
  render(<CorrectionCard correction={FIX} onResend={null} />);
  expect(screen.queryByTestId(ids.resend)).toBeNull();
  cleanup();
  render(<CorrectionCard correction={FIX} onResend={() => undefined} />);
  const button = screen.getByTestId(ids.resend);
  expect(text(ids.resend)).toContain("Send corrected");
  expect(screen.getByTestId(ids.cardContent).contains(button)).toBe(false);
});

test("CR-UI5. 👍 👎: 누르면 콜백, 켜진 쪽은 data-on · 「selected」 낭독, 탭 요소는 flatten={false}", () => {
  const onGood = vi.fn<() => void>();
  const onBad = vi.fn<() => void>();
  render(<RatingButtons rating={{ value: "up" }} onGood={onGood} onBad={onBad} />);
  const good = screen.getByTestId(ids.ratingGood);
  const bad = screen.getByTestId(ids.ratingBad);
  expect(good.getAttribute("data-on")).toBe("true");
  expect(good.getAttribute("accessibility-label")).toBe("Good reply, selected");
  expect(bad.getAttribute("data-on")).toBe("false");
  expect(bad.getAttribute("accessibility-label")).toBe("Bad reply");
  for (const el of [good, bad]) {
    expect(el.getAttribute("flatten")).toBe("false");
    expect(el.getAttribute("accessibility-enable-tap")).toBe("true");
  }
  tap(ids.ratingGood);
  tap(ids.ratingBad);
  expect(onGood).toHaveBeenCalledTimes(1);
  expect(onBad).toHaveBeenCalledTimes(1);
});

test("CR-UI6. 지난 평가 한 줄 — 👍 You liked this · 👎 You flagged this", () => {
  render(<RatingResult rating={{ value: "up" }} />);
  expect(text(ids.ratingResult)).toBe("You liked this");
  cleanup();
  render(<RatingResult rating={{ value: "down", reasons: ["other"], note: null }} />);
  expect(text(ids.ratingResult)).toBe("You flagged this");
});

function mountSheet(reasons: readonly ChatRatingReason[]) {
  const handlers = {
    onToggle: vi.fn<(reason: ChatRatingReason) => void>(),
    onNote: vi.fn<(value: string) => void>(),
    onSend: vi.fn<() => void>(),
    onReport: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(<RatingSheet name="미나" reasons={reasons} note="" {...handlers} />);
  return handlers;
}
const sendDisabled = () =>
  within(screen.getByTestId("ui-lynx-bottom-sheet-action-send"))
    .getByTestId("ui-lynx-button")
    .getAttribute("data-disabled");

test("CR-UI7. 👎 시트: 이유 다섯 줄(이름이 든 줄 포함) · 이유가 없으면 Send 꺼짐 · 줄을 누르면 토글", () => {
  const handlers = mountSheet([]);
  const sheet = screen.getByTestId(ids.sheet);
  expect(sheet.textContent).toContain("What went wrong?");
  expect(text(ids.sheetReason("out_of_character"))).toBe("Doesn't sound like 미나");
  expect(sendDisabled()).toBe("true");
  expect(screen.queryByTestId(ids.sheetReport)).toBeNull();
  expect(screen.getByTestId(ids.sheetNote)).toBeTruthy();
  tap(ids.sheetReason("too_hard"));
  expect(handlers.onToggle).toHaveBeenCalledWith("too_hard");
});

test("CR-UI8. 👎 시트: 이유가 있으면 Send, uncomfortable이면 Report 길이 선다", () => {
  const handlers = mountSheet(["uncomfortable"]);
  expect(sendDisabled()).not.toBe("true");
  expect(screen.getByTestId(ids.sheetReason("uncomfortable")).getAttribute("data-checked")).toBe(
    "true",
  );
  tapButtonIn(ids.sheetReport);
  expect(handlers.onReport).toHaveBeenCalledTimes(1);
  tapButtonIn("ui-lynx-bottom-sheet-action-send");
  expect(handlers.onSend).toHaveBeenCalledTimes(1);
});
