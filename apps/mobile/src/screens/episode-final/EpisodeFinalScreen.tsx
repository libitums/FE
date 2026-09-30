import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import storyBackground from "../../assets/story/story-background.png";
import storyCharacter from "../../assets/story/story-character.png";
import type { AnswerResult } from "../../lib/answer-result";
import { useUiCopy } from "../../lib/ui-copy";
import type { EpisodeFinalScreenProps } from "./episode-final.contract";
import { episodeFinalTestIds } from "./episode-final.contract";
import {
  episodeFinalSessionReducer,
  initialEpisodeFinalSessionState,
  judgeWordChoice,
} from "./episode-final";
import { FinalSpeakingPanel } from "./FinalSpeakingPanel";
import { FinalWordChoicePanel } from "./FinalWordChoicePanel";
import { FinalWritingPanel } from "./FinalWritingPanel";
import { useAdvanceAfterJudged, useAnnounceResult, useFinalSpeech } from "./useFinalSpeech";

import "./episode-final-screen.css";

/**
 * 에피소드 최종 테스트입니다(Figma 79-6484 · 79-6648 · 79-6378). 서사 장면 위에서 문항을 차례로
 * 풀고, 마지막 문항이 끝나면 결과를 부모에게 넘깁니다. 이야기형 시험은 지정된 배경을
 * 쓰며, 부모가 통과 여부와 후속 이야기를 진행합니다. 일반 시험은 기존 서사 그림을 씁니다.
 *
 * 판정 뒤에는 누를 것이 없습니다 — 판정과 정답을 잠시 보여 준 뒤 저절로 다음 문항으로
 * 갑니다(서사가 이어지듯, 2026-09-28 결정). 틀려도 정답을 보여 주고 다음으로
 * 갑니다. **쓰기만 다릅니다** — 음절마다 판정 뒤 `Next`를 눌러 넘어가고(다시 쓸 수 있어서),
 * 마지막 음절의 `Next`가 곧 다음 문항입니다. 푼 것은 이 화면의 것입니다 — 뒤로 나가면 버려지고, 다시 들어오면 첫 문항부터입니다.
 */
export function EpisodeFinalScreen({
  insets,
  episodeLabel,
  test,
  onFinish,
  onExit,
}: EpisodeFinalScreenProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(episodeFinalSessionReducer, initialEpisodeFinalSessionState);
  const question = test.questions[state.questionIndex] ?? test.questions[0];
  const isLast = state.questionIndex >= test.questions.length - 1;
  const writing = question.kind === "writing";

  const { speakingAction: speakingActionFor } = useFinalSpeech(dispatch);

  const judged = state.phase === "judged";
  const result = judged ? (state.results[state.results.length - 1] ?? null) : null;
  useAnnounceResult(state.questionIndex, state.phase, result);

  // 다음 문항으로 가거나, 마지막이면 끝냅니다. 판정 뒤의 넘김과 건너뛰기가 함께 씁니다.
  const advance = (type: "next" | "skip") => {
    if (isLast) {
      onFinish(state.results);
      return;
    }
    dispatch({ type });
  };
  useAdvanceAfterJudged(state.questionIndex, state.phase, () => advance("next"));

  // 쓰기 문항은 판정과 넘김을 문항 안에서 이미 지나 왔습니다 — 결과를 싣고 곧장 넘어갑니다.
  const finishWriting = (result: AnswerResult | null) => {
    if (isLast) {
      onFinish(result === null ? state.results : [...state.results, result]);
      return;
    }
    dispatch({ type: "written", result });
  };

  const speakingAction =
    question.kind === "speaking"
      ? speakingActionFor(state.phase, question.sentence, () => advance("next"))
      : undefined;

  return (
    <view className="episode-final-screen" data-testid={episodeFinalTestIds.screen}>
      {/* 장면 그림 · 위 명암은 순수 장식입니다. 래퍼가 자손을 통째로 가립니다(ADR-0016 D5). */}
      <view className="episode-final-scene" accessibility-elements-hidden={true}>
        <image
          className="episode-final-background"
          src={test.story?.background ?? storyBackground}
          mode="aspectFill"
        />
        {test.story ? null : (
          <view className="episode-final-character-slot">
            <image className="episode-final-character" src={storyCharacter} mode="aspectFit" />
          </view>
        )}
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
              accessibilityLabel={copy.common.exitTo.journey}
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

        {/* 쓰기는 캔버스(450)가 커서 패널이 머리 바로 아래부터 화면을 채웁니다. 나머지 문항은
            이 빈 상자가 패널을 화면 아래로 밉니다. */}
        {writing ? null : <view className="episode-final-spacer" />}

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
        ) : question.kind === "writing" ? (
          <FinalWritingPanel
            key={question.id}
            insets={insets}
            question={question}
            onDone={finishWriting}
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
