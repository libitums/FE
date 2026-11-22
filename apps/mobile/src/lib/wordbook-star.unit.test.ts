import { afterEach, describe, expect, test, vi } from "vitest";

import {
  adoptGuestWordbook,
  emptyWordbook,
  isStarredIn,
  isWordbookRef,
  loadWordbook,
  mergeWordbooks,
  saveWordbook,
  withAnswer,
  withCardsSeen,
  withStarred,
  wordbookFrom,
  wordbookKeyOf,
  type Wordbook,
} from "./wordbook";

// `unit` 계층: 단어 즐겨찾기(별) — 달기 · 떼기 · 없는 단어에 달면 함께 적기 · 합치기(합집합) · 이전 형식 읽기(ADR-0169 즐겨찾기 개정).

afterEach(() => {
  vi.unstubAllGlobals();
});

const day = "2026-11-21";
const ep = "u01-water";
const key = (ref: string) => wordbookKeyOf(ep, ref);
const seen = (refs: readonly string[], book: Wordbook = emptyWordbook) =>
  withCardsSeen(book, ep, refs, "2026-11-20");
const star = (book: Wordbook, ref: string, on = true) => withStarred(book, ep, ref, on, day);

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (k: string) => store.get(k) ?? null,
      set: (k: string, value: string) => void store.set(k, value),
      remove: (k: string) => void store.delete(k),
    },
  });
  return store;
}

describe("별 달기 · 떼기", () => {
  test("WB-S1. 단어장에 둘 수 있는 ref는 voca: 뒤가 비지 않은 것뿐", () => {
    expect(isWordbookRef("voca:a1")).toBe(true);
    expect(isWordbookRef("voca:")).toBe(false);
    expect(isWordbookRef("expr:a1")).toBe(false);
    expect(isWordbookRef("")).toBe(false);
  });

  test("WB-S2. 있는 단어에 달면 별만 바뀌고 기록(맞힘 · 상자 · 처음 본 날)은 그대로, 떼면 필드가 사라진다", () => {
    const before = withAnswer(seen(["voca:a1"]), ep, "voca:a1", "correct", "2026-11-20");
    const on = star(before, "voca:a1");
    expect(on.words[key("voca:a1")]).toEqual({ ...before.words[key("voca:a1")], starred: true });
    expect(isStarredIn(on, ep, "voca:a1")).toBe(true);
    const off = star(on, "voca:a1", false);
    expect(off.words[key("voca:a1")]).toEqual(before.words[key("voca:a1")]);
    expect("starred" in (off.words[key("voca:a1")] ?? {})).toBe(false);
    expect(isStarredIn(off, ep, "voca:a1")).toBe(false);
  });

  test("WB-S3. 단어장에 없는 단어에 달면 오늘 처음 본 단어로 함께 적힌다(상자 0 · 내일 복습)", () => {
    const book = star(emptyWordbook, "voca:b2");
    expect(book.words[key("voca:b2")]).toEqual({
      episodeId: ep,
      ref: "voca:b2",
      firstSeen: day,
      correct: 0,
      incorrect: 0,
      box: 0,
      due: "2026-11-22",
      last: null,
      starred: true,
    });
  });

  test("WB-S4. 바뀔 것이 없으면 같은 객체 — 없는 단어 떼기 · 이미 단 별 · voca가 아닌 ref", () => {
    const book = star(seen(["voca:a1"]), "voca:a1");
    expect(star(book, "voca:a1")).toBe(book);
    expect(star(book, "voca:zz", false)).toBe(book);
    expect(star(book, "expr:x")).toBe(book);
    const plain = seen(["voca:a1"]);
    expect(star(plain, "voca:a1", false)).toBe(plain);
  });

  test("WB-S5. 다시 만나도(카드 끝) · 답해도 별은 남는다", () => {
    const book = star(seen(["voca:a1"]), "voca:a1");
    const again = withAnswer(seen(["voca:a1"], book), ep, "voca:a1", "incorrect", day);
    expect(isStarredIn(again, ep, "voca:a1")).toBe(true);
  });
});

describe("합치기 · 디코드 · 저장", () => {
  test("WB-S6. 비회원 → 계정 합치기에서 별은 합집합(한쪽에만 있어도 남음)", () => {
    const user = star(seen(["voca:a1", "voca:b2"]), "voca:a1");
    const guest = star(star(seen(["voca:b2", "voca:c3"]), "voca:b2"), "voca:c3");
    const merged = mergeWordbooks(user, guest);
    expect(["voca:a1", "voca:b2", "voca:c3"].map((ref) => isStarredIn(merged, ep, ref))).toEqual([
      true,
      true,
      true,
    ]);
    const plainGuest = seen(["voca:a1"]);
    expect(isStarredIn(mergeWordbooks(user, plainGuest), ep, "voca:a1")).toBe(true);
    expect(isStarredIn(mergeWordbooks(seen(["voca:a1"]), plainGuest), ep, "voca:a1")).toBe(false);
  });

  test("WB-S7. 이전 형식(starred 없음)은 그대로 읽히고, starred는 true만 살린다(그 밖 값은 줄을 버리지 않고 별만 없음)", () => {
    const old = seen(["voca:a1"]);
    expect(wordbookFrom(JSON.parse(JSON.stringify(old)))).toEqual(old);
    const starred = star(old, "voca:a1");
    expect(wordbookFrom(JSON.parse(JSON.stringify(starred)))).toEqual(starred);
    const odd = { words: { [key("voca:a1")]: { ...old.words[key("voca:a1")], starred: "yes" } } };
    expect(wordbookFrom(odd)).toEqual(old);
  });

  test("WB-S8. 저장 · 로그인 이관을 지나도 별이 남는다", () => {
    installStorage();
    saveWordbook("guest", star(seen(["voca:b2"]), "voca:b2"));
    saveWordbook("u1", star(seen(["voca:a1"]), "voca:a1"));
    adoptGuestWordbook("u1");
    const book = loadWordbook("u1");
    expect(isStarredIn(book, ep, "voca:a1")).toBe(true);
    expect(isStarredIn(book, ep, "voca:b2")).toBe(true);
  });
});
