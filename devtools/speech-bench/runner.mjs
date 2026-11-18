// 벤더 실행기: 호출 · 지연 측정 · 재시도 · 속도 제한 · 동시 실행 · 이어 하기.
// fetch · sleep · now를 주입받아 테스트는 가짜로만 돕니다.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { prepareAudio } from "./audio.mjs";
import { VendorError } from "./vendors.mjs";

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 결과 파일 이름. 우회 경로는 `<발음벤더>__via__<STT벤더>`. */
export const runId = (adapterId, viaStt = null) =>
  viaStt ? `${adapterId}__via__${viaStt}` : adapterId;
export const resultsPath = (outDir, id) => join(outDir, "results", `${id}.jsonl`);

/** 결과 JSONL을 읽어 id별 마지막 기록을 돌려줍니다(이어 하기 · 보고서 공용). */
export function readResults(path) {
  const out = new Map();
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      out.set(r.id, r);
    } catch {
      // 중단으로 잘린 마지막 줄은 버립니다 — 그 발화는 다시 돕니다.
    }
  }
  return out;
}

/** 한 번 호출합니다. 성공이면 해석 결과 + latencyMs + raw, 실패면 VendorError를 던집니다. */
export async function callVendor(adapter, input, { fetch, now = Date.now }) {
  const req = adapter.build(input);
  const started = now();
  let res;
  try {
    res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  } catch (error) {
    throw new VendorError(`네트워크 오류: ${error.message}`, { retryable: true });
  }
  const text = await res.text();
  const latencyMs = now() - started;
  if (!res.ok) {
    const retryAfter = Number(res.headers?.get?.("retry-after"));
    throw new VendorError(`HTTP ${res.status}: ${text.slice(0, 300)}`, {
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
      retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null,
    });
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new VendorError(`JSON이 아닌 응답: ${text.slice(0, 200)}`, { status: res.status });
  }
  return { ...adapter.parse(json), latencyMs, raw: json };
}

/** 재시도: 429 · 5xx · 네트워크 오류만, 지수 백오프(Retry-After가 있으면 그 값). */
export async function withRetry(
  fn,
  { maxAttempts = 3, baseDelayMs = 1000, sleep = realSleep } = {},
) {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      return { value: await fn(), attempts: attempt };
    } catch (error) {
      if (!(error instanceof VendorError) || !error.retryable || attempt >= maxAttempts) {
        error.attempts = attempt;
        throw error;
      }
      await sleep(error.retryAfterMs ?? baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

/** 시작 간격을 minIntervalMs 이상으로 벌리는 속도 제한기. */
export function createLimiter(minIntervalMs, { now = Date.now, sleep = realSleep } = {}) {
  let next = 0;
  return async () => {
    const t = now();
    const at = Math.max(t, next);
    next = at + minIntervalMs;
    if (at > t) await sleep(at - t);
  };
}

/** 할 일 목록: 과제마다 대상 발화가 다릅니다. */
export function tasksFor(adapter, entries, { viaTranscripts = null } = {}) {
  if (viaTranscripts) {
    return entries
      .filter(
        (e) =>
          typeof viaTranscripts.get(e.id) === "string" && viaTranscripts.get(e.id).trim() !== "",
      )
      .map((e) => ({ entry: e, referenceText: viaTranscripts.get(e.id) }));
  }
  if (adapter.task === "pron")
    return entries
      .filter((e) => e.type === "read" && e.referenceText)
      .map((e) => ({ entry: e, referenceText: e.referenceText }));
  return entries.map((e) => ({ entry: e, referenceText: null }));
}

/**
 * 한 벤더(또는 우회 경로)를 끝까지 돕니다. 이미 결과가 있는 발화는 건너뜁니다 —
 * 성공 · 건너뜀은 언제나, 실패는 retryFailed가 아닐 때.
 */
export async function runVendor({
  adapter,
  entries,
  outDir,
  env,
  fetch,
  ffmpeg = false,
  viaStt = null,
  viaTranscripts = null,
  concurrency = 2,
  minIntervalMs = 250,
  maxAttempts = 3,
  retryFailed = false,
  sleep = realSleep,
  now = Date.now,
  spawn,
  readAudio,
  log = () => {},
}) {
  const id = runId(adapter.id, viaStt);
  const path = resultsPath(outDir, id);
  mkdirSync(join(outDir, "results"), { recursive: true });
  const previous = readResults(path);
  const isDone = (r) => r && (r.ok || r.skipped || !retryFailed);
  const todo = tasksFor(adapter, entries, { viaTranscripts }).filter(
    (t) => !isDone(previous.get(t.entry.id)),
  );
  const summary = { id, total: todo.length, alreadyDone: 0, ok: 0, failed: 0, skipped: 0 };
  summary.alreadyDone = tasksFor(adapter, entries, { viaTranscripts }).length - todo.length;

  const limit = createLimiter(minIntervalMs, { now, sleep });
  const write = (record) =>
    appendFileSync(
      path,
      JSON.stringify({ ...record, vendor: id, at: new Date(now()).toISOString() }) + "\n",
    );

  let cursor = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      const { entry, referenceText } = todo[cursor++];
      if (adapter.maxSec && entry.durationSec && entry.durationSec > adapter.maxSec) {
        write({
          id: entry.id,
          ok: false,
          skipped: true,
          reason: `${adapter.maxSec}초 초과(${entry.durationSec}초)`,
        });
        summary.skipped += 1;
        continue;
      }
      let audio;
      try {
        audio = prepareAudio(entry.audio, {
          cacheDir: join(outDir, "audio-cache"),
          id: entry.id,
          ffmpeg,
          spawn,
          read: readAudio,
        });
      } catch (error) {
        write({
          id: entry.id,
          ok: false,
          skipped: true,
          reason: `오디오를 읽지 못함: ${error.message}`,
        });
        summary.skipped += 1;
        continue;
      }
      if (!audio.wav16k && (adapter.needsWav16k || !adapter.acceptExts.includes(audio.ext))) {
        write({
          id: entry.id,
          ok: false,
          skipped: true,
          reason: `형식 맞지 않음(${audio.ext})`,
          audioNote: audio.note,
        });
        summary.skipped += 1;
        continue;
      }
      await limit();
      try {
        const { value, attempts } = await withRetry(
          () =>
            callVendor(
              adapter,
              { audio: audio.buffer, ext: audio.ext, referenceText, env, now },
              { fetch, now },
            ),
          { maxAttempts, sleep },
        );
        write({
          id: entry.id,
          ok: true,
          ...value,
          referenceUsed: referenceText,
          attempts,
          audioNote: audio.note,
        });
        summary.ok += 1;
      } catch (error) {
        write({
          id: entry.id,
          ok: false,
          error: error.message,
          status: error.status ?? null,
          attempts: error.attempts ?? 1,
          audioNote: audio.note,
        });
        summary.failed += 1;
      }
      log(`${id}: ${summary.ok + summary.failed + summary.skipped}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return summary;
}
