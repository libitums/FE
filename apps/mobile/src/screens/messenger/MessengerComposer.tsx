import type { ReactNode } from "@lynx-js/react";
import arrowUp02 from "@libitums/icons/lynx/arrow-up-02";
import { color } from "@libitums/design-tokens";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { useUiCopy } from "../../lib/ui-copy";
import { maskedAnswer } from "./hangul-keyboard";
import type { MessengerComposerProps } from "./messenger.contract";

// 답장 입력창과 그 위의 배지입니다(Figma 80-7082 · 80-7380). 입력 방식별 안내를 표시하고,
// 판정이 나면 정답 · 오답을 표시합니다.
//
// 힌트는 입력 방식마다 다릅니다.
// - 자판: 비어 있으면 정답이 초성으로 가려 보이고(`ㅈㅇㅇ!`), 그 아래 뜻(영문)이 늘 섭니다.
//   치기 시작하면 가린 정답은 아래 줄로 옮겨 가 뜻과 함께 계속 보입니다 — 뜻만으로는 너무
//   어렵습니다.
// - 객관식: 비어 있으면 선택·전송 안내를 표시하고, 아래 줄에는 뜻과 제공된 로마자를 둡니다.
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
  const placeholder = choosing ? copy.messenger.chooseReply : maskedAnswer(reply.text);
  const hint =
    choosing && reply.romanization
      ? `${reply.romanization} · ${reply.translation}`
      : choosing || empty
        ? reply.translation
        : `${maskedAnswer(reply.text)} · ${reply.translation}`;

  return (
    <>
      {verdict === "typing" ? (
        <view className="messenger-composer-prompt" data-testid="messenger-composer-prompt">
          <text className="messenger-composer-prompt-label">
            {choosing ? copy.messenger.chooseReply : "Type!"}
          </text>
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
