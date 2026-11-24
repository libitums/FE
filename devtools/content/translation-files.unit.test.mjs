// `unit` 계층(TF-U1 ~ U6, ADR-0185 개정): 스테이징 에피소드(delivery-2)의 `translations.<언어>` → 운영 번역 파일(translation-1)과
// 매니페스트 항목을 만드는 변환과, 만든 파일의 점검(ja 대비 키 · 자리표시자 · 간체)을 본다.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  alignedEntries,
  checkTranslationEntries,
  translationFileText,
  translationRef,
  withTranslationRefs,
} from "./translation-files.mjs";

const staging = {
  schema: "delivery-2",
  unit_id: "u01-water",
  translations: {
    ja: { "Buying Water": "水を買う", "I'm {이름}.": "{이름}です。" },
    "zh-TW": { "Buying Water": "買水", "I'm {이름}.": "我是{이름}。" },
  },
};

test("TF-U1. 번역 파일은 {schema, episode, language, entries} · 들여쓰기 2 · 비ASCII 그대로 · 끝 줄바꿈이다(다른 언어 운영 파일과 같은 모양)", () => {
  const text = translationFileText(staging, "zh-TW");
  assert.equal(
    text,
    '{\n  "schema": "translation-1",\n  "episode": "u01-water",\n  "language": "zh-TW",\n  "entries": {\n    "Buying Water": "買水",\n    "I\'m {이름}.": "我是{이름}。"\n  }\n}\n',
  );
});

test("TF-U2. 그 언어 번역이 없거나 비면 던진다", () => {
  assert.throws(() => translationFileText(staging, "fr"), /fr/);
  assert.throws(
    () => translationFileText({ ...staging, translations: { "zh-TW": {} } }, "zh-TW"),
    /zh-TW/,
  );
});

test("TF-U3. 매니페스트 항목은 url · version · sha256 · bytes(UTF-8)다", () => {
  const text = translationFileText(staging, "zh-TW");
  const ref = translationRef(text, "translations/level-5/zh-TW/u01-water.json", "2026-11-18.1");
  assert.deepEqual(ref, {
    url: "translations/level-5/zh-TW/u01-water.json",
    version: "2026-11-18.1",
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    bytes: Buffer.byteLength(text, "utf8"),
  });
});

test("TF-U4. 매니페스트에 그 언어 항목을 더하되 다른 언어 · 다른 칸은 그대로 두고, 같은 언어는 바꾼다", () => {
  const manifest = {
    schema: "manifest-1",
    episodes: [
      { id: "u01-water", version: "v1", translations: { ja: { url: "a" } } },
      { id: "u02-checkin", version: "v2" },
    ],
  };
  const next = withTranslationRefs(manifest, "zh-TW", {
    "u01-water": { url: "z1" },
    "u02-checkin": { url: "z2" },
  });
  assert.deepEqual(next.episodes[0].translations, { ja: { url: "a" }, "zh-TW": { url: "z1" } });
  assert.deepEqual(next.episodes[1].translations, { "zh-TW": { url: "z2" } });
  assert.equal(next.episodes[0].version, "v1");
  assert.deepEqual(manifest.episodes[1].translations, undefined, "입력을 바꾸지 않는다");
});

test("TF-U7. 기준(운영 본문의 ja)에만 있는 키는 자리표시자 이름만 다른 스테이징 키의 번역으로 채우고, 이름을 기준 쪽으로 바꾼다", () => {
  const { entries, aligned, missing } = alignedEntries(
    { "I will do it using {means}.": "我會用{means}。", Card: "卡片" },
    { "I will do it using {수단}.": "{수단}で支払います。", Card: "カード", Aside: "一歩" },
  );
  assert.deepEqual(entries, {
    "I will do it using {means}.": "我會用{means}。",
    Card: "卡片",
    "I will do it using {수단}.": "我會用{수단}。",
  });
  assert.deepEqual(aligned, ["I will do it using {수단}. ← I will do it using {means}."]);
  assert.deepEqual(missing, ["Aside"]);
});

test("TF-U5.점검: 기준(ja)에 있는 키가 빠지거나, 자리표시자를 잃거나, 비면 문제로 낸다", () => {
  const problems = checkTranslationEntries(
    { "Buying Water": "", "I'm {이름}.": "我是。" },
    { "Buying Water": "水を買う", "I'm {이름}.": "{이름}です。", Card: "カード" },
  );
  assert.deepEqual(problems, [
    "빈 번역: Buying Water",
    "자리표시자 {이름} 잃음: I'm {이름}.",
    "기준에 있으나 없음: Card",
  ]);
});

test("TF-U6. 점검: 대만 번체가 아닌 글자(간체 · 가나)를 문제로 낸다 — 앱 문구표와 같은 목록", () => {
  const problems = checkTranslationEntries(
    { A: "设置", B: "設定する" },
    { A: "x", B: "y" },
    {
      traditional: true,
    },
  );
  assert.deepEqual(problems, ["간체 设: A", "가나 す: B", "가나 る: B"]);
});
