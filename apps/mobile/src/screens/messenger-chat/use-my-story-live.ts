// 내 스토리 보기를 연 동안 Seen by · 답을 다시 읽습니다(ADR-0194 개정 ⟨살아 있는 보기⟩). 얹기 판정은 `my-story-live.ts`.
// 열면 바로 한 번, 그 뒤 30초마다. 앱이 뒤로 가면(`appDidEnterBackground`) 멈추고 앞으로 오면(`contentSyncOpportunity`) 바로 한 번 —
// 보기가 닫혀 있어도 한 번(목록의 「Your story」 고리). 열린 방들의 안 읽음이 오르면(답 도착) 바로 한 번. 겹친 읽기는 하나로 묶고, 못 읽으면
// 넘기지 않고 다음 주기에 다시 읽습니다. 새 RPC 없이 목록 읽기(`port.load`)를 씁니다.

import { useEffect, useLynxGlobalEventListener, useRef } from "@lynx-js/react";

import type { ChatRoomSummary } from "./chat-source.contract";
import { MY_STORY_LIVE_MS, stateWithLive } from "./my-story-live";
import type { MyStoriesPort, MyStoriesState } from "./my-stories.contract";

type Args = {
  readonly port: MyStoriesPort | undefined;
  /** 내 스토리 전체 화면 보기가 열려 있는가. */
  readonly open: boolean;
  readonly rooms: readonly ChatRoomSummary[];
  /** 목록 상태 — 다시 읽은 Seen by · 답을 얹습니다(못 읽었으면 그대로). */
  readonly setState: (update: (before: MyStoriesState | null) => MyStoriesState | null) => void;
};

// 배경 스레드에서만 — 메인 스레드(첫 화면)에는 이 판정 · 타이머를 싣지 않습니다(번들 천장 ADR-0149). 스레드마다 훅 순서는 일정합니다.
export const useMyStoryLive: (args: Args) => void = __BACKGROUND__ ? useLive : () => undefined;

type Live = {
  open: boolean;
  away: boolean;
  unread: number;
  timer: ReturnType<typeof setTimeout> | null;
  pending: Promise<MyStoriesState | null> | null;
};

function useLive({ port, open, rooms, setState }: Args): void {
  const unread = rooms.reduce((sum, room) => sum + room.unread, 0);
  const box = useRef<Live>({ open, away: false, unread, timer: null, pending: null }).current;
  box.open = open && port !== undefined;

  function stop() {
    "background only";
    if (box.timer !== null) clearTimeout(box.timer);
    box.timer = null;
  }
  // 읽는 중에 또 부르면 같은 읽기. 보기가 열려 있으면 Seen by · 답만 얹고(장 · 자리 그대로), 닫혀 있거나 첫 읽기를 못 했으면 통째로.
  function read() {
    "background only";
    if (box.pending === null && port !== undefined) {
      const done = () => {
        box.pending = null;
      };
      box.pending = port.load().catch(() => null);
      box.pending.then(done, done);
    }
    return (box.pending ?? Promise.resolve(null)).then((state) => {
      if (state !== null)
        setState((before) =>
          before === null || !box.open ? state : stateWithLive(before, state.stories),
        );
    });
  }
  // 지금 한 번 읽고 30초 뒤를 다시 겁니다.
  function tick() {
    "background only";
    stop();
    if (!box.open || box.away) return;
    void read().then(() => {
      if (!box.open || box.away) return;
      stop();
      box.timer = setTimeout(tick, MY_STORY_LIVE_MS);
    });
  }

  useEffect(() => {
    if (!box.open) return undefined;
    tick();
    return () => {
      box.open = false;
      stop();
    };
  }, [open, port]);
  useLynxGlobalEventListener("contentSyncOpportunity", () => {
    "background only";
    box.away = false;
    if (box.open) tick();
    else void read();
  });
  useLynxGlobalEventListener("appDidEnterBackground", () => {
    "background only";
    box.away = true;
    stop();
  });
  useEffect(() => {
    if (unread > box.unread && box.open) tick();
    box.unread = unread;
  }, [unread]);
}
