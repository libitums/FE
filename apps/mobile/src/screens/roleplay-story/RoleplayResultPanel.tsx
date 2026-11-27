import type { ReactNode } from "@lynx-js/react";

import check from "@libitums/icons/lynx/tick";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { wordDiff } from "../../lib/syllable-diff";
import { useUiCopy } from "../../lib/ui-copy";
import type { RoleplayClose } from "./roleplay-panel";
import { DiffPieces, RoleplayAnswerBox } from "./RoleplayAnswerBox";

export type RoleplayResultPanelProps = {
  readonly correct: boolean;
  /** 맞았지만 완벽하지 않으면(close) 모범 정답 묶음. 아니면 `null`. */
  readonly close: RoleplayClose | null;
  /** 가장 가까운 정답 문장 — 오답 패널의 주인공. */
  readonly expected: string;
  /** 그 문장의 로마자. */
  readonly roman: string;
  /** 그 문장의 뜻(앱 언어). 없으면 `null`. */
  readonly meaning: string | null;
  /** 들은 문장(빈 글자면 「들은 말 없음」). */
  readonly heard: string;
  readonly isLast: boolean;
  /** 내 문장 소리가 있으면 정답 상자에 소리 단추가 섭니다. */
  readonly onHear?: () => void;
  readonly onRetry: () => void;
  readonly onNext: () => void;
};

// close(맞음 · 완벽하지 않음)의 모범 정답 — 말하기 퀴즈 close와 같은 문구 · 같은 꼴: 「Model answer」 정답 상자(표시 없음) · 「You said」
// 들은 말(다른 음절 밑줄). 저절로 넘어가지 않고 Next를 기다립니다(화면이 정함).
function CloseAnswer({
  close,
  roman,
  meaning,
  onHear,
}: {
  readonly close: RoleplayClose;
  readonly roman: string;
  readonly meaning: string | null;
  readonly onHear?: () => void;
}): ReactNode {
  const copy = useUiCopy();
  return (
    <view className="roleplay-story-close" data-testid="roleplay-talk-close">
      <text className="roleplay-story-panel-label">{copy.speakWord.result.modelAnswer}</text>
      <RoleplayAnswerBox
        testId="roleplay-talk-close-answer"
        answer={[{ text: close.expected, differs: false }]}
        roman={roman}
        meaning={meaning}
        onHear={onHear}
      />
      {close.heard.length === 0 ? null : (
        <view className="roleplay-story-heard">
          <text className="roleplay-story-heard-label">{copy.speakWord.result.youSaid}</text>
          <DiffPieces
            pieces={close.heard}
            className="roleplay-story-heard-text"
            testId="roleplay-talk-close-heard"
          />
        </view>
      )}
    </view>
  );
}

// 판정 뒤 아래 패널입니다(시안 R3 · R4). 맞으면 짧은 확인과 넘김(내 문장 소리가 끝난 뒤 저절로 · 누르면 바로 — 화면이 잽니다),
// close면 모범 정답을 함께, 틀리면 정답 문장이 주인공이고(크게 · 소리 단추 · 다른 낱말 밑줄) 들은 말은 작게, Try again이 주 버튼입니다.
export function RoleplayResultPanel({
  correct,
  close,
  expected,
  roman,
  meaning,
  heard,
  isLast,
  onHear,
  onRetry,
  onNext,
}: RoleplayResultPanelProps): ReactNode {
  const copy = useUiCopy();
  const next = isLast ? copy.common.seeResults : copy.common.next;
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
          {close === null ? null : (
            <text className="roleplay-story-result-chip" data-testid="roleplay-talk-close-chip">
              {copy.speakWord.result.almostPerfect}
            </text>
          )}
        </view>
        {close === null ? null : (
          <CloseAnswer close={close} roman={roman} meaning={meaning} onHear={onHear} />
        )}
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
      <RoleplayAnswerBox
        testId="roleplay-talk-answer"
        answer={diff.expected}
        roman={roman}
        meaning={meaning}
        onHear={onHear}
      />
      <view className="roleplay-story-heard" data-testid="roleplay-talk-heard">
        <text className="roleplay-story-heard-label">{copy.speakWord.result.youSaid}</text>
        {heard.trim() === "" ? (
          <text className="roleplay-story-heard-text">{copy.roleplayStory.heardNothing}</text>
        ) : (
          <DiffPieces
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
