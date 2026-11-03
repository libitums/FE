import type { ReactNode } from "@lynx-js/react";
import { color } from "@libitums/design-tokens";

import { DrawingSurface } from "../../components/DrawingSurface";
import { useUiCopy } from "../../lib/ui-copy";
import type { StoryTrace } from "./use-story-trace";
import { storyTraceStrokeWidth, storyTraceSurface } from "./use-story-trace";

// 이야기 파이널 따라 쓰기의 쓰기 칸 · Redo · Listen입니다. **스크롤 영역 밖**에 섭니다 — 표면과 스크롤이 같은
// 제스처를 다투지 않게(`DrawingSurface` 주의, ADR-0022). 획순은 보이지 않고 흐린 안내 글자만 깝니다.

export function StoryWritePad({
  syllable,
  trace,
  onListen,
}: {
  readonly syllable: string;
  readonly trace: StoryTrace;
  /** 내 줄 소리가 없으면 `null` — Listen이 서지 않습니다. */
  readonly onListen: (() => void) | null;
}): ReactNode {
  const copy = useUiCopy().catalogStoryFinal;
  return (
    <view className="catalog-story-final-write" data-testid="catalog-story-final-write">
      <view
        className="catalog-story-final-pad"
        data-testid="catalog-story-final-pad"
        accessibility-element={true}
        accessibility-label={copy.padLabel(syllable)}
      >
        {/* 호스트가 구운 안내 그림이 채점 마스크와 같은 픽셀입니다. 호스트가 없으면(채점도 없음) 글자로 대신합니다. */}
        {trace.guideImage === null ? (
          trace.graded ? null : (
            <text className="catalog-story-final-pad-glyph">{syllable}</text>
          )
        ) : (
          <image
            className="catalog-story-final-pad-guide"
            data-testid="catalog-story-final-pad-guide"
            src={`data:image/png;base64,${trace.guideImage}`}
          />
        )}
        <DrawingSurface
          strokes={trace.strokes}
          width={storyTraceSurface.width}
          height={storyTraceSurface.height}
          sizeClassName="catalog-story-final-pad-surface"
          color={color.white}
          strokeWidth={storyTraceStrokeWidth}
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
