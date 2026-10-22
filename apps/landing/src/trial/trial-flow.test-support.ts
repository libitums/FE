// 통합 테스트 지원 — 실제 TrialPage를 렌더한 HTML을 JSDOM으로 띄우고, 가짜 접점(소리 · 말하기 · 전송)으로
// initTrial을 붙입니다. 시계는 가짜(vitest)이고 JSDOM 창의 타이머도 같은 가짜 시계로 돌립니다.

import { JSDOM } from "jsdom";
import { expect, vi } from "vitest";

import type { TrialPageData, TrialTestId } from "../components/trial/trial-components.contract";
import TrialPage from "../components/trial/TrialPage.astro";
import { allByTestId, isHiddenWithin, textOf } from "../components/trial/trial-ui.support";
import { render } from "../components/render.support";
import type { AnalyticsEvent } from "../scripts/analytics.contract";
import type { Language } from "../site";
import { initTrial } from "./trial-controller";
import {
  type FakeAudio,
  type FakeFullscreen,
  type FakePrereg,
  type FakeSamples,
  type FakeSpeech,
  fakeAudio,
  fakeFullscreen,
  fakePrereg,
  fakeSamples,
  fakeSpeech,
} from "./trial-fakes.test-support";
import type { SpeechOutcome, TrialController, VoiceOutcome } from "./trial-ports.contract";
import type { TrialPreregConfig } from "./trial-prereg.contract";
import type { TrialSamplesConfig } from "./trial-samples.contract";
import { u00TrialModel } from "./trial.test-support";

const pageHtml = new Map<Language, string>();

/** 테스트 빌드의 사전 등록 설정(en 페이지만 — ko는 key 없는 빌드처럼 null). 주소는 어디에도 닿지 않는다. */
export const TEST_PREREG: TrialPreregConfig = {
  endpoint: "https://proj.example.test/rest/v1/pre_registrations",
  apiKey: "sb_publishable_test_key_0000000000",
};

/** 테스트 빌드의 수집 설정(en 페이지만). 주소는 어디에도 닿지 않는다. */
export const TEST_SAMPLES: TrialSamplesConfig = {
  endpoint: "https://proj.example.test/rest/v1/trial_speech_samples",
  apiKey: "sb_publishable_test_key_0000000000",
};

/** 실제 TrialPage(u00 모델) HTML — 언어마다 한 번만 렌더합니다. */
export async function trialPageHtml(language: Language): Promise<string> {
  const cached = pageHtml.get(language);
  if (cached !== undefined) return cached;
  const { html } = await render(TrialPage, {
    props: {
      language,
      model: u00TrialModel(),
      measurementId: "",
      prereg: language === "en" ? TEST_PREREG : null,
      samples: language === "en" ? TEST_SAMPLES : null,
    },
  });
  pageHtml.set(language, html);
  return html;
}

/** 페이지 JSON(`trial-model`)을 그대로 읽습니다 — readTrialModel과 독립. */
export function pageDataOf(doc: Document): TrialPageData {
  const script = doc.querySelector('[data-testid="trial-model"]');
  return JSON.parse(script?.textContent ?? "") as TrialPageData;
}

/** 가짜 시계를 켜고 JSDOM 창의 타이머 · rAF를 같은 시계에 묶습니다. */
export function installClock(window: Window): void {
  vi.useFakeTimers();
  const scope = window as unknown as Record<string, unknown>;
  scope.setTimeout = (...args: Parameters<typeof setTimeout>) => globalThis.setTimeout(...args);
  scope.clearTimeout = (id: Parameters<typeof clearTimeout>[0]) => globalThis.clearTimeout(id);
  scope.setInterval = (...args: Parameters<typeof setInterval>) => globalThis.setInterval(...args);
  scope.clearInterval = (id: Parameters<typeof clearInterval>[0]) => globalThis.clearInterval(id);
  const raf = (callback: FrameRequestCallback) =>
    globalThis.setTimeout(() => callback(Date.now()), 16) as unknown as number;
  const caf = (id: number) => globalThis.clearTimeout(id);
  scope.requestAnimationFrame = raf;
  scope.cancelAnimationFrame = caf;
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", caf);
}

export function uninstallClock(): void {
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

/** 마이크로태스크만 비웁니다(시계는 움직이지 않음) — 「곧바로」 관찰할 때. */
export async function flush(): Promise<void> {
  for (let round = 0; round < 20; round += 1) await Promise.resolve();
}

/** 모든 움직임(타자 · 전환 · 폭죽)이 끝날 만큼 시계를 돌립니다. */
export const settle = (ms = 30_000) => vi.advanceTimersByTimeAsync(ms);

export * from "./trial-fakes.test-support";

export type MountOptions = {
  readonly language?: Language;
  readonly speech?: "supported" | "unsupported";
  readonly voice?: VoiceOutcome;
  readonly reducedMotion?: boolean;
  /** 사전 등록 접점 — 기본은 가짜 접점, false면 없음(null). */
  readonly prereg?: boolean;
  /** 수집 접점 — 기본은 가짜 접점, false면 없음(null), "throwing"이면 던지는 접점. */
  readonly samples?: boolean | "throwing";
};

export type Harness = {
  readonly window: Window;
  readonly doc: Document;
  readonly root: HTMLElement;
  readonly data: TrialPageData;
  readonly audio: FakeAudio;
  readonly speech: FakeSpeech;
  readonly sent: AnalyticsEvent[];
  readonly errors: unknown[];
  readonly fullscreen: FakeFullscreen;
  readonly prereg: FakePrereg;
  readonly samples: FakeSamples;
  readonly controller: TrialController;
};

/** 렌더 → JSDOM → initTrial(가짜 접점). 기본은 움직임 줄이기 · 말하기 지원 · 음성 성공. */
export async function mountTrial(options: MountOptions = {}): Promise<Harness> {
  const language = options.language ?? "en";
  const dom = new JSDOM(await trialPageHtml(language), {
    url: language === "en" ? "https://duru.test/try/" : `https://duru.test/${language}/try/`,
  });
  const window = dom.window as unknown as Window;
  const doc = window.document;
  installClock(window);
  const errors: unknown[] = [];
  window.addEventListener("error", (event) => errors.push(event.error ?? event.message));
  const root = doc.querySelector('[data-testid="trial"]') as HTMLElement;
  const data = pageDataOf(doc);
  const audio = fakeAudio(() => root, options.voice);
  const speech = fakeSpeech(options.speech ?? "supported");
  const sent: AnalyticsEvent[] = [];
  const fullscreen = fakeFullscreen();
  const prereg = fakePrereg();
  const samples = fakeSamples(options.samples === "throwing");
  const controller = initTrial({
    root,
    model: data.model,
    copy: data.copy,
    audio,
    speech,
    send: (event) => sent.push(event),
    reducedMotion: options.reducedMotion ?? true,
    fullscreen,
    prereg: options.prereg === false ? null : prereg,
    locale: data.locale,
    samples: options.samples === false ? null : samples,
    // 가짜 시계의 Date.now — 시도 시간을 시계를 돌려 잰다.
    now: () => Date.now(),
  });
  return {
    window,
    doc,
    root,
    data,
    audio,
    speech,
    sent,
    errors,
    fullscreen,
    prereg,
    samples,
    controller,
  };
}

export function unmount(harness: Harness | undefined): void {
  harness?.controller.dispose();
  uninstallClock();
}

/** 지금 보이는(조상까지 hidden 없는) 그 test-id 요소 — 정확히 하나여야 합니다. */
export function shown(h: Harness, id: TrialTestId): HTMLElement {
  const found = allByTestId(h.root, id).filter((element) => !isHiddenWithin(element, h.root));
  expect(found, `보이는 data-testid="${id}"가 하나여야 한다`).toHaveLength(1);
  return found[0] as HTMLElement;
}

/** 보이는 것이 없어야 할 때. */
export function noneShown(h: Harness, id: TrialTestId): void {
  const found = allByTestId(h.root, id).filter((element) => !isHiddenWithin(element, h.root));
  expect(found, `data-testid="${id}"가 보이면 안 된다`).toHaveLength(0);
}

/** 보이는 단계 section의 test-id 목록. */
export const visibleSteps = (h: Harness): string[] =>
  [...h.root.querySelectorAll('[data-testid^="trial-step-"]')]
    .filter((section) => !section.hasAttribute("hidden"))
    .map((section) => section.getAttribute("data-testid") ?? "");

export const stepOf = (h: Harness) => h.root.getAttribute("data-step");
export const progressOf = (h: Harness) => shown(h, "trial-progress").getAttribute("aria-valuenow");
export const liveText = (h: Harness) => textOf(shown(h, "trial-live"));

/** 보이는 버튼을 누르고 움직임이 끝날 때까지 시계를 돌립니다. */
export async function tap(h: Harness, id: TrialTestId, index?: number): Promise<void> {
  const target =
    index === undefined
      ? shown(h, id)
      : (allByTestId(h.root, id).find(
          (element) =>
            !isHiddenWithin(element, h.root) &&
            (element.getAttribute("data-option-index") ??
              element.getAttribute("data-tile-index")) === String(index),
        ) as HTMLElement | undefined);
  expect(target, `누를 ${id}[${index ?? ""}]`).toBeDefined();
  (target as HTMLElement).click();
  await settle();
}

/** 연 화면(컷 1 · 타자 효과가 끝날 때까지 기다림) → 첫 탭(begin)부터 컷 6 → 단어 → 그림 고르기(정답 0) → 대답 고르기(정답 2) → 문화(뒤집기) → 롤플레이 첫 턴. */
export async function playToRoleplay(h: Harness): Promise<void> {
  await settle();
  for (let cut = 0; cut < 6; cut += 1) await tap(h, "trial-cuts-next");
  await tap(h, "trial-vocab-next");
  await tap(h, "trial-option", 0);
  await tap(h, "trial-choice-next");
  await tap(h, "trial-option", 2);
  await tap(h, "trial-choice-next");
  await tap(h, "trial-culture-flip");
  await tap(h, "trial-culture-next");
}

/** 말하기 턴 하나 — 결과를 줄 세우고 Speak. */
export async function speakTurn(h: Harness, outcome: SpeechOutcome): Promise<void> {
  h.speech.queue(outcome);
  await tap(h, "trial-turn-speak");
}

/** 타일 턴 하나 — 차례대로 놓고 Check. */
export async function tileTurn(h: Harness, placed: readonly number[]): Promise<void> {
  for (const tileIndex of placed) await tap(h, "trial-tile", tileIndex);
  await tap(h, "trial-turn-check");
}

/** 엔딩 컷 넷을 넘겨 Episode clear 배너에 선다(마지막 컷은 시계를 돌리지 않아 배너 유지 시간 전이다). */
export async function toClear(h: Harness): Promise<void> {
  for (let cut = 0; cut < 3; cut += 1) await tap(h, "trial-cuts-next");
  shown(h, "trial-cuts-next").click();
  await flush();
}

/** 엔딩 컷 넷 → Episode clear 배너 → 유지 시간 뒤 곧바로 완료(움직임이 끝날 때까지). */
export async function finishEpilogue(h: Harness): Promise<void> {
  await toClear(h);
  await settle();
}
