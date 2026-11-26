import { describe, expect, test } from "vitest";

import { uiCopyEn } from "../../lib/ui-copy-en";
import { uiCopyVi } from "../../lib/ui-copy-vi";
import type { CatalogCutView } from "./catalog-cover.contract";
import {
  catalogCutAccessibilityLabel,
  catalogCutLinesOf,
  catalogRomanizationSwitchOf,
} from "./catalog-cover";

// `unit` 계층(ADR-0188 D2 · 개정 D7): 로마자 스위치에 따른 컷 대사 아래 줄 · 낭독 · 대사 상자 안 스위치만 봅니다.
// 2026-11-24 개정 — 대사 상자의 숨은 영어 ↔ 로마자 토글이 없어지고, 끔은 「로마자 줄만 빠짐」입니다.

const both = { ko: "어서 오세요.", en: "Welcome.", roman: "eoseo oseyo." };

describe("catalogCutLinesOf", () => {
  test("CC-R1. 끔이면 로마자 줄이 없고 영어 줄은 그대로다(토글 없음)", () => {
    expect(catalogCutLinesOf(both, "hidden")).toEqual({
      romanization: null,
      translation: "Welcome.",
    });
  });

  test("CC-R1b. 끔 · 영어가 없으면 아래 줄이 없다 — 로마자가 번역 자리로 내려오지 않는다", () => {
    expect(catalogCutLinesOf({ ko: "네?", en: null, roman: "ne?" }, "hidden")).toEqual({
      romanization: null,
      translation: null,
    });
  });

  test("CC-R2. 켬이면 로마자 줄과 영어 줄이 함께 선다", () => {
    expect(catalogCutLinesOf(both, "shown")).toEqual({
      romanization: "eoseo oseyo.",
      translation: "Welcome.",
    });
  });

  test("CC-R3. 켬 · 콘텐츠 로마자가 없으면 한글을 변환하고, 영어가 없으면 영어 줄은 없다", () => {
    expect(catalogCutLinesOf({ ko: "(같이 가요)", en: null, roman: null }, "shown")).toEqual({
      romanization: "(gachi gayo)",
      translation: null,
    });
  });
});

describe("catalogCutAccessibilityLabel — 로마자 켬 · 끔", () => {
  const clerkView: CatalogCutView = {
    kind: "line",
    voice: "speech",
    index: 0,
    speaker: { kind: "named", name: "점원" },
    text: both,
    aside: null,
    imageUrl: null,
  };

  test("CC-R4. 켬이면 한글 · Pronunciation 로마자 · 영어 순서다(화면에 선 순서)", () => {
    expect(catalogCutAccessibilityLabel(clerkView, uiCopyEn, "shown")).toBe(
      "점원: 어서 오세요., Pronunciation: eoseo oseyo., Welcome.",
    );
  });

  test("CC-R5. 끔(기본)이면 한글 뒤 영어뿐이고 토글 안내가 없다", () => {
    expect(catalogCutAccessibilityLabel(clerkView, uiCopyEn)).toBe("점원: 어서 오세요. Welcome.");
    expect(catalogCutAccessibilityLabel(clerkView, uiCopyEn, "hidden")).toBe(
      "점원: 어서 오세요. Welcome.",
    );
  });
});

describe("catalogRomanizationSwitchOf", () => {
  test("CC-R6. 스위치 글자는 설정 토글 제목과 같고, 켬 여부 · 상태 말이 표시값을 따른다", () => {
    expect(catalogRomanizationSwitchOf("shown", uiCopyEn)).toEqual({
      label: uiCopyEn.settings.sessionOption["show-choice-romanization"],
      checked: true,
      stateLabel: uiCopyEn.settings.optionState.on,
    });
    expect(catalogRomanizationSwitchOf("hidden", uiCopyEn)).toEqual({
      label: "Romanization",
      checked: false,
      stateLabel: uiCopyEn.settings.optionState.off,
    });
  });

  test("CC-R7. 화면 언어를 따른다(설정과 같은 문구)", () => {
    expect(catalogRomanizationSwitchOf("shown", uiCopyVi).label).toBe(
      uiCopyVi.settings.sessionOption["show-choice-romanization"],
    );
  });
});
