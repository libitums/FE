import type { ReactNode } from "@lynx-js/react";
import arrowUp02 from "@libitums/icons/lynx/arrow-up-02";
import { color } from "@libitums/design-tokens";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { useUiCopy } from "../../lib/ui-copy";
import { maskedAnswer } from "./hangul-keyboard";
import type { MessengerComposerProps } from "./messenger.contract";

// 답장 입력창과 그 위의 배지입니다(Figma 80-7082 · 80-7380). 배지는 치는 동안 `Type!`,
// 판정이 나면 정답 · 오답입니다.
//
// 힌트는 입력 방식마다 다릅니다.
// - 자판: 비어 있으면 정답이 초성으로 가려 보이고(`ㅈㅇㅇ!`), 그 아래 뜻(영문)이 늘 섭니다.
//   치기 시작하면 가린 정답은 아래 줄로 옮겨 가 뜻과 함께 계속 보입니다 — 뜻만으로는 너무
//   어렵습니다.
// - 객관식: 보기가 곧 단서라 정답을 가려 보이지 않습니다. 비어 있으면 `messenger.placeholder`(디자인)이고
//   아래 줄은 뜻입니다.
export function MessengerComposer({
  reply,
  typed,
  verdict,
  onSend,
}: MessengerComposerProps): ReactNode {
  const copy = useUiCopy();
  const choosing = reply.choices !== undefined;
  const empty = typed.length === 0;
  const canSend = verdict === "typing" && typed.trim().length > 0;
  const placeholder = choosing ? copy.messenger.placeholder : maskedAnswer(reply.text);
  const hint =
    choosing || empty ? reply.translation : `${maskedAnswer(reply.text)} · ${reply.translation}`;

  return (
    <>
      {verdict === "typing" ? (
        <view className="messenger-composer-prompt" data-testid="messenger-composer-prompt">
          <text className="messenger-composer-prompt-label">Type!</text>
        </view>
      ) : (
        <AnswerVerdict result={verdict === "correct" ? "correct" : "incorrect"} />
      )}
      <view
        className={`messenger-composer messenger-composer-${verdict}`}
        data-testid="messenger-composer"
        data-verdict={verdict}
      >
        <view className="messenger-composer-body">
          <text
            className={
              empty
                ? "messenger-composer-text messenger-composer-placeholder"
                : "messenger-composer-text"
            }
            data-testid="messenger-composer-text"
            text-maxline="2"
          >
            {empty ? placeholder : typed}
          </text>
          <text
            className="messenger-composer-hint"
            data-testid="messenger-composer-hint"
            text-maxline="2"
          >
            {hint}
          </text>
        </view>
        <view
          className={
            canSend
              ? "messenger-composer-send"
              : "messenger-composer-send messenger-composer-send-idle"
          }
          data-testid="messenger-send"
          accessibility-element={true}
          accessibility-traits={canSend ? "button" : "disabled"}
          accessibility-label={canSend ? copy.common.sendWithText(typed) : copy.common.send}
          bindtap={onSend}
        >
          <svg
            className="messenger-composer-send-icon"
            content={arrowUp02}
            current-color={color.white}
          />
        </view>
      </view>
    </>
  );
}
