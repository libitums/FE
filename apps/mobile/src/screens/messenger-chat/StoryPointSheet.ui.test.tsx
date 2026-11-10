import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  mountChat,
  systemBack,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { StoryPointSheet } from "./StoryPointSheet";

// `ui` 계층(MC-UI23): 이야기 시점 시트(O5) — 시점 줄(지금 값 selected · 잠김 data-locked · 조건 낭독) ·
// Change는 지금 값과 다른 열린 시점을 골라야 켜짐 · 잠긴 줄 탭 무동작 · Change → setStoryPoint 뒤 사이드바로.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const storyPoints = fixtureRoom("mina").storyPoints;

function mountSheet(selected = "sp-1") {
  const handlers = {
    onSelect: vi.fn<(id: string) => void>(),
    onChange: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  };
  render(
    <StoryPointSheet
      name="미나"
      storyPoints={storyPoints}
      currentId="sp-1"
      selected={selected}
      {...handlers}
    />,
  );
  return handlers;
}

const changeDisabled = () =>
  within(screen.getByTestId("ui-lynx-bottom-sheet-action-change"))
    .getByTestId("ui-lynx-button")
    .getAttribute("data-disabled");

test("MC-UI23. 시트에 제목 · 설명과 시점 줄 셋이 서고 줄마다 에피소드 제목과 관계가 보인다", () => {
  mountSheet();

  const sheet = screen.getByTestId(ids.storyPointSheet);
  expect(sheet.textContent).toContain("Story point");
  expect(sheet.textContent).toContain("미나 talks to you as of the episode you pick.");
  const first = screen.getByTestId(ids.storyPointOption("sp-1"));
  expect(first.textContent).toContain("Episode 1 · Buying water");
  expect(first.textContent).toContain("You just met");
  expect(screen.getByTestId(ids.storyPointOption("sp-2")).textContent).toContain(
    "Getting to know each other",
  );
  expect(screen.getByTestId(ids.storyPointOption("sp-3")).textContent).toContain("Friends now");
});

test("MC-UI23. 고른 줄만 data-selected이고 잠긴 줄만 data-locked이며 잠긴 줄 낭독에 조건이 든다", () => {
  mountSheet("sp-2");

  expect(screen.getByTestId(ids.storyPointOption("sp-2")).getAttribute("data-selected")).toBe(
    "true",
  );
  expect(screen.getByTestId(ids.storyPointOption("sp-1")).getAttribute("data-selected")).toBe(
    "false",
  );
  expect(screen.getByTestId(ids.storyPointOption("sp-3")).getAttribute("data-locked")).toBe("true");
  expect(screen.getByTestId(ids.storyPointOption("sp-1")).getAttribute("data-locked")).not.toBe(
    "true",
  );
  expect(
    screen.getByTestId(ids.storyPointOption("sp-3")).getAttribute("accessibility-label"),
  ).toContain("Finish Episode 3 to unlock");
});

test("MC-UI23. 지금 값과 같은 줄을 골라 둔 동안 Change는 꺼져 있고 눌러도 onChange가 없다", () => {
  const { onChange } = mountSheet("sp-1");

  expect(changeDisabled()).toBe("true");
  tapButtonIn("ui-lynx-bottom-sheet-action-change");

  expect(onChange).not.toHaveBeenCalled();
});

test("MC-UI23. 다른 열린 시점을 고른 상태면 Change가 켜지고 탭하면 onChange가 한 번 불린다", () => {
  const { onChange } = mountSheet("sp-2");

  expect(changeDisabled()).toBe("false");
  tapButtonIn("ui-lynx-bottom-sheet-action-change");

  expect(onChange).toHaveBeenCalledTimes(1);
});

test("MC-UI23. 열린 줄을 탭하면 onSelect가 그 id로, 잠긴 줄을 탭하면 아무 일도 없다", () => {
  const { onSelect } = mountSheet();

  fireEvent.tap(screen.getByTestId(ids.storyPointOption("sp-2")), {});
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith("sp-2");
  fireEvent.tap(screen.getByTestId(ids.storyPointOption("sp-3")), {});

  expect(onSelect).toHaveBeenCalledTimes(1);
});

test("MC-UI23. 닫기 단추와 scrim이 onClose를 부른다", () => {
  const { onClose } = mountSheet();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"), {});

  expect(onClose).toHaveBeenCalledTimes(2);
});

// ----------------------------------------------------------------------- 화면 결선

function openSheet() {
  const mounted = mountChat();
  tapId(ids.settings);
  tapId(ids.sidebarStoryPoint);
  return mounted;
}

test("MC-UI23. 화면: 사이드바의 이야기 시점 줄이 시트를 열고 지금 시점이 골라져 있으며 Change는 꺼져 있다", () => {
  openSheet();

  expect(screen.getByTestId(ids.storyPointSheet)).toBeTruthy();
  expect(screen.getByTestId(ids.storyPointOption("sp-1")).getAttribute("data-selected")).toBe(
    "true",
  );
  expect(changeDisabled()).toBe("true");
});

test("MC-UI23. 화면: 잠긴 시점을 눌러도 고름이 옮겨 가지 않는다", () => {
  openSheet();

  fireEvent.tap(screen.getByTestId(ids.storyPointOption("sp-3")), {});

  expect(screen.getByTestId(ids.storyPointOption("sp-1")).getAttribute("data-selected")).toBe(
    "true",
  );
  expect(screen.getByTestId(ids.storyPointOption("sp-3")).getAttribute("data-selected")).not.toBe(
    "true",
  );
  expect(changeDisabled()).toBe("true");
});

test("MC-UI23. 화면: 다른 열린 시점을 골라 Change하면 출처에 반영되고 사이드바로 돌아가 새 시점이 보인다", () => {
  const { source } = openSheet();
  const setStoryPoint = vi.spyOn(source, "setStoryPoint");

  fireEvent.tap(screen.getByTestId(ids.storyPointOption("sp-2")), {});
  expect(changeDisabled()).toBe("false");
  tapButtonIn("ui-lynx-bottom-sheet-action-change");

  expect(setStoryPoint).toHaveBeenCalledWith("mina", "sp-2");
  expect(screen.queryByTestId(ids.storyPointSheet)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
  expect(screen.getByTestId(ids.sidebarStoryPoint).textContent).toContain("Getting lost");
});

test("MC-UI23. 화면: 닫기 · 시스템 뒤로는 시점을 바꾸지 않고 사이드바로 돌아간다", () => {
  const { source } = openSheet();
  const setStoryPoint = vi.spyOn(source, "setStoryPoint");
  fireEvent.tap(screen.getByTestId(ids.storyPointOption("sp-2")), {});

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-close"), {});
  expect(screen.queryByTestId(ids.storyPointSheet)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();

  tapId(ids.sidebarStoryPoint);
  expect(systemBack()).toBe(true);
  expect(screen.queryByTestId(ids.storyPointSheet)).toBeNull();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();
  expect(setStoryPoint).not.toHaveBeenCalled();
});
