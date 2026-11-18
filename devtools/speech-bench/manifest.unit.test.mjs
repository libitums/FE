// 매니페스트 검증 · 층화 표본의 결정성 · AI Hub 변환 뼈대 · WAV 머리 읽기.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { convertFolder, getPath, pick, toScore, toType } from "./aihub.mjs";
import { hasFfmpeg, isWav16kMono, prepareAudio, wavInfo } from "./audio.mjs";
import { makeWav } from "./fixtures.mjs";
import {
  countBy,
  loadManifest,
  parseManifest,
  seededRandom,
  stratifiedSample,
  validateEntry,
} from "./manifest.mjs";

const good = {
  id: "a1",
  audio: "a1.wav",
  type: "read",
  referenceText: "안녕하세요",
  human: { pronunciation: 3 },
  speaker: { l1: "vi" },
};

test("매니페스트 검증: 통과와 각 오류", () => {
  assert.deepEqual(validateEntry(good), []);
  assert.deepEqual(validateEntry({ id: "f", audio: "f.wav", type: "free" }), []);
  assert.match(validateEntry({ ...good, referenceText: "" }).join(), /referenceText/);
  assert.match(validateEntry({ ...good, type: "talk" }).join(), /type/);
  assert.match(validateEntry({ ...good, human: { pronunciation: 7 } }).join(), /1~5/);
  assert.match(validateEntry({ ...good, human: { accent: 3 } }).join(), /모르는 칸/);
  assert.match(validateEntry({ ...good, durationSec: -1 }).join(), /양수/);
  assert.match(validateEntry({ ...good, id: "" }).join(), /id/);
  assert.match(validateEntry([]).join(), /객체/);
});

test("매니페스트 파싱: JSON 오류 · id 중복을 줄 번호와 함께", () => {
  const text = [JSON.stringify(good), "{깨짐", "", JSON.stringify(good)].join("\n");
  const { entries, errors } = parseManifest(text);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    errors.map((e) => [e.line, e.message]),
    [
      [2, "JSON이 아닙니다"],
      [4, "id가 겹칩니다"],
    ],
  );
});

test("loadManifest: 상대 오디오 경로를 매니페스트 폴더 기준으로, 오류면 던짐", () => {
  const dir = mkdtempSync(join(tmpdir(), "speech-bench-"));
  writeFileSync(join(dir, "m.jsonl"), JSON.stringify(good) + "\n");
  assert.equal(loadManifest(join(dir, "m.jsonl"))[0].audio, join(dir, "a1.wav"));
  writeFileSync(join(dir, "bad.jsonl"), JSON.stringify({ ...good, type: "x" }) + "\n");
  assert.throws(() => loadManifest(join(dir, "bad.jsonl")), /매니페스트 오류 1건/);
});

function population() {
  const out = [];
  const plan = [
    ["vi", "초급", "read", 20],
    ["vi", "초급", "free", 20],
    ["zh", "중급", "read", 3],
    ["en", "고급", "read", 10],
  ];
  for (const [l1, proficiency, type, count] of plan) {
    for (let i = 0; i < count; i += 1) {
      out.push({
        id: `${l1}-${type}-${i}`,
        audio: "x.wav",
        type,
        referenceText: "가",
        speaker: { l1, proficiency },
      });
    }
  }
  return out;
}

test("표본 추출: 같은 시드면 같은 결과, 다른 시드면 다름", () => {
  const pop = population();
  const a = stratifiedSample(pop, { n: 16, seed: 7 }).map((e) => e.id);
  const b = stratifiedSample(pop, { n: 16, seed: 7 }).map((e) => e.id);
  const c = stratifiedSample(pop, { n: 16, seed: 8 }).map((e) => e.id);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(new Set(a).size, 16);
  // 시드 난수열 자체도 고정입니다.
  const r = seededRandom(1);
  assert.deepEqual(
    [r(), r()].map((x) => x.toFixed(6)),
    (() => {
      const s = seededRandom(1);
      return [s(), s()].map((x) => x.toFixed(6));
    })(),
  );
});

test("표본 추출: 층마다 고르게, 작은 층이 모자라면 남는 몫을 다른 층에", () => {
  // 층 4개(20 · 20 · 3 · 10), n=16 → 균등 4씩이지만 zh는 3뿐 → 남는 1이 다른 층으로
  const picked = stratifiedSample(population(), { n: 16, seed: 1 });
  const byL1 = countBy(picked, "l1");
  assert.equal(byL1.zh, 3);
  assert.equal(picked.length, 16);
  const byType = countBy(
    picked.filter((e) => e.speaker.l1 === "vi"),
    "type",
  );
  assert.ok(Math.abs(byType.read - byType.free) <= 1);
  // n이 전체 이상이면 전부
  assert.equal(stratifiedSample(population(), { n: 999 }).length, 53);
});

test("AI Hub 도우미: 경로 · 후보 · 점수 평균 · 유형", () => {
  assert.equal(getPath({ a: { b: [{ c: 3 }] } }, "a.b.0.c"), 3);
  assert.equal(pick({ x: "", y: "값" }, ["x", "y"]), "값");
  assert.equal(toScore("4"), 4);
  assert.equal(toScore([3, 4, { score: 5 }]), 4); // 채점자 셋의 평균
  assert.equal(toScore("없음"), undefined);
  assert.equal(toType("낭독", { read: ["낭독"], free: ["자유"] }), "read");
});

test("AI Hub 변환: 매핑으로 칸을 읽고, 오디오 없는 라벨은 문제로", () => {
  const root = mkdtempSync(join(tmpdir(), "speech-bench-aihub-"));
  mkdirSync(join(root, "labels", "sub"), { recursive: true });
  mkdirSync(join(root, "audio"));
  writeFileSync(join(root, "audio", "S1_001.wav"), makeWav({ seconds: 2 }));
  writeFileSync(
    join(root, "labels", "sub", "S1_001.json"),
    JSON.stringify({
      fileName: "S1_001.wav",
      script: "사과를 먹어요",
      transcription: "사가를 머거요",
      evaluation: { pronunciation: [3, 4], fluency: "4" },
      speaker: { id: "S1", nativeLanguage: "vi", level: "초급" },
      utteranceType: "낭독",
    }),
  );
  writeFileSync(
    join(root, "labels", "S2_001.json"),
    JSON.stringify({ fileName: "S2_001.wav", speaker: { id: "S2" } }),
  );
  // 기본 매핑 파일을 그대로 씁니다 — 추정 칸 이름이 이 모양을 읽는지까지 확인합니다.
  const mapping = JSON.parse(
    readFileSync(new URL("./aihub-mapping.default.json", import.meta.url), "utf8"),
  );
  const { entries, problems, stats } = convertFolder({
    labelsDir: join(root, "labels"),
    audioDir: join(root, "audio"),
    mapping,
  });
  assert.equal(stats.labels, 2);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    id: "S1_001",
    audio: join(root, "audio", "S1_001.wav"),
    type: "read",
    referenceText: "사과를 먹어요",
    transcript: "사가를 머거요",
    human: { pronunciation: 3.5, fluency: 4 },
    speaker: { id: "S1", l1: "vi", proficiency: "초급" },
    durationSec: 2,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /오디오 파일이 없습니다/);
});

test("WAV 머리: 16kHz mono PCM 판별과 길이", () => {
  const info = wavInfo(makeWav({ seconds: 1.5 }));
  assert.equal(info.durationSec, 1.5);
  assert.ok(isWav16kMono(info));
  assert.ok(!isWav16kMono(wavInfo(makeWav({ sampleRate: 44100 }))));
  assert.ok(!isWav16kMono(wavInfo(makeWav({ channels: 2 }))));
  assert.equal(wavInfo(Buffer.from("ID3 not a wav")), null);
});

test("오디오 준비: 맞는 WAV는 그대로, 아니면 ffmpeg 변환 · 없으면 기록만", () => {
  const cacheDir = join(mkdtempSync(join(tmpdir(), "speech-bench-audio-")), "cache");
  const wav = makeWav();
  const ok = prepareAudio("/x/a.wav", { cacheDir, id: "a", ffmpeg: true, read: () => wav });
  assert.deepEqual([ok.wav16k, ok.note], [true, null]);

  const none = prepareAudio("/x/b.mp3", {
    cacheDir,
    id: "b",
    ffmpeg: false,
    read: () => Buffer.from("ID3"),
  });
  assert.deepEqual([none.wav16k, none.ext], [false, ".mp3"]);
  assert.match(none.note, /ffmpeg가 없어/);

  const calls = [];
  const spawn = (cmd, args) => {
    calls.push([cmd, ...args]);
    writeFileSync(args.at(-1), wav);
    return { status: 0 };
  };
  const read = (p) => (p.endsWith(".mp3") ? Buffer.from("ID3") : readFileSync(p));
  const converted = prepareAudio("/x/c.mp3", { cacheDir, id: "c", ffmpeg: true, spawn, read });
  assert.equal(converted.wav16k, true);
  assert.match(converted.note, /ffmpeg로/);
  assert.equal(calls[0][0], "ffmpeg");
  assert.ok(calls[0].includes("16000") && calls[0].includes("pcm_s16le"));
  // 두 번째는 캐시에서 — 다시 변환하지 않습니다.
  assert.match(
    prepareAudio("/x/c.mp3", { cacheDir, id: "c", ffmpeg: true, spawn, read }).note,
    /캐시/,
  );
  assert.equal(calls.length, 1);
  assert.equal(
    hasFfmpeg(() => ({ status: 1 })),
    false,
  );
  assert.equal(
    hasFfmpeg(() => {
      throw new Error("ENOENT");
    }),
    false,
  );
});
