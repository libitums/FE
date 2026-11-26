// `unit` 계층(PL-U1 ~ U3, ADR-0185 언어 검증): 콘솔(segments.mjs · story.mjs · copy.mjs)과 자동 캠페인 서버(push-campaign-locale.ts)가
// 같은 나라 → 언어 표를 쓰고, 콘솔 기본 문구가 콘솔 언어 목록을 빠짐없이 채운다. 대만 · 홍콩 · 마카오 → zh-TW.

import assert from "node:assert/strict";
import test from "node:test";

import {
  copyLanguageFor,
  storyLanguageFor as serverStoryLanguageFor,
} from "../../apps/supabase-functions/supabase/functions/_shared/push-campaign-locale.ts";
import { DEFAULT_COPY, DEFAULT_COPY_B } from "./copy.mjs";
import { LANGUAGES, languageFor, renderCopy } from "./segments.mjs";
import { STORY_LANGUAGES, storyLanguageFor } from "./story.mjs";

const COUNTRIES = [
  "US",
  "VN",
  "ID",
  "MY",
  "JP",
  "TH",
  "MM",
  "MX",
  "ES",
  "TW",
  "HK",
  "MO",
  "CN",
  "SG",
  "KR",
  "",
  null,
];

test("PL-U1. 콘솔과 서버의 나라 → 문구 언어 · 예고 언어 표가 같다", () => {
  for (const country of COUNTRIES) {
    assert.equal(languageFor(country), copyLanguageFor(country), String(country));
    assert.equal(storyLanguageFor(country), serverStoryLanguageFor(country), String(country));
  }
  for (const country of ["TW", "HK", "MO"]) {
    assert.equal(languageFor(country), "zh-TW", country);
    assert.equal(storyLanguageFor(country), "zh-TW", country);
  }
});

test("PL-U2. 언어 목록에 zh-TW가 있고, 나라 표가 내는 언어는 모두 목록 안이다", () => {
  assert.ok(LANGUAGES.includes("zh-TW"));
  assert.ok(STORY_LANGUAGES.includes("zh-TW"));
  for (const country of COUNTRIES) {
    assert.ok(LANGUAGES.includes(languageFor(country)), String(country));
    assert.ok(STORY_LANGUAGES.includes(storyLanguageFor(country)), String(country));
  }
});

test("PL-U3. 콘솔 기본 문구 — 영어 밖 언어가 있는 세그먼트는 zh-TW도 있고 자리표시자가 영어와 같다", () => {
  const holes = (text) => (text.match(/\{[a-z]+\}/g) ?? []).sort().join(",");
  for (const table of [DEFAULT_COPY, DEFAULT_COPY_B]) {
    for (const [segment, copy] of Object.entries(table)) {
      if (Object.keys(copy).length === 1) continue;
      const zh = copy["zh-TW"];
      assert.ok(zh, `${segment}: zh-TW가 없습니다`);
      assert.match(zh.body, /[一-鿿]/u, segment);
      assert.equal(holes(zh.title), holes(copy.en.title), `${segment} title`);
      assert.equal(holes(zh.body), holes(copy.en.body), `${segment} body`);
    }
  }
});

test("PL-U4. 이름 없는 학습자에게도 콘솔 기본 문구가 쉼표(, ， 、)로 시작하지 않는다", () => {
  const vars = {
    name: "",
    episode: "Buying Water",
    character: "미나",
    streak: 3,
    steps: 2,
    store: "App Store",
  };
  for (const table of [DEFAULT_COPY, DEFAULT_COPY_B]) {
    for (const [segment, copy] of Object.entries(table)) {
      for (const [language, entry] of Object.entries(copy)) {
        for (const text of [renderCopy(entry.title, vars), renderCopy(entry.body, vars)]) {
          assert.doesNotMatch(text, /^[\s,，、]/u, `${segment} ${language}: ${text}`);
          assert.ok(!text.includes("{name}"), `${segment} ${language}`);
        }
      }
    }
  }
});
