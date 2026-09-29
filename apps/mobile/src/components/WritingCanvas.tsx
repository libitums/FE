import type { ReactNode } from "@lynx-js/react";

import eraser from "@libitums/icons/lynx/eraser";
import { color } from "@libitums/design-tokens";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { AnswerVerdict } from "./AnswerVerdict";
import { DrawingSurface } from "./DrawingSurface";
import type { WritingEraseControl, WritingGuideView } from "./use-writing-practice";
import type { AnswerResult } from "../lib/answer-result";
import type { Stroke } from "../lib/handwriting-recognition";
import { useUiCopy } from "../lib/ui-copy";
import { writingCanvasGeometries, type WritingCanvasSize } from "../lib/writing-canvas";

import "./writing-canvas.css";

// 쓰기 캔버스입니다(Figma 79-6378의 아래 판). 흐린 안내 글자 위에 따라 쓰고, 판정이 나면 안내가
// 걷히고 쓴 획과 판정 배지만 남습니다. 쓰기 학습형과 최종 테스트가 함께 씁니다(ADR-0008).
//
// 캔버스는 흐름을 모릅니다 — 무엇을 깔지(`guide`), 위에 무엇을 띄울지(`badge`), 지우기 버튼이
// 있는지(`erase`)를 받아 그릴 뿐입니다. 흐름은 `use-writing-practice.ts`가 집니다.

/** 캔버스 위쪽 가운데에 뜨는 것입니다 — 판정 배지, 또는 잴 수 없을 때의 안내 한 줄입니다. */
export type WritingCanvasBadge =
  | { readonly kind: "none" }
  | { readonly kind: "verdict"; readonly result: AnswerResult }
  | { readonly kind: "notice"; readonly text: string };

export type WritingCanvasProps = {
  readonly size: WritingCanvasSize;
  /** 지금 쓸 음절입니다. 글자 안내(`text`)와 안내의 낭독 이름이 이 값을 씁니다. */
  readonly glyph: string;
  readonly guide: WritingGuideView;
  readonly strokes: readonly Stroke[];
  readonly badge: WritingCanvasBadge;
  readonly erase: WritingEraseControl | null;
  readonly onStrokeComplete: (stroke: Stroke) => void;
};

export function WritingCanvas({
  size,
  glyph,
  guide,
  strokes,
  badge,
  erase,
  onStrokeComplete,
}: WritingCanvasProps): ReactNode {
  const copy = useUiCopy();
  const geometry = writingCanvasGeometries[size];

  return (
    <view
      className={`writing-canvas writing-canvas-${size}`}
      data-testid="writing-canvas"
      data-guide={guide.kind}
    >
      {/* 안내가 표면 **뒤**에 섭니다(DOM에서 먼저 옵니다). 표면이 위에 서야 터치를 표면이
          받습니다 — 안내를 위에 올리면 그것이 터치를 가로챌지가 이 스택에서 확인된 바
          없습니다. */}
      {guide.kind === "image" ? (
        <image
          className={`writing-canvas-guide writing-canvas-${size}`}
          data-testid="writing-canvas-guide"
          src={`data:image/png;base64,${guide.image}`}
          accessibility-element={true}
          accessibility-label={copy.writing.guideGlyph(glyph)}
        />
      ) : guide.kind === "text" ? (
        <text
          className={`writing-canvas-guide-text writing-canvas-guide-text-${size}`}
          data-testid="writing-canvas-guide-text"
          accessibility-label={copy.writing.guideGlyph(glyph)}
        >
          {glyph}
        </text>
      ) : null}
      <DrawingSurface
        strokes={strokes}
        width={geometry.width}
        height={geometry.height}
        sizeClassName={`writing-canvas-${size}`}
        color={color.gray[900]}
        strokeWidth={geometry.strokeWidth}
        onStrokeComplete={onStrokeComplete}
        // 시스템이 가져간 획은 표면이 이미 버렸습니다. 쓰기에서는 그 수를 세어 쓸 곳이 없어
        // 받기만 합니다 — 세는 것은 탐침의 관측 몫입니다.
        onStrokeCancel={() => {}}
      />
      {badge.kind === "none" ? null : (
        <view className="writing-canvas-badge" data-testid="writing-canvas-badge">
          {badge.kind === "verdict" ? (
            <AnswerVerdict result={badge.result} />
          ) : (
            <text className="writing-canvas-notice" data-testid="writing-canvas-notice">
              {badge.text}
            </text>
          )}
        </view>
      )}
      {erase === null ? null : (
        <view className="writing-canvas-erase" data-testid="writing-canvas-erase">
          <RoundButton
            accessibilityLabel={erase.label}
            icon={eraser}
            variant="neutral"
            size="m"
            bindtap={erase.run}
          />
        </view>
      )}
    </view>
  );
}
