// 어댑터마다 요청 모양(주소 · 헤더 · 본문)과 가짜 응답 해석을 고정합니다. 실제 호출은 없습니다.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { ADAPTERS, adapterById, missingEnv, parseClovaDetails, VendorError } from "./vendors.mjs";

// 값은 가짜입니다. 진짜 키를 테스트에 넣지 않습니다.
const ENV = {
  AZURE_SPEECH_KEY: "fake-azure",
  AZURE_SPEECH_ENDPOINT: "https://my-speech.cognitiveservices.azure.com/",
  SPEECHSUPER_APP_KEY: "fake-app",
  SPEECHSUPER_SECRET_KEY: "fake-secret",
  CLOVA_SPEECH_SECRET_KEY: "fake-clova",
  ELEVENLABS_API_KEY: "fake-eleven",
  OPENAI_API_KEY: "fake-openai",
  DEEPGRAM_API_KEY: "fake-deepgram",
};
const AUDIO = Buffer.from("RIFF....WAVE");
const input = {
  audio: AUDIO,
  ext: ".wav",
  referenceText: "사과를 먹어요",
  env: ENV,
  now: () => 1_700_000_000_000,
};
const build = (id, extra = {}) => adapterById(id).build({ ...input, ...extra });

test("어댑터 목록: 여덟 개, 과제 구분", () => {
  assert.deepEqual(
    ADAPTERS.map((a) => `${a.id}:${a.task}`),
    [
      "azure-pron:pron",
      "speechsuper-pron:pron",
      "clova-pron:pron",
      "azure-stt:stt",
      "clova-stt:stt",
      "elevenlabs-stt:stt",
      "openai-stt:stt",
      "deepgram-stt:stt",
    ],
  );
});

test("Azure 발음 평가: 주소 · 헤더 · Base64 JSON", () => {
  const req = build("azure-pron");
  assert.equal(
    req.url,
    "https://my-speech.cognitiveservices.azure.com/stt/speech/recognition/conversation/cognitiveservices/v1?language=ko-KR&format=detailed&profanity=raw",
  );
  assert.equal(req.method, "POST");
  assert.equal(req.headers["Ocp-Apim-Subscription-Key"], "fake-azure");
  assert.equal(req.headers["Content-Type"], "audio/wav; codecs=audio/pcm; samplerate=16000");
  assert.deepEqual(
    JSON.parse(Buffer.from(req.headers["Pronunciation-Assessment"], "base64").toString("utf8")),
    {
      ReferenceText: "사과를 먹어요",
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: "True",
    },
  );
  assert.equal(req.body, AUDIO);
  // 지역만 주면 지역 주소
  const regional = adapterById("azure-stt").build({
    ...input,
    env: { AZURE_SPEECH_KEY: "k", AZURE_SPEECH_REGION: "koreacentral" },
  });
  assert.match(
    regional.url,
    /^https:\/\/koreacentral\.stt\.speech\.microsoft\.com\/speech\/recognition\/conversation\/cognitiveservices\/v1\?language=ko-KR/,
  );
  assert.equal(regional.headers["Pronunciation-Assessment"], undefined);
});

test("Azure 해석: 문장 · 낱말 · 음소 점수, 인식 실패", () => {
  const parsed = adapterById("azure-pron").parse({
    RecognitionStatus: "Success",
    DisplayText: "사과를 먹어요.",
    NBest: [
      {
        Display: "사과를 먹어요.",
        AccuracyScore: 80,
        FluencyScore: 90,
        CompletenessScore: 100,
        PronScore: 85.5,
        Words: [
          {
            Word: "사과를",
            AccuracyScore: 70,
            ErrorType: "Mispronunciation",
            Phonemes: [{ Phoneme: "", AccuracyScore: 60 }, { AccuracyScore: 80 }],
          },
          { Word: "먹어요", AccuracyScore: 95, ErrorType: "None" },
        ],
      },
    ],
  });
  assert.equal(parsed.transcript, "사과를 먹어요.");
  assert.deepEqual(parsed.scores, { overall: 85.5, accuracy: 80, fluency: 90, completeness: 100 });
  assert.deepEqual(parsed.words[0], { text: "사과를", score: 70, errorType: "Mispronunciation" });
  assert.deepEqual(
    parsed.jamo.map((j) => j.score),
    [60, 80],
  );
  assert.deepEqual(parsed.syllables, []);
  // 점수가 PronunciationAssessment 아래 있는 모양도 읽습니다.
  const nested = adapterById("azure-pron").parse({
    RecognitionStatus: "Success",
    NBest: [{ Display: "가", PronunciationAssessment: { PronScore: 50, AccuracyScore: 40 } }],
  });
  assert.equal(nested.scores.overall, 50);
  const nomatch = adapterById("azure-stt").parse({ RecognitionStatus: "NoMatch" });
  assert.equal(nomatch.transcript, "");
  assert.equal(nomatch.note, "RecognitionStatus=NoMatch");
  assert.throws(
    () => adapterById("azure-stt").parse({ RecognitionStatus: "Error" }),
    (e) => e instanceof VendorError && e.retryable,
  );
});

test("SpeechSuper: 주소 · multipart · SHA-1 서명", async () => {
  const req = build("speechsuper-pron");
  assert.equal(req.url, "https://api.speechsuper.com/sent.eval.kr");
  assert.equal(req.headers["Request-Index"], "0");
  const params = JSON.parse(req.body.get("text"));
  const ts = "1700000000";
  const sha1 = (s) => createHash("sha1").update(s).digest("hex");
  assert.equal(params.connect.param.app.timestamp, ts);
  assert.equal(params.connect.param.app.sig, sha1(`fake-app${ts}fake-secret`));
  assert.equal(params.start.param.app.sig, sha1(`fake-app${ts}speech-benchfake-secret`));
  assert.deepEqual(params.start.param.request, {
    coreType: "sent.eval.kr",
    refText: "사과를 먹어요",
    tokenId: "speech-bench",
  });
  assert.deepEqual(params.start.param.audio, {
    audioType: "wav",
    channel: 1,
    sampleBytes: 2,
    sampleRate: 16000,
  });
  const file = req.body.get("audio");
  assert.equal(file.type, "audio/wav");
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), AUDIO);
  assert.equal(
    build("speechsuper-pron", { env: { ...ENV, SPEECHSUPER_CORE_TYPE: "word.eval.kr" } }).url,
    "https://api.speechsuper.com/word.eval.kr",
  );
});

test("SpeechSuper 해석: 문장 다섯 점수 · 낱말 · 음절 · 자모, 오류 응답", () => {
  const parsed = adapterById("speechsuper-pron").parse({
    result: {
      overall: 78,
      pronunciation: 75,
      fluency: 80,
      rhythm: 70,
      speed: 90,
      words: [
        {
          word: "사과를",
          scores: { overall: 72 },
          syllables: [{ char: "사", score: 90 }],
          phonemes: [{ phoneme: "ㅅ", pronunciation: 95 }],
        },
      ],
    },
  });
  assert.equal(parsed.transcript, null);
  assert.deepEqual(parsed.scores, {
    overall: 78,
    pronunciation: 75,
    fluency: 80,
    rhythm: 70,
    speed: 90,
  });
  assert.deepEqual(parsed.words, [{ text: "사과를", score: 72 }]);
  assert.deepEqual(parsed.syllables, [{ text: "사", score: 90 }]);
  assert.deepEqual(parsed.jamo, [{ text: "ㅅ", score: 95 }]);
  assert.throws(
    () => adapterById("speechsuper-pron").parse({ errId: 20009, error: "sig" }),
    /SpeechSuper 오류 20009 sig/,
  );
});

test("CLOVA: 발음 평가는 assessment · utterance, STT는 lang만", () => {
  const pron = build("clova-pron");
  const url = new URL(pron.url);
  assert.equal(url.origin + url.pathname, "https://clovaspeech-gw.ncloud.com/recog/v1/stt");
  assert.equal(url.searchParams.get("lang"), "Kor");
  assert.equal(url.searchParams.get("assessment"), "true");
  assert.equal(url.searchParams.get("utterance"), "사과를 먹어요");
  assert.equal(pron.headers["X-CLOVASPEECH-API-KEY"], "fake-clova");
  assert.equal(pron.headers["Content-Type"], "application/octet-stream");
  assert.equal(pron.body, AUDIO);
  assert.equal(build("clova-stt").url, "https://clovaspeech-gw.ncloud.com/recog/v1/stt?lang=Kor");
});

test("CLOVA 해석: 점수와 assessment_details(예시 꼴)", () => {
  const parsed = adapterById("clova-pron").parse({
    text: "사과를 먹어요",
    quota: 1,
    assessment_score: 82,
    assessment_details: "사과를|{s:90, a:70} 먹어요|{m:100}",
  });
  assert.equal(parsed.transcript, "사과를 먹어요");
  assert.deepEqual(parsed.scores, { overall: 82 });
  assert.deepEqual(parsed.words, [
    { text: "사과를", score: 80 },
    { text: "먹어요", score: 100 },
  ]);
  assert.equal(parsed.jamo.length, 3);
  assert.deepEqual(parseClovaDetails(undefined), { words: [], jamo: [] });
  assert.equal(adapterById("clova-stt").parse({ text: "가" }).scores, null);
});

test("ElevenLabs: xi-api-key · multipart, 무보관은 켤 때만", () => {
  const req = build("elevenlabs-stt");
  assert.equal(req.url, "https://api.elevenlabs.io/v1/speech-to-text");
  assert.equal(req.headers["xi-api-key"], "fake-eleven");
  assert.equal(req.body.get("model_id"), "scribe_v2");
  assert.equal(req.body.get("language_code"), "ko");
  assert.ok(req.body.get("file") instanceof Blob);
  assert.equal(
    build("elevenlabs-stt", { env: { ...ENV, ELEVENLABS_ZERO_RETENTION: "1" } }).url,
    "https://api.elevenlabs.io/v1/speech-to-text?enable_logging=false",
  );
  assert.equal(adapterById("elevenlabs-stt").parse({ text: "안녕" }).transcript, "안녕");
});

test("OpenAI: Bearer · multipart", () => {
  const req = build("openai-stt", { ext: ".mp3" });
  assert.equal(req.url, "https://api.openai.com/v1/audio/transcriptions");
  assert.equal(req.headers.Authorization, "Bearer fake-openai");
  assert.equal(req.body.get("model"), "gpt-4o-transcribe");
  assert.equal(req.body.get("language"), "ko");
  assert.equal(req.body.get("response_format"), "json");
  assert.equal(req.body.get("file").type, "audio/mpeg");
  assert.equal(adapterById("openai-stt").parse({ text: "안녕" }).transcript, "안녕");
});

test("Deepgram: Token · 바이너리 · 요청마다 mip_opt_out=true", () => {
  const req = build("deepgram-stt");
  const url = new URL(req.url);
  assert.equal(url.origin + url.pathname, "https://api.deepgram.com/v1/listen");
  assert.equal(url.searchParams.get("mip_opt_out"), "true");
  assert.equal(url.searchParams.get("language"), "ko");
  assert.equal(url.searchParams.get("model"), "nova-3");
  assert.equal(req.headers.Authorization, "Token fake-deepgram");
  assert.equal(req.headers["Content-Type"], "audio/wav");
  assert.equal(req.body, AUDIO);
  assert.equal(
    adapterById("deepgram-stt").parse({
      results: { channels: [{ alternatives: [{ transcript: "안녕" }] }] },
    }).transcript,
    "안녕",
  );
  assert.equal(adapterById("deepgram-stt").parse({}).transcript, "");
});

test("빠진 키: 이름만 알려 주고 값은 보지 않음", () => {
  assert.deepEqual(missingEnv(adapterById("azure-pron"), {}), [
    "AZURE_SPEECH_KEY",
    "AZURE_SPEECH_ENDPOINT 또는 AZURE_SPEECH_REGION",
  ]);
  assert.deepEqual(
    missingEnv(adapterById("azure-pron"), { AZURE_SPEECH_KEY: "x", AZURE_SPEECH_REGION: "r" }),
    [],
  );
  assert.deepEqual(missingEnv(adapterById("speechsuper-pron"), { SPEECHSUPER_APP_KEY: "  " }), [
    "SPEECHSUPER_APP_KEY",
    "SPEECHSUPER_SECRET_KEY",
  ]);
});
