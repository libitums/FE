// 스테이징 에피소드의 번역 → 운영 번역 파일 · 매니페스트 항목(ADR-0185 개정, ADR-0102 D2 · ADR-0158 「적용」과 같은 모양). 순수 함수뿐입니다.
//
// 운영 파일 모양: `{schema: "translation-1", episode, language, entries}`, `JSON.stringify(_, null, 2)` + 끝 줄바꿈(비ASCII 그대로) — 스테이징이
// 바뀌지 않은 편에서 운영 th 파일과 바이트가 같다(u00 · u03, 2026-11-24 확인). 운영 ja는 손본 값이 있어 모양만 같다. 간체 · 가나 목록은 앱 문구표 점검과 같은 출처를 쓴다.

import { createHash } from "node:crypto";

import { kanaIn, simplifiedOnlyIn } from "../../apps/mobile/src/lib/ui-copy-zh-tw.test-support.ts";

/** 스테이징 에피소드(delivery-2) 하나의 그 언어 번역 파일 글. 번역이 없거나 비면 던진다. */
export function translationFileText(episode, language) {
  const entries = episode?.translations?.[language];
  if (entries === null || typeof entries !== "object" || Object.keys(entries).length === 0) {
    throw new Error(`${episode?.unit_id ?? "?"}: ${language} 번역이 없습니다`);
  }
  const file = { schema: "translation-1", episode: episode.unit_id, language, entries };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** 매니페스트의 `translations.<언어>` 항목 — 앱이 sha256 · bytes로 받은 파일을 확인한다. */
export function translationRef(text, url, version) {
  return {
    url,
    version,
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    bytes: Buffer.byteLength(text, "utf8"),
  };
}

/** 매니페스트 사본에 그 언어 항목을 넣는다(편 id → 항목). 다른 칸 · 다른 언어는 그대로, 입력은 바꾸지 않는다. */
export function withTranslationRefs(manifest, language, refsById) {
  return {
    ...manifest,
    episodes: manifest.episodes.map((episode) => {
      const ref = refsById[episode.id];
      if (ref === undefined) return episode;
      return { ...episode, translations: { ...episode.translations, [language]: ref } };
    }),
  };
}

const placeholdersOf = (text) => text.match(/\{[^}]+\}/g) ?? [];

const shapeOf = (key) => key.replace(/\{[^}]+\}/g, "{}");

/**
 * 운영 본문에 맞춘다 — 기준 표(같은 편의 운영 ja)에만 있는 키를, 자리표시자 이름만 다른 스테이징 키(2026-11-20판이 `{수단}` → `{means}`처럼
 * 이름을 바꿈)의 번역으로 채우고 값의 자리표시자를 기준 키의 이름으로 차례대로 바꾼다. 스테이징 키는 그대로 남긴다(다음 본문판용).
 * 맞출 키가 없으면 `missing` — 앱은 그 줄을 영어로 둔다.
 */
export function alignedEntries(entries, reference) {
  // 모양이 같은 후보가 둘 이상이면 고르지 않는다(`{N}` · `{명사}`처럼 실제로 있다) — 영어로 남기는 편이 엉뚱한 번역보다 낫다.
  const byShape = new Map();
  for (const key of Object.keys(entries)) {
    const shape = shapeOf(key);
    byShape.set(shape, byShape.has(shape) ? null : key);
  }
  const out = { ...entries };
  const aligned = [];
  const missing = [];
  for (const key of Object.keys(reference)) {
    if (key in entries) continue;
    const source = byShape.get(shapeOf(key));
    if (source === undefined || source === null || placeholdersOf(source).length === 0) {
      missing.push(key);
      continue;
    }
    // 이름 바꾸기는 한 번에 — 차례대로 바꾸면 이름이 엇갈린 경우(`{a}…{b}` → `{b}…{a}`) 섞인다.
    const to = placeholdersOf(key);
    const rename = new Map(
      placeholdersOf(source).map((token, index) => [token, to[index] ?? token]),
    );
    out[key] = entries[source].replace(/\{[^}]+\}/g, (token) => rename.get(token) ?? token);
    aligned.push(`${key} ← ${source}`);
  }
  return { entries: out, aligned, missing };
}

/**
 * 번역 표 점검 — 빈 번역, 영어 키의 자리표시자(`{이름}` 등)를 잃은 값, 기준 표(같은 편 ja)에 있는데 빠진 키.
 * `traditional`이면 대만 번체가 아닌 글자(간체 전용 · 가나)도 낸다.
 */
export function checkTranslationEntries(entries, reference, options = {}) {
  const problems = [];
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== "string" || value.trim() === "") {
      problems.push(`빈 번역: ${key}`);
      continue;
    }
    for (const token of placeholdersOf(key)) {
      if (!value.includes(token)) problems.push(`자리표시자 ${token} 잃음: ${key}`);
    }
    for (const token of placeholdersOf(value)) {
      if (!key.includes(token)) problems.push(`키에 없는 자리표시자 ${token}: ${key}`);
    }
  }
  for (const key of Object.keys(reference)) {
    if (!(key in entries)) problems.push(`기준에 있으나 없음: ${key}`);
  }
  if (options.traditional) {
    for (const [key, value] of Object.entries(entries)) {
      for (const ch of simplifiedOnlyIn(String(value))) problems.push(`간체 ${ch}: ${key}`);
      for (const ch of kanaIn(String(value))) problems.push(`가나 ${ch}: ${key}`);
    }
  }
  return problems;
}
