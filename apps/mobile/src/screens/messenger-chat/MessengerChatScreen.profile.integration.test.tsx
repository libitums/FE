import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, screen } from "@lynx-js/react/testing-library";

import { chatProfileTestIds, type ChatProfilePort } from "./chat-profile";
import {
  clearBackHandlers,
  mountChat,
  mountChatOpen,
  slotContent,
  systemBack,
  tapEl,
  tapId,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import { suggestedFriendsTestIds as sheet } from "./suggested-friends.contract";
import { friend } from "./suggested-friends.test-support";

// `integration` 계층(CP-I1 ~ I5): 대화방 화면 · 겹침 상태 · 상대 줄 · 머리 · 프로필 포트가 함께 — 상대 아바타(또는 머리 이름)를
// 누르면 방 위에 프로필 시트가 행동 단추 없이 열리고(ADR-0178 개정 ⟨대화방⟩), 닫으면 방으로 돌아온다. 키보드는 먼저 내린다.

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const profile: ChatProfilePort = {
  profileOf: (id) =>
    id === "mina"
      ? friend("mina", { name: "Mina", intro: { en: "Runs a bakery" }, tags: [{ en: "ENFP" }] })
      : null,
};

const firstAvatar = (): Element => {
  const avatars = screen.getAllByTestId(chatProfileTestIds.avatar);
  expect(avatars.length).toBeGreaterThan(0);
  return avatars[0] as Element;
};
const sheetShown = (): boolean => screen.queryByTestId(sheet.sheet) !== null;
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(50);
  });

test("CP-I1. 상대 아바타는 「<이름>'s profile」 단추이고, 누르면 카탈로그 소개 · 태그가 든 시트가 행동 단추 없이 열린다", () => {
  mountChat({ profile });
  const avatar = firstAvatar();
  expect(avatar.getAttribute("accessibility-label")).toBe("미나's profile");
  expect(avatar.getAttribute("accessibility-traits")).toBe("button");

  tapEl(avatar);

  expect(sheetShown()).toBe(true);
  expect(screen.getByTestId(sheet.sheetName).textContent).toBe("미나");
  expect(screen.getByTestId(sheet.sheetIntro).textContent).toBe("Runs a bakery");
  expect(screen.getByTestId(sheet.sheetTags).textContent).toBe("ENFP");
  expect(screen.queryByTestId(sheet.sheetStart) === null).toBe(true);
  expect(screen.queryByTestId(sheet.sheetEarly) === null).toBe(true);
  expect(screen.queryByTestId(sheet.sheetLater) === null).toBe(true);
});

test("CP-I2. 시트가 열린 동안 방(머리 · 로그 · 독)은 낭독에서 숨고, Close · 시스템 뒤로가기로 방에 돌아온다", () => {
  mountChat({ profile });
  tapEl(firstAvatar());
  expect(screen.getByTestId(ids.log).closest("[accessibility-elements-hidden='true']")).not.toBe(
    null,
  );

  tapId(sheet.sheetClose);
  expect(sheetShown()).toBe(false);

  tapEl(firstAvatar());
  expect(sheetShown()).toBe(true);
  expect(systemBack()).toBe(true);
  expect(sheetShown()).toBe(false);
  expect(screen.getByTestId(ids.screen)).toBeTruthy();
});

test("CP-I3. 키보드가 열린 채 아바타를 누르면 키보드 자리를 먼저 접고 시트를 연다, 닫아도 키보드는 다시 열리지 않는다", () => {
  mountChatOpen({ profile });
  expect(slotContent()).toBe("learning-keyboard");

  tapEl(firstAvatar());
  settle();

  expect(sheetShown()).toBe(true);
  expect(slotContent()).not.toBe("learning-keyboard");
  tapId(sheet.sheetClose);
  settle();
  expect(slotContent()).not.toBe("learning-keyboard");
});

test("CP-I4. 머리의 상대 이름을 눌러도 같은 시트가 열린다", () => {
  mountChat({ profile });
  tapId(ids.title);
  expect(sheetShown()).toBe(true);
  expect(screen.queryByTestId(sheet.sheetStart) === null).toBe(true);
});

test("CP-I5. 프로필 포트가 없으면(옛 결선) 시트는 이름 · 얼굴만 선다", () => {
  mountChat();
  tapEl(firstAvatar());
  expect(sheetShown()).toBe(true);
  expect(screen.getByTestId(sheet.sheetName).textContent).toBe("미나");
  expect(screen.queryByTestId(sheet.sheetIntro) === null).toBe(true);
  expect(screen.queryByTestId(sheet.sheetTags) === null).toBe(true);
});

test("CP-I6. 비회원 방(ADR-0166)에서도 아바타는 로그인 권유 대신 프로필 시트를 연다", () => {
  const onSignInRequired = vi.fn<() => void>();
  mountChat({ profile, onSignInRequired });
  tapEl(firstAvatar());
  expect(sheetShown()).toBe(true);
  expect(onSignInRequired).not.toHaveBeenCalled();
});
