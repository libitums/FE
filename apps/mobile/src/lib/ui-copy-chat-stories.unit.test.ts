import { describe, expect, test } from "vitest";

import { messengerChatStoriesEn } from "./ui-copy-en-chat-stories";
import { messengerChatStoriesEs } from "./ui-copy-es-chat-stories";
import { messengerChatStoriesId } from "./ui-copy-id-chat-stories";
import { messengerChatStoriesJa } from "./ui-copy-ja-chat-stories";
import { messengerChatStoriesMy } from "./ui-copy-my-chat-stories";
import { messengerChatStoriesTh } from "./ui-copy-th-chat-stories";
import { messengerChatStoriesVi } from "./ui-copy-vi-chat-stories";
import { uiCopyFor } from "./ui-copy";
import { placeholderProblems } from "./ui-copy-placeholder.test-support";
import { scriptLeaves } from "./ui-copy-script.test-support";

// `unit` 계층(FS-U13): 친구 스토리 문구 일곱 언어(ADR-0177) — 빈 글이 없고, 영어 밖 표는 영어를 그대로 두지 않으며, 문구표에 걸려 있다.

const tables = {
  es: messengerChatStoriesEs,
  id: messengerChatStoriesId,
  ja: messengerChatStoriesJa,
  vi: messengerChatStoriesVi,
  th: messengerChatStoriesTh,
  my: messengerChatStoriesMy,
} as const;

describe("FS-U13 친구 스토리 문구", () => {
  test.each(Object.entries(tables))(
    "%s — 빈 글이 없고 영어를 그대로 두지 않는다",
    (language, table) => {
      const leaves = scriptLeaves(table, messengerChatStoriesEn);
      expect(leaves.strings.length).toBeGreaterThan(30);
      // 이름 자리 · 숫자만 들어간 글(예: 경과 「3m」)은 언어 따라 같을 수 있어 단위가 있는 글만 봅니다.
      const same = leaves.sameAsEnglish.filter(({ value }) => /[A-Za-z]{3,}/.test(value));
      expect(
        same.map((leaf) => leaf.path),
        language,
      ).toEqual([]);
      expect(table.language).toBe(language);
    },
  );

  test("경과 표기 — now · 분 · 시간", () => {
    expect(messengerChatStoriesEn.age({ unit: "now" })).toBe("now");
    expect(messengerChatStoriesEn.age({ unit: "m", value: 5 })).toBe("5m");
    expect(messengerChatStoriesEn.age({ unit: "h", value: 2 })).toBe("2h");
    expect(messengerChatStoriesJa.age({ unit: "h", value: 2 })).toBe("2時間");
  });

  test("UiCopy.messengerChat.stories로 걸려 있다", () => {
    expect(uiCopyFor("en").messengerChat.stories).toBe(messengerChatStoriesEn);
    expect(uiCopyFor("th").messengerChat.stories.rowTitle).toBe(messengerChatStoriesTh.rowTitle);
  });

  test.each(Object.entries(tables))(
    "%s — 여러 표본 인자에서 자리표시자(이름 · 글)가 빠지지 않고 빈 글이 없다(감사)",
    (_language, table) => {
      expect(placeholderProblems(table, messengerChatStoriesEn)).toEqual({
        missing: [],
        empty: [],
      });
    },
  );
});
