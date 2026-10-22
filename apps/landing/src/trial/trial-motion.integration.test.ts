// 체험판 움직임 통합 — 타자 효과 · 완료 폭죽 · 장면 전환 표식을 컨트롤러가 붙이고, 움직임 줄이기면 붙이지 않는다.
// 화면에 보이는 모양(CSS)이 아니라 스크립트가 남기는 DOM 표식으로 봅니다.
//   타자: 보이는 컷 article의 `data-revealing="true"`(드러나는 중) · 드러나는 층 `[data-trial-reveal]`(aria-hidden)
//   폭죽: 완료 section 안 `[data-trial-confetti]`(aria-hidden, 조각을 자식으로)
//   장면 전환: 새로 선 단계 section의 `data-entering`(전환이 끝나면 지움)
//   꿈 전환: 루트의 `data-transition="dream" | "wake"`(d8 600ms · d9 1000ms 뒤 지움), 장식 베일 `[trial-veil]`

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type Harness,
  flush,
  heard,
  mountTrial,
  playToRoleplay,
  settle,
  shown,
  speakTurn,
  stepOf,
  tap,
  tileTurn,
  unmount,
  voicesOf,
} from "./trial-flow.test-support";
import { SPEECH_CORRECT } from "./trial.test-support";

let h: Harness | undefined;
afterEach(() => {
  unmount(h);
  h = undefined;
});

/** 디자인의 가장 긴 전환(컷 그림 교차 900ms · 장면 교차 300ms)보다 넉넉한 시간. */
const TRANSITION_DONE_MS = 1_500;

const visibleCut = (harness: Harness) => shown(harness, "trial-cut");
const revealOf = (cut: Element) => cut.querySelector("[data-trial-reveal]");

/** 보조기술이 읽는 대사 — 드러나는 층을 뺀 trial-cut-line 글. */
function fullLineOf(cut: Element): string {
  const line = cut.querySelector('[data-testid="trial-cut-line"]');
  const copy = line?.cloneNode(true) as Element | undefined;
  copy?.querySelectorAll("[data-trial-reveal]").forEach((layer) => layer.remove());
  return (copy?.textContent ?? "").trim();
}

const revealedText = (cut: Element) => (revealOf(cut)?.textContent ?? "").trim();

/** 다 드러났다 — 드러나는 중 표식이 없고, 층이 남아 있다면 온전한 대사. */
function expectFullyShown(cut: Element): void {
  expect(cut.getAttribute("data-revealing")).not.toBe("true");
  const layerText = revealOf(cut) === null ? fullLineOf(cut) : revealedText(cut);
  expect(layerText).toBe(fullLineOf(cut));
}

describe("TI11 움직임 줄이기 표식", () => {
  it("reducedMotion: true → 루트 data-motion=reduced", async () => {
    h = await mountTrial({ reducedMotion: true });
    expect(h.root.getAttribute("data-motion")).toBe("reduced");
  });

  it("reducedMotion: false → data-motion이 reduced가 아니다", async () => {
    h = await mountTrial({ reducedMotion: false });
    expect(h.root.getAttribute("data-motion")).not.toBe("reduced");
  });
});

describe("MO1 컷 대사 타자 효과", () => {
  it("움직임 허용: 연 직후 컷 1 대사가 덜 드러나 있고, 시간이 지나며 늘고, 끝나면 온전하다", async () => {
    h = await mountTrial({ reducedMotion: false });
    await flush();
    const cut = visibleCut(h);
    expect(cut.getAttribute("data-cut-index")).toBe("1");
    const full = fullLineOf(cut);
    expect(full.length).toBeGreaterThan(5);
    expect(cut.getAttribute("data-revealing")).toBe("true");
    const layer = revealOf(cut);
    expect(layer, "드러나는 층 [data-trial-reveal]").not.toBeNull();
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    const first = revealedText(cut);
    expect(first.length).toBeLessThan(full.length);
    expect(full.startsWith(first)).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    const later = revealedText(cut);
    expect(later.length).toBeGreaterThan(first.length);
    expect(full.startsWith(later)).toBe(true);
    await settle();
    expectFullyShown(cut);
    expect(fullLineOf(cut)).toBe(full);
  });

  it("드러나는 중 첫 탭 = begin + 끝까지 보이기(넘기지 않음), 둘째 탭 = 다음 컷", async () => {
    h = await mountTrial({ reducedMotion: false });
    await flush();
    await vi.advanceTimersByTimeAsync(50);
    const voicesBefore = voicesOf(h.audio).length;
    shown(h, "trial-cuts-next").click();
    await flush();
    const cut = visibleCut(h);
    expect(cut.getAttribute("data-cut-index")).toBe("1");
    expectFullyShown(cut);
    // 첫 탭은 넘기지 않아도 시작이다(trial_start · trial_step prologue).
    expect(h.sent.map((event) => event.name)).toEqual(["trial_start", "trial_step"]);
    expect(voicesOf(h.audio).length).toBe(voicesBefore);
    shown(h, "trial-cuts-next").click();
    await flush();
    const second = visibleCut(h);
    expect(second.getAttribute("data-cut-index")).toBe("2");
    expect(second.getAttribute("data-revealing")).toBe("true");
  });

  it("움직임 줄이기: 연 직후 · Next 직후 대사가 곧바로 온전하다", async () => {
    h = await mountTrial({ reducedMotion: true });
    await flush();
    expectFullyShown(visibleCut(h));
    shown(h, "trial-cuts-next").click();
    await flush();
    const cut = visibleCut(h);
    expect(cut.getAttribute("data-cut-index")).toBe("2");
    expectFullyShown(cut);
  });
});

/** 롤플레이를 지정한 결과로 마치고 Episode clear 배너까지(완료 직전, 유지 시간 전). */
async function toLastEpilogueCut(harness: Harness, pass: boolean): Promise<void> {
  await playToRoleplay(harness);
  if (pass) {
    for (const index of [0, 1, 2]) {
      await speakTurn(harness, heard(SPEECH_CORRECT[index] ?? ""));
      await tap(harness, "trial-turn-next");
    }
  } else {
    for (const index of [0, 1, 2]) {
      await tap(harness, "trial-turn-cant-speak");
      await tileTurn(harness, index === 2 ? [0] : index === 1 ? [0, 1] : [0, 1, 2]);
      await tap(harness, "trial-turn-next");
    }
  }
  expect(stepOf(harness)).toBe("epilogue");
  for (let cut = 0; cut < 3; cut += 1) await tap(harness, "trial-cuts-next");
  // 엔딩 마지막 컷 → Episode clear 배너(시계를 돌리지 않아 유지 시간 전) — 배너 탭이 완료다.
  shown(harness, "trial-cuts-next").click();
  await flush();
  expect(stepOf(harness)).toBe("clear");
}

const confettiOf = (harness: Harness) => harness.root.querySelectorAll("[data-trial-confetti]");

describe("MO2 완료 폭죽", () => {
  it("움직임 허용 · passed → 완료 화면에 장식 폭죽 층(aria-hidden, 조각 있음)", async () => {
    h = await mountTrial({ reducedMotion: false });
    await toLastEpilogueCut(h, true);
    expect(confettiOf(h)).toHaveLength(0);
    shown(h, "trial-clear-banner").click();
    await vi.advanceTimersByTimeAsync(100);
    expect(stepOf(h)).toBe("complete");
    const layers = [...confettiOf(h)];
    expect(layers).toHaveLength(1);
    const layer = layers[0] as Element;
    expect(shown(h, "trial-step-complete").contains(layer)).toBe(true);
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.children.length).toBeGreaterThan(0);
  });

  it("움직임 허용 · failed → 폭죽 없음", async () => {
    h = await mountTrial({ reducedMotion: false });
    await toLastEpilogueCut(h, false);
    shown(h, "trial-clear-banner").click();
    await vi.advanceTimersByTimeAsync(100);
    expect(shown(h, "trial-step-complete").getAttribute("data-result")).toBe("failed");
    expect(confettiOf(h)).toHaveLength(0);
  });

  it("움직임 줄이기 · passed → 폭죽 DOM 없음", async () => {
    h = await mountTrial({ reducedMotion: true });
    await toLastEpilogueCut(h, true);
    shown(h, "trial-clear-banner").click();
    await vi.advanceTimersByTimeAsync(100);
    expect(shown(h, "trial-step-complete").getAttribute("data-result")).toBe("passed");
    expect(confettiOf(h)).toHaveLength(0);
  });
});

const sectionOf = (harness: Harness, step: string) =>
  harness.root.querySelector(`[data-testid="trial-step-${step}"]`) as Element;
const enteringSteps = (harness: Harness) =>
  [...harness.root.querySelectorAll('[data-testid^="trial-step-"][data-entering]')].map((section) =>
    section.getAttribute("data-testid"),
  );

/** 단계가 바뀌는 누름 — 누른 직후 새 section에 data-entering, 전환이 끝나면 지워진다. */
async function expectEntering(harness: Harness, press: () => void, step: string): Promise<void> {
  press();
  await flush();
  expect(stepOf(harness)).toBe(step);
  expect(enteringSteps(harness), `${step} 진입 직후`).toEqual([`trial-step-${step}`]);
  expect(sectionOf(harness, step).hasAttribute("hidden")).toBe(false);
  await vi.advanceTimersByTimeAsync(TRANSITION_DONE_MS);
  expect(enteringSteps(harness), `${step} 전환 뒤`).toEqual([]);
  await settle();
}

describe("MO3 장면 전환 표식 data-entering", () => {
  it("움직임 허용: 단계가 바뀔 때마다 새 section에만 붙고 전환 뒤 지워진다", async () => {
    h = await mountTrial({ reducedMotion: false });
    const harness = h;
    const click = (id: Parameters<typeof shown>[1], index?: number) => () => {
      const target =
        index === undefined
          ? shown(harness, id)
          : (shown(
              harness,
              `trial-step-${stepOf(harness)}` as Parameters<typeof shown>[1],
            ).querySelector(`[data-option-index="${index}"]`) as HTMLElement);
      target.click();
    };
    await settle();
    for (let cut = 0; cut < 5; cut += 1) {
      await tap(h, "trial-cuts-next");
      expect(enteringSteps(h)).toEqual([]);
    }
    await expectEntering(h, click("trial-cuts-next"), "vocab");
    await expectEntering(h, click("trial-vocab-next"), "image-match");
    await tap(h, "trial-option", 0);
    await expectEntering(h, click("trial-choice-next"), "reply-select");
    await tap(h, "trial-option", 2);
    await expectEntering(h, click("trial-choice-next"), "culture");
    await expectEntering(h, click("trial-culture-next"), "roleplay");
  });

  it("움직임 줄이기: 어느 누름 직후에도 data-entering이 없다", async () => {
    h = await mountTrial({ reducedMotion: true });
    const steps = [...Array<string>(6).fill("trial-cuts-next"), "trial-vocab-next"];
    for (const id of steps) {
      shown(h, id as Parameters<typeof shown>[1]).click();
      await flush();
      expect(enteringSteps(h)).toEqual([]);
      await settle();
    }
    expect(stepOf(h)).toBe("image-match");
  });
});

const transitionOf = (harness: Harness) => harness.root.getAttribute("data-transition");
const DREAM_MS = 600;
const WAKE_MS = 1_000;

/** 누른 직후 루트 data-transition이 kind이고, 그 시간이 지나면 없다. */
async function expectTransition(
  harness: Harness,
  press: () => void,
  kind: "dream" | "wake",
  ms: number,
): Promise<void> {
  press();
  await flush();
  expect(transitionOf(harness), `${kind} 직후`).toBe(kind);
  await vi.advanceTimersByTimeAsync(ms - 1);
  expect(transitionOf(harness), `${kind} ${ms - 1}ms`).toBe(kind);
  await vi.advanceTimersByTimeAsync(1);
  expect(transitionOf(harness), `${kind} 끝`).toBeNull();
  await settle();
}

describe("MO-T 꿈 전환 data-transition", () => {
  it("MO-T1 prologue 컷 사이 dream, 컷 5 → 6은 wake(깨어남), prologue → vocab은 없음", async () => {
    h = await mountTrial({ reducedMotion: false });
    const harness = h;
    const next = () => shown(harness, "trial-cuts-next").click();
    await settle();
    expect(transitionOf(h)).toBeNull();
    for (let cut = 0; cut < 4; cut += 1) {
      await expectTransition(h, next, "dream", DREAM_MS);
    }
    expect(visibleCut(h).getAttribute("data-cut-index")).toBe("5");
    await expectTransition(h, next, "wake", WAKE_MS);
    expect(visibleCut(h).getAttribute("data-cut-index")).toBe("6");
    next();
    await flush();
    expect(stepOf(h)).toBe("vocab");
    expect(transitionOf(h)).toBeNull();
  });

  it("MO-T2 roleplay → epilogue · 엔딩 컷 사이 · 배너 → 완료는 dream", async () => {
    h = await mountTrial({ reducedMotion: false });
    const harness = h;
    await playToRoleplay(h);
    for (const index of [0, 1]) {
      await speakTurn(h, heard(SPEECH_CORRECT[index] ?? ""));
      await tap(h, "trial-turn-next");
    }
    await speakTurn(h, heard(SPEECH_CORRECT[2] ?? ""));
    await expectTransition(h, () => shown(harness, "trial-turn-next").click(), "dream", DREAM_MS);
    expect(stepOf(h)).toBe("epilogue");
    for (let cut = 0; cut < 3; cut += 1) {
      await expectTransition(h, () => shown(harness, "trial-cuts-next").click(), "dream", DREAM_MS);
    }
    shown(h, "trial-cuts-next").click();
    await flush();
    expect(stepOf(h)).toBe("clear");
    expect(transitionOf(h)).toBeNull();
    await expectTransition(
      h,
      () => shown(harness, "trial-clear-banner").click(),
      "dream",
      DREAM_MS,
    );
    expect(stepOf(h)).toBe("complete");
  });

  it("MO-T3 전환 중에도 초점은 Next 그대로 · 베일은 aria-hidden 장식", async () => {
    h = await mountTrial({ reducedMotion: false });
    await settle();
    const next = shown(h, "trial-cuts-next");
    next.focus();
    next.click();
    await flush();
    await vi.advanceTimersByTimeAsync(100);
    expect(transitionOf(h)).toBe("dream");
    expect(h.doc.activeElement).toBe(next);
    const veil = h.root.querySelector('[data-testid="trial-veil"]');
    expect(veil?.getAttribute("aria-hidden")).toBe("true");
  });

  it("MO-T3 움직임 줄이기: 처음부터 끝까지 data-transition이 한 번도 붙지 않는다", async () => {
    h = await mountTrial({ reducedMotion: true });
    const seen = new Set<string>();
    const observer = new (h.window as Window & typeof globalThis).MutationObserver(() => {
      const value = h?.root.getAttribute("data-transition");
      if (value) seen.add(value);
    });
    observer.observe(h.root, { attributes: true, attributeFilter: ["data-transition"] });
    await playToRoleplay(h);
    for (const index of [0, 1, 2]) {
      await speakTurn(h, heard(SPEECH_CORRECT[index] ?? ""));
      await tap(h, "trial-turn-next");
    }
    // 마지막 컷 뒤 배너 유지 시간이 지나 완료로 — 줄이기면 전환 표식은 한 번도 없다.
    for (let cut = 0; cut < 4; cut += 1) await tap(h, "trial-cuts-next");
    await flush();
    observer.disconnect();
    expect(stepOf(h)).toBe("complete");
    expect([...seen]).toEqual([]);
    expect(transitionOf(h)).toBeNull();
  });
});
