// 글자 소리(ADR-0173) 업로드 준비의 순수 함수입니다 — 파일 목록 · 음성 정보 파일 합치기 · 길이 · sha256 목록 · TTS 요청.
// 파일을 만드는 쪽(letters-audio-build.mjs)과 올리는 쪽(letters-audio-upload.sh)이 부릅니다. 네트워크 · 파일을 건드리지 않습니다.

const AUDIO_MANIFEST_SCHEMA = "audio-manifest-1";
const LETTERS_PREFIX = "letters/";
const VOICE_ID = /^[A-Za-z0-9]+$/;

const isPositiveInt = (value) => Number.isSafeInteger(value) && value > 0;

/**
 * 앱의 음절 목록(`LETTER_SOUND_SYLLABLES`)과 id 함수(`letterAudioIdOf`) → 만들 파일 목록. id가 없거나 겹치면 멈춥니다.
 * @returns {{ id: string, syllable: string, file: string, path: string }[]}
 */
export function letterSoundEntries(syllables, idOf) {
  const seen = new Set();
  return syllables.map((syllable) => {
    const id = idOf(syllable);
    if (typeof id !== "string" || !id.startsWith(LETTERS_PREFIX)) {
      throw new Error(`소리 파일 id가 없는 음절: ${syllable}`);
    }
    if (seen.has(id)) throw new Error(`겹치는 id: ${id}`);
    seen.add(id);
    const file = `${id.slice(LETTERS_PREFIX.length)}.m4a`;
    return { id, syllable, file, path: `audio/${id}.m4a` };
  });
}

/**
 * 버킷의 지금 음성 정보 파일 원문에 letters 항목을 더하거나 바꿉니다. 다른 항목 · 순서는 그대로, `generated_at`만 새 시각.
 * 직렬화는 버킷 파일과 같은 2칸 들여쓰기 + 끝 줄바꿈입니다.
 */
export function mergeAudioManifest(liveText, timings, generatedAt) {
  let root;
  try {
    root = JSON.parse(liveText);
  } catch {
    throw new Error("음성 정보 파일이 JSON이 아닙니다");
  }
  if (root === null || typeof root !== "object" || root.schema !== AUDIO_MANIFEST_SCHEMA) {
    throw new Error(`음성 정보 파일 schema가 ${AUDIO_MANIFEST_SCHEMA}가 아닙니다`);
  }
  if (root.audio === null || typeof root.audio !== "object" || Array.isArray(root.audio)) {
    throw new Error("음성 정보 파일 audio가 객체가 아닙니다");
  }
  const audio = { ...root.audio };
  for (const [id, timing] of Object.entries(timings)) {
    if (!id.startsWith(LETTERS_PREFIX)) throw new Error(`letters/ 밖 id: ${id}`);
    if (!isPositiveInt(timing.duration_ms))
      throw new Error(`${id} duration_ms가 양의 정수가 아닙니다`);
    const entry = { duration_ms: timing.duration_ms };
    if (timing.speech_end_ms !== undefined) {
      if (!isPositiveInt(timing.speech_end_ms) || timing.speech_end_ms > timing.duration_ms) {
        throw new Error(`${id} speech_end_ms가 1 ~ duration_ms 밖입니다`);
      }
      entry.speech_end_ms = timing.speech_end_ms;
    }
    audio[id] = entry;
  }
  return `${JSON.stringify({ ...root, generated_at: generatedAt, audio }, null, 2)}\n`;
}

/**
 * 길이(ms)와 ffmpeg `silencedetect` 로그 → `{duration_ms, speech_end_ms}`. 말소리 끝은 파일 끝까지 이어지는 마지막 무음의 시작
 * (닫히지 않았거나 길이에서 30 ms 안에 닫힘)이고, 그런 무음이 없으면 길이입니다.
 */
export function speechTimingOf(durationMs, silenceLog) {
  if (!isPositiveInt(durationMs)) throw new Error("duration_ms가 양의 정수가 아닙니다");
  const events = [];
  for (const match of silenceLog.matchAll(/silence_(start|end): ([0-9.]+)/g)) {
    events.push({ kind: match[1], ms: Math.round(Number(match[2]) * 1000) });
  }
  let speechEnd = durationMs;
  const last = events[events.length - 1];
  if (last !== undefined) {
    const start =
      last.kind === "start"
        ? last.ms
        : durationMs - last.ms <= 30
          ? events[events.length - 2]?.ms
          : undefined;
    if (start !== undefined && start > 0 && start < durationMs) speechEnd = start;
  }
  return { duration_ms: durationMs, speech_end_ms: speechEnd };
}

/** `sha256sum` 형식(`<hex>  <경로>`) 목록 — 경로 순, 끝 줄바꿈. */
export function sha256SumsText(rows) {
  const sorted = [...rows].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sorted
    .map((row) => {
      if (!/^[0-9a-f]{64}$/.test(row.sha256))
        throw new Error(`sha256 형식이 아닙니다: ${row.path}`);
      return `${row.sha256}  ${row.path}\n`;
    })
    .join("");
}

/**
 * ElevenLabs 낭독 요청(이미 있는 계정 키를 환경 변수로 받습니다 — 새 키를 만들지 않습니다). 오류 메시지에 키를 싣지 않습니다.
 * @returns {{ url: string, init: { method: string, headers: Record<string, string>, body: string } }}
 */
export function elevenLabsRequestOf({ text, voiceId, modelId, apiKey }) {
  if (typeof apiKey !== "string" || apiKey === "") {
    throw new Error("ELEVENLABS_API_KEY가 비어 있습니다");
  }
  if (typeof voiceId !== "string" || !VOICE_ID.test(voiceId)) {
    throw new Error("ELEVENLABS_VOICE_ID가 영문 · 숫자 id가 아닙니다");
  }
  return {
    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    init: {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: modelId }),
    },
  };
}
