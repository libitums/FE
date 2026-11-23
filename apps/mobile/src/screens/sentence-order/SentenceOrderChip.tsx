import { useUiCopy } from "../../lib/ui-copy";
import type { ReactNode } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";
import { useMotion } from "@libitums/ui-lynx/motion";

import {
  chipAccessibilityLabel,
  sentenceOrderChipClassName,
  sentenceOrderChipPlaceholderClassName,
} from "./sentence-order";
import {
  ANSWER_NUDGE_TARGET_CLASS,
  AnswerNudgeGlow,
} from "../../components/answer-nudge/AnswerNudgeGlow";
import { SentenceOrderResultMark } from "./SentenceOrderResultMark";
import type { AnswerResult } from "../../lib/answer-result";
import { playSound } from "../../lib/sound-effects";
import type { SurfaceTone } from "../../lib/surface-tone";

import "./sentence-order-chip.css";

// 낱말 조각 하나입니다(Figma 65-14). 놓인 조각은 답 칸 줄에 주황 칩으로, 창고의 조각은 흰
// 칩으로 섭니다 — 같은 조각이 어느 목록에 있는가로 모양이 갈립니다. 창고에서 빠져나간
// 자리는 이 컴포넌트가 아니라 `SentenceOrderChipPlaceholder`가 지킵니다.
export type SentenceOrderChipProps = {
  /** `chips` 안에서의 인덱스입니다. **안정적 식별자**이지 화면 위치가 아닙니다. */
  index: number;
  text: string;
  /** 배치된 자리(1-based)입니다. `null`이면 창고에 있습니다. **boolean을 두지 않습니다.** */
  placedOrdinal: number | null;
  /** 누를 수 없는 상태입니다 — 채점 뒤이거나, 칸이 다 차 창고의 조각을 더 놓을 수 없을 때. */
  disabled?: boolean;
  /** 놓이는 면입니다. 기본 `light`. */
  surface?: SurfaceTone;
  /** 채점 뒤 줄 위 조각의 판정 색입니다. */
  result?: AnswerResult | null;
  /** 창고 조각의 로마자 줄입니다(글자 위). 없으면 한 줄 조각입니다(ADR-0153). */
  romanization?: string;
  /** 고민 힌트(ADR-0177) — 다음 정답인 창고 조각에 브랜드 색 그림자가 섭니다. */
  nudged?: boolean;
  onTap: (index: number) => void;
};

export function SentenceOrderChip({
  index,
  text,
  placedOrdinal,
  disabled = false,
  surface = "light",
  result = null,
  romanization,
  nudged = false,
  onTap,
}: SentenceOrderChipProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const handleTap = () => {
    "background only";
    playSound("button");
    onTap(index);
  };
  const variant = placedOrdinal === null ? "bank" : "placed";
  const judged = placedOrdinal === null ? null : result;
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다. undefined로 넘기면 테스트 렌더러가 "null" 문자열로 남깁니다.
  const motionProps = motion === "reduced" ? { "data-motion": "reduced" } : {};
  const glow = nudged && placedOrdinal === null;
  const reading =
    (romanization === undefined ? "" : " sentence-order-chip-with-reading") +
    (glow ? ANSWER_NUDGE_TARGET_CLASS : "");

  return (
    <view
      className={
        judged === null
          ? `${sentenceOrderChipClassName(variant, motion, surface)}${reading}`
          : `${sentenceOrderChipClassName(variant, motion, surface)}${reading} sentence-order-chip-${judged}`
      }
      data-testid={`sentence-order-chip-${index}`}
      {...motionProps}
      data-surface={surface}
      data-placed={placedOrdinal ?? "none"}
      {...(judged === null ? {} : { "data-result": judged })}
      accessibility-element={true}
      accessibility-label={chipAccessibilityLabel(text, placedOrdinal, copy, judged)}
      accessibility-traits={disabled ? "disabled" : "button"}
      bindtap={disabled ? undefined : handleTap}
    >
      {glow ? <AnswerNudgeGlow /> : null}
      {/* 보이는 이름을 지는 요소는 가리지 않습니다(ADR-0016 D5) — 접근성 속성이 없습니다. */}
      {romanization === undefined ? null : (
        <text className="tile-romanization" data-testid={`sentence-order-chip-${index}-roman`}>
          {romanization}
        </text>
      )}
      <text className="sentence-order-chip-label">{text}</text>
      {judged === null ? null : (
        <SentenceOrderResultMark
          result={judged}
          tint={color.feedback[judged === "correct" ? "correct-text" : "incorrect-text"]}
          testId={`sentence-order-chip-${index}-mark`}
        />
      )}
    </view>
  );
}

export type SentenceOrderChipPlaceholderProps = {
  readonly index: number;
  readonly text: string;
  /** 놓이는 면입니다. 기본 `light`. */
  readonly surface?: SurfaceTone;
  /** 빠져나간 조각의 로마자 — 보이지 않게 두어 자리 폭 · 높이를 원래 조각과 같게 지킵니다. */
  readonly romanization?: string;
};

/**
 * 창고에서 조각이 빠져나간 자리입니다. 같은 크기의 회색 칸이 남아 창고의 배치가 흔들리지
 * 않습니다(디자인). 낭독하지 않습니다 — 조작 단위도 정보도 아닙니다.
 */
export function SentenceOrderChipPlaceholder({
  index,
  text,
  surface = "light",
  romanization,
}: SentenceOrderChipPlaceholderProps): ReactNode {
  const reading = romanization === undefined ? "" : " sentence-order-chip-with-reading";
  return (
    <view
      className={`${sentenceOrderChipPlaceholderClassName(surface)}${reading}`}
      data-testid={`sentence-order-bank-slot-${index}`}
      data-surface={surface}
      accessibility-elements-hidden={true}
    >
      {/* 자리 폭을 조각 글자로 잡되 보이지 않게 둡니다 — 빈칸이 원래 조각과 같은 폭입니다. */}
      {romanization === undefined ? null : (
        <text className="tile-romanization sentence-order-chip-label-hidden">{romanization}</text>
      )}
      <text className="sentence-order-chip-label sentence-order-chip-label-hidden">{text}</text>
    </view>
  );
}
