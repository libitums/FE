import { expect, test, vi } from "vitest";

import { birthYearState, type BirthYearStore } from "./chat-fixture-birth-year";
import type { ChatProfileRemote } from "./chat-remote.contract";
import type { ChatBirthYear } from "./chat-source.contract";

// `unit` 계층(BY-U1 ~ U8): 생년의 기기 · 서버 저장(ADR-0125 「서버 결선」). 예전에는 메모리에만 있어 앱을 다시 켜면 다시 물었고,
// 서버 프로필에 가지 않아 모든 학습자가 「나이 모름」이었다.

const memoryStore = (initial: ChatBirthYear | null = null) => {
  let value = initial;
  const write = vi.fn<(next: ChatBirthYear) => void>((next) => {
    value = next;
  });
  const store: BirthYearStore = { read: () => value, write };
  return { store, write };
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const remoteOf = (loaded: Promise<{ readonly birthYear: number | null } | null>) => {
  const saveBirthYear = vi.fn<(year: number) => Promise<boolean>>(async () => true);
  const profile: ChatProfileRemote = { load: () => loaded, saveBirthYear };
  return { profile, saveBirthYear };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const make = (over: Partial<Parameters<typeof birthYearState>[0]> = {}) => {
  const onChange = vi.fn<() => void>();
  const state = birthYearState({ seed: undefined, onChange, disposed: () => false, ...over });
  return { state, onChange };
};

test("BY-U1 기기에 적힌 생년으로 시작한다 — 다시 켜도 다시 묻지 않는다", () => {
  expect(make({ store: memoryStore({ kind: "set", year: 1990 }).store }).state.current()).toEqual({
    kind: "set",
    year: 1990,
  });
  // 기기에 없으면 씨앗, 씨앗도 없으면 unasked.
  expect(make({ seed: { kind: "set", year: 2001 } }).state.current()).toEqual({
    kind: "set",
    year: 2001,
  });
  expect(make().state.current()).toEqual({ kind: "unasked" });
});

test("BY-U2 고르면 기기에 적고 서버에 생년 · 출처를 보내며 알린다", () => {
  const { store, write } = memoryStore();
  const { profile, saveBirthYear } = remoteOf(new Promise(() => undefined));
  const { state, onChange } = make({ store, profile });
  state.set(1995);
  expect(state.current()).toEqual({ kind: "set", year: 1995 });
  expect(write).toHaveBeenLastCalledWith({ kind: "set", year: 1995 });
  expect(saveBirthYear).toHaveBeenCalledWith(1995);
  expect(onChange).toHaveBeenCalledTimes(1);
  // 같은 값이면 다시 적거나 보내지 않는다.
  state.set(1995);
  expect(saveBirthYear).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("BY-U4 서버에 생년이 있으면 그 값으로 바꾸고 기기에 적는다(다른 기기 · 재설치)", async () => {
  const { store, write } = memoryStore();
  const { profile, saveBirthYear } = remoteOf(Promise.resolve({ birthYear: 1988 }));
  const { state, onChange } = make({ store, profile });
  await flush();
  expect(state.current()).toEqual({ kind: "set", year: 1988 });
  expect(write).toHaveBeenLastCalledWith({ kind: "set", year: 1988 });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(saveBirthYear).not.toHaveBeenCalled();
});

test("BY-U5 기기에는 생년이 있는데 서버가 비어 있으면(지난 저장 실패) 다시 보낸다", async () => {
  const { profile, saveBirthYear } = remoteOf(Promise.resolve({ birthYear: null }));
  const { state, onChange } = make({
    store: memoryStore({ kind: "set", year: 1999 }).store,
    profile,
  });
  await flush();
  expect(saveBirthYear).toHaveBeenCalledWith(1999);
  expect(state.current()).toEqual({ kind: "set", year: 1999 });
  expect(onChange).not.toHaveBeenCalled();
});

test("BY-U6 서버를 읽는 동안 고른 값이 이긴다", async () => {
  const loaded = deferred<{ readonly birthYear: number | null } | null>();
  const { profile } = remoteOf(loaded.promise);
  const { state } = make({ store: memoryStore().store, profile });
  state.set(2003);
  loaded.resolve({ birthYear: 1970 });
  await flush();
  expect(state.current()).toEqual({ kind: "set", year: 2003 });
});

test("BY-U7 서버를 못 읽거나 저장이 던져도 던지지 않고 기기 값으로 간다", async () => {
  const failing: ChatProfileRemote = {
    load: () => Promise.reject(new Error("offline")),
    saveBirthYear: () => Promise.reject(new Error("offline")),
  };
  const throwing: BirthYearStore = {
    read: () => {
      throw new Error("storage");
    },
    write: () => {
      throw new Error("storage");
    },
  };
  const { state } = make({ store: throwing, profile: failing });
  expect(state.current()).toEqual({ kind: "unasked" });
  expect(() => state.set(1990)).not.toThrow();
  await flush();
  expect(state.current()).toEqual({ kind: "set", year: 1990 });
  // 못 읽음(null)도 그대로.
  const { state: unread } = make({ profile: remoteOf(Promise.resolve(null)).profile });
  await flush();
  expect(unread.current()).toEqual({ kind: "unasked" });
});

test("BY-U8 출처를 버린 뒤에는 서버 답 · 고르기를 무시한다", async () => {
  let disposed = false;
  const loaded = deferred<{ readonly birthYear: number | null } | null>();
  const { profile, saveBirthYear } = remoteOf(loaded.promise);
  const { state, onChange } = make({ profile, disposed: () => disposed });
  disposed = true;
  loaded.resolve({ birthYear: 1980 });
  await flush();
  state.set(1990);
  expect(state.current()).toEqual({ kind: "unasked" });
  expect(onChange).not.toHaveBeenCalled();
  expect(saveBirthYear).not.toHaveBeenCalled();
});
