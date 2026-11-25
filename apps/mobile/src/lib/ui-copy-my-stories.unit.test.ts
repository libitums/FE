import { describe, expect, test } from "vitest";

import { myStoriesEn } from "./ui-copy-en-my-stories";
import { myStoriesEs } from "./ui-copy-es-my-stories";
import { myStoriesId } from "./ui-copy-id-my-stories";
import { myStoriesJa } from "./ui-copy-ja-my-stories";
import { myStoriesMy } from "./ui-copy-my-my-stories";
import { myStoriesTh } from "./ui-copy-th-my-stories";
import { myStoriesVi } from "./ui-copy-vi-my-stories";
import { myStoriesZhTw } from "./ui-copy-zh-tw-my-stories";
import { uiCopyFor } from "./ui-copy";
import { placeholderProblems } from "./ui-copy-placeholder.test-support";
import { scriptLeaves } from "./ui-copy-script.test-support";

// `unit` 계층(MS-U10): 내 스토리 문구 여덟 언어(ADR-0194 · ADR-0191) — 빈 글이 없고, 영어 밖 표는 영어를 그대로 두지 않으며, 문구표에 걸려 있다.

const tables = {
  es: myStoriesEs,
  id: myStoriesId,
  ja: myStoriesJa,
  vi: myStoriesVi,
  th: myStoriesTh,
  my: myStoriesMy,
  "zh-TW": myStoriesZhTw,
} as const;

describe("MS-U10 내 스토리 문구", () => {
  test.each(Object.entries(tables))(
    "%s — 빈 글이 없고 영어를 그대로 두지 않는다",
    (language, table) => {
      const leaves = scriptLeaves(table, myStoriesEn);
      expect(leaves.strings.length).toBeGreaterThan(40);
      const same = leaves.sameAsEnglish.filter(({ value }) => /[A-Za-z]{3,}/.test(value));
      expect(
        same.map((leaf) => leaf.path),
        language,
      ).toEqual([]);
      expect(table.language).toBe(language);
      expect(table.guide.steps).toHaveLength(myStoriesEn.guide.steps.length);
    },
  );

  test("수 · 날짜 표기", () => {
    expect(myStoriesEn.archive.count(1)).toBe("1 story");
    expect(myStoriesEn.archive.count(4)).toBe("4 stories");
    expect(myStoriesEn.archive.date(11, 21)).toBe("Nov 21");
    expect(myStoriesJa.archive.date(11, 21)).toBe("11月21日");
    expect(myStoriesEn.remove.body(1)).toContain("the 1 reply on it");
    expect(myStoriesEn.remove.body(2)).toBe(
      "Your card and the 2 replies on it will be removed. Messages in your chats stay, with a “Deleted story” note. You can't undo this.",
    );
    expect(myStoriesEn.window.time(18, 0)).toBe("6 PM");
    expect(myStoriesEn.window.time(0, 30)).toBe("12:30 AM");
    expect(myStoriesEn.window.title("day")).toBe("You shared this afternoon's story");
    expect(myStoriesEn.viewer.replied(0)).toBe("No replies yet");
    expect(myStoriesEn.viewer.replied(2)).toBe("2 friends replied");
    expect(myStoriesJa.window.time(18, 0)).toBe("18:00");
  });

  test("새 흐름 — 안내에 「Answer」 · 「over the day」가 없다(ADR-0191)", () => {
    for (const table of [myStoriesEn, ...Object.values(tables)]) {
      const text = JSON.stringify(table.guide);
      expect(text).not.toMatch(/Answer|over the day/);
    }
    expect(JSON.stringify(myStoriesEn.guide)).not.toContain("Tap Answer");
  });

  test("UiCopy.messengerChat.myStories로 걸려 있다", () => {
    expect(uiCopyFor("en").messengerChat.myStories).toBe(myStoriesEn);
    expect(uiCopyFor("my").messengerChat.myStories.row.mine).toBe(myStoriesMy.row.mine);
    expect(uiCopyFor("zh-TW").messengerChat.myStories).toBe(myStoriesZhTw);
  });

  test.each(Object.entries(tables))(
    "%s — 여러 표본 인자에서 자리표시자가 빠지지 않고 빈 글이 없다(감사)",
    (_language, table) => {
      expect(placeholderProblems(table, myStoriesEn)).toEqual({ missing: [], empty: [] });
    },
  );

  test("오늘 지우기 · 단어장 이름 · 미얀마 날짜(감사 M1 · M3 · M4)", () => {
    expect(myStoriesEn.archive.deleteToday).toBe("Delete today's story");
    expect(myStoriesEs.archive.deleteToday).not.toContain("Hoy");
    expect(myStoriesJa.composer.tab("word")).toBe("単語帳");
    expect(myStoriesTh.composer.tab("word")).toBe("คำศัพท์ของฉัน");
    expect(myStoriesId.composer.tab("word")).toBe("Kosakataku");
    expect(myStoriesMy.archive.date(11, 21)).toBe("21/11");
    expect(myStoriesEn.archive.tileLabel("야근", "overtime", "Today", 2, true)).toBe(
      "야근, overtime, Today, 2 replies, LIVE",
    );
  });
});
