import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { CallCaller, CallLineBubble } from "../../components/CallCaller";
import type { EpisodeFinalCallScreenProps } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";
import {
  episodeFinalLineMs,
  episodeFinalSessionReducer,
  initialEpisodeFinalSessionState,
  latestCallLine,
} from "./episode-final";
import { FinalSpeakingPanel } from "./FinalSpeakingPanel";
import {
  useAdvanceAfterJudged,
  useAnnounceResult,
  useFinalSpeech,
  useLatest,
} from "./useFinalSpeech";

import "./episode-final-call-screen.css";

/**
 * 통화 최종 테스트입니다(Figma 79-6043). 서사가 통화인 에피소드의 마지막 유닛입니다 —
 * 통화가 이어지며 상대 대사가 저절로 흐르고, **내 차례가 오면 흰 말하기 카드가 올라와**
 * 답할 문장을 말합니다. 판정 뒤 잠시 뒤 카드가 걷히고 통화가 이어집니다. 마지막 차례가
 * 끝나면 에피소드를 끝냅니다.
 *
 * 통화 버튼 줄(음소거 · 종료 · 소리 크기)은 두지 않습니다 — 디자인에서 카드가 그 자리를
 * 덮고, 이 통화는 끊는 것이 아니라 끝까지 답하는 시험입니다. 나가기는 뒤로 버튼입니다.
 */
export function EpisodeFinalCallScreen({
  insets,
  episodeLabel,
  test,
  callerPortrait,
  onFinish,
  onExit,
}: EpisodeFinalCallScreenProps): ReactNode {
  // 차례 번호는 세션 리듀서의 문항 번호를 그대로 씁니다 — 말하기 차례는 문항이고, 상대 대사는
  // 판정 없이 지나가는(`skip`) 차례입니다.
  const [state, dispatch] = useReducer(episodeFinalSessionReducer, initialEpisodeFinalSessionState);
  const turn = test.turns[state.questionIndex] ?? test.turns[0];
  const isLast = state.questionIndex >= test.turns.length - 1;
  const line = latestCallLine(test.turns, state.questionIndex);

  const { speakingAction: speakingActionFor } = useFinalSpeech(dispatch);

  const judged = state.phase === "judged";
  const result = judged ? (state.results[state.results.length - 1] ?? null) : null;
  useAnnounceResult(state.questionIndex, state.phase, result);

  const advance = (type: "next" | "skip") => {
    if (isLast) {
      onFinish(state.results);
      return;
    }
    dispatch({ type });
  };
  useAdvanceAfterJudged(state.questionIndex, state.phase, () => advance("next"));

  // 상대 대사는 잠시 머문 뒤 저절로 다음 차례로 갑니다. 부르는 함수는 ref가 늘 최신으로
  // 듭니다 — 대사 틈에 `onFinish`가 바뀌어도 앞 렌더의 콜백을 부르지 않습니다.
  const latestAdvance = useLatest(advance);
  useEffect(() => {
    if (turn.kind !== "line") {
      return undefined;
    }
    const timer = setTimeout(() => latestAdvance.current("skip"), episodeFinalLineMs);
    return () => clearTimeout(timer);
    // 차례가 바뀔 때만 겁니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex]);

  const speaking = turn.kind === "speaking";

  return (
    <view className="episode-final-call-screen" data-testid={episodeFinalTestIds.call}>
      <view
        className="episode-final-call-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="episode-final-call-body">
          <view className="episode-final-call-header">
            <view className="episode-final-call-back" data-testid={episodeFinalTestIds.callBack}>
              <RoundButton
                accessibilityLabel="맵으로"
                icon={arrowLeft03}
                variant="neutral"
                size="xl"
                bindtap={onExit}
              />
            </view>
            <text className="episode-final-call-title" accessibility-traits="header">
              {episodeLabel}
            </text>
          </view>

          {/* 말하기 카드가 떠 있는 동안 카드 뒤의 통화 화면은 낭독에서 뺍니다 — 카드가 덮고
              있고, 읽을 것은 카드입니다. */}
          <view className="episode-final-call-stage" accessibility-elements-hidden={speaking}>
            <CallCaller
              callerName={test.callerName}
              callerPortrait={callerPortrait}
              clockRunning={true}
              testIdPrefix={episodeFinalTestIds.call}
            />
            {line === undefined ? null : (
              <CallLineBubble
                key={line.id}
                text={line.text}
                translation={line.translation}
                testIdPrefix={episodeFinalTestIds.call}
              />
            )}
          </view>
        </view>
      </view>

      {/* 내 차례 — 흰 말하기 카드가 통화 화면 아래를 덮습니다. 화면 루트에 절대 배치로
          얹어 가장자리 여백(홈 인디케이터) 위에 섭니다. */}
      {turn.kind === "speaking" ? (
        <view className="episode-final-call-card" style={{ bottom: `${insets.bottom}px` }}>
          <FinalSpeakingPanel
            key={turn.id}
            tone="call"
            insets={insets}
            question={turn}
            phase={state.phase}
            recognized={state.recognized}
            result={result}
            action={speakingActionFor(state.phase, turn.sentence, () => advance("next"))}
            onNotNow={state.phase === "ready" ? () => advance("skip") : undefined}
          />
        </view>
      ) : null}
    </view>
  );
}
