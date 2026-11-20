import { afterEach, describe, expect, test, vi } from "vitest";

import {
  canRecommendLetters,
  emptyLettersRecord,
  isHangulReadingItem,
  lettersRecommendConfig,
  lettersRecordFrom,
  loadLettersRecord,
  recommendReasonOf,
  saveLettersRecord,
  withKeepGoing,
  withLettersOpened,
  withShown,
} from "./letters-recommend";

// `unit` 계층: Letters 추천의 신호 → 이유와 띄우지 않는 규칙 · 기록(ADR-0169).

afterEach(() => {
  vi.unstubAllGlobals();
});

const day = "2026-11-20";

describe("설정", () => {
  test("LR-C. 문턱은 한 곳 — 3번 틀림 · 2번 연속 · 노출 2 · Keep going 2", () => {
    expect(lettersRecommendConfig).toMatchObject({
      hangulWrong: 3,
      repeatWrong: 2,
      maxShows: 2,
      maxKeepGoing: 2,
    });
  });
});

describe("한글 읽기 문항", () => {
  test.each([
    ["SYLLABLE_BUILD", true],
    ["LISTEN_BUILD", true],
    ["CLOZE", true],
    ["CLOZE_CHOICE", true],
    ["WORD_ORDER", false],
    ["IMG_MATCH", false],
  ])("LR-H. %s → %s", (type, hangul) => {
    expect(isHangulReadingItem(type)).toBe(hangul);
  });
});

describe("이유", () => {
  test("LR1. 실패 · 나가기는 failed(틀림 수와 무관)", () => {
    expect(recommendReasonOf({ hangulWrong: 0, repeatWrong: 0, end: "failed" })).toBe("failed");
    expect(recommendReasonOf({ hangulWrong: 0, repeatWrong: 0, end: "exited" })).toBe("failed");
  });

  test("LR2. 끝냈고 한글 읽기 3번 틀림 또는 같은 문항 2번 연속 → hard", () => {
    expect(recommendReasonOf({ hangulWrong: 3, repeatWrong: 0, end: "finished" })).toBe("hard");
    expect(recommendReasonOf({ hangulWrong: 1, repeatWrong: 2, end: "finished" })).toBe("hard");
  });

  test("LR3. 끝냈고 문턱 아래면 없음", () => {
    expect(recommendReasonOf({ hangulWrong: 2, repeatWrong: 1, end: "finished" })).toBeNull();
  });
});

describe("띄우지 않는 규칙", () => {
  test("LR4. 처음이면 띄움", () => {
    expect(canRecommendLetters(emptyLettersRecord, day)).toBe(true);
  });

  test("LR5. Letters를 연 사람 · 오늘 본 사람 · 2번 본 사람 · Keep going 2번은 안 띄움", () => {
    expect(canRecommendLetters(withLettersOpened(emptyLettersRecord), day)).toBe(false);
    const once = withShown(emptyLettersRecord, day);
    expect(canRecommendLetters(once, day)).toBe(false);
    expect(canRecommendLetters(once, "2026-11-21")).toBe(true);
    const twice = withShown(once, "2026-11-21");
    expect(canRecommendLetters(twice, "2026-11-25")).toBe(false);
    const declined = withKeepGoing(withKeepGoing(emptyLettersRecord));
    expect(canRecommendLetters(declined, day)).toBe(false);
  });

  test("LR6. 기록 디코드 — 깨지면 빈 기록", () => {
    expect(lettersRecordFrom("x")).toEqual(emptyLettersRecord);
    const record = withKeepGoing(withShown(emptyLettersRecord, day));
    expect(lettersRecordFrom(JSON.parse(JSON.stringify(record)))).toEqual(record);
  });

  test("LR7. 저장 · 읽기(기기 범위 키 libitum.letters), 저장소 없으면 빈 기록", () => {
    expect(loadLettersRecord()).toEqual(emptyLettersRecord);
    const store = new Map<string, string>();
    vi.stubGlobal("NativeModules", {
      StorageModule: {
        get: (key: string) => store.get(key) ?? null,
        set: (key: string, value: string) => void store.set(key, value),
        remove: (key: string) => void store.delete(key),
      },
    });
    const record = withLettersOpened(emptyLettersRecord);
    saveLettersRecord(record);
    expect(store.has("libitum.letters")).toBe(true);
    expect(loadLettersRecord()).toEqual(record);
  });
});
