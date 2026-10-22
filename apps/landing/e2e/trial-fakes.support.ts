import type { Page } from "@playwright/test";
import { supabaseUrl } from "../playwright.config";
import { contentHost } from "./trial.support";

// 체험판 e2e의 가짜 접점입니다 — 음성 버킷 가로채기(무음 소리 · 404)와 말하기 인식기(가짜 · 없음).

/** 0.05초 무음 WAV — 어느 엔진의 decodeAudioData도 풉니다(받은 뒤 진행은 소리 성공 · 실패와 무관). */
function silentWav(): Buffer {
  const rate = 8_000;
  const samples = 400;
  const data = samples * 2;
  const buffer = Buffer.alloc(44 + data);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + data, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(data, 40);
  return buffer;
}

export interface SoundLog {
  /** 버킷에 간 요청의 전체 주소. */
  voice: string[];
  /** 같은 출처 효과음 요청의 경로. */
  sfx: string[];
}

/** 버킷 요청을 가로챕니다 — `ok`면 무음 소리, `missing`이면 404. 요청 기록을 돌려줍니다. */
export async function routeSound(page: Page, mode: "ok" | "missing" = "ok"): Promise<SoundLog> {
  const log: SoundLog = { voice: [], sfx: [] };
  const body = silentWav();
  await page.route(`${supabaseUrl}/**`, (route) =>
    mode === "ok"
      ? route.fulfill({
          status: 200,
          contentType: "audio/mp4",
          headers: { "access-control-allow-origin": "*" },
          body,
        })
      : route.fulfill({
          status: 404,
          contentType: "text/plain",
          headers: { "access-control-allow-origin": "*" },
          body: "not found",
        }),
  );
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === contentHost) log.voice.push(request.url());
    else if (url.pathname.startsWith("/trial/sfx/")) log.sfx.push(url.pathname);
  });
  return log;
}

/** 말하기 생성자 둘을 지웁니다 → 처음부터 타일. */
export function withoutSpeech(page: Page) {
  return page.addInitScript(() => {
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
  });
}

export type FakeOutcome = { heard: string[] } | { error: string };

/** 가짜 인식기를 넣습니다. `start()`는 줄 세운 결과(`say`)를 하나 꺼내 비동기로 냅니다. */
export function withFakeSpeech(page: Page) {
  return page.addInitScript(() => {
    type Outcome = { heard: string[] } | { error: string };
    const scope = window as unknown as {
      __speechQueue: Outcome[];
      __speechStarts: { lang: string; maxAlternatives: number }[];
    };
    scope.__speechQueue = [];
    scope.__speechStarts = [];
    class FakeRecognition {
      lang = "";
      continuous = true;
      interimResults = true;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      private ended = false;
      start() {
        scope.__speechStarts.push({
          lang: this.lang,
          maxAlternatives: this.maxAlternatives,
        });
        const next = scope.__speechQueue.shift();
        if (!next) return;
        setTimeout(() => {
          if (this.ended) return;
          if ("error" in next) this.onerror?.({ error: next.error });
          else
            this.onresult?.({
              results: [next.heard.map((transcript) => ({ transcript }))],
            });
          this.end();
        }, 30);
      }
      stop() {
        setTimeout(() => this.end(), 0);
      }
      abort() {
        if (this.ended) return;
        this.onerror?.({ error: "aborted" });
        this.end();
      }
      private end() {
        if (this.ended) return;
        this.ended = true;
        this.onend?.();
      }
    }
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
      Object.defineProperty(window, name, {
        value: FakeRecognition,
        configurable: true,
        writable: true,
      });
    }
  });
}

/** 다음 인식 결과를 줄 세웁니다. */
export const say = (page: Page, outcome: FakeOutcome) =>
  page.evaluate((value) => {
    (window as unknown as { __speechQueue: unknown[] }).__speechQueue.push(value);
  }, outcome);

export const speechStarts = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __speechStarts: { lang: string; maxAlternatives: number }[];
        }
      ).__speechStarts,
  );
