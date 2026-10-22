// 페이지 진입 통합 — 실제 TrialPage HTML + trial-main(readTrialModel · createTrialAudio · createTrialSpeech ·
// gtag 전송 · matchMedia)을 띄웁니다. 브라우저 전역(SpeechRecognition · AudioContext · fetch · gtag)만 가짜입니다.

import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { textOf } from "../components/trial/trial-ui.support";
import { createTrialAudio } from "./trial-audio";
import { readTrialModel } from "./trial-controller";
import {
  type Harness,
  installClock,
  pageDataOf,
  playToRoleplay,
  settle,
  shown,
  stepOf,
  tap,
  trialPageHtml,
  uninstallClock,
} from "./trial-flow.test-support";
import { SPEECH_CORRECT } from "./trial.test-support";

afterEach(() => {
  uninstallClock();
  FakeRecognition.instances = [];
  FakeAudioContext.resumeFailure = null;
});

type Listener = (event: unknown) => void;

/** Web Speech 인식기 대역 — 설정 값과 start · stop · abort를 기록하고, 테스트가 이벤트를 낸다. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = true;
  interimResults = true;
  maxAlternatives = 1;
  started = 0;
  stopped = 0;
  aborted = 0;
  private readonly listeners = new Map<string, Listener[]>();
  [handler: `on${string}`]: Listener | null | undefined;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started += 1;
  }
  stop() {
    this.stopped += 1;
  }
  abort() {
    this.aborted += 1;
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== listener),
    );
  }
  emit(type: string, event: object = {}) {
    const payload = { type, ...event };
    this[`on${type}`]?.(payload);
    for (const listener of this.listeners.get(type) ?? []) listener(payload);
  }
  /** 대안들을 한 결과로 내고 끝낸다. */
  hear(...alternatives: string[]) {
    this.emit("result", {
      results: [alternatives.map((transcript) => ({ transcript }))],
    });
    this.emit("end");
  }
}

const latestRecognition = () => FakeRecognition.instances.at(-1);

type Boot = {
  readonly h: Harness;
  readonly gtag: unknown[][];
  readonly window: Window;
};

/** 페이지 HTML을 띄우고 전역을 그 창으로 바꾼 뒤 trial-main을 새로 import합니다. */
async function boot(
  options: {
    reduce?: boolean;
    recognition?: boolean;
    audio?: boolean;
    edit?: (doc: Document) => void;
  } = {},
): Promise<Boot> {
  const dom = new JSDOM(await trialPageHtml("en"), {
    url: "https://duru.test/try/",
  });
  const window = dom.window as unknown as Window;
  options.edit?.(window.document);
  installClock(window);
  const scope = window as unknown as Record<string, unknown>;
  scope.matchMedia = (query: string) => ({
    matches: options.reduce === true && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
  const gtag: unknown[][] = [];
  scope.gtag = (...args: unknown[]) => gtag.push(args);
  if (options.recognition === true) scope.webkitSpeechRecognition = FakeRecognition;
  if (options.audio === true) {
    FakeAudioContext.instances = [];
    FakeAudioContext.log = [];
    scope.AudioContext = FakeAudioContext;
    scope.fetch = okFetch;
  }
  for (const name of ["window", "document", "HTMLElement", "Element", "Node", "Event"] as const) {
    vi.stubGlobal(name, name === "window" ? window : scope[name]);
  }
  vi.resetModules();
  await import("./trial-main");
  await settle();
  const root = window.document.querySelector('[data-testid="trial"]') as HTMLElement;
  return {
    h: { root, doc: window.document } as unknown as Harness,
    gtag,
    window,
  };
}

const gtagEvents = (gtag: unknown[][]) =>
  gtag.filter((call) => call[0] === "event").map((call) => ({ name: call[1], params: call[2] }));

describe("TI13 readTrialModel · 모델 없음", () => {
  it("페이지 JSON → { model, copy }, 없음 · 깨짐 → null", async () => {
    const html = await trialPageHtml("en");
    const doc = new JSDOM(html).window.document;
    expect(readTrialModel(doc)).toEqual(pageDataOf(doc));
    const missing = new JSDOM(html).window.document;
    missing.querySelector("#trial-model")?.remove();
    expect(readTrialModel(missing)).toBeNull();
    const broken = new JSDOM(html).window.document;
    const script = broken.querySelector("#trial-model") as Element;
    script.textContent = "{ not json";
    expect(readTrialModel(broken)).toBeNull();
  });

  it("trial-main: 모델 JSON이 없으면 시작 버튼 disabled · 눌러도 시작하지 않는다", async () => {
    const { h, gtag } = await boot({
      edit: (doc) => doc.querySelector("#trial-model")?.remove(),
    });
    const start = shown(h, "trial-start-button") as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    start.click();
    await settle();
    expect(stepOf(h)).toBe("start");
    expect(gtagEvents(gtag)).toEqual([]);
  });
});

describe("TI14 trial-main 결선 — 실제 어댑터", () => {
  it("움직임 줄이기 미디어 쿼리 → data-motion=reduced, Start → gtag trial_start(인식기 없음 → unsupported)", async () => {
    const { h, gtag } = await boot({ reduce: true });
    expect(h.root.getAttribute("data-motion")).toBe("reduced");
    expect((shown(h, "trial-start-button") as HTMLButtonElement).disabled).toBe(false);
    await tap(h, "trial-start-button");
    expect(stepOf(h)).toBe("prologue");
    expect(gtagEvents(gtag).slice(0, 2)).toEqual([
      { name: "trial_start", params: { speech: "unsupported" } },
      { name: "trial_step", params: { step: "prologue", ordinal: "1" } },
    ]);
  });

  it("webkitSpeechRecognition → 말하기 턴: ko-KR · 대안 3 · 한 번, 정답 대안이면 Great", async () => {
    const { h, gtag } = await boot({ reduce: true, recognition: true });
    await playToRoleplay(h);
    expect(gtagEvents(gtag)[0]).toEqual({
      name: "trial_start",
      params: { speech: "supported" },
    });
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("speech");
    await tap(h, "trial-turn-speak");
    const recognition = latestRecognition();
    expect(recognition).toBeDefined();
    expect(recognition?.lang).toBe("ko-KR");
    expect(recognition?.maxAlternatives).toBe(3);
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(false);
    expect(recognition?.started).toBe(1);
    expect(shown(h, "trial-turn").getAttribute("data-phase")).toBe("listening");
    recognition?.hear("안녕 하세요", SPEECH_CORRECT[0] ?? "");
    await settle();
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    expect(textOf(shown(h, "trial-turn-heard"))).toContain(SPEECH_CORRECT[0] ?? "");
  });

  it("인식 오류 not-allowed → 그 턴 타일 · notice denied", async () => {
    const { h } = await boot({ reduce: true, recognition: true });
    await playToRoleplay(h);
    await tap(h, "trial-turn-speak");
    latestRecognition()?.emit("error", { error: "not-allowed" });
    latestRecognition()?.emit("end");
    await settle();
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
    expect(shown(h, "trial-turn-notice").getAttribute("data-notice")).toBe("denied");
  });

  it("결과 없이 end → 못 들음(오답 판정), 8초가 지나면 인식기를 멈춘다", async () => {
    const { h } = await boot({ reduce: true, recognition: true });
    await playToRoleplay(h);
    shown(h, "trial-turn-speak").click();
    await vi.advanceTimersByTimeAsync(8_000);
    const recognition = latestRecognition();
    expect((recognition?.stopped ?? 0) + (recognition?.aborted ?? 0)).toBeGreaterThanOrEqual(1);
    recognition?.emit("end");
    await settle();
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
  });
});

/** Web Audio 대역 — 컨텍스트 · resume · 소스 재생(끝나면 ended)을 기록. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  /** resume · 소스 시작의 순서 기록(모든 인스턴스 공통). */
  static log: ("resume" | "start")[] = [];
  /** "reject" → resume이 거부, "throw" → resume이 동기로 던짐. */
  static resumeFailure: "reject" | "throw" | null = null;
  state = "suspended";
  resumes = 0;
  readonly destination = {};
  readonly started: unknown[] = [];
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  resume() {
    this.resumes += 1;
    FakeAudioContext.log.push("resume");
    if (FakeAudioContext.resumeFailure === "throw") throw new Error("resume blocked");
    if (FakeAudioContext.resumeFailure === "reject") return Promise.reject(new Error("blocked"));
    this.state = "running";
    return Promise.resolve();
  }
  /** iOS 통화 · 백그라운드 · 마이크 사용처럼 시작 뒤 컨텍스트가 멈춘 상태. */
  interrupt(state: "suspended" | "interrupted") {
    this.state = state;
  }
  createBuffer() {
    return { duration: 0 };
  }
  createGain() {
    return {
      gain: { value: 1 },
      connect: () => undefined,
      disconnect: () => undefined,
    };
  }
  decodeAudioData(_data: ArrayBuffer, ok?: (buffer: object) => void) {
    const buffer = { duration: 0.5 };
    ok?.(buffer);
    return Promise.resolve(buffer);
  }
  createBufferSource() {
    const listeners: (() => void)[] = [];
    const end = () => {
      source.onended?.();
      for (const listener of listeners) listener();
    };
    const source = {
      buffer: null as unknown,
      onended: null as (() => void) | null,
      connect: () => undefined,
      disconnect: () => undefined,
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
      removeEventListener: () => undefined,
      start: () => {
        FakeAudioContext.log.push("start");
        this.started.push(source.buffer);
        globalThis.setTimeout(end, 500);
      },
      stop: () => globalThis.setTimeout(end, 0),
    };
    return source;
  }
}

const okFetch = (input: unknown) => {
  const ok = !String(input).includes("missing");
  return Promise.resolve({
    ok,
    status: ok ? 200 : 404,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });
};

function audioWindow(withContext: boolean) {
  const window = new JSDOM("", { url: "https://duru.test/try/" }).window as unknown as Window;
  installClock(window);
  FakeAudioContext.instances = [];
  FakeAudioContext.log = [];
  FakeAudioContext.resumeFailure = null;
  const requested: string[] = [];
  const fetch = (input: unknown) => {
    const url = String(input);
    requested.push(url);
    const ok = !url.includes("missing");
    return Promise.resolve({
      ok,
      status: ok ? 200 : 404,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
  };
  const scope = window as unknown as Record<string, unknown>;
  scope.fetch = fetch;
  vi.stubGlobal("fetch", fetch);
  if (withContext) scope.AudioContext = FakeAudioContext;
  return { audio: createTrialAudio(window, "/trial/sfx/"), requested };
}

describe("TI15 createTrialAudio — Web Audio 대역", () => {
  it("잠금 전 음성은 failed, unlock은 컨텍스트 하나 · resume", async () => {
    const { audio } = audioWindow(true);
    await expect(audio.playVoice("https://c.test/a.m4a")).resolves.toBe("failed");
    audio.unlock();
    audio.unlock();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0]?.resumes).toBeGreaterThanOrEqual(1);
  });

  it("잠금 뒤 음성은 받아 재생해 ended, 404는 failed, 멈추면 stopped", async () => {
    const { audio, requested } = audioWindow(true);
    audio.unlock();
    const played = audio.playVoice("https://c.test/audio/ok.m4a");
    await settle(2_000);
    await expect(played).resolves.toBe("ended");
    expect(requested).toContain("https://c.test/audio/ok.m4a");
    const missing = audio.playVoice("https://c.test/audio/missing.m4a");
    await settle(2_000);
    await expect(missing).resolves.toBe("failed");
    const stopped = audio.playVoice("https://c.test/audio/ok2.m4a");
    await vi.advanceTimersByTimeAsync(50);
    audio.stopVoice();
    await settle(2_000);
    await expect(stopped).resolves.toBe("stopped");
  });

  it("효과음은 /trial/sfx/<이름>.mp3를 받는다", async () => {
    const { audio, requested } = audioWindow(true);
    audio.unlock();
    audio.playSfx("button");
    await settle(2_000);
    expect(requested.some((url) => url.endsWith("/trial/sfx/button.mp3"))).toBe(true);
  });

  it("AudioContext가 없으면 unlock은 조용하고 음성은 failed", async () => {
    const { audio } = audioWindow(false);
    expect(() => audio.unlock()).not.toThrow();
    const played = audio.playVoice("https://c.test/audio/ok.m4a");
    await settle(2_000);
    await expect(played).resolves.toBe("failed");
  });
});

/** 마지막 "resume" 뒤에 "start"가 있는가 — 컨텍스트를 깨운 다음 소리를 냈다는 순서. */
const resumedThenStarted = (log: readonly string[]) => {
  const resumed = log.indexOf("resume");
  return resumed !== -1 && log.indexOf("start", resumed) > resumed;
};

describe("TI16 시작 뒤 멈춘 컨텍스트(iOS 통화 · 백그라운드 · 마이크) — 다시 깨운다", () => {
  it.each(["suspended", "interrupted"] as const)(
    "%s → playVoice는 resume한 뒤 재생해 ended",
    async (state) => {
      const { audio } = audioWindow(true);
      audio.unlock();
      await settle(2_000);
      const context = FakeAudioContext.instances[0];
      context?.interrupt(state);
      FakeAudioContext.log = [];
      const played = audio.playVoice("https://c.test/audio/ok.m4a");
      await settle(2_000);
      await expect(played).resolves.toBe("ended");
      expect(resumedThenStarted(FakeAudioContext.log)).toBe(true);
      expect(context?.state).toBe("running");
    },
  );

  it("interrupted → playSfx도 resume한 뒤 낸다", async () => {
    const { audio } = audioWindow(true);
    audio.unlock();
    await settle(2_000);
    FakeAudioContext.instances[0]?.interrupt("interrupted");
    FakeAudioContext.log = [];
    audio.playSfx("button");
    await settle(2_000);
    expect(resumedThenStarted(FakeAudioContext.log)).toBe(true);
  });

  it("running이면 재생 전에 resume하지 않는다", async () => {
    const { audio } = audioWindow(true);
    audio.unlock();
    await settle(2_000);
    FakeAudioContext.log = [];
    const played = audio.playVoice("https://c.test/audio/ok.m4a");
    await settle(2_000);
    await expect(played).resolves.toBe("ended");
    expect(FakeAudioContext.log).toEqual(["start"]);
  });

  it.each(["reject", "throw"] as const)(
    "resume이 %s여도 던지지 않고 재생을 시도한다",
    async (failure) => {
      const { audio } = audioWindow(true);
      audio.unlock();
      await settle(2_000);
      FakeAudioContext.instances[0]?.interrupt("interrupted");
      FakeAudioContext.resumeFailure = failure;
      FakeAudioContext.log = [];
      let played: Promise<unknown> = Promise.resolve();
      expect(() => {
        played = audio.playVoice("https://c.test/audio/ok.m4a");
        audio.playSfx("button");
      }).not.toThrow();
      await settle(2_000);
      await expect(played).resolves.toBe("ended");
      expect(FakeAudioContext.log.filter((entry) => entry === "start")).toHaveLength(2);
    },
  );

  it("trial-main: Start 뒤 interrupted → 다음 Next 클릭이 resume하고 다음 컷 음성을 낸다", async () => {
    const { h } = await boot({ reduce: true, audio: true });
    await tap(h, "trial-start-button");
    await settle();
    const context = FakeAudioContext.instances[0];
    expect(context).toBeDefined();
    expect(stepOf(h)).toBe("prologue");
    // 음성이 있는 첫 컷 바로 앞까지 넘긴다(앞 컷들은 음성이 없다)
    const prologue = pageDataOf(h.doc).model.prologue;
    const voiced = prologue.findIndex((cut) => cut.audioUrl !== null);
    expect(voiced).toBeGreaterThan(0);
    for (let index = 1; index < voiced; index += 1) {
      await tap(h, "trial-cuts-next");
      await settle();
    }
    context?.interrupt("interrupted");
    FakeAudioContext.log = [];
    await tap(h, "trial-cuts-next");
    await settle();
    expect(context?.state).toBe("running");
    expect(resumedThenStarted(FakeAudioContext.log)).toBe(true);
  });

  type View = Window & typeof globalThis;
  const viewOf = (doc: Document) => doc.defaultView as View;
  it.each([
    [
      "pointerdown",
      (doc: Document) => new (viewOf(doc).MouseEvent)("pointerdown", { bubbles: true }),
    ],
    [
      "keydown",
      (doc: Document) =>
        new (viewOf(doc).KeyboardEvent)("keydown", {
          bubbles: true,
          key: "Tab",
        }),
    ],
  ] as const)(
    "trial-main: 체험판 안의 %s(사용자 활성화)마다 멈춘 컨텍스트를 resume — 던지지 않는다",
    async (_name, make) => {
      const { h } = await boot({ reduce: true, audio: true });
      await tap(h, "trial-start-button");
      await settle();
      const context = FakeAudioContext.instances[0];
      context?.interrupt("suspended");
      const before = context?.resumes ?? 0;
      const target = shown(h, "trial-cuts-next");
      expect(() => target.dispatchEvent(make(h.doc))).not.toThrow();
      expect(context?.resumes).toBe(before + 1);
      expect(context?.state).toBe("running");
      // 이미 running이면 다시 부르지 않는다
      target.dispatchEvent(make(h.doc));
      expect(context?.resumes).toBe(before + 1);
    },
  );
});
