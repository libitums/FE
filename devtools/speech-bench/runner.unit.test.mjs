// 실행기: 재시도 · 속도 제한 · 이어 하기 · 건너뜀 · 예상 비용 · `--yes` 문 · 보고서.
// fetch는 가짜, 결과 폴더는 OS 임시 폴더(저장소 밖)입니다.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { insideRepo, main, REPO_ROOT } from "./cli.mjs";
import { estimateAll, estimateCost } from "./costs.mjs";
import { makeWav } from "./fixtures.mjs";
import { buildReport, loadRuns, viaVsFormal } from "./report.mjs";
import { createLimiter, readResults, resultsPath, runVendor, withRetry } from "./runner.mjs";
import { adapterById, VendorError } from "./vendors.mjs";

const ENV = {
  AZURE_SPEECH_KEY: "fake",
  AZURE_SPEECH_REGION: "koreacentral",
  OPENAI_API_KEY: "fake",
  DEEPGRAM_API_KEY: "fake",
};
const WAV = makeWav({ seconds: 1 });
const tmp = () => mkdtempSync(join(tmpdir(), "speech-bench-run-"));

const entries = [
  {
    id: "r1",
    audio: "/x/r1.wav",
    type: "read",
    referenceText: "사과를 먹어요",
    transcript: "사가를 머거요",
    human: { pronunciation: 2, fluency: 3 },
    speaker: { l1: "vi", proficiency: "초급" },
    durationSec: 3,
  },
  {
    id: "r2",
    audio: "/x/r2.wav",
    type: "read",
    referenceText: "안녕하세요",
    transcript: "안녕하세요",
    human: { pronunciation: 4, fluency: 4 },
    speaker: { l1: "zh", proficiency: "고급" },
    durationSec: 2,
  },
  {
    id: "r3",
    audio: "/x/r3.wav",
    type: "read",
    referenceText: "감사합니다",
    transcript: "감사합니다",
    human: { pronunciation: 5, fluency: 5 },
    speaker: { l1: "vi", proficiency: "고급" },
    durationSec: 2,
  },
  {
    id: "f1",
    audio: "/x/f1.wav",
    type: "free",
    transcript: "저는 학생이에요",
    human: { pronunciation: 3 },
    speaker: { l1: "vi", proficiency: "초급" },
    durationSec: 40,
  },
];

const azureOk = (text, score) =>
  JSON.stringify({
    RecognitionStatus: "Success",
    DisplayText: text,
    NBest: [{ Display: text, PronScore: score, AccuracyScore: score }],
  });

/** 호출을 기록하는 가짜 fetch. responder(url, init, n) → Response */
function fakeFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init, calls.length);
  };
  fn.calls = calls;
  return fn;
}

const clock = () => {
  let t = 1_000_000;
  const now = () => (t += 10);
  return { now, sleep: async (ms) => void (t += ms) };
};

test("재시도: 503 다음 성공이면 두 번째에 돌려줌, 400은 바로 실패", async () => {
  const waits = [];
  let n = 0;
  const { value, attempts } = await withRetry(
    async () => {
      n += 1;
      if (n === 1) throw new VendorError("503", { status: 503, retryable: true });
      return "ok";
    },
    { sleep: async (ms) => waits.push(ms), baseDelayMs: 100 },
  );
  assert.equal(value, "ok");
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [100]);
  await assert.rejects(
    withRetry(
      async () => {
        throw new VendorError("400", { status: 400 });
      },
      { sleep: async () => {} },
    ),
    (e) => e.attempts === 1,
  );
  // Retry-After가 있으면 그 값
  const waits2 = [];
  await assert.rejects(
    withRetry(
      async () => {
        throw new VendorError("429", { status: 429, retryable: true, retryAfterMs: 5000 });
      },
      { maxAttempts: 2, sleep: async (ms) => waits2.push(ms) },
    ),
  );
  assert.deepEqual(waits2, [5000]);
});

test("속도 제한: 시작 간격을 벌림", async () => {
  let t = 0;
  const waits = [];
  const limit = createLimiter(100, {
    now: () => t,
    sleep: async (ms) => {
      waits.push(ms);
      t += ms;
    },
  });
  await limit();
  await limit();
  await limit();
  assert.deepEqual(waits, [100, 100]);
});

test("실행: 낭독만 발음 평가, 지연 · 결과 기록, 이어 하기는 다시 부르지 않음", async () => {
  const outDir = tmp();
  const { now, sleep } = clock();
  const fetch = fakeFetch((url, init) => {
    const ref = JSON.parse(
      Buffer.from(init.headers["Pronunciation-Assessment"], "base64").toString(),
    );
    return new Response(azureOk(ref.ReferenceText, ref.ReferenceText.length * 10));
  });
  const opts = {
    adapter: adapterById("azure-pron"),
    entries,
    outDir,
    env: ENV,
    fetch,
    now,
    sleep,
    readAudio: () => WAV,
    concurrency: 2,
  };
  const s = await runVendor(opts);
  assert.deepEqual(
    { total: s.total, ok: s.ok, failed: s.failed, skipped: s.skipped },
    { total: 3, ok: 3, failed: 0, skipped: 0 },
  );
  assert.equal(fetch.calls.length, 3);
  const results = readResults(resultsPath(outDir, "azure-pron"));
  assert.equal(results.get("r1").scores.overall, 70); // 「사과를 먹어요」 7글자 × 10
  assert.equal(results.get("r1").vendor, "azure-pron");
  assert.ok(results.get("r1").latencyMs > 0);
  assert.ok(!results.has("f1")); // 자유 발화는 정식 발음 평가 대상이 아님

  const again = await runVendor(opts);
  assert.equal(again.total, 0);
  assert.equal(again.alreadyDone, 3);
  assert.equal(fetch.calls.length, 3);
});

test("실행: 실패는 기록하고, --retry-failed일 때만 다시", async () => {
  const outDir = tmp();
  const { now, sleep } = clock();
  let fail = true;
  const fetch = fakeFetch(() =>
    fail
      ? new Response("bad", { status: 400 })
      : new Response(JSON.stringify({ text: "안녕하세요" })),
  );
  const opts = {
    adapter: adapterById("openai-stt"),
    entries: entries.slice(0, 2),
    outDir,
    env: ENV,
    fetch,
    now,
    sleep,
    readAudio: () => WAV,
  };
  const first = await runVendor(opts);
  assert.equal(first.failed, 2);
  assert.match(readResults(resultsPath(outDir, "openai-stt")).get("r1").error, /HTTP 400/);
  fail = false;
  assert.equal((await runVendor(opts)).total, 0);
  const retried = await runVendor({ ...opts, retryFailed: true });
  assert.equal(retried.ok, 2);
  assert.equal(readResults(resultsPath(outDir, "openai-stt")).get("r1").ok, true);
});

test("실행: 중단으로 잘린 마지막 줄은 버리고 그 발화만 다시", async () => {
  const outDir = tmp();
  const { now, sleep } = clock();
  const fetch = fakeFetch(() => new Response(JSON.stringify({ text: "가" })));
  const opts = {
    adapter: adapterById("openai-stt"),
    entries: entries.slice(0, 2),
    outDir,
    env: ENV,
    fetch,
    now,
    sleep,
    readAudio: () => WAV,
    concurrency: 1,
  };
  await runVendor(opts);
  const path = resultsPath(outDir, "openai-stt");
  const lines = readFileSync(path, "utf8").trim().split("\n");
  writeFileSync(path, `${lines[0]}\n${lines[1].slice(0, 20)}`);
  const resumed = await runVendor(opts);
  assert.equal(resumed.total, 1);
  assert.equal(fetch.calls.length, 3);
});

test("실행: 길이 초과 · 형식 불일치는 건너뜀(ffmpeg 없음), 받는 벤더는 원본 그대로", async () => {
  const outDir = tmp();
  const { now, sleep } = clock();
  const fetch = fakeFetch(() => new Response(azureOk("가", 50)));
  const mp3 = [{ ...entries[1], audio: "/x/r2.mp3" }, entries[3]];
  const s = await runVendor({
    adapter: adapterById("azure-stt"),
    entries: mp3,
    outDir,
    env: ENV,
    fetch,
    now,
    sleep,
    readAudio: (p) => (p.endsWith(".mp3") ? Buffer.from("ID3.....") : WAV),
    ffmpeg: false,
  });
  assert.equal(s.skipped, 1); // r2: mp3인데 ffmpeg가 없어 변환 못 함
  assert.equal(s.ok, 1); // f1: 40초 ≤ 60초, 16kHz WAV
  const r = readResults(resultsPath(outDir, "azure-stt"));
  assert.match(r.get("r2").reason, /형식/);
  assert.match(r.get("r2").audioNote, /ffmpeg가 없어/);

  const pron = await runVendor({
    adapter: adapterById("azure-pron"),
    entries: [{ ...entries[0], durationSec: 31 }],
    outDir,
    env: ENV,
    fetch,
    now,
    sleep,
    readAudio: () => WAV,
  });
  assert.equal(pron.skipped, 1);
  assert.match(readResults(resultsPath(outDir, "azure-pron")).get("r1").reason, /30초 초과/);

  const dg = fakeFetch(
    () =>
      new Response(
        JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: "가" }] }] } }),
      ),
  );
  const d = await runVendor({
    adapter: adapterById("deepgram-stt"),
    entries: [{ ...entries[1], audio: "/x/r2.mp3" }],
    outDir,
    env: ENV,
    fetch: dg,
    now,
    sleep,
    readAudio: () => Buffer.from("ID3....."),
    ffmpeg: false,
  });
  assert.equal(d.ok, 1);
  assert.equal(dg.calls[0].init.headers["Content-Type"], "audio/mpeg");
});

test("예상 비용: 시간 · 분 · 요청 · 15초 단위, 모르는 단가는 null, 길이 없음은 평균으로", () => {
  const list = [{ durationSec: 30 }, { durationSec: 90 }, {}];
  assert.deepEqual(estimateCost(list, { unit: "minute", price: 0.01 }), {
    n: 3,
    totalSec: 180,
    missingDuration: 1,
    unit: "minute",
    units: 3,
    cost: 0.03,
    perUtterance: 0.01,
  });
  assert.equal(estimateCost(list, { unit: "hour", price: 1 }).cost, 0.05);
  assert.equal(estimateCost(list, { unit: "request", price: 0.002 }).cost, 0.006);
  assert.equal(estimateCost(list, { unit: "per15s", price: 1 }).units, 2 + 6 + 4); // 30→2, 90→6, 평균 60→4
  assert.equal(estimateCost(list, { unit: "minute", price: null }).cost, null);
  const rows = estimateAll(
    [adapterById("azure-pron"), adapterById("openai-stt")],
    entries,
    { vendors: { "openai-stt": { unit: "minute", price: 0.006 } } },
    { via: true },
  );
  assert.deepEqual(
    rows.map((r) => [r.id, r.n]),
    [
      ["azure-pron", 3],
      ["openai-stt", 4],
      ["azure-pron__via__(STT)", 4],
    ],
  );
  assert.equal(rows[0].cost, null);
  assert.ok(Math.abs(rows[1].cost - (47 / 60) * 0.006) < 1e-12);
});

function writeManifestFile(dir) {
  const path = join(dir, "m.jsonl");
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
  return path;
}

test("명령줄: --yes 없이는 비용만 보이고 호출하지 않음, 키 없는 벤더는 이름과 함께 건너뜀", async () => {
  const dir = tmp();
  const out = [];
  const fetch = fakeFetch(() => new Response("{}"));
  const code = await main(
    [
      "run",
      "--manifest",
      writeManifestFile(dir),
      "--out",
      join(dir, "out"),
      "--vendors",
      "azure-pron,deepgram-stt,speechsuper-pron",
    ],
    { env: ENV, fetch, ffmpeg: false, print: (s) => out.push(s) },
  );
  assert.equal(code, 0);
  assert.equal(fetch.calls.length, 0);
  const text = out.join("\n");
  assert.match(
    text,
    /건너뜀: speechsuper-pron — 빠진 환경 변수: SPEECHSUPER_APP_KEY, SPEECHSUPER_SECRET_KEY/,
  );
  assert.match(text, /예상 비용/);
  assert.match(text, /--yes/);
  assert.ok(!existsSync(join(dir, "out", "results")));
});

test("명령줄: 결과 경로가 저장소 안이면 멈춤", async () => {
  assert.ok(insideRepo(join(REPO_ROOT, "devtools")));
  assert.ok(!insideRepo(tmpdir()));
  const dir = tmp();
  await assert.rejects(
    main(
      [
        "run",
        "--yes",
        "--manifest",
        writeManifestFile(dir),
        "--out",
        join(REPO_ROOT, "bench-out"),
        "--vendors",
        "deepgram-stt",
      ],
      { env: ENV, fetch: fakeFetch(() => new Response("{}")), ffmpeg: false, print: () => {} },
    ),
    /저장소 안/,
  );
});

test("명령줄 → 보고서: STT · 발음 · 우회까지 돌리고 마크다운 한 장", async () => {
  const dir = tmp();
  const manifest = writeManifestFile(dir);
  const outDir = join(dir, "out");
  const { now, sleep } = clock();
  const fetch = fakeFetch((url, init) => {
    const pa = init.headers["Pronunciation-Assessment"];
    if (pa) {
      const ref = JSON.parse(Buffer.from(pa, "base64").toString()).ReferenceText;
      return new Response(azureOk(ref, 40 + ref.length * 5));
    }
    return new Response(azureOk("사과를 먹어요", null)); // STT: 늘 기준 문장 쪽으로 받아 적는 엔진
  });
  const deps = {
    env: { AZURE_SPEECH_KEY: "fake", AZURE_SPEECH_REGION: "r" },
    fetch,
    ffmpeg: false,
    now,
    sleep,
    readAudio: () => WAV,
    print: () => {},
  };
  const args = [
    "--manifest",
    manifest,
    "--out",
    outDir,
    "--vendors",
    "azure-stt,azure-pron",
    "--via-stt",
    "azure-stt",
    "--yes",
  ];
  assert.equal(await main(["run", ...args], deps), 0);
  const runs = loadRuns(outDir);
  assert.deepEqual([...runs.keys()], ["azure-pron", "azure-pron__via__azure-stt", "azure-stt"]);
  // 우회는 STT 글(늘 「사과를 먹어요」)을 기준 삼으므로 길이 7 → 75점
  assert.equal(runs.get("azure-pron__via__azure-stt").get("r2").scores.overall, 75);
  const v = viaVsFormal(runs.get("azure-pron__via__azure-stt"), runs.get("azure-pron"), entries);
  assert.equal(v.n, 3);

  assert.equal(await main(["report", "--manifest", manifest, "--out", outDir], deps), 0);
  const md = readFileSync(join(outDir, "report.md"), "utf8");
  assert.match(md, /# 음성 벤더 비교 보고서/);
  assert.match(md, /\| azure-stt \| 4 \|/);
  assert.match(md, /overall~pronunciation/);
  assert.match(md, /azure-pron__via__azure-stt \| 3 \|/);
  // f1(자유, 40초)은 우회 경로의 대상이지만 Azure 발음 평가 30초 제한으로 건너뜀
  assert.match(
    readFileSync(join(outDir, "results", "azure-pron__via__azure-stt.jsonl"), "utf8"),
    /30초 초과/,
  );
  assert.match(md, /기준 문장 쪽으로 받아 적음/);
  // r1만 사람 전사 ≠ 기준 문장, 엔진은 기준 문장과 똑같이 → 100.0% / 100.0% (1)
  assert.match(md, /100\.0% \/ 100\.0% \(1\)/);
  const direct = buildReport({
    entries,
    runs,
    prices: { currency: "USD", vendors: {} },
    generatedAt: "t",
  });
  assert.match(direct, /발화당 비용/);
});
