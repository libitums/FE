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

import "./listening-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
//
// LIB-223 (ui): 계약(.agent-harness/work/lib-223/spec.md §1.7 「ListeningScreen」)의
// 속성 전부를 채운다. **DOM 순서가 계약이다** — 낭독 순서 = DOM 순서이므로 시각으로
// 뒤집지 않는다 (§1.9의 design 제약 1).
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `listeningSessionReducer`를 소비한다
// (계약 §1.5). 판정·완료·응답 여부를 상태에 적지 않는다 — 전부 파생이다.
//
// journey-map에서 가져오는 것은 **타입 하나뿐**이다. `stepOrdinal`은 App이
// `journeyStepOrdinal`로 계산해 내려 주고, 이 화면은 여정 맵의 값을 읽지 않는다 (§8.4).
export type ListeningScreenProps = {
  stepId: JourneyStepId;
  stepOrdinal: number;
  onExit: () => void;
  onFinish: (id: JourneyStepId, results: readonly AnswerResult[]) => void;
};

export function ListeningScreen({
  stepId,
  stepOrdinal,
  onExit,
  onFinish,
}: ListeningScreenProps): ReactNode {
  const questions = questionsForStep(stepId);
  const [state, dispatch] = useReducer(listeningSessionReducer, initialListeningSessionState);

  // 완료는 파생이다 (계약 §1.3(c)). 완료 시점에는 `questionIndex`가 문항 수와 같아
  // 조회할 문항이 없다 — 그래서 여기서 한 번만 갈라 아래에서 다시 묻지 않는다.
  const complete = isSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번 (ADR-0016 D11-2).
  // dep이 `complete` 하나다 — 리듀서가 `questionIndex`를 늘리기만 하므로 이 파생값은
  // false→true로 **한 번만** 갈린다. 그래서 재렌더로는 다시 돌지 않고, 마운트 때 이미
  // true면 그 순간이 「처음 존재하게 되는 순간」이라 거기서 한 번 돈다.
  // cleanup이 없다 — 낭독은 취소할 수 있는 자원이 아니다 (D11-2).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(listeningCompletionAnnouncement(listeningFinishLabel));
  }, [complete]);

  return (
    <view className="listening-screen">
      <view className="listening-screen-header">
        {/* 나가는 수단이 어느 시점에도 정확히 하나다 — 완료 전에는 `맵으로`뿐이다.
            둘 다 두면 같은 목적지에 가는데 진행이 갈리는 버튼 둘이 앉는다 (§1.7).
            `onExit`은 진행을 갱신하지 않는다 (수용 기준 10). */}
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

      {/* [흐름] 내용 슬롯 — LIB-226 계약 §1.3. 스크롤 컨테이너 하나가 진행·제시·지시·
          보기·완료문을 감싼다. 자식의 요소·클래스·testid·accessibility-*·형제 순서는
          한 글자도 바뀌지 않는다 (계약 R7). `scroll-orientation`·`scroll-bar-enable`을
          적는다 — 안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로
          불가능하다(계약 R5.2·R5.3). accessibility-*를 붙이지 않는다 — 조작 단위가
          아니라 상자다(계약 R6). */}
      <scroll-view
        className="listening-screen-scroll"
        data-testid="listening-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 최대 하나다 — 간격은 이 상자가 진다
            (계약 R7.1). `data-testid`는 붙이지 않는다: U10은 부모에서 자식 수를
            세고, 아래 자식들은 여전히 `within(scroll)` 자손 질의로 닿는다. */}
        <view className="listening-screen-content">
          {question === null ? null : (
            <text className="listening-screen-progress" data-testid="listening-screen-progress">
              {questionProgressLabel(state.questionIndex, questions.length)}
            </text>
          )}

          {/* 제시 채널. 오디오가 생기면 **이 컴포넌트만** 통째로 갈린다 (§1.7.2). */}
          {question === null ? null : (
            <ListeningPrompt text={question.prompt} audioSource={question.audioSource} />
          )}

          {question === null ? null : (
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않는다 (§2.2).
            <text className="listening-screen-instruction">말의 뜻으로 알맞은 것을 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="listening-screen-choices">
              {question.choices.map((choiceText, choiceIndex) => (
                <ListeningChoice
                  key={choiceIndex}
                  index={choiceIndex}
                  text={choiceText}
                  // 판정을 지는 보기는 고른 하나뿐이다 — 고르지 않은 정답 보기는 null이다
                  // (계약 §1.1 「정답을 알려 주지 않는다」).
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

      {/* [고정] 액션 행. 흐르는 영역이 아니라 화면의 직계 자식으로 남는다 (계약 R1·R9).
          응답 여부의 프로브다 — 존재 자체가 상태이므로 속성을 또 붙이지 않는다 (§1.8).
          판정 전에는 렌더하지 않는다. 영구 `disabled` 버튼을 두지 않는다 —
          「다음」은 *아직* 불가이지 *영구히* 불가가 아니다 (ADR-0016 D10). */}
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

      {/* 완료의 단일 프로브. 두 출구의 라벨이 **다른 문자열**이라 음성 제어에서 갈린다.
          진행을 쓰는 자리는 여전히 App이고, 완료 여부의 판정은 평가가 진다(u7이 D4를
          뒤집었다, 계약 §0.4 · §1.6(c)). 이 화면이 넘기는 것은 「끝났다」와 「무엇이
          일어났는지」뿐이다 — 통과 여부를 계산하지도, 알지도 않는다.

          문구가 '맵으로 돌아가기' → '결과 보기'로 바뀐다(계약 §1.6(c)) — 이 버튼의
          목적지가 맵에서 평가 화면으로 바뀌었고, 통과든 미통과든 이 버튼이 데려가는
          곳은 결과 화면이다(u7). `data-testid`·클래스·DOM 자리·`accessibility-traits`는
          그대로다. */}
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
