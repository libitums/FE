import { expect, test } from "vitest";

import { uiCopyCatalog } from "./ui-copy";
import { roleplayMissionEn } from "./ui-copy-roleplay-mission";
import { roleplayMissionListCopy } from "./ui-copy-roleplay-mission-list";
import { missionCopyFor, roleplayMissionCopyTables } from "./ui-copy-roleplay-mission-tables";

// `unit` 계층(RMC-U1 ~): 미션 화면 문구 표(문구표 밖, 가지치기 대상) — 언어마다 영어와 같은 모양 · 빈 글 없음, 화면 언어로 고름,
// 문구표에는 목록 카드 몫만.

type Leaf = { readonly path: string; readonly value: unknown };

function leaves(value: unknown, path = ""): Leaf[] {
  if (typeof value === "object" && value !== null)
    return Object.entries(value).flatMap(([key, child]) => leaves(child, `${path}.${key}`));
  return [{ path, value }];
}

const sample = (value: unknown): unknown =>
  typeof value === "function" ? (value as (...args: unknown[]) => unknown)(2, 3, true) : value;

test("RMC-U1 모든 언어의 미션 문구가 영어와 같은 칸이고, 글이 비지 않았다", () => {
  const english = leaves(roleplayMissionEn).map((leaf) => leaf.path);
  for (const [language, table] of Object.entries(roleplayMissionCopyTables)) {
    const mine = leaves(table);
    expect(
      mine.map((leaf) => leaf.path),
      language,
    ).toEqual(english);
    for (const leaf of mine) {
      const value = sample(leaf.value);
      expect(typeof value, `${language}${leaf.path}`).toBe("string");
      expect(String(value).trim().length, `${language}${leaf.path}`).toBeGreaterThan(0);
    }
  }
});

test("RMC-U2 화면 언어로 고르고, 모르는 언어는 영어 — 대만 중국어도 있다", () => {
  expect(missionCopyFor("zh-TW").extra.success.title).toBe("任務成功！");
  expect(missionCopyFor("ja")).toBe(roleplayMissionCopyTables.ja);
  expect(missionCopyFor("xx")).toBe(roleplayMissionEn);
});

test("RMC-U3 문구표(UiCopy)의 미션 칸은 목록 카드 몫뿐이고, 화면 문구는 그 몫을 그대로 잇는다", () => {
  for (const [language, copy] of Object.entries(uiCopyCatalog)) {
    const list = copy?.roleplayMission;
    if (list === undefined) throw new Error(language);
    expect(Object.keys(list).sort(), language).toEqual(
      ["best", "form", "goalCount", "reportReady"].sort(),
    );
    expect(missionCopyFor(language).form).toBe(list.form);
  }
  expect(roleplayMissionListCopy.en.reportReady.ready).toBe("Report ready");
});
