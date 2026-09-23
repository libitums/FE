import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announceCompletion } from "../../lib/accessibility";
import { ListeningPrompt } from "./ListeningPrompt";
import { ListeningChoice } from "./ListeningChoice";
import {
  choiceResultAt,
  hasAnswered,
  initialListeningSessionState,
  isSessionComplete,
  listeningCompletionAnnouncement,
  listeningCompletionText,
  listeningFinishLabel,
  listeningScreenTitle,
  listeningSessionReducer,
  questionProgressLabel,
  questionsForStep,
  sessionAnswerResults,
} from "./listening";
import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";
import type { SessionOptions } from "../../lib/session-options";

import "./listening-screen.css";

// **DOM 순서가 곧 계약입니다** — 낭독 순서 = DOM 순서이므로 시각으로
// 뒤집지 않습니다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `listeningSessionReducer`를
// 소비합니다. 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
//
// journey-map에서 가져오는 것은 **타입 하나뿐**입니다. `stepOrdinal`은
// App이 `journeyStepOrdinal`로 계산해 내려 주고, 이 화면은 여정 맵의 값을
// 읽지 않습니다.
export type ListeningScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
  sessionOptions: SessionOptions;
};

export function ListeningScreen({
  stepId,
  stepOrdinal,
  onExit,
  onFinish,
  sessionOptions,
}: ListeningScreenProps): ReactNode {
  const questions = questionsForStep(stepId);
  const [state, dispatch] = useReducer(listeningSessionReducer, initialListeningSessionState);

  // 완료는 파생입니다. 완료 시점에는 `questionIndex`가 문항 수와 같아
  // 조회할 문항이 없습니다 — 그래서 여기서 한 번만 갈라 아래에서 다시
  // 묻지 않습니다.
  const complete = isSessionComplete(state, questions.length);
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
    announceCompletion(listeningCompletionAnnouncement(listeningFinishLabel));
  }, [complete]);

  return (
    <view className="listening-screen">
      <view className="listening-screen-header">
        {/* 나가는 수단이 어느 시점에도 정확히 하나입니다 — 완료 전에는
            `맵으로`뿐입니다. 둘 다 두면 같은 목적지에 가는데 진행이 갈리는
            버튼 둘이 앉습니다. `onExit`은 진행을 갱신하지 않습니다. */}
        {question === null ? null : (
          <view
            className="listening-screen-exit"
            data-testid="listening-screen-exit"
            accessibility-element={true}
            accessibility-label="맵으로"
            accessibility-traits="button"
            bindtap={onExit}
          >
            <text className="listening-screen-exit-label">맵으로</text>
          </view>
        )}
        <text
          className="listening-screen-title"
          data-testid="listening-screen-title"
          accessibility-traits="header"
        >
          {listeningScreenTitle(stepOrdinal)}
        </text>
      </view>

      {/* [흐름] 내용 슬롯. 스크롤 컨테이너 하나가 진행·제시·지시·보기·완료문을
          감쌉니다. 자식의 요소·클래스·testid·accessibility-*·형제 순서는
          한 글자도 바뀌지 않습니다. `scroll-orientation`·`scroll-bar-enable`을
          적습니다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이
          원리적으로 불가능합니다. accessibility-*를 붙이지 않습니다 — 조작
          단위가 아니라 상자입니다. */}
      <scroll-view
        className="listening-screen-scroll"
        data-testid="listening-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 최대 하나입니다 — 간격은 이 상자가
            집니다. `data-testid`는 붙이지 않습니다: 자식 수는 부모에서
            세고, 아래 자식들은 여전히 `within(scroll)` 자손 질의로
            닿습니다. */}
        <view className="listening-screen-content">
          {question === null ? null : (
            <text className="listening-screen-progress" data-testid="listening-screen-progress">
              {questionProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {/* 제시 채널입니다. 오디오가 생기면 **이 컴포넌트만** 통째로
              갈립니다. */}
          {question === null ? null : (
            <ListeningPrompt
              text={question.prompt}
              audioSource={question.audioSource}
              sessionOptions={sessionOptions}
            />
          )}

          {question === null ? null : (
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않습니다.
            <text className="listening-screen-instruction">말의 뜻으로 알맞은 것을 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="listening-screen-choices">
              {question.choices.map((choiceText, choiceIndex) => (
                <ListeningChoice
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
            <text className="listening-screen-complete" data-testid="listening-screen-complete">
              {listeningCompletionText}
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
          className="listening-screen-next"
          data-testid="listening-screen-next"
          accessibility-element={true}
          accessibility-label="다음"
          accessibility-traits="button"
          bindtap={() => dispatch({ type: "nextQuestion" })}
        >
          <text className="listening-screen-next-label">다음</text>
        </view>
      ) : null}

      {/* 완료의 단일 프로브입니다. 두 출구의 라벨이 **다른 문자열**이라
          음성 제어에서 갈립니다. 진행을 쓰는 자리는 여전히 App이고, 완료
          여부의 판정은 평가가 집니다. 이 화면이 넘기는 것은 「끝났다」와
          「무엇이 일어났는지」뿐입니다 — 통과 여부를 계산하지도, 알지도
          않습니다.

          문구가 '맵으로 돌아가기' → '결과 보기'로 바뀝니다 — 이 버튼의
          목적지가 맵에서 평가 화면으로 바뀌었고, 통과든 미통과든 이 버튼이
          데려가는 곳은 결과 화면입니다. `data-testid`·클래스·DOM 자리·
          `accessibility-traits`는 그대로입니다. */}
      {question === null ? (
        <view
          className="listening-screen-finish"
          data-testid="listening-screen-finish"
          accessibility-element={true}
          accessibility-label={listeningFinishLabel}
          accessibility-traits="button"
          bindtap={() =>
            onFinish(stepId, sessionAnswerResults(questions, state.answeredChoiceIndexes))
          }
        >
          <text className="listening-screen-finish-label">{listeningFinishLabel}</text>
        </view>
      ) : null}
    </view>
  );
}
