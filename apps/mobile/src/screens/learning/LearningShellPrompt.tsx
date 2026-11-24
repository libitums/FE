import type { ReactNode } from "@lynx-js/react";

import { AnswerVerdict } from "../../components/AnswerVerdict";
import { SentenceReplayButton } from "../../components/SentenceReplayButton";
import type { AnswerResult } from "../../lib/answer-result";
import type { VerdictReplay } from "./learning-shell-props";

export type LearningShellPromptProps = {
  readonly instruction: string;
  /** 주면 지시문 자리에 판정 배지가 겹쳐 섭니다. */
  readonly verdict?: AnswerResult;
  /** 배지 옆 다시 듣기 스피커입니다(ADR-0189). 배지가 없으면 그리지 않습니다. */
  readonly verdictReplay?: VerdictReplay | undefined;
};

// 지시문 줄입니다. 판정이 서면 지시문 글은 흐름에 남은 채 가려지고(잎 `<text>`라 `accessibility-element={false}`로 낭독에서도 뺌 — 가림 속성은 자손에만 듭니다, ADR-0016 D5) 배지가 그 줄 위에 겹쳐 서므로
// 줄 높이가 판정 때문에 바뀌지 않습니다 — 두 줄 지시문도 마찬가지입니다. 줄 상자의 하한은 배지 높이(36)입니다.
// 배지 옆 다시 듣기는 [배지][8][스피커] 한 묶음으로 가운데에 섭니다(ADR-0189). 판정 층은 흐름 밖이라 줄 높이가 그대로이고,
// 48 누르는 자리는 36 줄 위아래로 넘칩니다(`overflow: visible`).
export function LearningShellPrompt({
  instruction,
  verdict,
  verdictReplay,
}: LearningShellPromptProps): ReactNode {
  const covered = verdict !== undefined;
  return (
    <view className="learning-shell-prompt" data-testid="learning-shell-prompt">
      <text
        className={
          covered
            ? "learning-shell-instruction learning-shell-instruction-covered"
            : "learning-shell-instruction"
        }
        data-testid="learning-shell-instruction"
        accessibility-element={covered ? false : undefined}
      >
        {instruction}
      </text>
      {covered ? (
        <view className="learning-shell-verdict" data-testid="learning-shell-verdict">
          <AnswerVerdict result={verdict} />
          {verdictReplay === undefined ? null : (
            <SentenceReplayButton
              testId="learning-shell-verdict-replay"
              replay={verdictReplay.replay}
              size="m"
              onReplayed={verdictReplay.onReplayed}
            />
          )}
        </view>
      ) : null}
    </view>
  );
}
