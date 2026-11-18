// AI Hub 「교육용 한국어 음성 데이터」 라벨(JSON) 폴더 → 매니페스트 변환기의 뼈대입니다.
//
// 라벨의 실제 모양을 아직 모르므로(데이터를 신청해 받아야 합니다) 칸 이름은 전부 매핑 파일
// (`aihub-mapping.default.json`을 복사해 고칩니다)에서 받습니다. 기본 매핑은 추정입니다.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

import { wavDurationOfFile } from "./audio.mjs";
import { HUMAN_KEYS, validateEntry } from "./manifest.mjs";
import { normalize } from "./text.mjs";

/** "a.b.0.c" 경로로 값을 꺼냅니다. */
export function getPath(object, path) {
  let cur = object;
  for (const part of path.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** 후보 경로 중 처음으로 값이 있는 것. */
export function pick(object, candidates) {
  for (const path of [candidates].flat()) {
    const v = getPath(object, path);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/** 점수: 수 · 수 글자 · (채점자 여럿이면) 수 배열의 평균. */
export function toScore(value) {
  if (Array.isArray(value)) {
    const nums = value.map(toScore).filter(Number.isFinite);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
  }
  if (value && typeof value === "object") return toScore(value.score ?? value.value);
  const n = typeof value === "string" ? Number(value.trim()) : value;
  return Number.isFinite(n) ? n : undefined;
}

export function toType(value, typeValues) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  for (const [type, names] of Object.entries(typeValues)) {
    if (names.some((name) => name.toLowerCase() === v)) return type;
  }
  return undefined;
}

/** 라벨 객체 하나 → 매니페스트 줄. audioDir 기준으로 오디오 경로를 맞춥니다. */
export function labelToEntry(label, mapping, { audioDir, labelPath }) {
  const f = mapping.fields;
  const text = (v) => (v === undefined ? undefined : String(v));
  let audio = text(pick(label, f.audio)) ?? basename(labelPath, extname(labelPath));
  if (!extname(audio) && mapping.audioExtension) audio += mapping.audioExtension;
  const audioPath = resolve(audioDir, audio);

  const human = {};
  for (const key of HUMAN_KEYS) {
    const score = toScore(pick(label, f[key]));
    if (score !== undefined) human[key] = score;
  }
  const strip = mapping.transcriptStrip ?? [];
  const transcriptRaw = text(pick(label, f.transcript));
  const entry = {
    id: text(pick(label, f.id))?.replace(/\.[a-z0-9]+$/i, "") ?? basename(labelPath, ".json"),
    audio: audioPath,
    type: toType(pick(label, f.type), mapping.typeValues),
    referenceText: text(pick(label, f.referenceText)),
    transcript:
      transcriptRaw === undefined
        ? undefined
        : normalize(transcriptRaw, { strip }) === ""
          ? undefined
          : transcriptRaw,
    human: Object.keys(human).length ? human : undefined,
    speaker: {
      id: text(pick(label, f.speakerId)),
      l1: text(pick(label, f.l1)),
      proficiency: text(pick(label, f.proficiency)),
    },
    durationSec: toScore(pick(label, f.durationSec)),
  };
  // 유형 칸이 없으면 기준 문장이 있으면 낭독, 없으면 자유로 봅니다(추정 — 보고에 셉니다).
  if (entry.type === undefined) entry.type = entry.referenceText ? "read" : "free";
  if (entry.durationSec === undefined)
    entry.durationSec = wavDurationOfFile(audioPath) ?? undefined;
  return JSON.parse(JSON.stringify(entry));
}

function* jsonFiles(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (name.toLowerCase().endsWith(".json")) yield path;
  }
}

/**
 * 라벨 폴더 전체를 바꿉니다. 돌려주는 것: { entries, problems, stats }.
 * problems는 검증에 걸린 줄(매니페스트에 넣지 않음)과 오디오가 없는 줄입니다.
 */
export function convertFolder({ labelsDir, audioDir, mapping }) {
  const entries = [];
  const problems = [];
  const stats = { files: 0, labels: 0, missingAudio: 0, typeGuessed: 0 };
  for (const path of jsonFiles(labelsDir)) {
    stats.files += 1;
    let json;
    try {
      json = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      problems.push({ file: relative(labelsDir, path), message: "JSON이 아닙니다" });
      continue;
    }
    const labels = mapping.records ? [getPath(json, mapping.records) ?? []].flat() : [json].flat();
    for (const label of labels) {
      stats.labels += 1;
      const entry = labelToEntry(label, mapping, { audioDir, labelPath: path });
      if (pick(label, mapping.fields.type) === undefined) stats.typeGuessed += 1;
      const errors = validateEntry(entry);
      if (!existsSync(entry.audio)) {
        stats.missingAudio += 1;
        errors.push("오디오 파일이 없습니다");
      }
      if (errors.length)
        problems.push({
          file: relative(labelsDir, path),
          id: entry.id,
          message: errors.join("; "),
        });
      else entries.push(entry);
    }
  }
  return { entries, problems, stats };
}
