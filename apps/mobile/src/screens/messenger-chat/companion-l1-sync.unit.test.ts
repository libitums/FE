import { expect, test, vi } from "vitest";

import { companionL1Sync } from "./companion-l1-sync";

// `unit` 계층(L1-U1 ~ U4, 2026-11-17): 서버 방은 앱 화면 언어를 학습자 언어(L1)로 서버 프로필에 맞춘다 — 번역 · 교정 설명 · 추천
// 답변 뜻이 그 언어로 온다. 시작할 때 한 번, 화면 언어를 바꿀 때마다. 같은 언어는 다시 보내지 않는다.

function setup(language = "vi") {
  let current = language;
  const listeners = new Set<(l: string) => void>();
  const syncL1 = vi.fn<(l1: string) => Promise<boolean>>(async () => true);
  const change = (next: string) => {
    current = next;
    for (const listener of listeners) listener(next);
  };
  const subscribe = (listener: (l: string) => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  };
  return { syncL1, change, subscribe, current: () => current, listeners };
}

test("L1-U1 시작하면 지금 화면 언어로 한 번 맞춘다", () => {
  const s = setup("vi");
  companionL1Sync({ syncL1: s.syncL1 }, s.current, s.subscribe);
  expect(s.syncL1).toHaveBeenCalledTimes(1);
  expect(s.syncL1).toHaveBeenCalledWith("vi");
});

test("L1-U2 화면 언어를 바꾸면 다시 맞추고, 같은 언어는 보내지 않는다", () => {
  const s = setup("vi");
  companionL1Sync({ syncL1: s.syncL1 }, s.current, s.subscribe);
  s.change("ja");
  s.change("ja");
  expect(s.syncL1.mock.calls.map(([l1]) => l1)).toEqual(["vi", "ja"]);
});

test("L1-U3 못 맞췄으면 같은 언어도 다음 기회에 다시 보낸다", async () => {
  const s = setup("vi");
  s.syncL1.mockResolvedValueOnce(false);
  companionL1Sync({ syncL1: s.syncL1 }, s.current, s.subscribe);
  await Promise.resolve();
  await Promise.resolve();
  s.change("vi");
  expect(s.syncL1).toHaveBeenCalledTimes(2);
});

test("L1-U4 프로필 포트가 없으면(가짜 방 · 옛 원격) 아무것도 하지 않고, 멈추면 듣기를 뗀다", () => {
  const s = setup("vi");
  const none = companionL1Sync(undefined, s.current, s.subscribe);
  expect(s.listeners.size).toBe(0);
  none();
  const stop = companionL1Sync({ syncL1: s.syncL1 }, s.current, s.subscribe);
  expect(s.listeners.size).toBe(1);
  stop();
  expect(s.listeners.size).toBe(0);
});
