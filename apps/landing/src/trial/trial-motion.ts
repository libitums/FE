// 체험판 움직임입니다 — 컷 대사 타자 효과 · 단계 전환 표식 · 꿈 전환 · 완료 폭죽. 전부 장식이라 글은 DOM에 처음부터 온전히 있고,
// 움직임 줄이기면 아무것도 붙이지 않습니다. 시간은 디자인 토큰 JS 출구에서 읽습니다(CSS 값을 옮겨 적지 않음).

import { motion } from "@libitums/design-tokens";

import type { TrialState, TrialTransition } from "./trial-machine.contract";

const msOf = (value: string): number => Number.parseFloat(value);

/** 글자 하나의 기본 간격과, 음성 길이에 맞출 때의 상한(앱 voiceRevealIntervalMs와 같은 규칙). */
const REVEAL_MIN_MS = msOf(motion.duration.reveal);
const REVEAL_MAX_MS = 300;
/** 단계 전환 표식이 머무는 시간 — 장면 교차(d6)와 같습니다. */
const ENTER_MS = msOf(motion.duration.d6);
/** 꿈 전환이 머무는 시간 — 구름빛(d8) · 깨어남(d9). CSS(trial-transition.css)와 같은 토큰입니다. */
const TRANSITION_MS: Readonly<Record<TrialTransition, number>> = {
  dream: msOf(motion.duration.d8),
  wake: msOf(motion.duration.d9),
};
/** 폭죽 조각 수 · 거리(근 · 중 · 원) — 디자인 3.7. */
const CONFETTI_PIECES = 28;
const CONFETTI_DISTANCES = [110, 150, 190] as const;
const CONFETTI_COLORS = 6;

/** 맞출 길이(ms)와 대사 → 글자 하나의 간격. 길이를 모르면 기본 간격입니다. */
export function revealIntervalMs(syncLengthMs: number | null, text: string): number {
  const count = Array.from(text).length;
  if (syncLengthMs === null || !Number.isFinite(syncLengthMs) || syncLengthMs <= 0 || count === 0) {
    return REVEAL_MIN_MS;
  }
  const perChar = Math.floor(syncLengthMs / count);
  return Math.min(REVEAL_MAX_MS, Math.max(REVEAL_MIN_MS, perChar));
}

type Reveal = { readonly cut: HTMLElement; readonly layer: HTMLElement; readonly timer: number };

export type TrialMotion = {
  /** 컷이 새로 섰을 때 — 대사를 한 글자씩 드러냅니다. */
  revealCut(cut: HTMLElement, syncLengthMs: number | null): void;
  /** 드러나는 중이면 끝까지 보이고 true(그 탭은 넘기지 않음). */
  completeReveal(): boolean;
  /** 전이 뒤 — 단계 전환 표식 · 완료 폭죽. */
  afterTransition(prev: TrialState, next: TrialState): void;
  /** 꿈 전환 — 루트 data-transition을 붙였다 뗍니다(움직임 줄이기 · null이면 아무것도 없음). */
  playTransition(kind: TrialTransition | null): void;
  dispose(): void;
};

const lineOf = (cut: HTMLElement) =>
  cut.querySelector<HTMLElement>('[data-testid="trial-cut-line"]');

export function createTrialMotion(root: HTMLElement, reducedMotion: boolean): TrialMotion {
  const view = root.ownerDocument.defaultView as Window;
  let reveal: Reveal | null = null;
  const enterTimers = new Set<number>();
  let transitionTimer: number | null = null;

  function endReveal(): void {
    if (reveal === null) return;
    view.clearInterval(reveal.timer);
    reveal.layer.remove();
    reveal.cut.removeAttribute("data-revealing");
    reveal = null;
  }

  function revealCut(cut: HTMLElement, syncLengthMs: number | null): void {
    endReveal();
    const line = lineOf(cut);
    if (reducedMotion || line === null) return;
    const glyphs = Array.from((line.textContent ?? "").trim());
    if (glyphs.length === 0) return;
    const layer = root.ownerDocument.createElement("span");
    layer.className = "trial-reveal-layer";
    layer.setAttribute("data-trial-reveal", "");
    layer.setAttribute("aria-hidden", "true");
    line.append(layer);
    cut.setAttribute("data-revealing", "true");
    let shownCount = 0;
    const timer = view.setInterval(
      () => {
        shownCount += 1;
        layer.textContent = glyphs.slice(0, shownCount).join("");
        if (shownCount >= glyphs.length) endReveal();
      },
      revealIntervalMs(syncLengthMs, glyphs.join("")),
    );
    reveal = { cut, layer, timer };
  }

  function completeReveal(): boolean {
    if (reveal === null) return false;
    endReveal();
    return true;
  }

  function markEntering(section: Element): void {
    section.setAttribute("data-entering", "");
    const timer = view.setTimeout(() => {
      enterTimers.delete(timer);
      section.removeAttribute("data-entering");
    }, ENTER_MS);
    enterTimers.add(timer);
  }

  function addConfetti(section: Element): void {
    if (section.querySelector("[data-trial-confetti]") !== null) return;
    const doc = root.ownerDocument;
    const layer = doc.createElement("div");
    layer.className = "trial-confetti";
    layer.setAttribute("data-trial-confetti", "");
    layer.setAttribute("aria-hidden", "true");
    for (let index = 0; index < CONFETTI_PIECES; index += 1) {
      const piece = doc.createElement("span");
      piece.className = "trial-confetti__piece";
      const angle = Math.round((360 / CONFETTI_PIECES) * index);
      const distance = CONFETTI_DISTANCES[index % CONFETTI_DISTANCES.length] ?? 150;
      piece.style.setProperty("--trial-confetti-angle", `${angle}deg`);
      piece.style.setProperty("--trial-confetti-distance", `${distance}px`);
      piece.style.setProperty("--trial-confetti-spin", index % 2 === 0 ? "1" : "-1");
      piece.setAttribute("data-color", String(index % CONFETTI_COLORS));
      layer.append(piece);
    }
    const badge = section.querySelector(".trial-complete__badge");
    if (badge?.parentElement) badge.parentElement.insertBefore(layer, badge);
    else section.prepend(layer);
  }

  function afterTransition(prev: TrialState, next: TrialState): void {
    if (prev.step === next.step) return;
    endReveal();
    if (reducedMotion) return;
    const section = root.querySelector(`[data-testid="trial-step-${next.step}"]`);
    if (section === null) return;
    markEntering(section);
    if (next.step === "complete" && next.roleplay.verdict === "passed") addConfetti(section);
  }

  function endTransition(): void {
    if (transitionTimer !== null) view.clearTimeout(transitionTimer);
    transitionTimer = null;
    root.removeAttribute("data-transition");
  }

  function playTransition(kind: TrialTransition | null): void {
    if (reducedMotion || kind === null) return;
    endTransition();
    // 같은 값을 다시 붙여도 CSS 애니메이션이 처음부터 돌도록 한 번 그린 뒤 붙입니다.
    void root.offsetWidth;
    root.setAttribute("data-transition", kind);
    transitionTimer = view.setTimeout(endTransition, TRANSITION_MS[kind]);
  }

  function dispose(): void {
    endReveal();
    endTransition();
    for (const timer of enterTimers) view.clearTimeout(timer);
    enterTimers.clear();
  }

  return { revealCut, completeReveal, afterTransition, playTransition, dispose };
}
