// 벤더 어댑터. 모두 같은 모양입니다:
//   build({ audio, ext, referenceText, env }) → { url, method, headers, body }   (순수 함수, 테스트로 모양을 고정)
//   parse(json) → { transcript, scores, words, syllables, jamo }                (가짜 응답으로 해석 고정)
// 실제 호출 · 지연 측정 · 재시도는 runner.mjs의 callVendor가 맡습니다(fetch 주입).
//
// 각 벤더의 세부는 2026-11-19에 공식 문서로 다시 확인한 것과 확인하지 못한 것(「미확인」)을
// 어댑터마다 주석에 적었습니다. 키 값은 이 파일 어디에도 적지 않습니다.

import { createHash } from "node:crypto";

import { mimeOf } from "./audio.mjs";

export class VendorError extends Error {
  constructor(message, { status = null, retryable = false, retryAfterMs = null } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

const num = (v) =>
  Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : null;
const blob = (audio, ext) => new Blob([audio], { type: mimeOf(ext) });

/** 벤더마다 이름이 다른 낱말 · 음절 · 자모 항목을 { text, score }로 맞춥니다(미확인 칸 대비). */
const item = (x) => ({
  text: String(
    x?.word ??
      x?.char ??
      x?.letter ??
      x?.syllable ??
      x?.phoneme ??
      x?.jamo ??
      x?.text ??
      x?.Word ??
      x?.Phoneme ??
      "",
  ),
  score: num(
    x?.scores?.overall ??
      x?.scores?.pronunciation ??
      x?.score ??
      x?.pronunciation ??
      x?.overall ??
      x?.AccuracyScore,
  ),
});

// ── Azure Speech (REST 짧은 오디오) ──────────────────────────────────────────────
// 확인(learn.microsoft.com rest-speech-to-text-short, 2026-06 갱신본): 주소 형식, `language` 필수,
// `format=detailed`, 헤더 `Ocp-Apim-Subscription-Key` · `Content-Type: audio/wav; codecs=audio/pcm;
// samplerate=16000` · `Pronunciation-Assessment`(Base64 JSON: ReferenceText · GradingSystem ·
// Granularity · Dimension · EnableMiscue), 발음 평가 30초 · 일반 60초, 응답의 NBest[0] 점수 칸.
// 미확인: 한국어에서 Phonemes[].Phoneme 이름이 비는지(조사 메모로는 「이름 없는 점수」), 응답 점수가
// NBest 바로 아래인지 PronunciationAssessment 아래인지(둘 다 읽습니다).
function azureUrl(env) {
  const base = env.AZURE_SPEECH_ENDPOINT
    ? `${env.AZURE_SPEECH_ENDPOINT.replace(/\/+$/, "")}/stt/speech/recognition/conversation/cognitiveservices/v1`
    : `https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  return `${base}?language=ko-KR&format=detailed&profanity=raw`;
}

function azureBuild({ audio, referenceText, env }, pron) {
  const headers = {
    "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_KEY,
    "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
    Accept: "application/json",
  };
  if (pron) {
    const params = {
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
    };
    headers["Pronunciation-Assessment"] = Buffer.from(JSON.stringify(params), "utf8").toString(
      "base64",
    );
  }
  return { url: azureUrl(env), method: "POST", headers, body: audio };
}

function azureParse(json) {
  const status = json.RecognitionStatus;
  if (status === "Error")
    throw new VendorError("Azure RecognitionStatus=Error", { retryable: true });
  const nb = json.NBest?.[0];
  if (status !== "Success" || !nb)
    return {
      transcript: "",
      scores: null,
      words: [],
      syllables: [],
      jamo: [],
      note: `RecognitionStatus=${status}`,
    };
  const pa = nb.PronunciationAssessment ?? nb;
  const words = (nb.Words ?? []).map((w) => ({
    text: w.Word,
    score: num(w.PronunciationAssessment?.AccuracyScore ?? w.AccuracyScore),
    errorType: w.PronunciationAssessment?.ErrorType ?? w.ErrorType ?? null,
  }));
  const jamo = (nb.Words ?? []).flatMap((w) =>
    (w.Phonemes ?? []).map((p) => ({
      text: p.Phoneme ?? "",
      score: num(p.PronunciationAssessment?.AccuracyScore ?? p.AccuracyScore),
      word: w.Word,
    })),
  );
  const syllables = (nb.Words ?? []).flatMap((w) => (w.Syllables ?? []).map(item));
  const scores =
    pa.PronScore === undefined && pa.AccuracyScore === undefined
      ? null
      : {
          overall: num(pa.PronScore),
          accuracy: num(pa.AccuracyScore),
          fluency: num(pa.FluencyScore),
          completeness: num(pa.CompletenessScore),
        };
  return {
    transcript: json.DisplayText ?? nb.Display ?? nb.Lexical ?? "",
    scores,
    words,
    syllables,
    jamo,
  };
}

// ── SpeechSuper ────────────────────────────────────────────────────────────────
// 확인(github.com/speechsuper/speechsuper-api-samples, http_samples/python_http_sample): 주소
// `https://api.speechsuper.com/{coreType}`, multipart 칸 `text`(JSON) · `audio`, 헤더 `Request-Index: 0`,
// connect 서명 SHA-1(appKey+timestamp+secretKey) · start 서명 SHA-1(appKey+timestamp+userId+secretKey).
// 미확인: 한국어 coreType 이름(`sent.eval.kr` — 조사 메모 기준, 공식 문서 사이트가 스크립트로만 열려
// 다시 읽지 못함), 한국어 응답의 글자(음절) · 자모 배열 칸 이름(아래는 여러 후보를 읽습니다).
function speechsuperBuild({ audio, ext, referenceText, env, now = Date.now }) {
  const coreType = env.SPEECHSUPER_CORE_TYPE || "sent.eval.kr";
  const appKey = env.SPEECHSUPER_APP_KEY;
  const timestamp = String(Math.floor(now() / 1000));
  const userId = "speech-bench";
  const sha1 = (s) => createHash("sha1").update(s, "utf8").digest("hex");
  const params = {
    connect: {
      cmd: "connect",
      param: {
        sdk: { version: 16777472, source: 9, protocol: 2 },
        app: {
          applicationId: appKey,
          sig: sha1(appKey + timestamp + env.SPEECHSUPER_SECRET_KEY),
          timestamp,
        },
      },
    },
    start: {
      cmd: "start",
      param: {
        app: {
          userId,
          applicationId: appKey,
          timestamp,
          sig: sha1(appKey + timestamp + userId + env.SPEECHSUPER_SECRET_KEY),
        },
        audio: {
          audioType: ext.replace(/^\./, "") || "wav",
          channel: 1,
          sampleBytes: 2,
          sampleRate: 16000,
        },
        request: { coreType, refText: referenceText, tokenId: "speech-bench" },
      },
    },
  };
  const form = new FormData();
  form.append("text", JSON.stringify(params));
  form.append("audio", blob(audio, ext), `audio${ext}`);
  return {
    url: `https://api.speechsuper.com/${coreType}`,
    method: "POST",
    headers: { "Request-Index": "0" },
    body: form,
  };
}

function speechsuperParse(json) {
  if (json.error || json.errId)
    throw new VendorError(`SpeechSuper 오류 ${json.errId ?? ""} ${json.error ?? ""}`.trim());
  const r = json.result ?? {};
  const list = r.words ?? [];
  const flat = (keys) =>
    list.flatMap((w) => keys.map((k) => w[k]).find(Array.isArray) ?? []).map(item);
  return {
    transcript: null, // 한국어 STT 없음
    scores: {
      overall: num(r.overall),
      pronunciation: num(r.pronunciation),
      fluency: num(r.fluency),
      rhythm: num(r.rhythm),
      speed: num(r.speed),
    },
    words: list.map(item),
    syllables: flat(["syllables", "chars", "letters"]),
    jamo: flat(["phonemes", "jamos", "phones"]),
  };
}

// ── 네이버 CLOVA Speech 단문 인식 ───────────────────────────────────────────────
// 확인(api.ncloud-docs.com 한국어판 clovaspeech-shortsentence): `POST .../recog/v1/stt`, `lang=Kor`,
// `assessment`는 Kor · Eng에서만, `utterance`(평가 대상 글), 헤더 `X-CLOVASPEECH-API-KEY` ·
// `Content-Type: application/octet-stream`, 60초, 형식 MP3 · AAC · AC3 · OGG · FLAC · WAV,
// 응답 `text` · `quota` · `assessment_score`(1~100) · `assessment_details`(낱말마다의 점수).
// 미확인: 10MB 제한(문서에서 찾지 못함), `assessment_details`의 정확한 형식 — 예시는
// `낱말|{음소:점수, …}` 꼴의 문자열이라 그 꼴을 읽고, 낱말 점수는 음소 점수의 평균으로 만듭니다.
function clovaBuild({ audio, referenceText, env }, pron) {
  const q = new URLSearchParams({ lang: "Kor" });
  if (pron) {
    q.set("assessment", "true");
    q.set("utterance", referenceText);
  }
  return {
    url: `https://clovaspeech-gw.ncloud.com/recog/v1/stt?${q}`,
    method: "POST",
    headers: {
      "X-CLOVASPEECH-API-KEY": env.CLOVA_SPEECH_SECRET_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: audio,
  };
}

export function parseClovaDetails(details) {
  if (typeof details !== "string") return { words: [], jamo: [] };
  const words = [];
  const jamo = [];
  for (const m of details.matchAll(/([^\s|{},]+)\s*\|\s*\{([^}]*)\}/gu)) {
    const scores = [...m[2].matchAll(/([^\s:,]+)\s*:\s*(-?[\d.]+)/gu)].map(([, text, s]) => ({
      text,
      score: Number(s),
      word: m[1],
    }));
    jamo.push(...scores);
    const avg = scores.length ? scores.reduce((a, b) => a + b.score, 0) / scores.length : null;
    words.push({ text: m[1], score: avg });
  }
  return { words, jamo };
}

function clovaParse(json) {
  const { words, jamo } = parseClovaDetails(json.assessment_details);
  const score = num(json.assessment_score);
  return {
    transcript: json.text ?? "",
    scores: score === null ? null : { overall: score },
    words,
    syllables: [],
    jamo,
  };
}

// ── STT 전용 ───────────────────────────────────────────────────────────────────
// ElevenLabs 확인(elevenlabs.io/docs speech-to-text/convert): 헤더 `xi-api-key`, multipart `model_id` ·
// `file` · `language_code`(ISO-639-1/3), 응답 `text`, 쿼리 `enable_logging=false`가 무보관(기업 계약만).
// 미확인: 기본 모델 이름의 최신값(문서 예시는 scribe_v2).
const elevenBuild = ({ audio, ext, env }) => {
  const form = new FormData();
  form.append("model_id", env.ELEVENLABS_STT_MODEL || "scribe_v2");
  form.append("language_code", "ko");
  form.append("tag_audio_events", "false");
  form.append("file", blob(audio, ext), `audio${ext}`);
  const q = env.ELEVENLABS_ZERO_RETENTION === "1" ? "?enable_logging=false" : "";
  return {
    url: `https://api.elevenlabs.io/v1/speech-to-text${q}`,
    method: "POST",
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
    body: form,
  };
};

// OpenAI — 미확인: 공식 문서가 자동 접근을 막아(403) 다시 읽지 못했습니다. 아래는 알려진 모양
// (multipart `file` · `model` · `language` · `response_format=json`, Bearer, 응답 `text`, 25MB)입니다.
const openaiBuild = ({ audio, ext, env }) => {
  const form = new FormData();
  form.append("model", env.OPENAI_STT_MODEL || "gpt-4o-transcribe");
  form.append("language", "ko");
  form.append("response_format", "json");
  form.append("file", blob(audio, ext), `audio${ext}`);
  return {
    url: "https://api.openai.com/v1/audio/transcriptions",
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  };
};

// Deepgram 확인(developers.deepgram.com listen-pre-recorded): `Authorization: Token …`, `model` ·
// `language` · `smart_format` · `mip_opt_out`(모델 개선 프로그램 제외 — 요청마다 붙입니다),
// 응답 results.channels[0].alternatives[0].transcript. 미확인: nova-3의 한국어 지원(아니면 DEEPGRAM_MODEL=nova-2).
const deepgramBuild = ({ audio, ext, env }) => {
  const q = new URLSearchParams({
    model: env.DEEPGRAM_MODEL || "nova-3",
    language: "ko",
    smart_format: "true",
    mip_opt_out: "true",
  });
  return {
    url: `https://api.deepgram.com/v1/listen?${q}`,
    method: "POST",
    headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": mimeOf(ext) },
    body: audio,
  };
};

const sttOnly = (transcript) => ({
  transcript: transcript ?? "",
  scores: null,
  words: [],
  syllables: [],
  jamo: [],
});
const COMMON = [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm"];

/** 어댑터 목록. env는 모두 있어야 하는 이름, envAny는 그중 하나만 있으면 되는 묶음입니다. */
export const ADAPTERS = [
  {
    id: "azure-pron",
    task: "pron",
    label: "Azure 발음 평가",
    env: ["AZURE_SPEECH_KEY"],
    envAny: [["AZURE_SPEECH_ENDPOINT", "AZURE_SPEECH_REGION"]],
    needsWav16k: true,
    acceptExts: [],
    maxSec: 30,
    build: (i) => azureBuild(i, true),
    parse: azureParse,
  },
  {
    id: "speechsuper-pron",
    task: "pron",
    label: "SpeechSuper 발음 평가",
    env: ["SPEECHSUPER_APP_KEY", "SPEECHSUPER_SECRET_KEY"],
    needsWav16k: true,
    acceptExts: [],
    maxSec: null,
    build: speechsuperBuild,
    parse: speechsuperParse,
  },
  {
    id: "clova-pron",
    task: "pron",
    label: "CLOVA 발음 평가",
    env: ["CLOVA_SPEECH_SECRET_KEY"],
    needsWav16k: false,
    acceptExts: [".wav", ".mp3", ".flac", ".ogg"],
    maxSec: 60,
    build: (i) => clovaBuild(i, true),
    parse: clovaParse,
  },
  {
    id: "azure-stt",
    task: "stt",
    label: "Azure STT",
    env: ["AZURE_SPEECH_KEY"],
    envAny: [["AZURE_SPEECH_ENDPOINT", "AZURE_SPEECH_REGION"]],
    needsWav16k: true,
    acceptExts: [],
    maxSec: 60,
    build: (i) => azureBuild(i, false),
    parse: azureParse,
  },
  {
    id: "clova-stt",
    task: "stt",
    label: "CLOVA STT",
    env: ["CLOVA_SPEECH_SECRET_KEY"],
    needsWav16k: false,
    acceptExts: [".wav", ".mp3", ".flac", ".ogg"],
    maxSec: 60,
    build: (i) => clovaBuild(i, false),
    parse: clovaParse,
  },
  {
    id: "elevenlabs-stt",
    task: "stt",
    label: "ElevenLabs Scribe",
    env: ["ELEVENLABS_API_KEY"],
    needsWav16k: false,
    acceptExts: COMMON,
    maxSec: null,
    build: elevenBuild,
    parse: (j) => sttOnly(j.text),
  },
  {
    id: "openai-stt",
    task: "stt",
    label: "OpenAI 받아쓰기",
    env: ["OPENAI_API_KEY"],
    needsWav16k: false,
    acceptExts: COMMON,
    maxSec: null,
    build: openaiBuild,
    parse: (j) => sttOnly(j.text),
  },
  {
    id: "deepgram-stt",
    task: "stt",
    label: "Deepgram",
    env: ["DEEPGRAM_API_KEY"],
    needsWav16k: false,
    acceptExts: COMMON,
    maxSec: null,
    build: deepgramBuild,
    parse: (j) => sttOnly(j.results?.channels?.[0]?.alternatives?.[0]?.transcript),
  },
];

export const adapterById = (id) => ADAPTERS.find((a) => a.id === id);

/** 이 어댑터에 빠진 환경 변수 이름들(값은 보지 않고 있는지만). */
export function missingEnv(adapter, env) {
  const has = (name) => typeof env[name] === "string" && env[name].trim() !== "";
  const missing = adapter.env.filter((name) => !has(name));
  for (const group of adapter.envAny ?? []) {
    if (!group.some(has)) missing.push(group.join(" 또는 "));
  }
  return missing;
}
