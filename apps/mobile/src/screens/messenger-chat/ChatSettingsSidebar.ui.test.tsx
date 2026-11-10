import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import {
  clearBackHandlers,
  makeSource,
  mountChat,
  systemBack,
  tapId,
} from "./chat-ui.test-support";
import type { ChatThread } from "./chat-source.contract";
import { isInDocumentOrder } from "../../lib/dom.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(MC-UI22): 채팅 설정 사이드바(O4) — 줄 순서 고정(data-order 1~6) · 잔액 · Get gems → 젬 화면 →
// 닫으면 사이드바 · 자동 보기 토글(setAutoIdeas 뒤집은 값 · data-checked) · My profile 문장 · 프로필 줄 탭 무동작 ·
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
    onGetGems: vi.fn<() => void>(),
    onStoryPoint: vi.fn<() => void>(),
    onAutoIdeas: vi.fn<(on: boolean) => void>(),
    onDelete: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
}

function mountSidebar(thread: ChatThread = threadOf(), reduced = false) {
  const h = handlers();
  const sidebar = (
    <ChatSettingsSidebar thread={thread} learnerName="Hana" gemBalance={120} {...h} />
  );
  render(reduced ? <MotionProvider motion="reduced">{sidebar}</MotionProvider> : sidebar);
  return h;
}

const orderIds = [
  ids.sidebarGems,
  ids.sidebarProfile,
  ids.sidebarMyProfile,
  ids.sidebarStoryPoint,
  ids.sidebarAutoIdeas,
  ids.sidebarDelete,
] as const;

test("MC-UI22. 여섯 줄이 data-order 1~6으로 정해진 순서에 선다(DOM 순서도 같다)", () => {
  mountSidebar();

  const rows = orderIds.map((id) => screen.getByTestId(id));
  expect(rows.map((row) => row.getAttribute("data-order"))).toEqual(["1", "2", "3", "4", "5", "6"]);
  expect(isInDocumentOrder(rows)).toBe(true);
  expect(screen.getByTestId(ids.sidebar).textContent).toContain("Chat settings");
});

test("MC-UI22. 젬 상자는 잔액을 보이고 Get gems가 onGetGems를 부른다", () => {
  const { onGetGems } = mountSidebar();

  expect(screen.getByTestId(ids.sidebarGems).textContent).toContain("120");
  expect(screen.getByTestId(ids.sidebarGems).textContent).toContain("My gems");
  tapId(ids.sidebarGetGems);

  expect(onGetGems).toHaveBeenCalledTimes(1);
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

test("MC-UI22. 자동 보기 토글은 settings.autoIdeas를 data-checked로 보이고 탭하면 뒤집은 값을 부른다", () => {
  const { onAutoIdeas } = mountSidebar();
  const toggle = () => {
    const row = screen.getByTestId(ids.sidebarAutoIdeas);
    return row.hasAttribute("data-checked") ? row : row.querySelector("[data-checked]");
  };
  expect(toggle()?.getAttribute("data-checked")).toBe("true");
  expect(screen.getByTestId(ids.sidebarAutoIdeas).textContent).toContain(
    "Show reply ideas automatically",
  );

  const cell = within(screen.getByTestId(ids.sidebarAutoIdeas)).getByTestId(
    "ui-lynx-settings-cell",
  );
  fireEvent.tap(cell, {});

  expect(onAutoIdeas).toHaveBeenCalledTimes(1);
  expect(onAutoIdeas).toHaveBeenCalledWith(false);
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
  const mounted = mountChat({ gemBalance: 120 });
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

test("MC-UI22. 화면: Get gems는 젬 화면을 열고 그것을 닫으면 사이드바로 돌아온다", () => {
  openSidebar();

  tapId(ids.sidebarGetGems);
  expect(screen.getByTestId("gem-purchase-screen")).toBeTruthy();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
  fireEvent.tap(
    within(screen.getByTestId("gem-purchase-screen-close")).getByTestId("ui-lynx-round-button"),
    {},
  );

  expect(screen.queryByTestId("gem-purchase-screen")).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
});

test("MC-UI22. 화면: 자동 보기 토글을 누르면 출처가 바뀌고 data-checked가 뒤집힌다", () => {
  const { source } = openSidebar();
  const setAutoIdeas = vi.spyOn(source, "setAutoIdeas");

  const cell = within(screen.getByTestId(ids.sidebarAutoIdeas)).getByTestId(
    "ui-lynx-settings-cell",
  );
  fireEvent.tap(cell, {});

  expect(setAutoIdeas).toHaveBeenCalledWith("mina", false);
  expect(source.thread("mina")?.settings.autoIdeas).toBe(false);
  const row = screen.getByTestId(ids.sidebarAutoIdeas);
  const checked = row.hasAttribute("data-checked") ? row : row.querySelector("[data-checked]");
  expect(checked?.getAttribute("data-checked")).toBe("false");
});
