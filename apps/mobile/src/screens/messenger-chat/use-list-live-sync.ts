// 목록 화면이 보이는 동안 목록을 맞춥니다(ADR-0213 개정 2) — 들어오면 한 번, 그 뒤 30초마다 `server.syncRooms()`. 목록에 가만히 있는
// 동안 푸시 없이 온 선톡 · 스토리 반응이 맨 위 · 안 읽음 · 최신 미리보기로 섭니다. 화면을 떠나면(언마운트) · 앱이 뒤로 가면
// (`appDidEnterBackground`) 멈추고, 앞으로 오면(`contentSyncOpportunity`) 주기를 다시 겁니다 — 그때의 맞추기 한 번은 앱 결선
// (`use-messenger-refresh.ts`)이 이미 부릅니다. 겹친 맞추기는 출처가 요약 읽기 하나로 묶고, 실패는 조용히 다음 주기입니다.

import { useEffect, useLynxGlobalEventListener, useRef } from "@lynx-js/react";

import type { ChatSource } from "./chat-source.contract";

/** 맞추는 간격 — 내 스토리 보기의 다시 읽기(ADR-0194 ⟨살아 있는 보기⟩)와 같은 값. */
export const LIST_LIVE_MS = 30_000;

// 배경 스레드에서만 — 메인 스레드(첫 화면)에는 타이머를 싣지 않습니다(번들 천장 ADR-0149). 스레드마다 훅 순서는 일정합니다.
export const useListLiveSync: (source: ChatSource) => void = __BACKGROUND__
  ? useLive
  : () => undefined;

type Live = {
  shown: boolean;
  away: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

function useLive(source: ChatSource): void {
  const box = useRef<Live>({ shown: false, away: false, timer: null }).current;

  function stop() {
    "background only";
    if (box.timer !== null) clearTimeout(box.timer);
    box.timer = null;
  }
  function schedule() {
    "background only";
    stop();
    if (!box.shown || box.away) return;
    box.timer = setTimeout(() => {
      box.timer = null;
      if (!box.shown || box.away) return;
      source.server?.syncRooms();
      schedule();
    }, LIST_LIVE_MS);
  }

  useEffect(() => {
    const server = source.server;
    if (server === null) return undefined;
    box.shown = true;
    server.syncRooms();
    schedule();
    return () => {
      box.shown = false;
      stop();
    };
  }, [source]);
  useLynxGlobalEventListener("contentSyncOpportunity", () => {
    "background only";
    box.away = false;
    schedule();
  });
  useLynxGlobalEventListener("appDidEnterBackground", () => {
    "background only";
    box.away = true;
    stop();
  });
}
