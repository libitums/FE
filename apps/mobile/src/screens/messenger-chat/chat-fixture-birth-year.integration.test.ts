import { expect, test, vi } from "vitest";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import { memoryBirthYearStore } from "./chat-local-stores";
import type { BirthYearStore } from "./chat-fixture-birth-year";
import type { ChatProfileRemote, ChatRemote } from "./chat-remote.contract";
import { companionSeed } from "./companion-roster";

// `integration` 계층(BY-I1 ~ I2): 서버 모드 출처 + 기기 저장 + 가짜 프로필 원격 — 생년이 앱을 다시 켜도 남고 서버에 간다(ADR-0125).

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function serverSource(store: BirthYearStore, serverYear: number | null) {
  const saveBirthYear = vi.fn<(year: number) => Promise<boolean>>(async () => true);
  const profile: ChatProfileRemote = {
    load: async () => ({ birthYear: serverYear }),
    saveBirthYear,
  };
  const remote: ChatRemote = {
    loadHistory: async () => ({ messages: [], corrections: {}, ideas: null }),
    greet: async () => null,
    openTurn: () => ({ cancel: () => undefined }),
    profile,
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: companionSeed(),
    now: () => 1_000,
    timers: fakeTimers(),
    remote,
    birthYearStore: store,
  });
  return { source, saveBirthYear };
}

test("BY-I1 고른 생년은 서버에 가고, 앱을 다시 켜면(새 출처) 시트를 다시 띄우지 않는다", async () => {
  const store = memoryBirthYearStore();
  const first = serverSource(store, null);
  await flush();
  expect(first.source.snapshot().birthYear).toEqual({ kind: "unasked" });
  first.source.setBirthYear(1995);
  expect(first.saveBirthYear).toHaveBeenCalledWith(1995);
  first.source.dispose();

  const second = serverSource(store, 1995);
  expect(second.source.snapshot().birthYear).toEqual({ kind: "set", year: 1995 });
  await flush();
  expect(second.source.snapshot().birthYear).toEqual({ kind: "set", year: 1995 });
  expect(second.saveBirthYear).not.toHaveBeenCalled();
});

test("BY-I2 새 기기 · 재설치면 서버 생년을 읽어 스냅샷을 바꾸고 알린다", async () => {
  const { source } = serverSource(memoryBirthYearStore(), 1988);
  const listener = vi.fn<() => void>();
  source.subscribe(listener);
  expect(source.snapshot().birthYear).toEqual({ kind: "unasked" });
  await flush();
  expect(source.snapshot().birthYear).toEqual({ kind: "set", year: 1988 });
  expect(listener).toHaveBeenCalled();
});
