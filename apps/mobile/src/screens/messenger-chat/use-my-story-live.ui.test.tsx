import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { ChatRoomSummary } from "./chat-source.contract";
import { friendStoriesTestIds as fsIds } from "./friend-stories.contract";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import type { MyStoriesPort, MyStoriesState } from "./my-stories.contract";
import { fakeMyStories, MS_NOW, myStory } from "./my-stories.test-support";
import { MyStoryFullOpen } from "./MyStoryFullOpen";
import { useMyStoryLive } from "./use-my-story-live";

// `ui` 계층(LV-UI1 ~ UI8): 내 스토리 보기를 연 동안 다시 읽기(ADR-0194 개정 ⟨살아 있는 보기⟩) — 가짜 타이머로 30초 주기 · 닫으면 멈춤 ·
// 앱이 뒤로 가면 멈추고 앞으로 오면 바로 · 답 도착이면 바로 · 겹치면 하나 · 실패는 조용히 다음 주기.

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MS_NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const room = (unread: number) =>
  ({ roomId: "mina", unread, access: { kind: "open" } }) as ChatRoomSummary;

function harness(load?: () => Promise<MyStoriesState | null>) {
  const fake = fakeMyStories({ stories: [myStory("a")] });
  const loads = vi.fn(load ?? (async () => fake.state()));
  const port: MyStoriesPort = {
    ...fake.port,
    load: loads,
  };
  const got = vi.fn<(update: (before: MyStoriesState | null) => MyStoriesState | null) => void>();
  function Probe({ open, rooms }: { open: boolean; rooms: readonly ChatRoomSummary[] }) {
    useMyStoryLive({ port, open, rooms, setState: got });
    return <view />;
  }
  const signal = (value: "resume" | "background") =>
    act(() => {
      lynx
        .getJSModule("GlobalEventEmitter")
        .emit(value === "resume" ? "contentSyncOpportunity" : "appDidEnterBackground", []);
    });
  return { Probe, loads, got, signal };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

test("LV-UI1. 열면 바로 한 번, 그 뒤 30초마다 다시 읽어 넘긴다 — 닫혀 있으면 읽지 않는다", async () => {
  const { Probe, loads, got } = harness();
  const view = render(<Probe open={false} rooms={[]} />);
  await advance(60_000);
  expect(loads).not.toHaveBeenCalled();
  view.rerender(<Probe open rooms={[]} />);
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(1);
  expect(got).toHaveBeenCalledTimes(1);
  await advance(29_000);
  expect(loads).toHaveBeenCalledTimes(1);
  await advance(1_000);
  expect(loads).toHaveBeenCalledTimes(2);
  await advance(30_000);
  expect(loads).toHaveBeenCalledTimes(3);
});

test("LV-UI2. 닫으면 멈춘다(언마운트도)", async () => {
  const { Probe, loads } = harness();
  const view = render(<Probe open rooms={[]} />);
  await advance(1);
  view.rerender(<Probe open={false} rooms={[]} />);
  await advance(120_000);
  expect(loads).toHaveBeenCalledTimes(1);
  view.rerender(<Probe open rooms={[]} />);
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(2);
  view.unmount();
  await advance(120_000);
  expect(loads).toHaveBeenCalledTimes(2);
});

test("LV-UI3. 앱이 뒤로 가면 멈추고, 앞으로 오면 바로 한 번 읽고 주기를 잇는다", async () => {
  const { Probe, loads, signal } = harness();
  render(<Probe open rooms={[]} />);
  await advance(1);
  signal("background");
  await advance(120_000);
  expect(loads).toHaveBeenCalledTimes(1);
  signal("resume");
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(2);
  await advance(30_000);
  expect(loads).toHaveBeenCalledTimes(3);
  // 뒤로 간 적 없이 온 「앞」(연결이 돌아옴 · 옛 호스트)도 바로 한 번.
  signal("resume");
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(4);
});

test("LV-UI4. 열린 방의 안 읽음이 오르면(답 도착) 바로 한 번 — 주기는 거기서 다시 30초", async () => {
  const { Probe, loads } = harness();
  const view = render(<Probe open rooms={[room(0)]} />);
  await advance(10_000);
  expect(loads).toHaveBeenCalledTimes(1);
  view.rerender(<Probe open rooms={[room(1)]} />);
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(2);
  await advance(25_000);
  expect(loads).toHaveBeenCalledTimes(2);
  await advance(5_000);
  expect(loads).toHaveBeenCalledTimes(3);
});

test("LV-UI5. 읽는 중에 온 신호는 같은 읽기에 묶인다", async () => {
  let finish: (state: MyStoriesState | null) => void = () => undefined;
  const { Probe, loads, signal } = harness(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<Probe open rooms={[room(0)]} />);
  await advance(1);
  view.rerender(<Probe open rooms={[room(2)]} />);
  signal("resume");
  await advance(1);
  expect(loads).toHaveBeenCalledTimes(1);
  await act(async () => finish(null));
  await advance(30_000);
  expect(loads).toHaveBeenCalledTimes(2);
});

test("LV-UI6. 못 읽으면(null · 던짐) 넘기지 않고 조용히 다음 주기에 다시", async () => {
  let n = 0;
  const { Probe, loads, got } = harness(async () => {
    n += 1;
    if (n === 1) return null;
    if (n === 2) throw new Error("offline");
    return { enabled: true, keep: true, stories: [], window: null, kinds: [] };
  });
  render(<Probe open rooms={[]} />);
  await advance(1);
  await advance(30_000);
  expect(got).not.toHaveBeenCalled();
  await advance(30_000);
  expect(loads).toHaveBeenCalledTimes(3);
  expect(got).toHaveBeenCalledTimes(1);
});

test("LV-UI7. 보기를 연 채 목록이 바뀌면 아래 바의 Seen by가 바뀐다 — 장 · 보고 있는 자리는 그대로", () => {
  const before = myStory("a", { postedAt: MS_NOW - 3_600_000 });
  const props = {
    openedId: "a",
    now: MS_NOW,
    rooms: [],
    romanization: true,
    remove: async () => true,
    onShown: vi.fn(),
    onOpenChat: vi.fn(),
    onDeleted: vi.fn(),
    onClose: vi.fn(),
  };
  const view = render(<MyStoryFullOpen {...props} stories={[before]} />);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("No views yet");
  const seenBy = ["mina", "haejun"].map((characterId) => ({ characterId, at: MS_NOW }));
  view.rerender(<MyStoryFullOpen {...props} stories={[{ ...before, seenBy }]} />);
  expect(screen.getByTestId(ids.barSeen).textContent).toContain("Seen by 2");
  expect(screen.getByTestId(fsIds.progress).getAttribute("accessibility-label")).toBe(
    "Story 1 of 1",
  );
});

test("LV-UI8. 보기가 닫혀 있을 때 앞으로 와서 읽은 것은 통째로(새 스토리 포함), 열려 있으면 Seen by · 답만 얹는다", async () => {
  const loaded: MyStoriesState = {
    enabled: true,
    keep: true,
    stories: [myStory("a"), myStory("new")],
    window: null,
    kinds: ["word"],
  };
  const { Probe, got, signal } = harness(async () => loaded);
  const before: MyStoriesState = { ...loaded, stories: [myStory("a")] };
  const view = render(<Probe open={false} rooms={[]} />);
  signal("resume");
  await advance(1);
  expect(got.mock.calls[0]?.[0](before)).toBe(loaded);
  expect(got.mock.calls[0]?.[0](null)).toBe(loaded);
  view.rerender(<Probe open rooms={[]} />);
  await advance(1);
  expect(got.mock.calls[1]?.[0](before)?.stories.map((story) => story.id)).toEqual(["a"]);
});
