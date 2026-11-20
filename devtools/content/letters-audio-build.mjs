// 글자 소리 41개(ADR-0172)를 버킷 형식(m4a AAC · 모노 · 44.1 kHz · 앞뒤 무음 0.2 s 이내)으로 만들고 길이 · sha256 목록을 씁니다.
// 버킷에는 쓰지 않습니다 — 올리기는 letters-audio-upload.sh(사람이 실행).
//
//   node devtools/content/letters-audio-build.mjs --engine clips --from <받은 녹음 폴더> --out <출력 폴더>
//   ELEVENLABS_API_KEY=… ELEVENLABS_VOICE_ID=… node devtools/content/letters-audio-build.mjs --engine elevenlabs --out <출력 폴더>
//   node devtools/content/letters-audio-build.mjs --engine say --voice Yuna --out <출력 폴더>   # 기기 확인용 — 올리지 않습니다
//
// - 목록은 앱의 `LETTER_SOUND_SYLLABLES`(apps/mobile/src/lib/letters/jamo.ts) 하나입니다. 낭독 글자는 음절 그대로(가 · 아 …)입니다.
// - clips: `<from>/<로마자>.{wav,mp3,m4a,aiff}`(예: ga.mp3 · neo.wav) — 녹음 · 웹에서 내려받은 TTS를 이 이름으로 둡니다.
// - elevenlabs: 이미 있는 계정 키를 환경 변수로만 받습니다(출력하지 않음). 모델은 ELEVENLABS_MODEL_ID(기본 eleven_multilingual_v2).
// - 출력: `<out>/audio/letters/<로마자>.m4a` · `<out>/letters-audio-timings.json`(음성 정보 파일에 더할 항목) ·
//   `<out>/files.json`(경로 · 바이트 · sha256 · 길이) · `<out>/SHA256SUMS` · `<out>/SOURCE.txt`(만든 방법).
// - 필요한 도구: ffmpeg · ffprobe(say 엔진은 macOS `say`).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { LETTER_SOUND_SYLLABLES, letterAudioIdOf } from "../../apps/mobile/src/lib/letters/jamo.ts";
import {
  elevenLabsRequestOf,
  letterSoundEntries,
  sha256SumsText,
  speechTimingOf,
} from "./letters-audio.mjs";

const { values } = parseArgs({
  options: {
    engine: { type: "string" },
    from: { type: "string" },
    out: { type: "string" },
    voice: { type: "string", default: "Yuna" },
    only: { type: "string" },
  },
});

const engine = values.engine;
if (!["clips", "elevenlabs", "say"].includes(engine ?? "") || values.out === undefined) {
  console.error(
    "사용법: --engine clips|elevenlabs|say --out <폴더> [--from <녹음 폴더>] [--voice Yuna] [--only ga,na]",
  );
  process.exit(2);
}
if (engine === "clips" && values.from === undefined) {
  console.error("--engine clips에는 --from <녹음 폴더>가 필요합니다");
  process.exit(2);
}

const SILENCE = "-45dB";
const PEAK_DB = -1.5;
const PAD_S = 0.12;

const run = (command, args) =>
  execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const runStderr = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`${command} 실패: ${String(error.stderr ?? error.message).slice(-400)}`);
  }
};
/** ffmpeg 분석 필터 로그(stderr)를 읽습니다 — 셸 없이. */
function analyze(input, filter) {
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", input, "-af", filter, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(`ffmpeg 분석 실패: ${String(result.stderr).slice(-400)}`);
  return result.stderr;
}

async function rawOf(entry, dir) {
  const roman = entry.file.replace(/\.m4a$/, "");
  if (engine === "clips") {
    for (const ext of ["wav", "mp3", "m4a", "aiff"]) {
      const path = join(values.from, `${roman}.${ext}`);
      if (existsSync(path)) return path;
    }
    throw new Error(`녹음이 없습니다: ${join(values.from, `${roman}.(wav|mp3|m4a|aiff)`)}`);
  }
  if (engine === "say") {
    const path = join(dir, `${roman}.aiff`);
    run("say", ["-v", values.voice, "-o", path, entry.syllable]);
    return path;
  }
  const request = elevenLabsRequestOf({
    text: entry.syllable,
    voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
  });
  const response = await fetch(request.url, request.init);
  if (!response.ok) throw new Error(`ElevenLabs ${response.status} (${entry.id})`);
  const path = join(dir, `${roman}.mp3`);
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

function encode(raw, target) {
  // 1) 앞뒤 무음을 자르고 0.12 s씩 덧댄 모노 44.1 kHz WAV, 2) 최고점을 −1.5 dBFS로, 3) AAC 80 kbps m4a.
  const trimmed = `${target}.trim.wav`;
  try {
    const trim = [
      // 스테레오 입력(녹음 · 웹 파일)도 먼저 모노로 — adelay가 한 채널만 늦추지 않게.
      "aformat=channel_layouts=mono",
      `silenceremove=start_periods=1:start_threshold=${SILENCE}:start_silence=0.02`,
      "areverse",
      `silenceremove=start_periods=1:start_threshold=${SILENCE}:start_silence=0.02`,
      "areverse",
      `adelay=${Math.round(PAD_S * 1000)}:all=1`,
      `apad=pad_dur=${PAD_S}`,
    ].join(",");
    runStderr("ffmpeg", [
      "-hide_banner",
      "-y",
      "-i",
      raw,
      "-af",
      trim,
      "-ac",
      "1",
      "-ar",
      "44100",
      trimmed,
    ]);
    const peak = Number(/max_volume: (-?[0-9.]+) dB/.exec(analyze(trimmed, "volumedetect"))?.[1]);
    if (!Number.isFinite(peak)) throw new Error(`최고점을 못 쟀습니다: ${raw}`);
    const gain = (PEAK_DB - peak).toFixed(2);
    runStderr("ffmpeg", [
      "-hide_banner",
      "-y",
      "-i",
      trimmed,
      "-af",
      `volume=${gain}dB`,
      "-c:a",
      "aac",
      "-b:a",
      "80k",
      "-ac",
      "1",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
      "-map_metadata",
      "-1",
      target,
    ]);
  } finally {
    rmSync(trimmed, { force: true });
  }
}

function measure(path) {
  const seconds = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      path,
    ]).trim(),
  );
  const durationMs = Math.round(seconds * 1000);
  return speechTimingOf(durationMs, analyze(path, `silencedetect=n=${SILENCE}:d=0.05`));
}

const only = values.only === undefined ? null : new Set(values.only.split(","));
const entries = letterSoundEntries(LETTER_SOUND_SYLLABLES, letterAudioIdOf).filter(
  (entry) => only === null || only.has(entry.file.replace(/\.m4a$/, "")),
);
const out = values.out;
// say 엔진 파일은 배포할 수 없습니다(ADR-0172 D3) — 커밋되지 않게 저장소 밖에만 씁니다.
const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
if (engine === "say" && (resolve(out) + sep).startsWith(repoRoot + sep)) {
  console.error("--engine say는 저장소 밖 폴더에만 씁니다(배포 불가 음성, 커밋 금지)");
  process.exit(2);
}
mkdirSync(join(out, "audio", "letters"), { recursive: true });
const work = mkdtempSync(join(tmpdir(), "letters-audio-"));
const files = [];
const timings = {};
try {
  for (const entry of entries) {
    const raw = await rawOf(entry, work);
    const target = join(out, entry.path);
    encode(raw, target);
    const bytes = readFileSync(target);
    const timing = measure(target);
    timings[entry.id] = timing;
    files.push({
      id: entry.id,
      syllable: entry.syllable,
      path: entry.path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...timing,
    });
    console.log(`${entry.path}\t${entry.syllable}\t${timing.duration_ms} ms\t${bytes.length} B`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

writeFileSync(join(out, "letters-audio-timings.json"), `${JSON.stringify(timings, null, 2)}\n`);
writeFileSync(join(out, "files.json"), `${JSON.stringify(files, null, 2)}\n`);
writeFileSync(join(out, "SHA256SUMS"), sha256SumsText(files));
const source =
  engine === "say"
    ? `macOS say -v ${values.voice} (기기 확인용 — Apple 시스템 음성은 상업 배포 불가, 올리지 않습니다)`
    : engine === "elevenlabs"
      ? `ElevenLabs voice ${process.env.ELEVENLABS_VOICE_ID} · model ${process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2"}`
      : `녹음 폴더 ${values.from}`;
writeFileSync(
  join(out, "SOURCE.txt"),
  `${source}\n${new Date().toISOString()}\n파일 ${files.length}개 · 처리: 앞뒤 무음 ${SILENCE} 자름 + ${PAD_S} s 덧댐 · 최고점 ${PEAK_DB} dBFS · AAC 80k 모노 44.1 kHz\n`,
);
console.log(`\n${files.length}개 → ${out}`);
