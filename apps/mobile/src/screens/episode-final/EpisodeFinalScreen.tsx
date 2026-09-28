import { useEffect, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import storyBackground from "../../assets/story/story-background.png";
import storyCharacter from "../../assets/story/story-character.png";
import { announce } from "../../lib/accessibility";
import { answerResultLabel } from "../../lib/answer-result";
import { canListen, judgeSpeaking } from "../../lib/speaking-judge";
import {
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
} from "../../lib/speech-recognition";
import type { SpeechResult } from "../../lib/speech-recognition";
import type { EpisodeFinalScreenProps } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";
import {
  episodeFinalAdvanceDelayMs,
  episodeFinalSessionReducer,
  initialEpisodeFinalSessionState,
  judgeWordChoice,
} from "./episode-final";
import { FinalSpeakingPanel } from "./FinalSpeakingPanel";
import { FinalWordChoicePanel } from "./FinalWordChoicePanel";

import "./episode-final-screen.css";

/**
 * 에피소드 최종 테스트입니다(Figma 79-6484 · 79-6648). 서사 장면 위에서 문항을 차례로
 * 풀고, 마지막 문항이 끝나면 에피소드를 끝냅니다. 서사 그림은 서사 화면과 같은 것을
 * 씁니다(2026-09-28 결정 — 새 그림 없이).
 *
 * 판정 뒤에는 누를 것이 없습니다 — 판정과 정답을 잠시 보여 준 뒤 저절로 다음 문항으로
 * 갑니다(서사가 이어지듯, 2026-09-28 결정). 틀려도 정답을 보여 주고 다음으로 갑니다. 푼 것은 이 화면의 것입니다 — 뒤로 나가면
 * 버려지고, 다시 들어오면 첫 문항부터입니다.
 */
export function EpisodeFinalScreen({
  insets,
  episodeLabel,
  test,
  onFinish,
  onExit,
}: EpisodeFinalScreenProps): ReactNode {
  const [state, dispatch] = useReducer(episodeFinalSessionReducer, initialEpisodeFinalSessionState);
  const question = test.questions[state.questionIndex] ?? test.questions[0];
  const isLast = state.questionIndex >= test.questions.length - 1;

  // 화면이 떠 있는가입니다. 권한 조회 · 인식은 호스트를 거쳐 늦게 돌아오므로, 떠난 뒤에
  // 돌아온 콜백이 인식을 새로 시작하거나 상태를 바꾸지 않게 막습니다(말하기 학습형과 같습니다).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeechRecognition();
    };
  }, []);

  const judged = state.phase === "judged";
  const result = judged ? (state.results[state.results.length - 1] ?? null) : null;

  useEffect(() => {
    if (result !== null) {
      announce(`채점 결과, ${answerResultLabel(result)}`);
    }
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `result`는 그 둘에서 파생합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  // 다음 문항으로 가거나, 마지막이면 끝냅니다. 판정 뒤의 넘김과 건너뛰기가 함께 씁니다.
  const advance = (type: "next" | "skip") => {
    if (isLast) {
      onFinish(state.results);
      return;
    }
    dispatch({ type });
  };

  // 판정 뒤 잠시 뒤에 저절로 넘어갑니다. 화면을 떠나면 타이머를 걷습니다.
  useEffect(() => {
    if (state.phase !== "judged") {
      return undefined;
    }
    const timer = setTimeout(() => advance("next"), episodeFinalAdvanceDelayMs);
    return () => clearTimeout(timer);
    // 문항 순번 · 국면이 바뀔 때만 겁니다 — `advance`는 그 둘에서 파생한 값을 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  const handleResult = (sentence: string) => (speech: SpeechResult) => {
    if (!mounted.current) {
      return;
    }
    if (speech.status !== "recognized") {
      dispatch({ type: "unavailable" });
      return;
    }
    dispatch({
      type: "recognized",
      text: speech.text,
      result: judgeSpeaking(sentence, speech.text),
    });
  };

  // 권한을 먼저 확인하고(미요청인 것만 묻습니다), 들을 수 있으면 인식을 시작합니다.
  const startListening = (sentence: string) => {
    dispatch({ type: "start" });
    const requested = requestSpeechPermissions((status) => {
      if (!mounted.current) {
        return;
      }
      if (!canListen(status)) {
        dispatch({ type: "unavailable" });
        return;
      }
      if (startSpeechRecognition({}, handleResult(sentence)) === "unavailable") {
        dispatch({ type: "unavailable" });
      }
    });
    if (requested === "unavailable") {
      dispatch({ type: "unavailable" });
    }
  };

  // 말하기의 주 버튼입니다. 판정 뒤에는 없습니다 — 저절로 넘어갑니다. 문구는 이 화면의 다른
  // 조작(`Say` · 서사의 `Next`)과 같이 영어입니다(2026-09-28 결정).
  const speakingAction =
    question.kind !== "speaking"
      ? undefined
      : state.phase === "ready"
        ? { label: "Speak", run: () => startListening(question.sentence) }
        : state.phase === "listening"
          ? { label: "Stop", run: () => stopSpeechRecognition() }
          : state.phase === "unavailable"
            ? { label: "Skip", run: () => advance("next") }
            : undefined;

  return (
    <view className="episode-final-screen" data-testid={episodeFinalTestIds.screen}>
      {/* 장면 그림 · 위 명암은 순수 장식입니다. 래퍼가 자손을 통째로 가립니다(ADR-0016 D5). */}
      <view className="episode-final-scene" accessibility-elements-hidden={true}>
        <image className="episode-final-background" src={storyBackground} mode="aspectFill" />
        <view className="episode-final-character-slot">
          <image className="episode-final-character" src={storyCharacter} mode="aspectFit" />
        </view>
        <view className="episode-final-shade" />
      </view>

      <view
        className="episode-final-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="episode-final-header">
          <view data-testid={episodeFinalTestIds.back}>
            <RoundButton
              accessibilityLabel="맵으로"
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={onExit}
            />
          </view>
          <text
            className="episode-final-title"
            data-testid={episodeFinalTestIds.title}
            accessibility-traits="header"
          >
            {episodeLabel}
          </text>
          {/* 제목을 가운데에 두려고 나가기와 같은 폭을 오른쪽에 비워 둡니다. 디자인의 설정
              버튼은 두지 않습니다 — 서사 표지와 같은 결정입니다. */}
          <view className="episode-final-header-spacer" />
        </view>

        <view className="episode-final-spacer" />

        {question.kind === "speaking" ? (
          <FinalSpeakingPanel
            key={question.id}
            insets={insets}
            question={question}
            phase={state.phase}
            recognized={state.recognized}
            result={result}
            action={speakingAction}
            onNotNow={state.phase === "ready" ? () => advance("skip") : undefined}
          />
        ) : question.kind === "word-choice" ? (
          <FinalWordChoicePanel
            key={question.id}
            insets={insets}
            question={question}
            chosenIndex={state.chosenIndex}
            result={result}
            onChoose={(optionIndex) =>
              dispatch({
                type: "choose",
                optionIndex,
                result: judgeWordChoice(question, optionIndex),
              })
            }
          />
        ) : null}
      </view>
    </view>
  );
}
