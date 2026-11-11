import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import {
  clearBackHandlers,
  makeSource,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import type { ChatThread } from "./chat-source.contract";
import { isInDocumentOrder } from "../../lib/dom.test-support";
import { chatSettingsTestIds } from "./chat-settings.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI22): 채팅 설정 사이드바(O4) — 줄 순서 고정(data-order 1~6) · 잔액 · Get coins → 엽전 상점 →
// 닫으면 사이드바 · 기억 · 교정 방식 줄(CS-UI1 · UI2, ADR-0126) · My profile 문장 · 프로필 줄 탭 무동작 ·
// 움직임 줄이기에서 미는 움직임 없음.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

function threadOf(): ChatThread {
  const thread = makeSource().thread("mina");
  if (thread === null) throw new Error("fixture thread missing");
  return thread;
}

function handlers() {
  return {
    onGetCoins: vi.fn<() => void>(),
    onStoryPoint: vi.fn<() => void>(),
    onMemories: vi.fn<() => void>(),
    onFeedbackMode: vi.fn<() => void>(),
    onDelete: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
    onBirthYear: vi.fn<() => void>(),
  };
}

function mountSidebar(thread: ChatThread = threadOf(), reduced = false) {
  const h = handlers();
  const sidebar = (
    <ChatSettingsSidebar
      thread={thread}
      learnerName="Hana"
      coinBalance={120}
      birthYear={{ kind: "set", year: 2001 }}
      memories={{ memories: [], count: 50, cap: 50, full: true }}
      feedbackMode="natural"
      {...h}
    />
  );
  render(reduced ? <MotionProvider motion="reduced">{sidebar}</MotionProvider> : sidebar);
  return h;
}

const orderIds = [
  ids.sidebarCoins,
  ids.sidebarProfile,
  ids.sidebarMyProfile,
  ids.sidebarStoryPoint,
  ids.sidebarBirthYear,
  chatSettingsTestIds.sidebarMemories,
  chatSettingsTestIds.sidebarFeedback,
  ids.sidebarDelete,
] as const;

// ⟨ADR-0125⟩ 생년 줄이 이야기 시점 다음 다섯째로 들어왔고, ⟨ADR-0126⟩ 자동 보기 토글 자리에 기억 · 교정 방식 두 줄이 섰다.
test("MC-UI22. 여덟 줄이 data-order 1~8로 정해진 순서에 선다(DOM 순서도 같다)", () => {
  mountSidebar();

  const rows = orderIds.map((id) => screen.getByTestId(id));
  expect(rows.map((row) => row.getAttribute("data-order"))).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
  ]);
  expect(isInDocumentOrder(rows)).toBe(true);
  expect(screen.getByTestId(ids.sidebar).textContent).toContain("Chat settings");
});

test("MC-UI22. 엽전 상자는 잔액을 보이고 Get coins가 onGetCoins를 부른다", () => {
  const { onGetCoins } = mountSidebar();

  expect(screen.getByTestId(ids.sidebarCoins).textContent).toContain("120");
  expect(screen.getByTestId(ids.sidebarCoins).textContent).toContain("My coins");
  tapId(ids.sidebarGetCoins);

  expect(onGetCoins).toHaveBeenCalledTimes(1);
});

test("MC-UI22. 상대 프로필 줄에는 이름 · View profile이, My profile 줄에는 「{상대} calls you 「{내 이름}」」이 든다", () => {
  mountSidebar();

  expect(screen.getByTestId(ids.sidebarProfile).textContent).toContain("미나");
  expect(screen.getByTestId(ids.sidebarProfile).textContent).toContain("View profile");
  expect(screen.getByTestId(ids.sidebarMyProfile).textContent).toContain("My profile");
  expect(screen.getByTestId(ids.sidebarMyProfile).textContent).toContain("미나 calls you 「Hana」");
});

test("MC-UI22. 프로필 두 줄을 탭해도 아무 동작도 일어나지 않는다", () => {
  const h = mountSidebar();

  fireEvent.tap(screen.getByTestId(ids.sidebarProfile), {});
  fireEvent.tap(screen.getByTestId(ids.sidebarMyProfile), {});
  for (const id of [ids.sidebarProfile, ids.sidebarMyProfile]) {
    const inner = screen.getByTestId(id).querySelector('[data-testid="ui-lynx-settings-cell"]');
    if (inner !== null) fireEvent.tap(inner, {});
  }

  for (const fn of Object.values(h)) expect(fn).not.toHaveBeenCalled();
});

test("MC-UI22. 이야기 시점 줄은 지금 시점 제목을 값으로 보이고 탭하면 onStoryPoint다", () => {
  const { onStoryPoint } = mountSidebar();

  expect(screen.getByTestId(ids.sidebarStoryPoint).textContent).toContain("Story point");
  expect(screen.getByTestId(ids.sidebarStoryPoint).textContent).toContain("Buying water");
  tapId(ids.sidebarStoryPoint);
  const inner = screen
    .getByTestId(ids.sidebarStoryPoint)
    .querySelector('[data-testid="ui-lynx-settings-cell"]');
  if (inner !== null) fireEvent.tap(inner, {});

  expect(onStoryPoint).toHaveBeenCalled();
});

test("CS-UI1. 기억 줄은 「What {이름} remembers」 · 개수 · full을, 교정 방식 줄은 지금 방식을 보이고 탭하면 부른다", () => {
  const { onMemories, onFeedbackMode } = mountSidebar();

  const memories = screen.getByTestId(chatSettingsTestIds.sidebarMemories);
  expect(memories.textContent).toContain("What 미나 remembers");
  expect(memories.textContent).toContain("50 / 50 · full");
  expect(memories.getAttribute("accessibility-enable-tap")).toBe("true");
  const feedback = screen.getByTestId(chatSettingsTestIds.sidebarFeedback);
  expect(feedback.textContent).toContain("Correction style");
  expect(feedback.textContent).toContain("Naturally in the reply");

  // Android는 펴진 접근성 요소를 트리에서 지웠다(ADR-0126 기기 확인 — Story point · Get coins가 낭독에 없었다).
  for (const id of [
    ids.sidebarGetCoins,
    ids.sidebarStoryPoint,
    ids.sidebarBirthYear,
    chatSettingsTestIds.sidebarMemories,
    chatSettingsTestIds.sidebarFeedback,
  ]) {
    expect(screen.getByTestId(id).getAttribute("flatten")).toBe("false");
  }

  tapId(chatSettingsTestIds.sidebarMemories);
  tapId(chatSettingsTestIds.sidebarFeedback);
  expect(onMemories).toHaveBeenCalledTimes(1);
  expect(onFeedbackMode).toHaveBeenCalledTimes(1);
});

test("CS-UI2. 자동 보기 토글은 사이드바에 없다(설정 탭 Chats의 Reply ideas 하나로 옮겼다)", () => {
  mountSidebar();
  expect(screen.queryByTestId(ids.sidebarAutoIdeas) === null).toBe(true);
  expect(
    screen.getByTestId(ids.sidebar).textContent?.includes("Show reply ideas automatically"),
  ).toBe(false);
});

test("MC-UI22. Delete chat은 onDelete, 닫기 단추와 바깥(scrim)은 onClose를 부른다", () => {
  const { onDelete, onClose } = mountSidebar();

  tapId(ids.sidebarDelete);
  expect(onDelete).toHaveBeenCalledTimes(1);
  tapId(ids.sidebarClose);
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.tap(screen.getByTestId("ui-lynx-overlay"), {});
  expect(onClose).toHaveBeenCalledTimes(2);
});

test("MC-UI22. 움직임 줄이기에서는 미는 움직임 클래스가 빠진다(기본 움직임보다 클래스가 적다)", () => {
  const tokensOf = (): Set<string> => {
    const out = new Set<string>();
    const root = screen.getByTestId(ids.sidebar);
    for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) {
      // 사이드바 자기 클래스만 본다 — 안의 ui-lynx 부품은 움직임 줄이기일 때만 붙는
      // 자기 클래스(`ui-lynx-*-motion-reduced` 등)가 있어 전체 집합은 부분집합이 아니다.
      for (const token of (el.getAttribute("class") ?? "").split(/\s+/))
        if (token.startsWith("chat-sidebar")) out.add(token);
    }
    return out;
  };
  mountSidebar();
  const standard = tokensOf();
  cleanup();
  mountSidebar(threadOf(), true);
  const reduced = tokensOf();

  expect(standard.size).toBeGreaterThan(0);
  expect([...reduced].every((token) => standard.has(token))).toBe(true);
  expect(reduced.size).toBeLessThan(standard.size);
});

// ----------------------------------------------------------------------- 화면 결선

function openSidebar() {
  const mounted = mountChat({ coinBalance: 120 });
  tapId(ids.settings);
  return mounted;
}

test("MC-UI22. 화면: ☰가 사이드바를 열고 닫기 · 시스템 뒤로 · scrim으로 닫힌다", () => {
  openSidebar();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();

  tapId(ids.sidebarClose);
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();

  tapId(ids.settings);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
});

test("MC-UI22. 화면: Get coins는 엽전 상점을 열고 그것을 닫으면 사이드바로 돌아온다", () => {
  openSidebar();

  tapId(ids.sidebarGetCoins);
  expect(screen.getByTestId("coin-shop-screen")).toBeTruthy();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  fireEvent.tap(
    within(screen.getByTestId("coin-shop-screen-close")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("coin-shop-screen")).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});

test("CS-UI3. 화면: 교정 방식 줄 → 시트에서 고르고 Save하면 설정이 바뀌고 사이드바로, 뒤로는 저장 없이 사이드바로", () => {
  const { source } = openSidebar();

  tapId(chatSettingsTestIds.sidebarFeedback);
  expect(screen.getByTestId(chatSettingsTestIds.feedbackSheet)).toBeTruthy();
  expect(
    screen.getByTestId(chatSettingsTestIds.feedbackMode("separate")).getAttribute("data-selected"),
  ).toBe("true");
  tapId(chatSettingsTestIds.feedbackMode("natural"));
  expect(
    screen.getByTestId(chatSettingsTestIds.feedbackMode("natural")).getAttribute("data-selected"),
  ).toBe("true");
  expect(source.snapshot().preferences.feedbackMode).toBe("separate"); // 고르기만으로는 저장되지 않는다
  tapButtonIn("ui-lynx-bottom-sheet-action-save");
  expect(source.snapshot().preferences.feedbackMode).toBe("natural");
  expect(screen.queryByTestId(chatSettingsTestIds.feedbackSheet) === null).toBe(true);
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();

  tapId(chatSettingsTestIds.sidebarFeedback);
  tapId(chatSettingsTestIds.feedbackMode("prefix"));
  expect(systemBack()).toBe(true);
  expect(source.snapshot().preferences.feedbackMode).toBe("natural");
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});

test("CS-UI4. 화면: 기억 줄을 누르면 사이드바가 닫히고 onOpenMemories(인물 id, 이름)", () => {
  const { onOpenMemories } = openSidebar();

  tapId(chatSettingsTestIds.sidebarMemories);
  expect(onOpenMemories).toHaveBeenCalledWith("mina", "미나");
  expect(screen.queryByTestId(ids.sidebar) === null).toBe(true);
});

test("MC2-UI11. 화면: 사이드바의 My coins는 지갑 잔액이고 쓰면 열려 있는 동안에도 따라 줄어든다", () => {
  const { wallet } = mountChat({ coinBalance: 100 });
  act(() => {
    wallet.spend(60, "photo");
  });

  tapId(ids.settings);
  expect(screen.getByTestId(ids.sidebarCoins).textContent).toContain("40");
  expect(screen.getByTestId(ids.sidebarCoins).textContent).not.toContain("100");
  act(() => {
    wallet.spend(10, "message");
  });

  expect(screen.getByTestId(ids.sidebarCoins).textContent).toContain("30");
});
