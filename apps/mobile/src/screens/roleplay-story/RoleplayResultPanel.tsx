import type { ReactNode } from "@lynx-js/react";

import check from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import volume from "@libitums/icons/lynx/volume";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import type { DiffPiece } from "../../lib/syllable-diff";
import { wordDiff } from "../../lib/syllable-diff";
import { useUiCopy } from "../../lib/ui-copy";

export type RoleplayResultPanelProps = {
  readonly correct: boolean;
  /** 가장 가까운 정답 문장 — 오답 패널의 주인공. */
  readonly expected: string;
  /** 그 문장의 로마자. */
  readonly roman: string;
  /** 들은 문장(빈 글자면 「들은 말 없음」). */
  readonly heard: string;
  readonly isLast: boolean;
  /** 내 문장 소리가 있으면 정답 상자에 소리 단추가 섭니다. */
  readonly onHear?: () => void;
  readonly onRetry: () => void;
  readonly onNext: () => void;
};

function Pieces({
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

// 판정 뒤 아래 패널입니다(시안 R3 · R4). 맞으면 짧은 확인과 넘김(2초 뒤 저절로 · 누르면 바로 — 화면이 잽니다),
// 틀리면 정답 문장이 주인공이고(크게 · 소리 단추 · 다른 낱말 밑줄) 들은 말은 작게, Try again이 주 버튼입니다.
export function RoleplayResultPanel({
  correct,
  expected,
  roman,
  heard,
  isLast,
  onHear,
  onRetry,
  onNext,
}: RoleplayResultPanelProps): ReactNode {
  const copy = useUiCopy();
  const next = isLast ? copy.common.seeResults : copy.common.next;
  // custom prop 경계를 지나 `bindtap`에 닿는 핸들러라 `'background only'`를 둡니다.
  const handleHear = (): void => {
    "background only";
    onHear?.();
  };
  if (correct) {
    return (
      <view
        className="roleplay-story-panel roleplay-story-actions"
        data-testid="roleplay-talk-actions"
      >
        <view className="roleplay-story-result-head">
          <view className="roleplay-story-result-mark roleplay-story-result-mark-correct">
            <svg
              className="roleplay-story-result-icon"
              content={check}
              current-color={color.white}
            />
          </view>
          <text
            className="roleplay-story-result-title roleplay-story-result-title-correct"
            data-testid="roleplay-talk-verdict"
          >
            {copy.roleplayStory.great}
          </text>
        </view>
        <view data-testid="roleplay-talk-next">
          <Button label={next} variant="brand" size="xl" width="fill" bindtap={onNext} />
        </view>
      </view>
    );
  }
  const diff = wordDiff(heard, expected);
  return (
    <view
      className="roleplay-story-panel roleplay-story-actions"
      data-testid="roleplay-talk-actions"
    >
      <view className="roleplay-story-result-head">
        <view className="roleplay-story-result-mark roleplay-story-result-mark-incorrect">
          <svg
            className="roleplay-story-result-icon"
            content={cross}
            current-color={color.feedback.incorrect}
          />
        </view>
        <text
          className="roleplay-story-result-title roleplay-story-result-title-incorrect"
          data-testid="roleplay-talk-verdict"
        >
          {copy.roleplayStory.notQuite}
        </text>
      </view>
      <view className="roleplay-story-answer" data-testid="roleplay-talk-answer">
        {onHear === undefined ? null : (
          <view
            className="roleplay-story-answer-play"
            data-testid="roleplay-talk-answer-play"
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
          <Pieces
            pieces={diff.expected}
            className="roleplay-story-answer-ko"
            testId="roleplay-talk-answer-ko"
          />
          <text className="roleplay-story-panel-roman">{roman}</text>
        </view>
      </view>
      <view className="roleplay-story-heard" data-testid="roleplay-talk-heard">
        <text className="roleplay-story-heard-label">{copy.speakWord.result.youSaid}</text>
        {heard.trim() === "" ? (
          <text className="roleplay-story-heard-text">{copy.roleplayStory.heardNothing}</text>
        ) : (
          <Pieces
            pieces={diff.heard}
            className="roleplay-story-heard-text"
            testId="roleplay-talk-heard-text"
          />
        )}
      </view>
      <view data-testid="roleplay-talk-retry">
        <Button
          label={copy.speaking.tryAgain}
          variant="brand"
          size="xl"
          width="fill"
          bindtap={onRetry}
        />
      </view>
      <view data-testid="roleplay-talk-next">
        <Button label={next} variant="text" size="xl" width="fill" bindtap={onNext} />
      </view>
    </view>
  );
}
