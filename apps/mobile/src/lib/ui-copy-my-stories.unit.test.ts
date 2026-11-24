import { describe, expect, test } from "vitest";

import { myStoriesEn } from "./ui-copy-en-my-stories";
import { myStoriesEs } from "./ui-copy-es-my-stories";
import { myStoriesId } from "./ui-copy-id-my-stories";
import { myStoriesJa } from "./ui-copy-ja-my-stories";
import { myStoriesMy } from "./ui-copy-my-my-stories";
import { myStoriesTh } from "./ui-copy-th-my-stories";
import { myStoriesVi } from "./ui-copy-vi-my-stories";
import { uiCopyFor } from "./ui-copy";
import { placeholderProblems } from "./ui-copy-placeholder.test-support";
import { scriptLeaves } from "./ui-copy-script.test-support";

// `unit` 계층(MS-U10): 내 스토리 문구 일곱 언어(ADR-0179) — 빈 글이 없고, 영어 밖 표는 영어를 그대로 두지 않으며, 문구표에 걸려 있다.

const tables = {
  es: myStoriesEs,
  id: myStoriesId,
  ja: myStoriesJa,
  vi: myStoriesVi,
  th: myStoriesTh,
  my: myStoriesMy,
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
    expect(myStoriesEn.remove.body(1)).toContain("1 reply from friends");
  });

  test("UiCopy.messengerChat.myStories로 걸려 있다", () => {
    expect(uiCopyFor("en").messengerChat.myStories).toBe(myStoriesEn);
    expect(uiCopyFor("my").messengerChat.myStories.row.mine).toBe(myStoriesMy.row.mine);
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
