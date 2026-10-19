// 유닛 탭 등장 모션의 순수 파생입니다 — 모션 종류 · 클래스 묶음 · 기준점 · 카운트업 값 · 노드 단계.

import type { motion as motionTokens } from "@libitums/design-tokens";
import type { EpisodeHeaderProgressEntrance } from "@libitums/ui-lynx/episode-header";
import type { Motion } from "@libitums/ui-lynx/motion";
import type { SheetTargetId } from "./catalog-map.contract";
import type { SheetEntrancePhase } from "./journey-map-sheet-entrance";

/** none = 모션 없음(직접 렌더 기본값 — 지금 DOM 그대로). 앱 결선은 나머지 셋만 냅니다. */
export type SheetEntranceMotion = "none" | "awaiting" | "expressive" | "fade";

/** reduced → "fade"(단계 무관). standard: waiting → "awaiting", entering → "expressive". */
export function sheetEntranceMotionFor(
  _phase: SheetEntrancePhase,
  _motion: Motion,
): Exclude<SheetEntranceMotion, "none"> {
  return "awaiting";
}

export type SheetEntranceClasses = {
  /** 띠 래퍼(`JourneyMapEpisodeHeader`의 view) className 전체. */
  readonly band: string;
  /** ui-lynx EpisodeHeader에 넘길 값 — expressive만 "fill". */
  readonly bandProgress: EpisodeHeaderProgressEntrance;
  /** `.step-sheet-pop` className 전체. */
  readonly bubble: string;
  /** false면 `.step-sheet-pop`에 user-interaction-enabled={false}(awaiting만). */
  readonly bubbleInteractive: boolean;
  /** 말풍선 채움 className 전체. */
  readonly fill: string;
  /** 숨쉬기 층 DOM 여부(expressive만). */
  readonly startGlow: boolean;
  /** fade만 true — 띠 래퍼 · `.step-sheet-pop`에 data-motion="reduced". */
  readonly motionReduced: boolean;
};

const noEntranceClasses: SheetEntranceClasses = {
  band: "journey-map-screen-episode-header",
  bandProgress: "none",
  bubble: "step-sheet-pop",
  bubbleInteractive: true,
  fill: "step-sheet-progress-fill",
  startGlow: false,
  motionReduced: false,
};

/** 스캐폴드 — 모든 entrance에서 `none` 행을 돌려줍니다. */
export function sheetEntranceClasses(_entrance: SheetEntranceMotion): SheetEntranceClasses {
  return noEntranceClasses;
}

/** 말풍선 폭(step-sheet.css `.step-sheet-panel` width와 같은 값)입니다. */
export const stepSheetPanelWidth: number = 0;

/** `.step-sheet-pop` 인라인 transform-origin입니다. */
export function stepSheetBubbleOrigin(_caretOffset: number): string {
  return "0px 0px";
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
  delay: "d0",
  duration: "d0",
  interval: "d0",
  easing: "linear",
};

/** 진행 막대 값(0 ~ 100) → 글자에 쓰는 정수입니다. */
export function sheetPercentOf(_fillPercent: number): number {
  return 0;
}

/** `${value}%` — stepSheetProgress의 percentLabel과 같은 꼴입니다. */
export function sheetPercentLabel(_value: number): string {
  return "";
}

export type CubicBezier = readonly [number, number, number, number];

/** CSS cubic-bezier(x1, y1, x2, y2)의 t(0 ~ 1, 가둠)에서의 진행값입니다. 던지지 않습니다. */
export function cubicBezierEase(_easing: CubicBezier, _t: number): number {
  return 0;
}

/** 길이 stepCount + 1의 단조 비감소 정수 열입니다([0] = 0, 끝 = percent). */
export function sheetPercentCountUpFrames(
  _percent: number,
  _easing: CubicBezier,
  _stepCount: number,
): readonly number[] {
  return [];
}

export type SheetPercentCountUp = {
  readonly frames: readonly number[];
  readonly startDelayMs: number;
  readonly stepMs: number;
};

/** expressive && percent > 0 → 토큰에서 낸 일정, 아니면 null(카운트업 없음 — 최종값). */
export function sheetPercentCountUpFor(
  _entrance: SheetEntranceMotion,
  _percent: number,
): SheetPercentCountUp | null {
  return null;
}

export type SheetPercentView = {
  readonly label: string;
  /** `.step-sheet-progress-percent-pop` 래퍼 className 전체. */
  readonly className: string;
};

/** countUp null → 최종 라벨 · pop 없음. 아니면 frames[frameIndex]의 라벨, 마지막 칸이면 pop 클래스를 더합니다. */
export function sheetPercentView(
  _countUp: SheetPercentCountUp | null,
  _percent: number,
  _frameIndex: number,
): SheetPercentView {
  return { label: "", className: "" };
}

export type MapUnitEntrance = {
  readonly targetId: SheetTargetId | null;
  readonly entrance: SheetEntranceMotion;
};

export const noMapUnitEntrance: MapUnitEntrance = { targetId: null, entrance: "none" };

export type MapUnitStageMotion = "none" | "pop" | "pop-burst";

export function mapUnitStageMotionOf(
  _entrance: MapUnitEntrance,
  _targetId: SheetTargetId | null,
): MapUnitStageMotion {
  return "none";
}

/** 노드 튕김 래퍼 className입니다. */
export function mapUnitPopClassName(_stageMotion: MapUnitStageMotion): string {
  return "";
}

/** 반짝임 축 수입니다. */
export const mapUnitBurstRayCount: number = 0;

/** 축마다의 각도(도)입니다. */
export function mapUnitBurstRayAngles(_count: number): readonly number[] {
  return [];
}
