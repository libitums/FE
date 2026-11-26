import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import {
  clearBackHandlers,
  fixtureRoom,
  makeSource,
  seedOf,
  tapButtonIn,
  tapId,
} from "./chat-ui.test-support";
import { ChatEventsContext } from "./chat-events";
import { friendStoriesTestIds as fsIds } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import { fakeMyStories, MS_HOUR, MS_NOW, myStory } from "./my-stories.test-support";
import { MyStoriesScreen } from "./MyStoriesScreen";
import { takeStoryReplyHandoff } from "./story-reply-handoff";

// `ui` 계층(MS-UI9 ~ UI12): 설정 › My stories(ADR-0194, 시안 10번) — 보관 스위치 · 최신 먼저 칸 · 하나 지우기 · 모두 지우기 · 칸 → 보기 →
// 답하기. 서버는 메모리 대역입니다.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
  takeStoryReplyHandoff("mina");
});

const reaction = {
  id: "r1",
  characterId: "mina",
  messageId: "msg-r1",
  text: "산책 좋아!",
  meaning: "A walk sounds good!",
  at: MS_NOW - MS_HOUR,
};

async function mount(fake: ReturnType<typeof fakeMyStories>) {
  const sink = vi.fn();
  const onBack = vi.fn();
  const onOpenRoom = vi.fn<(roomId: string) => void>();
  const source = makeSource(
    seedOf(
      fixtureRoom("mina", {
        counterpart: { id: "mina", name: "미나", avatarPath: null },
        messages: [
          { kind: "text", from: "them", text: { ko: "안녕!", en: "Hi!" }, minutesAgo: 30 },
        ],
      }),
    ),
  );
  render(
    <ChatEventsContext.Provider value={{ sink, roomId: null }}>
      <MyStoriesScreen port={fake.port} source={source} onBack={onBack} onOpenRoom={onOpenRoom} />
    </ChatEventsContext.Provider>,
  );
  await flush();
  const events = () => sink.mock.calls.map(([event]) => event as { name: string });
  return { onBack, onOpenRoom, events };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i += 1) await vi.advanceTimersByTimeAsync(1);
  });
}

const stories = () => [
  myStory("old", { postedAt: MS_NOW - 50 * MS_HOUR, ko: "편의점" }),
  myStory("new", { postedAt: MS_NOW - 1 * MS_HOUR, ko: "산책", reactions: [reaction] }),
];

test("MS-UI9. 칸은 최신 먼저 · 수 · LIVE · 반응 수, 보관 스위치를 끄면 서버에 쓰고 지난 것은 숨는다", async () => {
  const fake = fakeMyStories({ stories: stories() });
  await mount(fake);
  expect(screen.getByTestId(ids.count).textContent).toBe("2 stories");
  const tiles = screen.getAllByTestId(/^my-stories-tile-(new|old)$/);
  expect(tiles.map((tile) => tile.getAttribute("data-testid"))).toEqual([
    ids.tile("new"),
    ids.tile("old"),
  ]);
  expect(screen.getByTestId(ids.tile("new")).textContent).toContain("LIVE");
  expect(screen.getByTestId(ids.tile("new")).textContent).toContain("Today · 1 reply");
  expect(screen.getByTestId(ids.tile("old")).textContent).not.toContain("LIVE");
  await act(async () => {
    fireEvent.tap(within(screen.getByTestId(ids.keep)).getByTestId("ui-lynx-settings-cell"), {});
  });
  await flush();
  expect(fake.setKeep).toHaveBeenCalledWith(false);
  expect(screen.queryByTestId(ids.tile("old"))).toBeNull();
  expect(screen.getByTestId(ids.count).textContent).toBe("1 story");
});

test("MS-UI10. 칸의 지우기 → 확인 → 그 칸만 사라짐 · deleted(one, archive)", async () => {
  const fake = fakeMyStories({ stories: stories() });
  const { events } = await mount(fake);
  tapId(ids.tileDelete("old"));
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain("Delete this story?");
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledWith("old");
  expect(screen.queryByTestId(ids.tile("old"))).toBeNull();
  expect(screen.getByTestId(ids.tile("new"))).not.toBeNull();
  expect(events()).toContainEqual(
    expect.objectContaining({ name: "my_story_deleted", scope: "one", from: "archive" }),
  );
});

test("MS-UI11. 모두 지우기 → 확인 → 빈 안내, 못 지우면 확인 상자에 까닭", async () => {
  const failing = fakeMyStories({ stories: stories(), removeOk: false });
  await mount(failing);
  tapId(ids.deleteAll);
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain("Delete all stories?");
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(screen.getByTestId(ids.deleteDialog).textContent).toContain("Couldn't delete");
  cleanup();
  const fake = fakeMyStories({ stories: stories() });
  const { events } = await mount(fake);
  tapId(ids.deleteAll);
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledWith(null);
  expect(screen.getByTestId(ids.archiveEmpty)).not.toBeNull();
  expect(screen.queryByTestId(ids.deleteAll)).toBeNull();
  expect(events()).toContainEqual(
    expect.objectContaining({ name: "my_story_deleted", scope: "all", from: "archive" }),
  );
});

test("MS-UI12. 칸 → 내 스토리 보기 → Open chat → 그 방(인용 넘김 없음), 뒤로 = onBack", async () => {
  const { onOpenRoom, onBack } = await mount(fakeMyStories({ stories: stories() }));
  tapId(ids.tile("new"));
  // 설정에서도 전체 화면 보기(ADR-0194 개정 ⟨보기⟩) — 그 스토리 한 장, 「+」 없음, 새 답 줄을 누르면 그 방.
  expect(screen.getByTestId(fsIds.line).textContent).toBe("산책");
  expect(screen.getByTestId(fsIds.progress).getAttribute("accessibility-label")).toBe(
    "Story 1 of 1",
  );
  expect(screen.queryByTestId(ids.barAdd)).toBeNull();
  expect(screen.getByTestId(ids.barDelete)).not.toBeNull();
  tapId(ids.replyLine("r1"));
  expect(onOpenRoom).toHaveBeenCalledWith("mina");
  expect(takeStoryReplyHandoff("mina")).toBeNull();
  tapId(ids.archiveBack);
  expect(onBack).toHaveBeenCalled();
});

test("MS-UI14. 지우기 확인을 두 번 눌러도 지우기는 한 번(리뷰 m7)", async () => {
  const fake = fakeMyStories({ stories: stories() });
  await mount(fake);
  tapId(ids.tileDelete("old"));
  tapButtonIn("ui-lynx-dialog-action-delete");
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledTimes(1);
});

test("MS-UI15. 24시간 지난 스토리는 반응이 없어도 「기다림」 문구 없이 「친구에게 24시간」만(리뷰 m6)", async () => {
  await mount(fakeMyStories({ stories: stories() }));
  tapId(ids.tile("old"));
  // 지난 스토리도 같은 전체 화면 보기 — 줄 자리에 「친구에게 24시간」, 시트에도 기다림 문구 없음.
  expect(screen.getByTestId(fsIds.viewer)).not.toBeNull();
  expect(screen.queryByTestId(ids.barWaiting)).toBeNull();
  expect(screen.getByTestId(ids.barHidden).textContent).toContain("Friends saw this for 24 hours");
  tapId(ids.barSeen);
  expect(screen.queryByTestId(ids.waiting)).toBeNull();
});

test("MS-UI17. 읽는 동안에는 빈 보관함 안내를 세우지 않는다(봇 리뷰)", async () => {
  const fake = fakeMyStories({ stories: [] });
  const never = { ...fake.port, load: () => new Promise<never>(() => undefined) };
  render(
    <ChatEventsContext.Provider value={{ sink: vi.fn(), roomId: null }}>
      <MyStoriesScreen
        port={never}
        source={makeSource(seedOf())}
        onBack={vi.fn()}
        onOpenRoom={vi.fn()}
      />
    </ChatEventsContext.Provider>,
  );
  await flush();
  expect(screen.queryByTestId(ids.archiveEmpty)).toBeNull();
});

test("MS-UI20. 보관 스위치 저장이 끝나면 keep_toggled 한 번 · 보관함에서 연 반응은 본 것으로 · 그 안 지우기는 from archive(감사 A8 · A9 · A12)", async () => {
  const fake = fakeMyStories({ stories: stories() });
  const { events } = await mount(fake);
  const of = (name: string) => events().filter((e) => e.name === name);
  await act(async () => {
    fireEvent.tap(within(screen.getByTestId(ids.keep)).getByTestId("ui-lynx-settings-cell"), {});
  });
  await flush();
  expect(of("my_story_keep_toggled")).toEqual([expect.objectContaining({ keep: false })]);
  tapId(ids.tile("new"));
  expect(of("my_story_viewed")).toEqual([
    expect.objectContaining({ from: "archive", reactions: "1", unseen: "1" }),
  ]);
  expect([...fake.port.seenReactions()]).toEqual(["r1"]);
  tapId(ids.viewerMenu);
  tapId(ids.viewerDelete);
  tapButtonIn("ui-lynx-dialog-action-delete");
  tapButtonIn("ui-lynx-dialog-action-delete");
  await flush();
  expect(fake.remove).toHaveBeenCalledTimes(1);
  expect(of("my_story_deleted")).toEqual([
    expect.objectContaining({ scope: "one", from: "archive" }),
  ]);
});
