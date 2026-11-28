import type { ReactNode } from "@lynx-js/react";

import { SpeechMic } from "../../components/speech-mic/SpeechMic";
import type { SpeechMicState } from "../../components/speech-mic/speech-mic";
import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { useUiCopy } from "../../lib/ui-copy";
import { speakWordResultView } from "./speak-word-result";
import type { SpeakWordQuestion } from "./speak-word.contract";
import { revealSpeakWordHint, speakWordHintId } from "./speak-word-hint-scroll";
import { SpeakWordResult } from "./SpeakWordResult";

export type SpeakWordWorkspaceProps = {
  readonly question: SpeakWordQuestion;
  readonly phase: SpeechAttemptPhase;
  readonly judgement: SpokenAnswerJudgement | null;
  readonly micState: SpeechMicState;
  /** 못 알아들음 · 인식 실패 뒤 — 마이크의 이름 · 아래 문구가 「Try again」입니다(같은 동작의 버튼을 따로 두지 않음). */
  readonly retry?: boolean;
  /** 마이크를 누르면 — 대기면 듣기, 듣는 중이면 멈춤. */
  readonly onMic: () => void;
  /** 듣는 중 최대 시간이 지나면. */
  readonly onExpire: () => void;
  /** 정답 소리가 있으면 결과 시트의 소리 단추가 부릅니다. */
  readonly onHear?: () => void;
  readonly hint: string | null;
  /** 주 버튼이 없을 때(그림 로딩) 작업 영역에 서는 보조 조작. */
  readonly secondary?: ReactNode;
};

// 카드 아래 작업 영역입니다. 판정 전에는 공용 마이크(음량 막대 · 남은 시간 링 · Listening… · Checking…)와 안내 줄이,
// 판정 뒤에는 결과 시트가 섭니다(시안 S1 ~ S4).
export function SpeakWordWorkspace({
  question,
  phase,
  judgement,
  micState,
  retry,
  onMic,
  onExpire,
  onHear,
  hint,
  secondary,
}: SpeakWordWorkspaceProps): ReactNode {
  const copy = useUiCopy();
  if (phase.kind === "heard" && judgement !== null) {
    return (
      <view className="speak-word-activity-result-slot">
        <SpeakWordResult
          view={speakWordResultView(question, judgement, phase.text)}
          onHear={onHear}
        />
      </view>
    );
  }
  const retrying = retry === true && micState === "idle";
  const status =
    micState === "listening"
      ? copy.speaking.listening
      : micState === "checking"
        ? copy.speaking.checking
        : retrying
          ? copy.speaking.tryAgain
          : null;
  const label =
    micState === "listening"
      ? copy.speaking.stopSpeaking
      : retrying
        ? copy.speaking.tryAgain
        : copy.speaking.speak;
  return (
    <>
      <view className="speak-word-activity-waves-slot">
        <SpeechMic
          testId="speak-word-mic"
          state={micState}
          label={label}
          status={status}
          hint={micState === "listening" ? copy.speaking.tapToStop : null}
          onTap={onMic}
          onExpire={onExpire}
        />
      </view>
      <view className="speak-word-activity-hint-slot">
        {hint === null ? null : (
          <text
            id={speakWordHintId}
            className="speak-word-activity-hint"
            data-testid="speak-word-hint"
            bindlayoutchange={
              phase.kind === "unavailable" || phase.kind === "missed"
                ? revealSpeakWordHint
                : undefined
            }
          >
            {hint}
          </text>
        )}
      </view>
      {secondary}
    </>
  );
}
