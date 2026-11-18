// 오디오 형식 확인과 변환. 벤더가 대부분 WAV PCM 16kHz mono를 받으므로 그 형식으로 맞춥니다.
// 변환은 ffmpeg가 있을 때만 하고, 없으면 원본을 그대로 쓰거나(받는 벤더만) 건너뛰고 그 사실을
// 결과에 남깁니다.

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync } from "node:fs";
import { extname, join } from "node:path";

/** WAV(RIFF) 머리를 읽습니다. WAV가 아니면 null. */
export function wavInfo(buffer) {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }
  let offset = 12;
  let fmt = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 24 <= buffer.length) {
      fmt = {
        audioFormat: buffer.readUInt16LE(offset + 8), // 1 = PCM
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        byteRate: buffer.readUInt32LE(offset + 16),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === "data" && fmt) {
      return {
        ...fmt,
        dataBytes: size,
        durationSec: fmt.byteRate > 0 ? size / fmt.byteRate : null,
      };
    }
    offset += 8 + size + (size % 2);
  }
  return fmt ? { ...fmt, dataBytes: null, durationSec: null } : null;
}

/** 벤더가 바로 받는 형식인가: PCM 16bit · 16kHz · mono. */
export const isWav16kMono = (info) =>
  info !== null &&
  info.audioFormat === 1 &&
  info.channels === 1 &&
  info.sampleRate === 16000 &&
  info.bitsPerSample === 16;

/** 파일 앞부분만 읽어 길이를 얻습니다(WAV만). */
export function wavDurationOfFile(path) {
  if (!existsSync(path)) return null;
  const fd = openSync(path, "r");
  try {
    const head = Buffer.alloc(8192);
    const read = readSync(fd, head, 0, head.length, 0);
    return wavInfo(head.subarray(0, read))?.durationSec ?? null;
  } finally {
    closeSync(fd);
  }
}

export function hasFfmpeg(spawn = spawnSync) {
  try {
    return spawn("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

const MIME = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
};
export const mimeOf = (ext) => MIME[ext.toLowerCase()] ?? "application/octet-stream";

/**
 * 발화 하나의 오디오를 준비합니다.
 * 돌려주는 것: { buffer, wav16k: boolean, ext, note } — note는 변환 · 건너뜀을 적은 글(없으면 null).
 * 변환본은 cacheDir(저장소 밖 결과 폴더 아래)에 남겨 다음 실행이 다시 변환하지 않게 합니다.
 */
export function prepareAudio(
  path,
  { cacheDir, id, ffmpeg, spawn = spawnSync, read = readFileSync },
) {
  const original = read(path);
  const ext = extname(path).toLowerCase() || ".bin";
  if (isWav16kMono(wavInfo(original)))
    return { buffer: original, wav16k: true, ext: ".wav", note: null };

  const cached = join(cacheDir, `${encodeURIComponent(id)}.wav`);
  if (existsSync(cached))
    return { buffer: read(cached), wav16k: true, ext: ".wav", note: "ffmpeg 변환본(캐시)" };
  if (!ffmpeg)
    return {
      buffer: original,
      wav16k: false,
      ext,
      note: "16kHz mono WAV가 아닌데 ffmpeg가 없어 변환하지 않음",
    };

  mkdirSync(cacheDir, { recursive: true });
  const result = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      path,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-sample_fmt",
      "s16",
      "-c:a",
      "pcm_s16le",
      cached,
    ],
    { stdio: "pipe" },
  );
  if (result.status !== 0) {
    return {
      buffer: original,
      wav16k: false,
      ext,
      note: `ffmpeg 변환 실패: ${String(result.stderr ?? "")
        .trim()
        .slice(0, 200)}`,
    };
  }
  return { buffer: read(cached), wav16k: true, ext: ".wav", note: "ffmpeg로 16kHz mono WAV 변환" };
}
