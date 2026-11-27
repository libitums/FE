import type { ReactNode } from "@lynx-js/react";

import volume from "@libitums/icons/lynx/volume";
import { color } from "@libitums/design-tokens";

import type { DiffPiece } from "../../lib/syllable-diff";
import { useUiCopy } from "../../lib/ui-copy";

/** 조각들 — 다른 낱말 · 음절만 주황 밑줄입니다(색만으로 말하지 않게 밑줄을 함께). */
export function DiffPieces({
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
          className={piece.differs ? "roleplay-story-differs" : undefined}
          data-differs={piece.differs ? "true" : undefined}
        >
          {piece.text}
        </text>
      ))}
    </text>
  );
}

/** 정답 상자 — 소리 단추(있으면) · 한국어(표시 조각) · 로마자 · 뜻. 오답 패널과 close 모범 정답이 함께 씁니다. */
export function RoleplayAnswerBox({
  testId,
  answer,
  roman,
  meaning,
  onHear,
}: {
  readonly testId: string;
  readonly answer: readonly DiffPiece[];
  readonly roman: string;
  readonly meaning: string | null;
  readonly onHear?: () => void;
}): ReactNode {
  const copy = useUiCopy();
  // custom prop 경계를 지나 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleHear = (): void => {
    "background only";
    onHear?.();
  };
  return (
    <view className="roleplay-story-answer" data-testid={testId}>
      {onHear === undefined ? null : (
        <view
          className="roleplay-story-answer-play"
          data-testid={`${testId}-play`}
          accessibility-element={true}
          flatten={false}
          accessibility-traits="button"
          accessibility-label={copy.speakWord.result.hearAnswer}
          bindtap={handleHear}
        >
          <svg
            className="roleplay-story-result-icon"
            content={volume}
            current-color={color.brand.strong}
          />
        </view>
      )}
      <view className="roleplay-story-answer-text">
        <DiffPieces pieces={answer} className="roleplay-story-answer-ko" testId={`${testId}-ko`} />
        <text className="roleplay-story-panel-roman">{roman}</text>
        {meaning === null ? null : (
          <text className="roleplay-story-panel-meaning" data-testid={`${testId}-meaning`}>
            {meaning}
          </text>
        )}
      </view>
    </view>
  );
}
