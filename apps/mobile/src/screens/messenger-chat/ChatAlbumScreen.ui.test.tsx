import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import { ChatAlbumScreen } from "./ChatAlbumScreen";
import {
  chatAlbumTestIds as ids,
  type ChatAlbumItem,
  type ChatAlbumPage,
  type ChatAlbumPort,
  type ChatRemakeResult,
} from "./chat-album.contract";
import { clearBackHandlers, makeSource, systemBack, tapId, textOf } from "./chat-ui.test-support";
import type { ChatSource } from "./chat-source.contract";
import { createCoinWallet } from "./coin-wallet";

// `ui` 계층(AL-UI1 ~ UI9): 앨범 화면 · 사진 보기 · 음성 시트 · 다시 만들기 확인(ADR-0150 M1 ~ M3 · M6).

const NOW = Date.parse("2026-11-15T10:00:00.000Z");
const HOUR = 3_600_000;
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const item = (over: Partial<ChatAlbumItem> & { id: string }): ChatAlbumItem => ({
  messageId: A,
  kind: "photo",
  url: `https://x/${over.id}.png`,
  aspect: "3:2",
  line: { ko: "떡볶이 맛있죠?", en: "Tteokbokki is good, right?" },
  createdAt: NOW - HOUR,
  fromPastChat: false,
  ...over,
});
const ITEMS: readonly ChatAlbumItem[] = [
  item({ id: "p2", createdAt: NOW - HOUR }),
  item({ id: "v1", kind: "voice", aspect: null, url: null, createdAt: NOW - 2 * HOUR }),
  item({ id: "p1", createdAt: NOW - 3 * HOUR }),
  item({ id: "p3", messageId: B, fromPastChat: true, createdAt: NOW - 30 * HOUR }),
];

const flush = async () => {
  for (let i = 0; i < 4; i += 1) await act(() => Promise.resolve());
};

function mount(
  over: {
    pages?: (ChatAlbumPage | null)[];
    remake?: ChatRemakeResult;
    balance?: number;
  } = {},
) {
  const pages = [...(over.pages ?? [{ items: ITEMS, hasMore: false }])];
  const album: ChatAlbumPort = {
    load: vi.fn(async () => (pages.length > 1 ? (pages.shift() ?? null) : (pages[0] ?? null))),
    remake: vi.fn(async () => over.remake ?? { kind: "started" as const }),
  };
  const source: ChatSource = { ...makeSource(), album };
  const onBack = vi.fn<() => void>();
  const wallet = createCoinWallet({ earned: over.balance ?? 120 });
  render(
    <ChatAlbumScreen
      source={source}
      roomId="mina"
      name="미나"
      wallet={wallet}
      now={() => NOW}
      offsetMinutes={0}
      onBack={onBack}
    />,
  );
  return { album, onBack, wallet };
}

beforeEach(clearBackHandlers);
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

test("AL-UI1 앨범은 제목 · 날짜 묶음 · 칸(판은 최신 하나) · 아래 안내를 보이고, 탭으로 종류를 거른다", async () => {
  const { album } = mount();
  await flush();
  expect(album.load).toHaveBeenCalledWith("mina", null);
  expect(textOf(ids.screen)).toContain("미나's album");
  expect(textOf(ids.screen)).toContain("Today");
  expect(textOf(ids.screen)).toContain("Yesterday");
  expect(textOf(ids.screen)).toContain("Pictures and voice messages stay here even if you delete the chat.");
  expect(screen.queryByTestId(ids.tile("p2"))).not.toBeNull();
  expect(screen.queryByTestId(ids.tile("p1"))).toBeNull();
  expect(textOf(ids.tile("p2"))).toContain("2 versions");
  expect(textOf(ids.tile("p3"))).toContain("From a past chat");
  expect(screen.getByTestId(ids.tab("all")).getAttribute("data-selected")).toBe("true");

  tapId(ids.tab("voice"));
  expect(screen.queryByTestId(ids.tile("p2"))).toBeNull();
  expect(screen.queryByTestId(ids.tile("v1"))).not.toBeNull();
  expect(screen.getByTestId(ids.tab("voice")).getAttribute("data-selected")).toBe("true");
  tapId(ids.tab("photos"));
  expect(screen.queryByTestId(ids.tile("v1"))).toBeNull();
  expect(screen.queryByTestId(ids.tile("p3"))).not.toBeNull();
});

test("AL-UI2 빈 앨범은 안내, 못 읽으면 Try again이 다시 읽는다", async () => {
  const { album } = mount({ pages: [null, { items: [], hasMore: false }] });
  await flush();
  expect(screen.queryByTestId(ids.failed)).not.toBeNull();
  tapId(ids.retry);
  await flush();
  expect(album.load).toHaveBeenCalledTimes(2);
  expect(textOf(ids.empty)).toContain("Pictures and voice messages from 미나 will appear here.");
});

test("AL-UI3 더 있으면 Show more가 가장 오래된 칸의 시각으로 다음 쪽을 읽어 덧붙인다", async () => {
  const older = item({ id: "p9", messageId: B, createdAt: NOW - 50 * HOUR });
  const { album } = mount({
    pages: [{ items: ITEMS.slice(0, 3), hasMore: true }, { items: [older], hasMore: false }],
  });
  await flush();
  tapId(ids.more);
  await flush();
  expect(album.load).toHaveBeenLastCalledWith("mina", NOW - 3 * HOUR);
  expect(screen.queryByTestId(ids.tile("p9"))).not.toBeNull();
  expect(screen.queryByTestId(ids.more)).toBeNull();
});

test("AL-UI4 사진 칸 → 사진 보기: AI 표시 · 그때의 말 · 판 고르기 · Redraw 25, 지난 대화는 Redraw 없음", async () => {
  mount();
  await flush();
  tapId(ids.tile("p2"));
  const viewer = textOf(ids.viewer);
  expect(viewer).toContain("AI-generated");
  expect(viewer).toContain("떡볶이 맛있죠?");
  expect(viewer).toContain("Tteokbokki is good, right?");
  expect(textOf(ids.redraw)).toContain("Redraw · 25");
  expect(screen.getByTestId(ids.viewerVersion(2)).getAttribute("data-selected")).toBe("true");
  tapId(ids.viewerVersion(1));
  expect(screen.getByTestId(ids.viewerVersion(1)).getAttribute("data-selected")).toBe("true");

  systemBack();
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  tapId(ids.tile("p3"));
  expect(screen.queryByTestId(ids.redraw)).toBeNull();
  tapId(ids.viewerClose);
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
});

test("AL-UI5 Redraw → 확인(25) → 다시 그리기 요청, 보기가 닫히고 그 칸이 「Drawing…」", async () => {
  const { album } = mount();
  await flush();
  tapId(ids.tile("p2"));
  tapId(ids.redraw);
  expect(textOf(ids.confirm)).toContain("Redraw this snapshot?");
  expect(textOf(ids.confirm)).toContain("You have 120 Yeopjeon");
  expect(textOf(ids.confirmGo)).toContain("Redraw for 25 Yeopjeon");
  tapId(ids.confirmGo);
  await flush();
  expect(album.remake).toHaveBeenCalledWith("mina", expect.objectContaining({ id: "p2" }));
  expect(screen.queryByTestId(ids.viewer)).toBeNull();
  expect(textOf(ids.tile("p2"))).toContain("Drawing…");
});

test("AL-UI6 서버가 거절하면 그 까닭을 앨범 위에 보인다", async () => {
  mount({ remake: { kind: "refused", notice: "busy" } });
  await flush();
  tapId(ids.tile("p2"));
  tapId(ids.redraw);
  tapId(ids.confirmGo);
  await flush();
  expect(textOf(ids.refused)).toContain("미나 is still working on another picture.");
  expect(textOf(ids.tile("p2"))).not.toContain("Drawing…");
});

test("AL-UI7 음성 칸 → 재생 시트(Play ↔ Pause) · Record again 15 확인", async () => {
  const { album } = mount();
  await flush();
  tapId(ids.tile("v1"));
  expect(textOf(ids.voiceSheet)).toContain("떡볶이 맛있죠?");
  expect(screen.getByTestId(ids.voicePlay).getAttribute("accessibility-label")).toBe("Play");
  tapId(ids.voicePlay);
  expect(screen.getByTestId(ids.voicePlay).getAttribute("accessibility-label")).toBe("Pause");
  tapId(ids.recordAgain);
  expect(textOf(ids.confirm)).toContain("Record again?");
  expect(textOf(ids.confirmGo)).toContain("Record for 15 Yeopjeon");
  tapId(ids.confirmGo);
  await flush();
  expect(album.remake).toHaveBeenCalledWith("mina", expect.objectContaining({ id: "v1" }));
});

test("AL-UI8 잔액이 모자라면 확인의 주 버튼이 Get Yeopjeon이고 요청하지 않는다", async () => {
  const { album } = mount({ balance: 10 });
  await flush();
  tapId(ids.tile("p2"));
  tapId(ids.redraw);
  expect(textOf(ids.confirmGo)).toContain("Get Yeopjeon");
  tapId(ids.confirmGo);
  await flush();
  expect(album.remake).not.toHaveBeenCalled();
});

test("AL-UI9 뒤로 단추 · 시스템 뒤로는 겹침이 없으면 화면을 나간다", async () => {
  const { onBack } = mount();
  await flush();
  tapId(ids.back);
  expect(onBack).toHaveBeenCalledTimes(1);
  systemBack();
  expect(onBack).toHaveBeenCalledTimes(2);
});
