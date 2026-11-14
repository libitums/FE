import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { ChatActionRow } from "./ChatActionRow";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(SS-UI1): 상대 지문 줄 — 말풍선 없이 *…* 회색 기울임, 번역 줄, 낭독(ADR-0137).

afterEach(cleanup);

test("SS-UI1 지문은 말풍선 없는 줄 하나 · 번역 줄 · 별표 뗀 낭독", () => {
  render(
    <ChatActionRow text={{ ko: "*칠판에 쓴다*", en: "Writes on the board." }} name="덕수쌤" />,
  );
  const row = screen.getByTestId(ids.action);
  expect(row.textContent).toContain("*칠판에 쓴다*");
  expect(row.textContent).toContain("Writes on the board.");
  expect(row.querySelector('[data-testid="ui-lynx-chat-bubble"]')).toBeNull();
  expect(row.getAttribute("accessibility-label")).toBe("덕수쌤: 칠판에 쓴다, Writes on the board.");
  expect(row.getAttribute("flatten")).toBe("false");
  cleanup();
  render(<ChatActionRow text={{ ko: "*웃는다*", en: "" }} name="덕수쌤" />);
  expect(screen.getByTestId(ids.action).getAttribute("accessibility-label")).toBe("덕수쌤: 웃는다");
});
