import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { wordChoicePictureLabel } from "./word-choice-picture";
import type { WordChoicePictureProps } from "./word-choice-picture";

import "./word-choice-picture.css";

// 그림 문항의 제시 자리입니다 — 단어 선택 카드 안에서 제시문이 서던 자리에 그림 틀이 섭니다. 받은 로드
// 상태대로 빈 틀 · 그림 · 뜻 글자를 그릴 뿐 상태는 없습니다(전이와 타이머는 `useWordChoicePicture`).
//
// 접근성: 그림 틀이 접근성 요소 하나(`image`)이고 이름이 로드 상태를 따릅니다. 이름은 영어 뜻뿐입니다 —
// 한글 · 로마자를 넣으면 정답을 읽어 줍니다. 답한 뒤에 서는 이름표는 틀의 **형제**입니다(틀 안에 넣으면
// 접근성 요소가 겹칩니다). 겹쳐 보이게 놓는 것은 CSS입니다.
export function WordChoicePicture({
  url,
  meaning,
  state,
  answer,
  onLoad,
  onError,
}: WordChoicePictureProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="word-choice-picture" data-testid="word-choice-picture" data-loadState={state}>
      <view
        className="word-choice-picture-frame"
        data-testid="word-choice-picture-frame"
        accessibility-element={true}
        accessibility-traits="image"
        accessibility-label={wordChoicePictureLabel(meaning, state, copy)}
      >
        {state === "failed" ? (
          // 그림이 못 서면 그 자리에 정답 낱말의 영어 뜻이 섭니다 — 문항이 「뜻 → 한글 고르기」로 성립합니다.
          <view className="word-choice-picture-fallback-box">
            <text
              className="word-choice-picture-fallback"
              data-testid="word-choice-picture-fallback"
            >
              {meaning}
            </text>
            <text className="word-choice-picture-caption" data-testid="word-choice-picture-caption">
              {copy.wordChoicePicture.unavailableCaption}
            </text>
          </view>
        ) : (
          // 로딩 중에는 빈 틀 위에 그림이 아직 안 보입니다 — 틀의 회색 면이 자리를 지킵니다.
          <image
            className="word-choice-picture-image"
            data-testid="word-choice-picture-image"
            src={url}
            mode="aspectFill"
            bindload={onLoad}
            binderror={onError}
          />
        )}
      </view>

      {answer === null ? null : (
        <view
          className="word-choice-picture-answer"
          data-testid="word-choice-picture-answer"
          accessibility-element={true}
          accessibility-traits="text"
          accessibility-label={copy.wordChoicePicture.answer(
            answer.word,
            answer.romanization,
            meaning,
          )}
        >
          <text className="word-choice-picture-answer-word">{answer.word}</text>
          <text className="word-choice-picture-answer-meaning">
            {copy.wordChoicePicture.answerSubline(answer.romanization, meaning)}
          </text>
        </view>
      )}
    </view>
  );
}
