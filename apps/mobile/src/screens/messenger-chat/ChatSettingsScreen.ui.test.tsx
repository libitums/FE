import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { ChatMemoriesScreen } from "./ChatMemoriesScreen";
import { ChatSettingsScreen } from "./ChatSettingsScreen";
import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  mountChat,
  nativeInput,
  seedOf,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import type { ChatFixtureSeed, ChatSource } from "./chat-source.contract";
import { chatSettingsTestIds as ids } from "./chat-settings.contract";
import { messengerChatTestIds as room } from "./messenger-chat.contract";

// `ui` 계층(CS-UI5 ~ UI12): 대화 설정(ADR-0126) — 설정 탭 Chats 화면 · 먼저 보내는 메시지 시트 · 기억 화면.

beforeEach(clearBackHandlers);
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const seed = (memories?: ChatFixtureSeed["memories"]): ChatFixtureSeed => ({
  ...seedOf(fixtureRoom("mina")),
  ...(memories === undefined ? {} : { memories }),
});

function mountSettings(
  source: ChatSource = makeSource(seed({ shared: ["You're from Manila."], byCharacter: {} })),
) {
  const onOpenSharedMemories = vi.fn<() => void>();
  const onBack = vi.fn<() => void>();
  render(
    <ChatSettingsScreen
      source={source}
      onOpenSharedMemories={onOpenSharedMemories}
      onBack={onBack}
    />,
  );
  return { source, onOpenSharedMemories, onBack };
}

const checkedOf = (testId: string): string | null => {
  const row = screen.getByTestId(testId);
  return (
    (row.hasAttribute("data-checked") ? row : row.querySelector("[data-checked]"))?.getAttribute(
      "data-checked",
    ) ?? null
  );
};

test("CS-UI5 Chats 화면은 추천 답변 · 먼저 보내는 메시지 · 공유 기억 · 생년 줄을 지금 값으로 보인다", () => {
  mountSettings();

  expect(checkedOf(ids.replyIdeas)).toBe("true");
  expect(screen.getByTestId(ids.proactive).textContent).toContain("Once a day · Any time");
  expect(screen.getByTestId(ids.proactive).getAttribute("accessibility-label")).toBe(
    "They message you first, Once a day · Any time",
  );
  expect(screen.getByTestId(ids.sharedMemories).textContent).toContain(
    "1 memory · shared by all characters",
  );
  expect(screen.getByTestId(ids.birthYear)).toBeTruthy();
  for (const id of [ids.proactive, ids.sharedMemories, ids.birthYear]) {
    const row = screen.getByTestId(id);
    expect(row.getAttribute("accessibility-enable-tap")).toBe("true");
    expect(row.getAttribute("flatten")).toBe("false");
  }
  const body = screen.getByTestId(ids.screen).querySelector(".chat-settings-body");
  expect(body?.getAttribute("flatten")).toBe("false");
});

test("CS-UI6 추천 답변 토글을 누르면 출처의 replyIdeas가 꺼진다", () => {
  const { source } = mountSettings();
  const cell = within(screen.getByTestId(ids.replyIdeas)).getByTestId("ui-lynx-settings-cell");
  fireEvent.tap(cell, {});
  expect(source.snapshot().preferences.replyIdeas).toBe(false);
});

test("CS-UI7 먼저 보내는 메시지 시트 — 끔이면 시각을 못 고르고, Save하면 빈도 · 시각이 저장된다", () => {
  const { source } = mountSettings();
  tapId(ids.proactive);
  expect(screen.getByTestId(ids.proactiveSheet).textContent).toContain(
    "No messages between 10 PM and 8 AM your time.",
  );

  tapId(ids.proactivePref("off"));
  const hour9 = screen.getByTestId(ids.proactiveHour(9));
  expect(hour9.getAttribute("accessibility-enable-tap")).toBe("false");
  tapId(ids.proactiveHour(9));
  expect(hour9.getAttribute("data-selected")).toBe("false");

  tapId(ids.proactivePref("daily2"));
  tapId(ids.proactiveHour(21));
  expect(screen.getByTestId(ids.proactiveHour(21)).getAttribute("data-selected")).toBe("true");
  tapButtonIn("ui-lynx-bottom-sheet-action-save");

  expect(source.snapshot().preferences).toMatchObject({ proactive: "daily2", proactiveHour: 21 });
  expect(screen.queryByTestId(ids.proactiveSheet) === null).toBe(true);
  expect(screen.getByTestId(ids.proactive).textContent).toContain("Twice a day · 9 PM");
});

test("CS-UI8 시트가 열렸을 때 시스템 뒤로는 시트만 닫고(저장 없음), 다음 뒤로는 onBack", () => {
  const { source, onBack } = mountSettings();
  tapId(ids.proactive);
  tapId(ids.proactivePref("off"));

  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.proactiveSheet) === null).toBe(true);
  expect(source.snapshot().preferences.proactive).toBe("daily1");
  expect(onBack).not.toHaveBeenCalled();
  expect(systemBack()).toBe(true);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("CS-UI9 공유 기억 줄은 onOpenSharedMemories, 뒤로 단추는 onBack", () => {
  const { onOpenSharedMemories, onBack } = mountSettings();
  tapId(ids.sharedMemories);
  expect(onOpenSharedMemories).toHaveBeenCalledTimes(1);
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onBack).toHaveBeenCalledTimes(1);
});

function mountMemories(memories: ChatFixtureSeed["memories"], character = true) {
  const source = makeSource(seed(memories));
  const onBack = vi.fn<() => void>();
  render(
    <ChatMemoriesScreen
      source={source}
      scope={character ? { kind: "character", characterId: "mina" } : { kind: "shared" }}
      name={character ? "Mina" : null}
      onBack={onBack}
    />,
  );
  return { source, onBack };
}

test("CS-UI10 기억 화면 — 제목 · 개수, 비면 빈 문구, 가득이면 알림 상자", () => {
  mountMemories({ shared: [], byCharacter: { mina: ["You like iced americano."] } });
  expect(screen.getByTestId(ids.memoriesScreen).textContent).toContain("What Mina remembers");
  expect(screen.getByTestId(ids.memoriesScreen).textContent).toContain("1 / 50");
  expect(screen.queryByTestId(ids.memoriesFull) === null).toBe(true);
  cleanup();

  mountMemories({ shared: [], byCharacter: {} }, false);
  expect(screen.getByTestId(ids.memoriesScreen).textContent).toContain(
    "What everyone knows about you",
  );
  expect(screen.getByTestId(ids.memoriesEmpty).textContent).toBe(
    "Nothing yet. Characters will remember things you share as you chat.",
  );
  cleanup();

  mountMemories(
    { shared: Array.from({ length: 30 }, (_, i) => `fact ${i}`), byCharacter: {} },
    false,
  );
  expect(screen.getByTestId(ids.memoriesFull).textContent).toContain("Memory is full");
  expect(screen.getByTestId(ids.memoriesScreen).textContent).toContain("30 / 30");
});

test("CS-UI11 고치기 — 시트에서 글을 바꿔 Save하면 바뀌고 Edited가 붙는다, 빈 글이면 Save가 꺼진다", () => {
  const { source } = mountMemories({ shared: [], byCharacter: { mina: ["You like coffee."] } });
  const id = source.memories({ kind: "character", characterId: "mina" }).memories[0]?.id ?? "";

  tapId(ids.memoryEdit(id));
  const sheet = screen.getByTestId(ids.memoryEditSheet);
  nativeInput("input", "   ", "ui-lynx-text-field-input");
  expect(sheet.querySelector('[data-enabled="false"]') !== null).toBe(true);
  // 버튼 상태는 감싸개 data-enabled로 본다(FixRequestDialog 선례).
  nativeInput("input", "You like iced americano.", "ui-lynx-text-field-input");
  const buttons = within(sheet).getAllByTestId("ui-lynx-button");
  fireEvent.tap(buttons[buttons.length - 1] as Element, {});
  expect(source.memories({ kind: "character", characterId: "mina" }).memories[0]).toMatchObject({
    content: "You like iced americano.",
    edited: true,
  });
  expect(screen.getByTestId(ids.memory(id)).textContent).toContain("Edited");
});

test("CS-UI12 지우기 — 확인 대화를 거쳐 지우고, 뒤로는 대화만 닫는다", () => {
  const { source, onBack } = mountMemories({ shared: [], byCharacter: { mina: ["A.", "B."] } });
  const first = source.memories({ kind: "character", characterId: "mina" }).memories[0]?.id ?? "";

  tapId(ids.memoryDelete(first));
  expect(screen.getByTestId(ids.memoryDeleteDialog).textContent).toContain("Delete this memory?");
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.memoryDeleteDialog) === null).toBe(true);
  expect(onBack).not.toHaveBeenCalled();

  tapId(ids.memoryDelete(first));
  const buttons = within(screen.getByTestId(ids.memoryDeleteDialog)).getAllByTestId(
    "ui-lynx-button",
  );
  fireEvent.tap(buttons[buttons.length - 1] as Element, {});
  expect(source.memories({ kind: "character", characterId: "mina" }).count).toBe(1);
  expect(screen.queryByTestId(ids.memory(first)) === null).toBe(true);
});

test("CS-UI14 고치기 대화상자는 글을 바꾸기 전에는 Save가 꺼져 있다(같은 글로 Edited가 붙지 않게)", () => {
  const { source } = mountMemories({ shared: [], byCharacter: { mina: ["You like coffee."] } });
  const id = source.memories({ kind: "character", characterId: "mina" }).memories[0]?.id ?? "";
  tapId(ids.memoryEdit(id));
  const sheet = screen.getByTestId(ids.memoryEditSheet);
  expect(sheet.querySelector('[data-enabled="false"]') !== null).toBe(true);
  nativeInput("input", "  You like coffee.  ", "ui-lynx-text-field-input");
  expect(sheet.querySelector('[data-enabled="false"]') !== null).toBe(true);
});

test("CS-UI15 기억이 대화상자 없이 바뀌어도(출처 알림) 목록 · 개수가 다시 그려진다", () => {
  const { source } = mountMemories({ shared: [], byCharacter: { mina: ["A.", "B."] } });
  const first = source.memories({ kind: "character", characterId: "mina" }).memories[0]?.id ?? "";
  act(() => {
    source.deleteMemory(first);
  });
  expect(screen.queryByTestId(ids.memory(first)) === null).toBe(true);
  expect(screen.getByTestId(ids.memoriesScreen).textContent).toContain("1 / 50");
});

test("CS-UI16 추천 답변이 꺼지면 「…」 메뉴에 New reply ideas가 없다", () => {
  const source = makeSource(seed());
  source.setPreferences({ replyIdeas: false });
  mountChat({ source });
  tapId(room.more);
  expect(screen.queryByTestId(room.moreItem("ideas")) === null).toBe(true);
  expect(screen.getByTestId(room.moreItem("fix"))).toBeTruthy();
});

test("CS-UI17 교정 방식 기본값 꼬리표(default)도 낭독 이름에 든다", () => {
  const source = makeSource(seed());
  mountChat({ source });
  tapId(room.settings);
  tapId(ids.sidebarFeedback);
  expect(screen.getByTestId(ids.feedbackMode("separate")).getAttribute("accessibility-label")).toBe(
    "Card only, default, 미나 just keeps chatting. The fix shows on the ✎ under your message., selected",
  );
});
