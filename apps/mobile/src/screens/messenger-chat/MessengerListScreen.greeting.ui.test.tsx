import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, fixtureRoom, makeSource, seedOf } from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { messengerListTestIds as ids } from "./messenger-chat.contract";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(CL-UI1 ~ UI3): 메시지가 아직 없는 열린 방은 그 인물의 첫 인사를 흐린 기울임 미리보기로 보이고, 시각 칸은 비우고,
// NEW 알약을 단다(ADR-0113 추가 2026-11-17). 안 읽은 알약은 없다. 낭독은 「New greeting」으로 시작한다. 판정은 unit(CL-G)이 진다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0, 0));
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function mount() {
  const source = makeSource(
    seedOf(
      fixtureRoom("duksu", {
        counterpart: { id: "duksu", name: "덕수쌤", avatarPath: null },
        messages: [],
      }),
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        messages: [
          { kind: "text", from: "them", text: { ko: "뭐 해요?", en: "What's up?" }, minutesAgo: 5 },
        ],
      }),
    ),
  );
  render(
    <MessengerListScreen
      source={source}
      wallet={createCoinWallet({ earned: 100 })}
      onOpenRoom={vi.fn<(id: string) => void>()}
      onGoToJourney={vi.fn<() => void>()}
      onLayerChange={vi.fn<(open: boolean) => void>()}
      notice={null}
      onNoticeShown={vi.fn<() => void>()}
      access="open"
      onSignIn={vi.fn<() => void>()}
    />,
  );
}

test("CL-UI1 빈 방은 첫 인사를 greeting 톤 미리보기로 보이고 시각 칸이 없다", () => {
  mount();
  const preview = screen.getByTestId(ids.rowPreview("duksu"));
  expect(preview.textContent).toBe("안녕하세요! 덕수쌤이에요.");
  expect(preview.getAttribute("data-tone")).toBe("greeting");
  expect(screen.queryByTestId(ids.rowTime("duksu"))).toBeNull();
});

test("CL-UI2 빈 방은 NEW 알약이 서고 안 읽은 알약은 없다 — 대화가 있는 방은 평소대로다", () => {
  mount();
  expect(screen.getByTestId(ids.rowNew("duksu")).textContent?.trim()).toBe("NEW");
  expect(screen.queryByTestId(ids.rowUnread("duksu"))).toBeNull();
  expect(screen.queryByTestId(ids.rowNew("mina"))).toBeNull();
  expect(screen.getByTestId(ids.rowPreview("mina")).getAttribute("data-tone")).not.toBe("greeting");
  expect(screen.getByTestId(ids.rowTime("mina"))).toBeTruthy();
});

test("CL-UI3 빈 방 줄의 낭독은 「New greeting」으로 시작하고 이름 · 첫 인사를 읽는다", () => {
  mount();
  const label = screen.getByTestId(ids.row("duksu")).getAttribute("accessibility-label") ?? "";
  expect(label.startsWith("New greeting")).toBe(true);
  expect(label).toContain("덕수쌤");
  expect(label).toContain("안녕하세요! 덕수쌤이에요.");
});
