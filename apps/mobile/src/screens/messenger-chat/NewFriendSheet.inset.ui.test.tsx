import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { newFriendTestIds as ids, type NewFriendModel } from "./new-friend.contract";
import { newFriendTimelineOf } from "./new-friend";
import { NewFriendSheet } from "./NewFriendSheet";

// `ui` 계층(NF-IN1 ~ NF-IN3): 새 친구 시트는 ui-lynx 시트가 아닌 자체 판이라, 단추 줄 아래 여백(16)에 아래 시스템 바를
// 스스로 더한다 — `env(safe-area-inset-bottom)`은 Lynx에서 0이라 Android 3버튼 · 제스처 바가 Reply · Later를 가렸다.

function setGlobalProps(value: unknown): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = value;
}

afterEach(() => {
  cleanup();
  setGlobalProps(undefined);
});

const MODEL: NewFriendModel = {
  characterId: "mina",
  roomId: "mina",
  name: "미나",
  faceUrl: "https://cdn/content/images/profiles/mina-casual.webp",
  sceneUrl: "https://cdn/content/images/u03-mina/pre-1.webp",
  episodeOrdinal: 3,
  episodeTitle: "Ikseon guesthouse",
  opening: { ko: "안녕! 나 미나야.", en: "Hi! It's Mina." },
};

function mount() {
  render(
    <NewFriendSheet
      model={MODEL}
      phase="message"
      timeline={newFriendTimelineOf("standard")}
      onReply={vi.fn()}
      onLater={vi.fn()}
    />,
  );
}

test("NF-IN1: Android 3버튼(아래 48) → 단추 줄 아래 여백 16 + 48", () => {
  setGlobalProps({
    safeAreaInsets: { top: 48, bottom: 48, left: 0, right: 0 },
    tappableBottomInset: 48,
  });
  mount();
  expect(screen.getByTestId(ids.actions).getAttribute("style") ?? "").toMatch(
    /padding-bottom:\s*64px/,
  );
});

test("NF-IN2: iOS 홈 인디케이터(아래 34) → 단추 줄 아래 여백이 안전 영역 34를 덮는다", () => {
  setGlobalProps({ safeAreaInsets: { top: 62, bottom: 34, left: 0, right: 0 } });
  mount();
  expect(screen.getByTestId(ids.actions).getAttribute("style") ?? "").toMatch(
    /padding-bottom:\s*34px/,
  );
});

test("NF-IN3: iOS 홈 인디케이터 없음(SE, 아래 0) → 인라인 여백 없이 CSS 토큰(16) 그대로", () => {
  setGlobalProps({ safeAreaInsets: { top: 20, bottom: 0, left: 0, right: 0 } });
  mount();
  expect(screen.getByTestId(ids.actions).getAttribute("style") ?? "").not.toMatch(/padding-bottom/);
});
