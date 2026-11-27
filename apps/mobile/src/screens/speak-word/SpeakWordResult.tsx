import type { ReactNode } from "@lynx-js/react";

import check from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import volume from "@libitums/icons/lynx/volume";
import { color } from "@libitums/design-tokens";

import type { DiffPiece } from "../../lib/syllable-diff";
import { useUiCopy } from "../../lib/ui-copy";
import type { SpeakWordResultView } from "./speak-word-result";

import "./speak-word-result.css";

export type SpeakWordResultProps = {
  readonly view: SpeakWordResultView;
  /** 정답 소리가 있으면 정답 상자 왼쪽에 소리 단추가 섭니다. */
  readonly onHear?: () => void;
};

/** 조각들 — 다른 음절만 주황 밑줄입니다(색만으로 말하지 않도록 밑줄을 함께). */
function DiffText({
  pieces,
  className,
  testId,
}: {
  readonly pieces: readonly DiffPiece[];
  readonly className: string;
  readonly testId: string;
}): ReactNode {
  return (
    <text className={className} data-testid={testId}>
      {pieces.map((piece, index) => (
        <text
          key={String(index)}
          className={piece.differs ? "speak-word-result-differs" : undefined}
          data-differs={piece.differs ? "true" : undefined}
        >
          {piece.text}
        </text>
      ))}
    </text>
  );
}

// 말하기 퀴즈 결과 시트입니다(시안 S2 perfect · S3 close · S4 오답). 판정 색은 시트 면에만 두고 정답 상자는 늘
// 중립(흰 면 · 회색 테)입니다. 결과는 화면이 한 번 알립니다(`announce`) — 여기에는 낭독 순서대로 글만 둡니다.
export function SpeakWordResult({ view, onHear }: SpeakWordResultProps): ReactNode {
  const copy = useUiCopy();
  const correct = view.tone === "correct";
  const title =
    view.title === "perfect"
      ? copy.speakWord.result.perfect
      : view.title === "close"
        ? copy.common.answerResult.correct
        : copy.learningShell.review.missed;
  const answerLabel =
    view.answerLabel === "model"
      ? copy.speakWord.result.modelAnswer
      : view.answerLabel === "answer"
        ? copy.catalogFinal.answerLabel
        : null;

  // custom prop 경계를 지나 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleHear = (): void => {
    "background only";
    onHear?.();
  };

  const heard =
    view.heard === null ? null : (
      <view className="speak-word-result-heard">
        <text className="speak-word-result-label">{copy.speakWord.result.youSaid}</text>
        <DiffText
          pieces={view.heard}
          className={correct ? "speak-word-result-heard-small" : "speak-word-result-heard-text"}
          testId="speak-word-result-heard"
        />
      </view>
    );

  return (
    <view
      className={`speak-word-result speak-word-result-${view.tone}`}
      data-testid="speak-word-result"
      data-grade={view.title}
    >
      <view className="speak-word-result-head">
        <view className={`speak-word-result-mark speak-word-result-mark-${view.tone}`}>
          <svg
            className="speak-word-result-mark-icon"
            content={correct ? check : cross}
            current-color={correct ? color.white : color.feedback.incorrect}
          />
        </view>
        <text
          className={`speak-word-result-title speak-word-result-title-${view.tone}`}
          data-testid="speak-word-result-title"
        >
          {title}
        </text>
        {view.title === "close" ? (
          <text className="speak-word-result-chip" data-testid="speak-word-result-chip">
            {copy.speakWord.result.almostPerfect}
          </text>
        ) : null}
      </view>
      {correct ? null : heard}
      <view className="speak-word-result-answer-group">
        {answerLabel === null ? null : (
          <text className="speak-word-result-label" data-testid="speak-word-result-answer-label">
            {answerLabel}
          </text>
        )}
        <view className="speak-word-result-answer" data-testid="speak-word-reveal">
          {onHear === undefined ? null : (
            <view
              className="speak-word-result-play"
              data-testid="speak-word-result-play"
              accessibility-element={true}
              accessibility-traits="button"
              accessibility-label={copy.speakWord.result.hearAnswer}
              bindtap={handleHear}
            >
              <svg
                className="speak-word-result-play-icon"
                content={volume}
                current-color={color.brand.strong}
              />
            </view>
          )}
          <view className="speak-word-result-answer-text">
            <DiffText
              pieces={view.answer}
              className="speak-word-result-word"
              testId="speak-word-result-answer"
            />
            {view.romanization === null ? null : (
              <text className="speak-word-result-romanization">{view.romanization}</text>
            )}
          </view>
        </view>
      </view>
      {correct ? heard : null}
    </view>
  );
}
