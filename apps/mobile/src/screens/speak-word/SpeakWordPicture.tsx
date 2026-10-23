import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { speakWordPictureLabel } from "./speak-word";
import type { SpeakWordPictureProps } from "./speak-word.contract";

import "./speak-word-picture.css";

// 그림 틀입니다 — 받은 로드 상태대로 빈 틀 · 그림 · 뜻 글자를 그릴 뿐 상태는 없습니다(전이와 타이머는
// `useSpeakWordPicture`). 접근성: 틀이 접근성 요소 하나(`image`)이고 이름이 로드 상태를 따릅니다.
// 이름은 영어 뜻뿐입니다. 정답 이름표는 틀에 겹치지 않고 카드 흐름의 `AnswerReveal`이 맡습니다.
export function SpeakWordPicture({
  url,
  ratio = "4-3",
  meaning,
  state,
  onLoad,
  onError,
}: SpeakWordPictureProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="speak-word-picture" data-testid="speak-word-picture" data-loadstate={state}>
      <view
        className={`speak-word-picture-frame speak-word-picture-frame-${ratio}`}
        data-testid="speak-word-picture-frame"
        accessibility-element={true}
        accessibility-traits="image"
        accessibility-label={speakWordPictureLabel(meaning, state, copy)}
      >
        {state === "failed" ? (
          // 그림이 못 서면 그 자리에 영어 뜻이 섭니다 — 무엇을 말할지 글자로 남습니다.
          <view className="speak-word-picture-fallback-box">
            <text className="speak-word-picture-fallback" data-testid="speak-word-picture-fallback">
              {meaning}
            </text>
            <text className="speak-word-picture-caption" data-testid="speak-word-picture-caption">
              {copy.wordChoicePicture.unavailableCaption}
            </text>
          </view>
        ) : (
          // 로딩 중에는 빈 틀 위에 그림이 아직 안 보입니다 — 틀의 회색 면이 자리를 지킵니다.
          <image
            className="speak-word-picture-image"
            data-testid="speak-word-picture-image"
            src={url}
            mode="aspectFill"
            bindload={onLoad}
            binderror={onError}
          />
        )}
      </view>
    </view>
  );
}
