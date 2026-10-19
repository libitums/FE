// 유닛 탭 등장 모션의 순수 파생입니다 — 모션 종류 · 클래스 묶음 · 기준점 · 카운트업 값 · 노드 단계.

import { motion as motionTokens } from "@libitums/design-tokens";
import type { EpisodeHeaderProgressEntrance } from "@libitums/ui-lynx/episode-header";
import { motionDurationMs, type Motion } from "@libitums/ui-lynx/motion";
import type { SheetTargetId } from "./catalog-map.contract";
import type { SheetEntrancePhase } from "./journey-map-sheet-entrance";

/** none = 모션 없음(직접 렌더 기본값 — 지금 DOM 그대로). 앱 결선은 나머지 셋만 냅니다. */
export type SheetEntranceMotion = "none" | "awaiting" | "expressive" | "fade";

/** reduced → "fade"(단계 무관). standard: waiting → "awaiting", entering → "expressive". */
export function sheetEntranceMotionFor(
  phase: SheetEntrancePhase,
  motion: Motion,
): Exclude<SheetEntranceMotion, "none"> {
  if (motion === "reduced") {
    return "fade";
  }
  return phase === "entering" ? "expressive" : "awaiting";
}

export type SheetEntranceClasses = {
  /** 띠 래퍼(`JourneyMapEpisodeHeader`의 view) className 전체. */
  readonly band: string;
  /** ui-lynx EpisodeHeader에 넘길 값 — expressive만 "fill". */
  readonly bandProgress: EpisodeHeaderProgressEntrance;
  /** `.step-sheet-pop` className 전체. */
  readonly bubble: string;
  /** false면(awaiting만) `.step-sheet-pop`이 탭을 잡아 닫습니다. 시작 버튼은 그대로 받습니다. */
  readonly bubbleInteractive: boolean;
  /** 말풍선 채움 className 전체. */
  readonly fill: string;
  /** 숨쉬기 층 DOM 여부(expressive만). */
  readonly startGlow: boolean;
  /** fade만 true — 띠 래퍼 · `.step-sheet-pop`에 data-motion="reduced". */
  readonly motionReduced: boolean;
};

const bandBase = "journey-map-screen-episode-header";
const bubbleBase = "step-sheet-pop";
const fillBase = "step-sheet-progress-fill";

const entranceClasses: Record<SheetEntranceMotion, SheetEntranceClasses> = {
  none: {
    band: bandBase,
    bandProgress: "none",
    bubble: bubbleBase,
    bubbleInteractive: true,
    fill: fillBase,
    startGlow: false,
    motionReduced: false,
  },
  awaiting: {
    band: `${bandBase} ${bandBase}-awaiting`,
    bandProgress: "none",
    bubble: `${bubbleBase} ${bubbleBase}-awaiting`,
    // 대기 중 말풍선은 보이지 않으니 누를 수도 없습니다 — 탭은 아래 가림막에 닿아 닫힙니다.
    bubbleInteractive: false,
    fill: fillBase,
    startGlow: false,
    motionReduced: false,
  },
  expressive: {
    band: `${bandBase} ${bandBase}-enter`,
    bandProgress: "fill",
    bubble: `${bubbleBase} ${bubbleBase}-enter`,
    bubbleInteractive: true,
    fill: `${fillBase} ${fillBase}-enter`,
    startGlow: true,
    motionReduced: false,
  },
  fade: {
    band: `${bandBase} ${bandBase}-motion-reduced`,
    bandProgress: "none",
    bubble: `${bubbleBase} ${bubbleBase}-motion-reduced`,
    bubbleInteractive: true,
    fill: fillBase,
    startGlow: false,
    motionReduced: true,
  },
};

/** 모션 종류 → 클래스 묶음 — 띠 · 말풍선 · 막대 · 숨쉬기가 같은 표에서 갈립니다. */
export function sheetEntranceClasses(entrance: SheetEntranceMotion): SheetEntranceClasses {
  return entranceClasses[entrance];
}

/** 말풍선 폭(step-sheet.css `.step-sheet-panel` width와 같은 값)입니다. */
export const stepSheetPanelWidth: number = 250;

/** `.step-sheet-pop` 인라인 transform-origin입니다. */
export function stepSheetBubbleOrigin(caretOffset: number): string {
  return `${stepSheetPanelWidth / 2 + caretOffset}px 0px`;
}

export type MotionDurationKey = keyof typeof motionTokens.duration;
export type SheetPercentCountUpTokens = {
  readonly delay: MotionDurationKey;
  readonly duration: MotionDurationKey;
  readonly interval: MotionDurationKey;
  readonly easing: keyof typeof motionTokens.easing;
};

/** 말풍선 막대 채움(CSS)과 같은 토큰입니다. */
export const sheetPercentCountUpTokens: SheetPercentCountUpTokens = {
  delay: "d6",
  duration: "d8",
  interval: "d1",
  easing: "enter",
};

/** 진행 막대 값(0 ~ 100) → 글자에 쓰는 정수입니다. */
export function sheetPercentOf(fillPercent: number): number {
  return Math.round(fillPercent);
}

/** `${value}%` — stepSheetProgress의 percentLabel과 같은 꼴입니다. */
export function sheetPercentLabel(value: number): string {
  return `${value}%`;
}

export type CubicBezier = readonly [number, number, number, number];

/** CSS cubic-bezier(x1, y1, x2, y2)의 t(0 ~ 1, 가둠)에서의 진행값입니다. 던지지 않습니다. */
export function cubicBezierEase(easing: CubicBezier, t: number): number {
  if (!(t > 0)) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  const [x1, y1, x2, y2] = easing;
  const at = (a: number, b: number, s: number): number =>
    3 * a * (1 - s) * (1 - s) * s + 3 * b * (1 - s) * s * s + s * s * s;
  // 시간 축 x(s) = t인 s를 이분법으로 찾고, 같은 s의 y를 읽습니다(x(s)는 x1, x2가 [0, 1]이면 단조).
  let low = 0;
  let high = 1;
  for (let round = 0; round < 40; round += 1) {
    const mid = (low + high) / 2;
    if (at(x1, x2, mid) < t) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return at(y1, y2, (low + high) / 2);
}

/** 길이 stepCount + 1의 단조 비감소 정수 열입니다([0] = 0, 끝 = percent). */
export function sheetPercentCountUpFrames(
  percent: number,
  easing: CubicBezier,
  stepCount: number,
): readonly number[] {
  if (percent <= 0) {
    return [0];
  }
  if (stepCount < 1) {
    return [percent];
  }
  const frames: number[] = [0];
  for (let index = 1; index < stepCount; index += 1) {
    const value = Math.round(percent * cubicBezierEase(easing, index / stepCount));
    frames.push(Math.min(percent, Math.max(frames[index - 1] ?? 0, value)));
  }
  frames.push(percent);
  return frames;
}

export type SheetPercentCountUp = {
  readonly frames: readonly number[];
  readonly startDelayMs: number;
  readonly stepMs: number;
};

/** expressive && percent > 0 → 토큰에서 낸 일정, 아니면 null(카운트업 없음 — 최종값). */
export function sheetPercentCountUpFor(
  entrance: SheetEntranceMotion,
  percent: number,
): SheetPercentCountUp | null {
  if (entrance !== "expressive" || percent <= 0) {
    return null;
  }
  const { delay, duration, interval, easing } = sheetPercentCountUpTokens;
  const stepMs = motionDurationMs(motionTokens.duration[interval]);
  return {
    frames: sheetPercentCountUpFrames(
      percent,
      motionTokens.easing[easing],
      Math.round(motionDurationMs(motionTokens.duration[duration]) / stepMs),
    ),
    startDelayMs: motionDurationMs(motionTokens.duration[delay]),
    stepMs,
  };
}

const percentPopClass = "step-sheet-progress-percent-pop";

export type SheetPercentView = {
  readonly label: string;
  /** `.step-sheet-progress-percent-pop` 래퍼 className 전체. */
  readonly className: string;
};

/** countUp null → 최종 라벨 · pop 없음. 아니면 frames[frameIndex]의 라벨, 마지막 칸이면 pop 클래스를 더합니다. */
export function sheetPercentView(
  countUp: SheetPercentCountUp | null,
  percent: number,
  frameIndex: number,
): SheetPercentView {
  if (countUp === null) {
    return { label: sheetPercentLabel(percent), className: percentPopClass };
  }
  const last = countUp.frames.length - 1;
  const index = Math.min(Math.max(frameIndex, 0), last);
  return {
    label: sheetPercentLabel(countUp.frames[index] ?? percent),
    className: index === last ? `${percentPopClass} ${percentPopClass}-enter` : percentPopClass,
  };
}

export type MapUnitEntrance = {
  readonly targetId: SheetTargetId | null;
  readonly entrance: SheetEntranceMotion;
};

export const noMapUnitEntrance: MapUnitEntrance = { targetId: null, entrance: "none" };

export type MapUnitStageMotion = "none" | "pop" | "pop-burst";

export function mapUnitStageMotionOf(
  entrance: MapUnitEntrance,
  targetId: SheetTargetId | null,
): MapUnitStageMotion {
  if (targetId === null || targetId !== entrance.targetId) {
    return "none";
  }
  if (entrance.entrance === "awaiting") {
    return "pop";
  }
  return entrance.entrance === "expressive" ? "pop-burst" : "none";
}

/** 노드 튕김 래퍼 className입니다. */
export function mapUnitPopClassName(stageMotion: MapUnitStageMotion): string {
  return stageMotion === "none"
    ? "journey-step-node-pop"
    : "journey-step-node-pop journey-step-node-pop-enter";
}

/** 반짝임 축 수입니다. */
export const mapUnitBurstRayCount: number = 8;

/** 축마다의 각도(도)입니다. */
export function mapUnitBurstRayAngles(count: number): readonly number[] {
  const angles: number[] = [];
  for (let index = 0; index < count; index += 1) {
    angles.push((index * 360) / count);
  }
  return angles;
}
