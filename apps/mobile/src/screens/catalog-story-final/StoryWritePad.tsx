import type { ReactNode } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import { DrawingSurface } from "../../components/DrawingSurface";
import { useUiCopy } from "../../lib/ui-copy";
import { storyPadPoints, storyPadStrokeWidth, type StoryPadSize } from "./story-pad-size";
import type { StoryTrace } from "./use-story-trace";
import { storyTraceStrokeWidth } from "./use-story-trace";

// 이야기 파이널 따라 쓰기의 쓰기 칸 · Redo · Listen입니다. **스크롤 영역 밖**에 섭니다 — 표면과 스크롤이 같은
// 제스처를 다투지 않게(`DrawingSurface` 주의, ADR-0022). 획순은 보이지 않고 흐린 안내 글자만 깝니다.

export function StoryWritePad({
  syllable,
  size,
  trace,
  onListen,
}: {
  readonly syllable: string;
  /** 칸 크기 단계 — 작은 화면에서 줄어듭니다. 채점은 기준 칸 좌표로 합니다(`story-pad-size`). */
  readonly size: StoryPadSize;
  readonly trace: StoryTrace;
  /** 내 줄 소리가 없으면 `null` — Listen이 서지 않습니다. */
  readonly onListen: (() => void) | null;
}): ReactNode {
  const copy = useUiCopy().catalogStoryFinal;
  return (
    <view className="catalog-story-final-write" data-testid="catalog-story-final-write">
      <view
        className={`catalog-story-final-pad catalog-story-final-pad-${size}`}
        data-testid="catalog-story-final-pad"
        data-size={size}
        accessibility-element={true}
        accessibility-label={copy.padLabel(syllable)}
      >
        {/* 호스트가 구운 안내 그림이 채점 마스크와 같은 픽셀입니다. 호스트가 없으면(채점도 없음) 글자로 대신합니다. */}
        {trace.guideImage === null ? (
          trace.graded ? null : (
            <text className={`catalog-story-final-pad-glyph catalog-story-final-pad-glyph-${size}`}>
              {syllable}
            </text>
          )
        ) : (
          <image
            className={`catalog-story-final-pad-guide catalog-story-final-pad-box-${size}`}
            data-testid="catalog-story-final-pad-guide"
            src={`data:image/png;base64,${trace.guideImage}`}
          />
        )}
        <DrawingSurface
          strokes={trace.strokes}
          width={storyPadPoints[size]}
          height={storyPadPoints[size]}
          sizeClassName={`catalog-story-final-pad-surface catalog-story-final-pad-box-${size}`}
          color={color.white}
          strokeWidth={storyPadStrokeWidth(storyTraceStrokeWidth, size)}
          onStrokeComplete={trace.addStroke}
          onStrokeCancel={() => {}}
        />
      </view>
      <view className="catalog-story-final-tools">
        <view
          className="catalog-story-final-tool"
          data-testid="catalog-story-final-redo"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.redo}
          bindtap={trace.redo}
        >
          <text className="catalog-story-final-tool-text">{copy.redo}</text>
        </view>
        {onListen === null ? null : (
          <view
            className="catalog-story-final-tool"
            data-testid="catalog-story-final-listen"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.listen}
            bindtap={onListen}
          >
            <text className="catalog-story-final-tool-text">{copy.listen}</text>
          </view>
        )}
      </view>
    </view>
  );
}
