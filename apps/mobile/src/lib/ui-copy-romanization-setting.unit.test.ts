import { describe, expect, test } from "vitest";

import { entryLanguages } from "./entry-language";
import { uiCopyFor } from "./ui-copy";

// `unit` 계층(ADR-0188 D5): 로마자 스위치가 보기만이 아니라 레슨 문장 · 이야기 대화까지 덮게 되어, 여덟 화면 언어의 토글 제목 ·
// 설명이 「보기의 로마자」를 벗어났는지 봅니다. 옛 문구가 남으면 실패합니다.

const OLD_TITLES = new Set([
  "Romanization on choices",
  "Phiên âm ở các lựa chọn",
  "Romanisasi pada pilihan",
  "Romanización en las opciones",
  "選択肢のローマ字",
  "คำอ่านในตัวเลือก",
  "ရွေးစရာများတွင် အသံထွက်",
  "選項顯示羅馬拼音",
]);

test("RS-U1. 영어 제목 · 설명", () => {
  const settings = uiCopyFor("en").settings;
  expect(settings.sessionOption["show-choice-romanization"]).toBe("Romanization");
  expect(settings.sessionOptionDescription["show-choice-romanization"]).toBe(
    "Show how Korean is read, in small text, in answers, lessons and stories.",
  );
});

describe.each(entryLanguages)("RS-U2 · %s", (language) => {
  test("제목이 옛 「보기의 로마자」가 아니고, 영어 밖 언어는 영어와 다르다", () => {
    const settings = uiCopyFor(language).settings;
    const title = settings.sessionOption["show-choice-romanization"];
    const description = settings.sessionOptionDescription["show-choice-romanization"];
    expect(OLD_TITLES.has(title)).toBe(false);
    expect(title.trim()).not.toBe("");
    expect(description.trim()).not.toBe("");
    if (language !== "en") {
      expect(title).not.toBe("Romanization");
      expect(description).not.toBe(
        uiCopyFor("en").settings.sessionOptionDescription["show-choice-romanization"],
      );
    }
  });
});
