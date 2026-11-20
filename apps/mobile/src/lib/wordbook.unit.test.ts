import { afterEach, describe, expect, test, vi } from "vitest";

import {
  addDays,
  adoptGuestWordbook,
  clearWordbook,
  emptyWordbook,
  loadWordbook,
  localDayOf,
  mergeWordbooks,
  reviewQueueOf,
  saveWordbook,
  withAnswer,
  withCardsSeen,
  wordbookCountsOf,
  wordbookFrom,
  wordbookKeyOf,
  wordbookStorageKey,
  wordStatusOf,
  type Wordbook,
} from "./wordbook";

// `unit` 계층: 단어장 기록 — 단어 카드로 만난 voca만, 답 기록, 상태, 간격 반복, 합치기, 저장 · 비회원 이관(ADR-0168).

const day = "2026-11-20";
const seen = (refs: readonly string[], today = day, book: Wordbook = emptyWordbook) =>
  withCardsSeen(book, "u01-water", refs, today);

function installStorage(entries: Record<string, string> = {}): Map<string, string> {
  const store = new Map<string, string>(Object.entries(entries));
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("날짜", () => {
  test("WB1. 기기 시각의 날 · 날 더하기(달 · 해 넘김)", () => {
    expect(localDayOf(new Date(2026, 10, 20, 23, 59))).toBe("2026-11-20");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 3)).toBe("2027-01-03");
  });
});

describe("단어 카드로 만남", () => {
  test("WB2. voca: ref만 들고, expr: · 빈 값은 버린다", () => {
    const book = seen(["voca:a1", "expr:b2", "", "voca:c3"]);
    expect(Object.keys(book.words).sort()).toEqual([
      wordbookKeyOf("u01-water", "voca:a1"),
      wordbookKeyOf("u01-water", "voca:c3"),
    ]);
    const record = book.words[wordbookKeyOf("u01-water", "voca:a1")]!;
    expect(record).toEqual({
      episodeId: "u01-water",
      ref: "voca:a1",
      firstSeen: day,
      correct: 0,
      incorrect: 0,
      box: 0,
      due: "2026-11-21",
      last: null,
    });
  });

  test("WB3. 다시 만나도 처음 본 날 · 기록은 그대로", () => {
    const first = seen(["voca:a1"]);
    const again = seen(["voca:a1"], "2026-11-25", first);
    expect(again.words[wordbookKeyOf("u01-water", "voca:a1")]?.firstSeen).toBe(day);
  });
});

describe("답", () => {
  test("WB4. 단어장에 없는 단어의 답은 무시", () => {
    expect(withAnswer(emptyWordbook, "u01-water", "voca:a1", "correct", day)).toEqual(
      emptyWordbook,
    );
  });

  test("WB5. 맞으면 맞힘 +1 · 상자 +1 · 다음 복습은 간격만큼 뒤", () => {
    const book = withAnswer(seen(["voca:a1"]), "u01-water", "voca:a1", "correct", day);
    const record = book.words[wordbookKeyOf("u01-water", "voca:a1")]!;
    expect([record.correct, record.box, record.due, record.last]).toEqual([
      1,
      1,
      "2026-11-23",
      "correct",
    ]);
  });

  test("WB6. 틀리면 틀림 +1 · 상자 0 · 내일 다시", () => {
    let book = withAnswer(seen(["voca:a1"]), "u01-water", "voca:a1", "correct", day);
    book = withAnswer(book, "u01-water", "voca:a1", "incorrect", day);
    const record = book.words[wordbookKeyOf("u01-water", "voca:a1")]!;
    expect([record.incorrect, record.box, record.due, record.last]).toEqual([
      1,
      0,
      "2026-11-21",
      "incorrect",
    ]);
  });

  test("WB7. 상자는 간격 표 끝에서 멈춘다(30일)", () => {
    let book = seen(["voca:a1"]);
    for (let i = 0; i < 8; i += 1) book = withAnswer(book, "u01-water", "voca:a1", "correct", day);
    expect(book.words[wordbookKeyOf("u01-water", "voca:a1")]?.due).toBe("2026-12-20");
  });
});

describe("상태 · 복습 줄", () => {
  test("WB8. 답 없음 → new, 맞힘 → known, 틀림 → review, 복습 날이 오면 review", () => {
    const fresh = seen(["voca:a1", "voca:b2", "voca:c3"]);
    let book = withAnswer(fresh, "u01-water", "voca:b2", "correct", day);
    book = withAnswer(book, "u01-water", "voca:c3", "incorrect", day);
    const status = (ref: string, today: string) =>
      wordStatusOf(book.words[wordbookKeyOf("u01-water", ref)]!, today);
    expect(status("voca:a1", day)).toBe("new");
    expect(status("voca:b2", day)).toBe("known");
    expect(status("voca:c3", day)).toBe("review");
    expect(status("voca:a1", "2026-11-21")).toBe("review");
    expect(status("voca:b2", "2026-11-23")).toBe("review");
  });

  test("WB9. 오늘 복습 줄은 복습 날이 온 단어(처음 본 순서) · 수", () => {
    let book = seen(["voca:a1", "voca:b2"]);
    book = withAnswer(book, "u01-water", "voca:b2", "correct", day);
    expect(reviewQueueOf(book, day)).toEqual([]);
    expect(reviewQueueOf(book, "2026-11-21").map((r) => r.ref)).toEqual(["voca:a1"]);
    expect(wordbookCountsOf(book, "2026-11-21")).toEqual({ words: 2, due: 1 });
  });
});

describe("합치기 · 디코드", () => {
  test("WB10. 비회원 기록을 합칠 때 같은 단어는 맞힘 · 틀림을 더하고 처음 본 날은 이른 쪽", () => {
    const user = withAnswer(
      seen(["voca:a1"], "2026-11-18"),
      "u01-water",
      "voca:a1",
      "correct",
      day,
    );
    const guest = withAnswer(
      seen(["voca:a1", "voca:b2"]),
      "u01-water",
      "voca:a1",
      "incorrect",
      day,
    );
    const merged = mergeWordbooks(user, guest);
    const a1 = merged.words[wordbookKeyOf("u01-water", "voca:a1")]!;
    expect([a1.firstSeen, a1.correct, a1.incorrect]).toEqual(["2026-11-18", 1, 1]);
    expect(Object.keys(merged.words)).toHaveLength(2);
  });

  test("WB11. 깨진 값은 빈 단어장, 모양이 틀린 줄만 버림", () => {
    expect(wordbookFrom("x")).toEqual(emptyWordbook);
    expect(wordbookFrom(null)).toEqual(emptyWordbook);
    const good = seen(["voca:a1"]);
    const raw = { words: { ...good.words, bad: { ref: 3 } } };
    expect(wordbookFrom(raw)).toEqual(good);
  });
});

describe("저장 · 이관", () => {
  test("WB12. 계정별 키 · 저장한 것을 읽음 · 지움", () => {
    const store = installStorage();
    expect(wordbookStorageKey("u1")).toBe("libitum.wordbook.u1");
    const book = seen(["voca:a1"]);
    saveWordbook("u1", book);
    expect(loadWordbook("u1")).toEqual(book);
    expect(loadWordbook("u2")).toEqual(emptyWordbook);
    clearWordbook("u1");
    expect(store.has("libitum.wordbook.u1")).toBe(false);
  });

  test("WB13. 저장소가 없거나 깨져도 던지지 않는다", () => {
    expect(loadWordbook("u1")).toEqual(emptyWordbook);
    expect(() => saveWordbook("u1", emptyWordbook)).not.toThrow();
    installStorage({ "libitum.wordbook.u1": "{not json" });
    expect(loadWordbook("u1")).toEqual(emptyWordbook);
  });

  test("WB14. 로그인하면 비회원 단어장을 그 계정 칸으로 합치고 비회원 칸을 지운다", () => {
    const store = installStorage();
    saveWordbook("guest", seen(["voca:b2"]));
    saveWordbook("u1", seen(["voca:a1"]));
    adoptGuestWordbook("u1");
    expect(Object.keys(loadWordbook("u1").words)).toHaveLength(2);
    expect(store.has("libitum.wordbook.guest")).toBe(false);
  });
});
