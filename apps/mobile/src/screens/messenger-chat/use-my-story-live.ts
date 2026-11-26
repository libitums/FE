// 내 스토리 보기를 연 동안 Seen by · 답을 다시 읽습니다(ADR-0194 개정 ⟨살아 있는 보기⟩). 판정은 `my-story-live.ts`.
// 열면 바로 한 번, 그 뒤 30초마다. 앱이 뒤로 가면 멈추고 앞으로 오면 바로 한 번, 열린 방에 새 말이 오면(답 도착) 바로 한 번.
// 앱 앞 · 뒤는 호스트 전역 이벤트로 받습니다(뒤로 감은 이 개정이 더한 `appDidEnterBackground`). 겹친 읽기는 하나로 묶고, 못 읽으면 넘기지 않고 다음 주기에 다시 읽습니다. 새 RPC 없이 목록 읽기(`port.load`)를 씁니다.

import { useEffect, useLynxGlobalEventListener, useMemo, useRef, useState } from "@lynx-js/react";

import type { ChatRoomSummary } from "./chat-source.contract";
import { MY_STORY_LIVE_MS, replyArrived, sharedRead, stateWithLive } from "./my-story-live";
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

function useLive({ port, open, rooms, setState }: Args): void {
  const [foreground, setForeground] = useState(true);
  // 보기가 열려 있고 앱이 앞에 있을 때만 돕니다.
  const active = open && port !== undefined && foreground;
  const activeRef = useRef(active);
  activeRef.current = active;
  const apply = (state: MyStoriesState | null) => {
    if (state !== null) setState((before) => stateWithLive(before, state.stories));
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const read = useMemo(
    () => (port === undefined ? null : sharedRead(() => port.load().catch(() => null))),
    [port],
  );

  function stop() {
    "background only";
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  }
  // 지금 한 번 읽고 30초 뒤를 다시 겁니다 — 읽는 중에 또 불러도 같은 읽기에 묶입니다.
  function readNow() {
    "background only";
    stop();
    if (read === null || !activeRef.current) return;
    void read().then((state) => {
      if (!activeRef.current) return;
      apply(state);
      stop();
      timer.current = setTimeout(readNow, MY_STORY_LIVE_MS);
    });
  }

  useEffect(() => {
    if (!active) return undefined;
    readNow();
    return () => {
      activeRef.current = false;
      stop();
    };
  }, [active]);

  // 앱이 앞으로 옴(호스트 `contentSyncOpportunity` — 연결이 돌아올 때도) · 뒤로 감(`appDidEnterBackground`). 뒤로 간 적 없이 온 「앞」도
  // 바로 한 번 읽습니다(신호가 없는 옛 호스트).
  useLynxGlobalEventListener("contentSyncOpportunity", () => {
    "background only";
    if (activeRef.current) readNow();
    // 보기가 닫혀 있어도 한 번 — 목록의 「Your story」 고리 · 다음에 열 보기가 맞습니다.
    else if (read !== null) void read().then(apply);
    setForeground(true);
  });
  useLynxGlobalEventListener("appDidEnterBackground", () => {
    "background only";
    setForeground(false);
  });

  const roomsRef = useRef(rooms);
  useEffect(() => {
    const before = roomsRef.current;
    roomsRef.current = rooms;
    if (activeRef.current && replyArrived(before, rooms)) readNow();
  }, [rooms]);
}
