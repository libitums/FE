// 답하면 카드에 붙는 정답 · 대본이 펼쳐지는 단계와 시간을 정하는 순수 함수입니다(ADR-0212, 시안 C안).
// 화면에 닿는 일(측정 · 타이머 · 클래스 적용)은 `RevealOnAnswer.tsx`가 집니다.
//
// Lynx는 `height: auto`로 전환하지 못합니다. 그래서 새 내용을 높이 0 상자 안에 한 번 세워 높이를 재고(재는 중),
// 그 높이까지 전환한 뒤(펼침), 끝나면 높이 지정을 풀어 auto로 돌립니다(열림) — 글꼴 크기 변경 · 회전에 따라갑니다.
// 시간 안에 높이를 못 재면 높이는 바로 서고 글만 나타납니다(A안 — 글만 나타남).

import { motion as motionTokens } from "@libitums/design-tokens";
import { motionDurationMs, type Motion } from "@libitums/ui-lynx/motion";

/** 닫힘 · 재는 중(높이 0) · 펼치는 중(잰 높이까지) · 글만 나타남(측정 실패 — A안) · 열림(높이 auto). */
export type RevealPhase = "closed" | "measuring" | "expanding" | "fading" | "open";

export type RevealState = { readonly phase: RevealPhase; readonly height: number | null };

export type RevealEvent =
  | { readonly type: "show"; readonly motion: Motion }
  | { readonly type: "hide" }
  | { readonly type: "measured"; readonly height: unknown }
  | { readonly type: "measure-timeout" }
  | { readonly type: "settled" };

// 시안의 280 · 120 · 60ms는 토큰에 그 값이 없고, Lynx는 전환 시간의 `calc()`를 0으로 읽습니다(ADR-0212 D2). 그래서 가장
// 가까운 토큰으로 옮겼습니다 — 높이 d6(300), 첫 글 d2(100), 간격 d1(50 — 지연이 d2 · d3 · d4 · d5와 같습니다), 글 하나 d4(200).
const ms = (token: keyof typeof motionTokens.duration) =>
  motionDurationMs(motionTokens.duration[token]);

/** 시간표(ms)입니다. */
export const revealTiming = {
  heightMs: ms("d6"),
  firstItemDelayMs: ms("d2"),
  itemStaggerMs: ms("d1"),
  itemMs: ms("d4"),
  /** 높이 답을 기다리는 한도입니다 — 넘기면 A안으로 물러섭니다. */
  measureTimeoutMs: ms("d2"),
  /** 지연 클래스가 있는 글 수입니다. 그 뒤 순서는 넷째와 같이 나타납니다. */
  maxItems: 4,
} as const;

/** 재는 틀의 넉넉한 높이(px)입니다 — 이보다 긴 내용은 잘린 높이로 재어지고, 펼친 뒤 auto로 풀릴 때 나머지가 섭니다. */
export const revealMeasureRoomPx = 2000;

const closed: RevealState = { phase: "closed", height: null };
const open: RevealState = { phase: "open", height: null };

/** 처음부터 보이면(대본을 켜 둔 세션 · 다시 그려진 화면) 움직이지 않고 열림입니다. */
export function initialRevealState(shown: boolean): RevealState {
  return shown ? open : closed;
}

function isMeasurable(height: unknown): height is number {
  return typeof height === "number" && Number.isFinite(height) && height > 0;
}

/** 단계 전이입니다. 맞지 않는 사건은 같은 상태를 그대로 돌려줍니다. */
export function revealReducer(state: RevealState, event: RevealEvent): RevealState {
  switch (event.type) {
    case "hide":
      return state.phase === "closed" ? state : closed;
    case "show":
      if (state.phase !== "closed") return state;
      return event.motion === "reduced" ? open : { phase: "measuring", height: null };
    case "measured":
      // 0 · 숫자 아님은 아직 자리가 잡히지 않은 답으로 보고 다음 답(또는 시간 초과)을 기다립니다.
      if (state.phase !== "measuring" || !isMeasurable(event.height)) return state;
      return { phase: "expanding", height: event.height };
    case "measure-timeout":
      return state.phase === "measuring" ? { phase: "fading", height: null } : state;
    case "settled":
      return state.phase === "expanding" || state.phase === "fading" ? open : state;
  }
}

function clampOrder(order: number): number {
  return Math.min(Math.max(0, Math.floor(order)), revealTiming.maxItems - 1);
}

/** 글 하나가 나타나기 시작하는 시각(ms) — 100ms부터 50ms 간격입니다(CSS 지연 d2 · d3 · d4 · d5). */
export function revealItemDelayMs(order: number): number {
  return revealTiming.firstItemDelayMs + revealTiming.itemStaggerMs * clampOrder(order);
}

/** 펼침이 끝나는 시각(ms) — 높이 전환과 마지막 글 가운데 늦은 쪽입니다. */
export function revealSettleMs(itemCount: number): number {
  if (itemCount < 1) return revealTiming.heightMs;
  return Math.max(revealTiming.heightMs, revealItemDelayMs(itemCount - 1) + revealTiming.itemMs);
}

/** 지금 단계가 기다리는 타이머입니다. 없으면 `null`. */
export function revealTimerOf(
  phase: RevealPhase,
  itemCount: number,
): { readonly event: RevealEvent; readonly ms: number } | null {
  if (phase === "measuring") {
    return { event: { type: "measure-timeout" }, ms: revealTiming.measureTimeoutMs };
  }
  if (phase === "expanding" || phase === "fading") {
    return { event: { type: "settled" }, ms: revealSettleMs(itemCount) };
  }
  return null;
}

/** 상자 높이 — 재는 중 0px, 펼침 중 잰 높이, 나머지는 지정 없음(auto)입니다. */
export function revealContainerStyle(state: RevealState): { readonly height: string } | undefined {
  if (state.phase === "measuring") return { height: "0px" };
  if (state.phase === "expanding" && state.height !== null) return { height: `${state.height}px` };
  return undefined;
}

export function revealContainerClassName(phase: RevealPhase): string {
  return phase === "measuring" || phase === "expanding" || phase === "fading"
    ? `reveal-on-answer reveal-on-answer-${phase}`
    : "reveal-on-answer";
}

/**
 * 재는 틀 — 재는 중 · 펼치는 중에는 상자 흐름에서 띄웁니다(`absolute`). Lynx는 높이가 내용보다 작은 상자 안의 흐름 자식을
 * 그 높이로 줄이고(높이 0 상자 안에서는 0), `absolute` 상자의 높이 auto는 내용이 아니라 부모 높이를 따릅니다(iOS 시뮬레이터
 * 관찰, ADR-0212 D3). 그래서 틀에 넉넉한 높이를 주어 그 안의 글 칸이 제 높이로 서게 하고, 펼치는 동안은 잰 높이로 고정해
 * 글이 눌리지 않고 상자가 위에서부터 드러내게 합니다.
 */
export function revealFrameClassName(phase: RevealPhase): string {
  return phase === "measuring" || phase === "expanding"
    ? "reveal-on-answer-frame reveal-on-answer-frame-floating"
    : "reveal-on-answer-frame";
}

/** 재는 틀의 높이 — 재는 중은 넉넉한 높이, 펼치는 중은 잰 높이, 나머지는 지정 없음입니다. */
export function revealFrameStyle(state: RevealState): { readonly height: string } | undefined {
  if (state.phase === "measuring") return { height: `${revealMeasureRoomPx}px` };
  if (state.phase === "expanding" && state.height !== null) return { height: `${state.height}px` };
  return undefined;
}

export function revealItemClassName(phase: RevealPhase, order: number): string {
  if (phase === "measuring") return "reveal-on-answer-item reveal-on-answer-item-pending";
  if (phase === "expanding" || phase === "fading") {
    return `reveal-on-answer-item reveal-on-answer-item-entering reveal-on-answer-item-${clampOrder(order)}`;
  }
  return "reveal-on-answer-item";
}
