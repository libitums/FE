import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, systemBack, tapId } from "./chat-ui.test-support";
import type { EarlyAccessOffer } from "./friend-catalog.contract";
import { suggestedFriendsTestIds as ids } from "./suggested-friends.contract";
import type { SuggestedFriendSheetModel } from "./suggested-friends.contract";
import { SuggestedFriendSheet } from "./SuggestedFriendSheet";
import { friend } from "./suggested-friends.test-support";

// `ui` 계층(CP-UI1 ~ UI3): 프로필 시트의 아래 단추 줄(ADR-0178 개정 ⟨대화방⟩). 대화방에서 연 시트(`actions="close"`)만 행동 단추가
// 없고 Close 하나, 그 밖의 진입(스토리 보기 · 추천 줄 · 친구 찾기 — 기본 `offer`)은 지금처럼 Start chatting · Chat now가 선다.

const NOW = 1_800_000_000_000;
const offer: EarlyAccessOffer = { price: 300, endsAt: null };

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const mina = friend("mina", { name: "미나", tags: [{ en: "ENFP" }] });
const model = (status: SuggestedFriendSheetModel["status"]): SuggestedFriendSheetModel => ({
  character: mina,
  avatarUrl: null,
  status,
  offer: status === "locked" ? offer : null,
});

function mount(sheet: SuggestedFriendSheetModel, actions?: "offer" | "close") {
  const handlers = { onStart: vi.fn(), onEarly: vi.fn(), onClose: vi.fn() };
  render(
    <SuggestedFriendSheet
      model={sheet}
      now={NOW}
      {...(actions === undefined ? {} : { actions })}
      {...handlers}
    />,
  );
  return handlers;
}

test("CP-UI1. 기본(스토리 보기 · 추천 줄 · 친구 찾기): 이미 친구 · 추가 가능은 Start chatting, 잠김 + 제안은 Chat now", () => {
  for (const status of ["added", "addable"] as const) {
    const { onStart } = mount(model(status));
    expect(screen.queryByTestId(ids.sheetStart) === null).toBe(false);
    expect(screen.queryByTestId(ids.sheetLater) === null).toBe(false);
    expect(screen.queryByTestId(ids.sheetClose) === null).toBe(true);
    tapId(ids.sheetStart);
    expect(onStart).toHaveBeenCalledTimes(1);
    cleanup();
    clearBackHandlers();
  }
  mount(model("locked"), "offer");
  expect(screen.queryByTestId(ids.sheetEarly) === null).toBe(false);
});

test("CP-UI2. 대화방(close): 행동 단추(Start chatting · Chat now · Not now) 없이 Close 하나, 본문(이름 · 태그)은 그대로", () => {
  for (const status of ["added", "addable", "locked"] as const) {
    mount(model(status), "close");
    expect(screen.getByTestId(ids.sheetName).textContent).toBe("미나");
    expect(screen.queryByTestId(ids.sheetStart) === null).toBe(true);
    expect(screen.queryByTestId(ids.sheetEarly) === null).toBe(true);
    expect(screen.queryByTestId(ids.sheetLater) === null).toBe(true);
    expect(screen.getByTestId(ids.sheetClose).textContent).toBe("Close");
    cleanup();
    clearBackHandlers();
  }
  mount(model("added"), "close");
  expect(screen.getByTestId(ids.sheetTags).textContent).toBe("ENFP");
});

test("CP-UI3. 대화방(close): Close · 시스템 뒤로가기는 onClose, 시작 · 먼저 만나기는 부르지 않는다", () => {
  const { onClose, onStart, onEarly } = mount(model("added"), "close");
  tapId(ids.sheetClose);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(systemBack()).toBe(true);
  expect(onClose).toHaveBeenCalledTimes(2);
  expect(onStart).not.toHaveBeenCalled();
  expect(onEarly).not.toHaveBeenCalled();
});
