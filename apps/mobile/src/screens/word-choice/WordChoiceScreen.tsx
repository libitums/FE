import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { WordChoiceOption } from "./WordChoiceOption";
import {
  choiceResultAt,
  hasAnswered,
  initialWordChoiceSessionState,
  isWordChoiceSessionComplete,
  wordChoiceCompletionAnnouncement,
  wordChoiceCompletionText,
  wordChoiceFinishLabel,
  wordChoiceProgressLabel,
  wordChoiceQuestionsForStep,
  wordChoiceScreenTitle,
  wordChoiceSessionReducer,
  wordChoiceSessionResults,
} from "./word-choice";
import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./word-choice-screen.css";

// `ListeningScreen`의 형태를 그대로 잇되 **제시 채널에서 오디오가 빠집니다**
// — `ListeningPrompt` · `lib/audio.ts` · 재생 상태를 이 화면이 가져오지
// 않습니다. 제시문은 `<text>` 하나입니다 — 카드 표면을 두지 않습니다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `wordChoiceSessionReducer`를
// 소비합니다. 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
//
// `stepOrdinal`은 App이 `journeyStepOrdinal`로 계산해 내려 주고, 이 화면은
// 여정 맵의 값을 읽지 않습니다.
export type WordChoiceScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
};

export function WordChoiceScreen({
  stepId,
  stepOrdinal,
  onExit,
  onFinish,
}: WordChoiceScreenProps): ReactNode {
  const questions = wordChoiceQuestionsForStep(stepId);
  const [state, dispatch] = useReducer(wordChoiceSessionReducer, initialWordChoiceSessionState);

  // 완료는 파생입니다. 완료 시점에는 `questionIndex`가 문항 수와 같아
  // 조회할 문항이 없습니다 — 여기서 한 번만 갈라 아래에서 다시 묻지
  // 않습니다.
  const complete = isWordChoiceSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번입니다(ADR-0016 D11-2).
  // dep이 `complete` 하나입니다 — 리듀서가 `questionIndex`를 늘리기만 하므로
  // 이 파생값은 false→true로 **한 번만** 갈립니다. 그래서 재렌더로는 다시
  // 돌지 않고, 마운트 때 이미 true면 그 순간이 「처음 존재하게 되는 순간」이라
  // 거기서 한 번 돕니다. cleanup이 없습니다 — 낭독은 취소할 수 있는 자원이
  // 아닙니다(D11-2).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(wordChoiceCompletionAnnouncement(wordChoiceFinishLabel));
  }, [complete]);

  return (
    <view className="word-choice-screen">
      <view className="word-choice-screen-header">
        {/* 나가는 수단이 어느 시점에도 정확히 하나입니다 — 완료 전에는
            `맵으로`뿐입니다. 완료 뒤에는 `결과 보기`가 그 자리를
            대신합니다. `onExit`은 진행을 갱신하지 않습니다. */}
        {question === null ? null : (
          <view
            className="word-choice-screen-exit"
            data-testid="word-choice-screen-exit"
            accessibility-element={true}
            accessibility-label="맵으로"
            accessibility-traits="button"
            bindtap={onExit}
          >
            <text className="word-choice-screen-exit-label">맵으로</text>
          </view>
        )}
        <text
          className="word-choice-screen-title"
          data-testid="word-choice-screen-title"
          accessibility-traits="header"
        >
          {wordChoiceScreenTitle(stepOrdinal)}
        </text>
      </view>

      {/* [흐름] 내용 슬롯. 스크롤 컨테이너 하나가 진행·제시·지시·보기·완료문을
          감쌉니다. `scroll-orientation`·`scroll-bar-enable`을 적습니다 — 안
          적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능합니다. `enable-scroll`·`bounces`는 적지 않습니다 — 초기값이
          이미 원하는 값이거나(전자, `YES`) 실기로 확인된 값입니다(후자,
          ADR-0022 D3 · 2026-09-04 실기로 「참. 안 적는다」로 닫혔습니다).
          accessibility-*를 붙이지 않습니다 — 조작 단위가 아니라 상자입니다. */}
      <scroll-view
        className="word-choice-screen-scroll"
        data-testid="word-choice-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 최대 하나입니다 — 간격은 이 상자가
            집니다. `data-testid`는 붙이지 않습니다: 자식 수 단언은 스크롤
            컨테이너에서 세고, 아래 자식들은 여전히 `within(scroll)` 자손
            질의로 닿습니다. */}
        <view className="word-choice-screen-content">
          {question === null ? null : (
            <text className="word-choice-screen-progress" data-testid="word-choice-screen-progress">
              {wordChoiceProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {question === null ? null : (
            <text className="word-choice-screen-prompt" data-testid="word-choice-screen-prompt">
              {question.prompt}
            </text>
          )}

          {question === null ? null : (
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않습니다.
            <text className="word-choice-screen-instruction">문항에 알맞은 단어를 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="word-choice-screen-options">
              {question.choices.map((choiceText, choiceIndex) => (
                <WordChoiceOption
                  key={choiceIndex}
                  index={choiceIndex}
                  text={choiceText}
                  // 판정을 지는 보기는 고른 하나뿐입니다 — 고르지 않은
                  // 정답 보기는 null입니다.
                  result={choiceResultAt(state, question, choiceIndex)}
                  onSelect={(index) => dispatch({ type: "selectChoice", choiceIndex: index })}
                />
              ))}
            </view>
          )}

          {question === null ? (
            <text className="word-choice-screen-complete" data-testid="word-choice-screen-complete">
              {wordChoiceCompletionText}
            </text>
          ) : null}
        </view>
      </scroll-view>

      {/* [고정] 액션 행. 흐르는 영역이 아니라 화면의 직계 자식으로
          남습니다. 응답 여부의 프로브입니다 — 존재 자체가 상태이므로
          속성을 또 붙이지 않습니다. 판정 전에는 렌더하지 않습니다. 영구
          `disabled` 버튼을 두지 않습니다 — 「다음」은 *아직* 불가이지
          *영구히* 불가가 아닙니다(ADR-0016 D10). */}
      {hasAnswered(state) ? (
        <view
          className="word-choice-screen-next"
          data-testid="word-choice-screen-next"
          accessibility-element={true}
          accessibility-label="다음"
          accessibility-traits="button"
          bindtap={() => dispatch({ type: "nextQuestion" })}
        >
          <text className="word-choice-screen-next-label">다음</text>
        </view>
      ) : null}

      {/* 완료의 단일 프로브입니다. 두 출구의 라벨이 다른 문자열이라 음성
          제어에서 갈립니다. 진행을 쓰는 자리는 여전히 App이고, 완료 여부의
          판정은 평가가 집니다. 이 화면이 넘기는 것은 「끝났다」와 「무엇이
          일어났는지」뿐입니다 — 통과 여부를 계산하지도, 알지도 않습니다. */}
      {question === null ? (
        <view
          className="word-choice-screen-finish"
          data-testid="word-choice-screen-finish"
          accessibility-element={true}
          accessibility-label={wordChoiceFinishLabel}
          accessibility-traits="button"
          bindtap={() =>
            onFinish(stepId, wordChoiceSessionResults(questions, state.answeredChoiceIndexes))
          }
        >
          <text className="word-choice-screen-finish-label">{wordChoiceFinishLabel}</text>
        </view>
      ) : null}
    </view>
  );
}
