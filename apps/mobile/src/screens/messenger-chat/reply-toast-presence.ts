// 답장 도착 토스트와 친구 스토리 보기가 서로를 아는 자리입니다(ADR-0200) — 보기가 열렸는지(목록 위라도 토스트를 띄움)와
// 토스트가 떠 있는지(그동안 스토리 진행을 멈춤). 화면 props를 늘리지 않으려고 모듈 하나에 둡니다.

import { useEffect, useState } from "@lynx-js/react";

let viewerOpen = false;
let toastShown = false;
const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) listener();
};

export function setStoryViewerOpen(open: boolean): void {
  if (viewerOpen === open) return;
  viewerOpen = open;
  notify();
}

export function storyViewerOpen(): boolean {
  return viewerOpen;
}

export function setReplyToastShown(shown: boolean): void {
  if (toastShown === shown) return;
  toastShown = shown;
  notify();
}

export function replyToastShown(): boolean {
  return toastShown;
}

export function subscribeReplyToastPresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 스토리 보기 쪽 — 열림을 알리고, 토스트가 떠 있는지를 받습니다(떠 있는 동안 진행을 멈춤). */
export function useStoryToastLink(open: boolean): boolean {
  const [shown, setShown] = useState(toastShown);
  useEffect(() => subscribeReplyToastPresence(() => setShown(toastShown)), []);
  useEffect(() => {
    setStoryViewerOpen(open);
    return () => setStoryViewerOpen(false);
  }, [open]);
  return shown;
}
