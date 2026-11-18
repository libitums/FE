import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { clearBackHandlers, tapButtonIn } from "./chat-ui.test-support";
import { friendsTestIds as ids } from "./chat-friends.contract";
import { friendProfileModel } from "./companion-friends";
import { FriendProfileSheet } from "./FriendProfileSheet";

// `ui` 계층(RF-UI10 ~ UI12): 프로필 시트 — 이름 · AI 표시 · 나이 · 직업(한국어 + 번역) · MBTI · 소개(한국어 + 번역). 아직 추가하지 않은
// 추천 친구만 「Add friend」 단추가 서고, 서버가 뺀 친구는 대화 불가 한 줄이 선다.

afterEach(() => {
  cleanup();
  clearBackHandlers();
});

function mount(id: string, addable: boolean, unavailable = false) {
  const model = friendProfileModel(id, { language: "en", addable });
  if (model === null) throw new Error("no model");
  const handlers = { onAdd: vi.fn<() => void>(), onClose: vi.fn<() => void>() };
  render(
    <FriendProfileSheet model={model} avatarUrl={null} unavailable={unavailable} {...handlers} />,
  );
  return handlers;
}

test("RF-UI10 추천 친구 — 프로필 칸이 모두 서고 Add friend가 onAdd를 부른다", () => {
  const { onAdd } = mount("seoyeon", true);
  expect(screen.getByTestId(ids.sheetName).textContent).toBe("차서연");
  expect(screen.getByTestId(ids.sheetAi).textContent).toBe(
    "AI character. Replies are written by AI.",
  );
  expect(screen.getByTestId(ids.sheetAge).textContent).toContain("28");
  expect(screen.getByTestId(ids.sheetJob).textContent).toContain("타투이스트");
  expect(screen.getByTestId(ids.sheetJob).textContent).toContain("Tattoo artist");
  expect(screen.getByTestId(ids.sheetMbti).textContent).toContain("ENTP");
  expect(screen.getByTestId(ids.sheetBio).textContent).toContain("성수동");
  expect(screen.getByTestId(ids.sheetBioTranslated).textContent).toContain("Seongsu");
  tapButtonIn("ui-lynx-bottom-sheet-action-add");
  expect(onAdd).toHaveBeenCalledTimes(1);
});

test("RF-UI11 이야기 인물 · 추가한 친구는 Add friend가 없다(나이는 30s처럼)", () => {
  mount("duksu", false);
  expect(screen.queryByTestId("ui-lynx-bottom-sheet-action-add")).toBeNull();
  expect(screen.getByTestId(ids.sheetAge).textContent).toContain("30s");
  expect(screen.queryByTestId(ids.sheetUnavailable)).toBeNull();
});

test("RF-UI12 서버가 뺀 추가한 친구는 대화 불가 한 줄이 선다", () => {
  mount("haejun", false, true);
  expect(screen.getByTestId(ids.sheetUnavailable).textContent).toContain("권해준");
});
