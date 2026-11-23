import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";
import { afterEach, expect, test, vi } from "vitest";

import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import type { CatalogMapSection } from "../screens/journey-map/catalog-map.contract";
import { createFixtureChatSource } from "../screens/messenger-chat/chat-fixture-source";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { companionSeed } from "../screens/messenger-chat/companion-roster";
import { forgetNewFriend, rememberNewFriend } from "./new-friend-pending";
import { NewFriendMapHost } from "./render-new-friend";

// `integration` 계층(NF-L1): 맵의 새 친구 자리(`NewFriendMapHost`)가 화면 문구 언어를 시트 모델에 넘긴다 — 서버 방이 비어 인물 표로
// 서는 첫 말의 뜻풀이가 그 언어로 선다(2026-11-19 l10n 점검: 베트남어 화면에 영어 뜻풀이). 실제 문구표 · 출처 · 층 · 시트, 대역은
// 원격(빈 방) · 가짜 타이머뿐입니다.

const remote: ChatRemote = {
  loadHistory: async () => null,
  greet: async () => null,
  openTurn: () => ({ cancel: () => undefined }),
};
const section = {
  kind: "catalog-ready",
  episodeId: "u03-mina",
  ordinal: 3,
  title: "미나",
  titleEn: "Mina",
} as unknown as CatalogMapSection;

afterEach(() => {
  cleanup();
  forgetNewFriend();
  vi.useRealTimers();
});

test("NF-L1 베트남어 화면이면 인물 표로 서는 미나 시트의 뜻풀이가 베트남어다", async () => {
  vi.useFakeTimers();
  const source = createFixtureChatSource({ imageUrlOf: () => null, seed: companionSeed(), remote });
  const wiring = {
    accountState: "signed-in",
    messengerChat: { source, eventSink: null, onOpenChatRoomFromNewFriend: () => undefined },
    catalogSections: [section],
    episodeContent: { imageUrlOf: (path: string) => `https://cdn/${path}` },
    onScreenLayerChange: () => undefined,
  } as never;
  rememberNewFriend("mina");
  render(
    <UiCopyContext.Provider value={uiCopyFor("vi")}>
      <NewFriendMapHost wiring={wiring} active={true}>
        <view />
      </NewFriendMapHost>
    </UiCopyContext.Provider>,
  );
  // 나타남(2.0 s) → 입력 중(1.2 s) → 첫 메시지 — 단계마다 효과가 다음 타이머를 겁니다.
  for (const ms of [2000, 1200]) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
  const sheet = screen.getByTestId("new-friend-sheet").textContent ?? "";
  expect(sheet).toContain("안녕하세요! 같은 방 미나예요.");
  expect(sheet).toContain("Chào bạn! Mình là Mina, bạn cùng phòng.");
  expect(sheet).not.toContain("Hi! It's Mina");
});
