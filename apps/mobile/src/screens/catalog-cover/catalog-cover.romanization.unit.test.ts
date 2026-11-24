import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import type { CatalogCutView } from "./catalog-cover.contract";
import { catalogCutAccessibilityLabel, catalogCutLinesOf } from "./catalog-cover";

// `unit` 계층(ADR-0188 D2): 로마자 스위치에 따른 컷 대사 아래 줄 · 토글 · 낭독만 봅니다.

const both = { ko: "어서 오세요.", en: "Welcome.", roman: "eoseo oseyo." };

describe("catalogCutLinesOf", () => {
  test("CC-R1. 끔이면 이 변경 전과 같다 — 고른 글 한 줄 · 둘 다 있으면 토글", () => {
    expect(catalogCutLinesOf(both, "en", "hidden")).toEqual({
      romanization: null,
      translation: "Welcome.",
      toggle: true,
    });
    expect(catalogCutLinesOf(both, "roman", "hidden")).toEqual({
      romanization: null,
      translation: "eoseo oseyo.",
      toggle: true,
    });
    expect(catalogCutLinesOf({ ko: "네?", en: null, roman: "ne?" }, "en", "hidden")).toEqual({
      romanization: null,
      translation: "ne?",
      toggle: false,
    });
  });

  test("CC-R2. 켬이면 로마자 줄과 영어 줄이 함께 서고 토글은 없다 — 고른 글(script)과 상관없다", () => {
    const expected = { romanization: "eoseo oseyo.", translation: "Welcome.", toggle: false };
    expect(catalogCutLinesOf(both, "en", "shown")).toEqual(expected);
    expect(catalogCutLinesOf(both, "roman", "shown")).toEqual(expected);
  });

  test("CC-R3. 켬 · 콘텐츠 로마자가 없으면 한글을 변환하고, 영어가 없으면 영어 줄은 없다", () => {
    expect(catalogCutLinesOf({ ko: "(같이 가요)", en: null, roman: null }, "en", "shown")).toEqual({
      romanization: "(gachi gayo)",
      translation: null,
      toggle: false,
    });
  });
});

describe("catalogCutAccessibilityLabel — 로마자 켬", () => {
  const clerkView: CatalogCutView = {
    kind: "line",
    voice: "speech",
    index: 0,
    speaker: { kind: "named", name: "점원" },
    text: both,
    aside: null,
    imageUrl: null,
  };

  test("CC-R4. 켬이면 한글 · Pronunciation 로마자 · 영어 순서이고 토글 안내가 없다", () => {
    expect(catalogCutAccessibilityLabel(clerkView, "en", uiCopyEn, "shown")).toBe(
      "점원: 어서 오세요., Pronunciation: eoseo oseyo., Welcome.",
    );
  });

  test("CC-R5. 끔(기본)이면 이 변경 전 낭독 그대로다", () => {
    expect(catalogCutAccessibilityLabel(clerkView, "en", uiCopyEn)).toBe(
      "점원: 어서 오세요. Welcome., Show romanization",
    );
    expect(catalogCutAccessibilityLabel(clerkView, "en", uiCopyEn, "hidden")).toBe(
      "점원: 어서 오세요. Welcome., Show romanization",
    );
  });
});
