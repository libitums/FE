// 시험 세트의 공통 형식(매니페스트)입니다. JSONL 한 줄에 발화 하나.
//
// {
//   "id": "aihub-000123",                 // 필수, 세트 안에서 유일
//   "audio": "/abs/path/or/relative.wav", // 필수. 상대 경로는 매니페스트 파일이 있는 폴더 기준
//   "type": "read" | "free",              // 필수. 낭독 / 자유 발화
//   "referenceText": "읽어야 했던 문장",   // 낭독이면 필수
//   "transcript": "사람이 받아 적은 글",    // 있으면(실제로 한 말)
//   "human": { "pronunciation": 3.5, "fluency": 4, "comprehensibility": 4 }, // 있으면, 1~5
//   "speaker": { "id": "S0012", "l1": "vi", "proficiency": "중급" },
//   "durationSec": 4.2                    // 있으면
// }

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export const HUMAN_KEYS = ["pronunciation", "fluency", "comprehensibility"];
export const TYPES = ["read", "free"];

const isText = (v) => typeof v === "string" && v.trim() !== "";
const optText = (v) => v === undefined || v === null || typeof v === "string";

/** 한 줄을 검사해 오류 문장 배열을 돌려줍니다(비면 통과). */
export function validateEntry(entry) {
  const errors = [];
  if (entry === null || typeof entry !== "object" || Array.isArray(entry))
    return ["객체가 아닙니다"];
  if (!isText(entry.id)) errors.push("id가 비었습니다");
  if (!isText(entry.audio)) errors.push("audio가 비었습니다");
  if (!TYPES.includes(entry.type)) errors.push(`type은 ${TYPES.join(" · ")} 중 하나여야 합니다`);
  if (entry.type === "read" && !isText(entry.referenceText))
    errors.push("낭독(read)인데 referenceText가 없습니다");
  if (!optText(entry.referenceText)) errors.push("referenceText는 글이어야 합니다");
  if (!optText(entry.transcript)) errors.push("transcript는 글이어야 합니다");
  if (entry.human !== undefined && entry.human !== null) {
    if (typeof entry.human !== "object") errors.push("human은 객체여야 합니다");
    else {
      for (const [key, value] of Object.entries(entry.human)) {
        if (!HUMAN_KEYS.includes(key)) errors.push(`human.${key}는 모르는 칸입니다`);
        else if (value !== null && !(Number.isFinite(value) && value >= 1 && value <= 5)) {
          errors.push(`human.${key}는 1~5의 수여야 합니다`);
        }
      }
    }
  }
  if (
    entry.speaker !== undefined &&
    (entry.speaker === null || typeof entry.speaker !== "object")
  ) {
    errors.push("speaker는 객체여야 합니다");
  } else if (entry.speaker) {
    for (const key of ["id", "l1", "proficiency"]) {
      if (!optText(entry.speaker[key])) errors.push(`speaker.${key}는 글이어야 합니다`);
    }
  }
  if (entry.durationSec !== undefined && entry.durationSec !== null) {
    if (!(Number.isFinite(entry.durationSec) && entry.durationSec > 0))
      errors.push("durationSec는 양수여야 합니다");
  }
  return errors;
}

/** JSONL 글 전체를 검사합니다. { entries, errors: [{ line, id, message }] } */
export function parseManifest(text) {
  const entries = [];
  const errors = [];
  const seen = new Set();
  text.split("\n").forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === "") return;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      errors.push({ line, id: null, message: "JSON이 아닙니다" });
      return;
    }
    for (const message of validateEntry(entry))
      errors.push({ line, id: entry?.id ?? null, message });
    if (isText(entry?.id)) {
      if (seen.has(entry.id)) errors.push({ line, id: entry.id, message: "id가 겹칩니다" });
      seen.add(entry.id);
    }
    entries.push(entry);
  });
  return { entries, errors };
}

/** 파일을 읽고 검사합니다. 오류가 있으면 던집니다. audio는 절대 경로로 바꿔 둡니다. */
export function loadManifest(path) {
  const { entries, errors } = parseManifest(readFileSync(path, "utf8"));
  if (errors.length > 0) {
    const head = errors
      .slice(0, 10)
      .map((e) => `  ${e.line}행${e.id ? ` (${e.id})` : ""}: ${e.message}`);
    throw new Error(`매니페스트 오류 ${errors.length}건:\n${head.join("\n")}`);
  }
  const base = dirname(resolve(path));
  return entries.map((e) => ({
    ...e,
    audio: isAbsolute(e.audio) ? e.audio : resolve(base, e.audio),
  }));
}

export function writeManifest(path, entries) {
  writeFileSync(
    path,
    entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""),
  );
}

/** 시드 고정 난수(mulberry32). 같은 시드면 어디서 돌려도 같은 수열입니다. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEY_OF = {
  l1: (e) => e.speaker?.l1 ?? "(모름)",
  proficiency: (e) => e.speaker?.proficiency ?? "(모름)",
  type: (e) => e.type,
  speaker: (e) => e.speaker?.id ?? "(모름)",
};

/**
 * 층화 표본 추출입니다. `by`의 칸 조합(예: 모국어 × 숙련도 × 유형)마다 되도록 같은 수를
 * 뽑고, 작은 층이 모자라면 남는 몫을 큰 층에 나눕니다. 층 안에서는 시드로 섞어 앞에서 자릅니다.
 * 결과 순서는 원래 매니페스트 순서입니다(같은 입력 · 시드면 같은 결과).
 */
export function stratifiedSample(entries, { n, seed = 1, by = ["l1", "proficiency", "type"] }) {
  if (n >= entries.length) return [...entries];
  const strata = new Map();
  entries.forEach((entry, index) => {
    const key = by.map((k) => (KEY_OF[k] ?? ((e) => String(e[k] ?? "(모름)")))(entry)).join("|");
    if (!strata.has(key)) strata.set(key, []);
    strata.get(key).push(index);
  });
  const random = seededRandom(seed);
  const keys = [...strata.keys()].sort();
  for (const key of keys) {
    const list = strata.get(key);
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  // 한 바퀴에 층마다 하나씩 — 균등 배분에 남는 몫을 자연스럽게 큰 층으로 넘깁니다.
  const picked = [];
  const cursor = new Map(keys.map((k) => [k, 0]));
  while (picked.length < n) {
    let progressed = false;
    for (const key of keys) {
      if (picked.length >= n) break;
      const at = cursor.get(key);
      const list = strata.get(key);
      if (at < list.length) {
        picked.push(list[at]);
        cursor.set(key, at + 1);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return picked.sort((a, b) => a - b).map((i) => entries[i]);
}

/** 칸별 개수(보고서 · 표본 확인용). */
export function countBy(entries, key) {
  const out = {};
  for (const e of entries) {
    const k = (KEY_OF[key] ?? ((x) => String(x[key] ?? "(모름)")))(e);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
