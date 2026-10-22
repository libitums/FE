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
  /** 창의 fetch가 받은 주소 차례. */
  readonly fetches: string[];
};

/** 페이지 HTML을 띄우고 전역을 그 창으로 바꾼 뒤 trial-main을 새로 import합니다. */
async function boot(
  options: {
    reduce?: boolean;
    recognition?: boolean;
    audio?: boolean;
    /** 모바일처럼 `(pointer: coarse)` · `(hover: none)`이 참. */
    coarse?: boolean;
    /** 사전 등록 요청에 답할 가짜 fetch(오디오 fetch보다 먼저 본다). */
    preregFetch?: (url: string, init: RequestInit) => Promise<Response>;
    edit?: (doc: Document) => void;
    /** navigator.userAgent를 바꾼다(브라우저 분류). */
    userAgent?: string;
  } = {},
): Promise<Boot> {
  const dom = new JSDOM(await trialPageHtml("en"), {
    url: "https://duru.test/try/",
  });
  const window = dom.window as unknown as Window;
  options.edit?.(window.document);
  if (options.userAgent !== undefined) {
    Object.defineProperty(window.navigator, "userAgent", {
      value: options.userAgent,
      configurable: true,
    });
  }
  installClock(window);
  const scope = window as unknown as Record<string, unknown>;
  scope.matchMedia = (query: string) => ({
    matches:
      (options.reduce === true && query.includes("prefers-reduced-motion: reduce")) ||
      (options.coarse === true && (query === "(pointer: coarse)" || query === "(hover: none)")),
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
  const fetches: string[] = [];
  const audioFetch = scope.fetch as ((input: unknown) => Promise<unknown>) | undefined;
  scope.fetch = (input: unknown, init?: RequestInit) => {
    fetches.push(String(input));
    if (String(input).includes("/rest/v1/") && options.preregFetch) {
      return options.preregFetch(String(input), init ?? {});
    }
    return audioFetch ? audioFetch(input) : Promise.reject(new TypeError("offline"));
  };
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
    fetches,
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

  it("trial-main: 모델 JSON이 없으면 컷 1의 Next disabled · 안내가 보이고 눌러도 시작하지 않는다", async () => {
    const { h, gtag } = await boot({
      edit: (doc) => doc.querySelector("#trial-model")?.remove(),
    });
    const next = shown(h, "trial-cuts-next") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(h.root.querySelector("[data-trial-unavailable]")?.hasAttribute("hidden")).toBe(false);
    next.click();
    await settle();
    expect(stepOf(h)).toBe("prologue");
    expect(shown(h, "trial-cut").getAttribute("data-cut-index")).toBe("1");
    expect(gtagEvents(gtag)).toEqual([]);
  });
});

describe("TI14 trial-main 결선 — 실제 어댑터", () => {
  it("움직임 줄이기 미디어 쿼리 → data-motion=reduced, 첫 Next → gtag trial_start(인식기 없음 → unsupported)", async () => {
    const { h, gtag } = await boot({ reduce: true });
    expect(h.root.getAttribute("data-motion")).toBe("reduced");
    expect((shown(h, "trial-cuts-next") as HTMLButtonElement).disabled).toBe(false);
    expect(gtagEvents(gtag)).toEqual([]);
    await tap(h, "trial-cuts-next");
    expect(stepOf(h)).toBe("prologue");
    // 보낼 때 접점이 browser를 붙인다(jsdom UA → desktop).
    expect(gtagEvents(gtag).slice(0, 2)).toEqual([
      { name: "trial_start", params: { speech: "unsupported", browser: "desktop" } },
      { name: "trial_step", params: { step: "prologue", ordinal: "1", browser: "desktop" } },
    ]);
  });

  it("webkitSpeechRecognition → 말하기 턴: ko-KR · 대안 3 · 한 번, 정답 대안이면 Great", async () => {
    const { h, gtag } = await boot({ reduce: true, recognition: true });
    await playToRoleplay(h);
    expect(gtagEvents(gtag)[0]).toEqual({
      name: "trial_start",
      params: { speech: "supported", browser: "desktop" },
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

  it("trial-main: 첫 탭 뒤 interrupted → 다음 Next 클릭이 resume하고 다음 컷 음성을 낸다", async () => {
    const { h } = await boot({ reduce: true, audio: true });
    await tap(h, "trial-cuts-next");
    await settle();
    const context = FakeAudioContext.instances[0];
    expect(context).toBeDefined();
    expect(stepOf(h)).toBe("prologue");
    // 음성이 있는 첫 컷 바로 앞까지 넘긴다(앞 컷들은 음성이 없다)
    const prologue = pageDataOf(h.doc).model.prologue;
    const voiced = prologue.findIndex((cut) => cut.audioUrl !== null);
    expect(voiced).toBeGreaterThan(0);
    // 첫 탭이 이미 컷 2(자리 1)로 넘겼다.
    for (let index = 2; index < voiced; index += 1) {
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
      await tap(h, "trial-cuts-next");
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

describe("TI-B1 trial-main — 열 때 소리 요청 0, 첫 탭에 시작", () => {
  it("열고 기다려도 AudioContext 0 · fetch 0, 첫 Next에 컨텍스트 하나 · 효과음 받기", async () => {
    const { h, fetches } = await boot({ reduce: true, audio: true });
    await settle();
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(fetches).toEqual([]);
    await tap(h, "trial-cuts-next");
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(fetches.some((url) => url.includes("/trial/sfx/"))).toBe(true);
    expect(fetches.some((url) => url.includes("pre-5-dream"))).toBe(true);
  });
});

describe("TI-F trial-main — 모바일 전체화면", () => {
  it("coarse + hover none이면 첫 탭에 documentElement.requestFullscreen 한 번(navigationUI hide)", async () => {
    const calls: unknown[] = [];
    const { h } = await boot({
      reduce: true,
      coarse: true,
      edit: (doc) => {
        (doc.documentElement as unknown as Record<string, unknown>).requestFullscreen = (
          options: unknown,
        ) => {
          calls.push(options);
          return Promise.resolve();
        };
      },
    });
    expect(calls).toEqual([]);
    await tap(h, "trial-cuts-next");
    await tap(h, "trial-cuts-next");
    expect(calls).toEqual([{ navigationUI: "hide" }]);
  });

  it("데스크톱(가는 포인터)은 부르지 않는다 · 함수가 없어도 오류 0", async () => {
    const calls: unknown[] = [];
    const { h, window } = await boot({
      reduce: true,
      edit: (doc) => {
        (doc.documentElement as unknown as Record<string, unknown>).requestFullscreen = () => {
          calls.push("called");
          return Promise.resolve();
        };
      },
    });
    const errors: unknown[] = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    await tap(h, "trial-cuts-next");
    expect(calls).toEqual([]);
    const mobile = await boot({ reduce: true, coarse: true });
    await tap(mobile.h, "trial-cuts-next");
    expect(stepOf(mobile.h)).toBe("prologue");
    expect(errors).toEqual([]);
  });
});

const PIXEL =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const KAKAO =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.0";

describe("TI-M1 trial-main — browser 공통 속성 · 인식 글자 수집", () => {
  it("모든 gtag 이벤트에 UA로 가른 browser(안드로이드 Chrome · 카카오톡 인앱)", async () => {
    for (const [userAgent, browser] of [
      [PIXEL, "android-chrome"],
      [KAKAO, "in-app"],
    ] as const) {
      const { h, gtag } = await boot({ reduce: true, recognition: true, userAgent });
      await playToRoleplay(h);
      const events = gtagEvents(gtag);
      expect(events.length).toBeGreaterThan(5);
      for (const event of events) {
        expect((event.params as Record<string, string>)["browser"], String(event.name)).toBe(
          browser,
        );
      }
      vi.unstubAllGlobals();
    }
  });

  it("말하기 판정 뒤 수집 요청 한 번 — 본문 열 아홉 · keepalive · session_id(uuid, 같은 페이지 같은 값), 시도 이벤트에 browser", async () => {
    const posts: { url: string; init: RequestInit }[] = [];
    const { h, gtag } = await boot({
      reduce: true,
      recognition: true,
      userAgent: PIXEL,
      preregFetch: (url, init) => {
        posts.push({ url, init });
        return Promise.resolve(new Response(null, { status: 201 }));
      },
    });
    await playToRoleplay(h);
    await tap(h, "trial-turn-speak");
    latestRecognition()?.hear("안녕 가세요", "안녕하세요 네 처음 이에요");
    await settle();
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    await tap(h, "trial-turn-next");
    await tap(h, "trial-turn-speak");
    latestRecognition()?.hear("죄송합니다");
    await settle();
    const samples = posts.filter(({ url }) => url.endsWith("/rest/v1/trial_speech_samples"));
    expect(samples).toHaveLength(2);
    const [first, second] = samples.map(
      ({ init }) => JSON.parse(String(init.body)) as Record<string, unknown>,
    );
    expect(Object.keys(first ?? {}).sort()).toEqual(
      [
        "alternatives",
        "browser",
        "episode_version",
        "expected",
        "locale",
        "outcome",
        "session_id",
        "similarity",
        "turn_index",
      ].sort(),
    );
    expect(first).toMatchObject({
      turn_index: 0,
      expected: "안녕하세요! 네, 처음이에요!",
      alternatives: ["안녕 가세요", "안녕하세요 네 처음 이에요"],
      outcome: "lenient",
      similarity: 1,
      browser: "android-chrome",
      locale: "en",
    });
    expect(String(first?.["session_id"])).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second?.["session_id"]).toBe(first?.["session_id"]);
    expect(second).toMatchObject({ turn_index: 1, outcome: "incorrect" });
    expect(samples[0]?.init).toMatchObject({
      method: "POST",
      keepalive: true,
      credentials: "omit",
    });
    expect((samples[0]?.init.headers as Record<string, string>)["apikey"]).toBeTruthy();
    const attemptsSent = gtagEvents(gtag).filter((event) => event.name === "trial_speech_attempt");
    expect(attemptsSent.map((event) => event.params)).toEqual([
      {
        turn: "1",
        outcome: "lenient",
        latency_bucket: expect.any(String),
        browser: "android-chrome",
      },
      {
        turn: "2",
        outcome: "incorrect",
        latency_bucket: expect.any(String),
        browser: "android-chrome",
      },
    ]);
  });

  it("수집 요청이 거부돼도 판정 · 진행은 그대로, 다시 보내지 않는다", async () => {
    let calls = 0;
    const { h } = await boot({
      reduce: true,
      recognition: true,
      preregFetch: () => {
        calls += 1;
        return Promise.reject(new TypeError("offline"));
      },
    });
    await playToRoleplay(h);
    await tap(h, "trial-turn-speak");
    latestRecognition()?.hear(SPEECH_CORRECT[0] ?? "");
    await settle();
    expect(calls).toBe(1);
    await tap(h, "trial-turn-next");
    expect(shown(h, "trial-turn").getAttribute("data-turn-index")).toBe("1");
    expect(calls).toBe(1);
  });
});
