import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { chatWordsTestIds as ids } from "../ranking/ranking.contract";
import { ChatWordsEarned, ChatWordsStrip } from "./ChatWords";

// `ui` 계층(ADR-0170 CW-UI1 ~ UI3): 방 머리 아래 이번 주 줄 · 내 말풍선 아래 얻은 단어 칩.

afterEach(cleanup);

test("CW-UI1. 방 줄: 「N chat words」 · 「this week · #R in your group」, 버튼 낭독 한 줄, 누르면 onOpen", () => {
  const onOpen = vi.fn<() => void>();
  render(<ChatWordsStrip words={14} rank={4} onOpen={onOpen} />);
  const strip = screen.getByTestId(ids.strip);
  expect(strip).toHaveTextContent("14 chat words");
  expect(strip).toHaveTextContent("this week · #4 in your group");
  expect(strip).toHaveAttribute("accessibility-traits", "button");
  expect(strip).toHaveAttribute(
    "accessibility-label",
    "14 chat words this week, number 4 in your group. Open ranking",
  );
  fireEvent.tap(strip, {});
  expect(onOpen).toHaveBeenCalledTimes(1);
  cleanup();
  render(<ChatWordsStrip words={1} rank={null} onOpen={onOpen} />);
  expect(screen.getByTestId(ids.strip)).toHaveTextContent("1 chat word");
  expect(screen.getByTestId(ids.strip)).not.toHaveTextContent("#");
});

test("CW-UI2. 얻은 단어: 「+2 chat words」 알약과 단어 칩(사전 꼴)", () => {
  render(
    <ChatWordsEarned
      result={{
        counted: [
          { id: "voca:a", surface: "김치찌개" },
          { id: "voca:b", surface: "맛있다" },
        ],
        pending: [],
        weekTotal: 14,
      }}
    />,
  );
  const earned = screen.getByTestId(ids.earned);
  expect(earned).toHaveTextContent("+2 chat words");
  expect(screen.getByTestId(ids.word(0))).toHaveTextContent("김치찌개");
  expect(screen.getByTestId(ids.word(1))).toHaveTextContent("맛있다");
  expect(screen.queryByTestId(ids.pending(0))).toBeNull();
});

test("CW-UI3. 교정이 짚은 단어는 회색 줄 「맵다 · counts when you resend it right」, 센 단어가 없으면 알약 없음", () => {
  render(
    <ChatWordsEarned
      result={{ counted: [], pending: [{ id: "voca:c", surface: "맵다" }], weekTotal: 14 }}
    />,
  );
  expect(screen.getByTestId(ids.pending(0))).toHaveTextContent(
    "맵다 · counts when you resend it right",
  );
  expect(screen.getByTestId(ids.earned)).not.toHaveTextContent("+");
  expect(screen.queryByTestId(ids.word(0))).toBeNull();
});
