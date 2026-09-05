import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { WordChoiceOption } from "./WordChoiceOption";
import {
  choiceResultAt,
  hasAnswered,
  initialWordChoiceSessionState,
  isWordChoiceSessionComplete,
  wordChoiceProgressLabel,
  wordChoiceQuestionsForStep,
  wordChoiceScreenTitle,
  wordChoiceSessionReducer,
  wordChoiceSessionResults,
} from "./word-choice";
import type { AnswerResult } from "../../lib/answer-result";
import type { JourneyStepId } from "../journey-map/journey-map";

import "./word-choice-screen.css";

// 화면 컴포넌트: 파일명 PascalCase, export 이름과 일치, `~Screen` 접미사 (ADR-0003 D6).
//
// LIB-229 (ui-d): 계약(.agent-harness/work/lib-229/spec.md §1.8(e) 「WordChoiceScreen」
// 표 · §1.9(b)~(g) 「슬롯 셋」 · §3.2 `ui` 테스트 계획)의 속성 전부를 채운다.
//
// `ListeningScreen`의 형태를 그대로 잇되(계약 §1.8(e)) **제시 채널에서 오디오가
// 빠진다** — `ListeningPrompt` · `lib/audio.ts` · 재생 상태를 이 화면이 가져오지
// 않는다(design.md §3.5). 제시문은 `<text>` 하나다(계약 §1.12.1 「제시 블록의 형태를
// 계약이 고른다」) — 카드 표면을 두지 않는다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `wordChoiceSessionReducer`를 소비한다
// (계약 §1.5(c)). 판정·완료·응답 여부를 상태에 적지 않는다 — 전부 파생이다.
//
// journey-map에서 가져오는 것은 **타입 하나뿐**이다(계약 §1.4(e) 화면 간 import
// 규칙). `stepOrdinal`은 App이 `journeyStepOrdinal`로 계산해 내려 주고, 이 화면은
// 여정 맵의 값을 읽지 않는다.
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

  // 완료는 파생이다(계약 §1.3(c)와 같은 규율). 완료 시점에는 `questionIndex`가
  // 문항 수와 같아 조회할 문항이 없다 — 여기서 한 번만 갈라 아래에서 다시 묻지 않는다.
  const question = isWordChoiceSessionComplete(state, questions.length)
    ? null
    : questions[state.questionIndex];

  return (
    <view className="word-choice-screen">
      <view className="word-choice-screen-header">
        {/* 나가는 수단이 어느 시점에도 정확히 하나다 — 완료 전에는 `맵으로`뿐이다.
            완료 뒤에는 `결과 보기`가 그 자리를 대신한다(계약 §1.8(c)와 같은 규율,
            §2.1 「나가는 수단이 정확히 하나임을 단언한다」). `onExit`은 진행을
            갱신하지 않는다. */}
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

      {/* [흐름] 내용 슬롯 — 계약 §1.9(b). 스크롤 컨테이너 하나가 진행·제시·지시·
          보기·완료문을 감싼다. `scroll-orientation`·`scroll-bar-enable`을 적는다 —
          안 적으면 초기값이 각각 가로·꺼짐이라 세로 스크롤이 원리적으로 불가능하다
          (계약 §1.9(d)). `enable-scroll`·`bounces`는 적지 않는다 — 초기값이 이미
          원하는 값이거나(전자, `YES`) 실기로 확인된 값이다(후자, ADR-0022 D3 ·
          docs/conventions/code.md, 2026-09-04 실기로 「참. 안 적는다」로 닫혔다).
          accessibility-*를 붙이지 않는다 — 조작 단위가 아니라 상자다(계약 §1.9(g)). */}
      <scroll-view
        className="word-choice-screen-scroll"
        data-testid="word-choice-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={true}
      >
        {/* `<scroll-view>`의 직계 자식은 최대 하나다 — 간격은 이 상자가 진다
            (계약 §1.9(e)). `data-testid`는 붙이지 않는다: 자식 수 단언은 스크롤
            컨테이너에서 세고, 아래 자식들은 여전히 `within(scroll)` 자손 질의로
            닿는다. */}
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
            // 항상 렌더돼 실패할 수 없는 단언은 검증이 아니므로 testid를 두지 않는다
            // (계약 §2.1).
            <text className="word-choice-screen-instruction">문항에 알맞은 단어를 고르세요.</text>
          )}

          {question === null ? null : (
            <view className="word-choice-screen-options">
              {question.choices.map((choiceText, choiceIndex) => (
                <WordChoiceOption
                  key={choiceIndex}
                  index={choiceIndex}
                  text={choiceText}
                  // 판정을 지는 보기는 고른 하나뿐이다 — 고르지 않은 정답 보기는
                  // null이다(계약 §1.1 「정답을 알려 주지 않는다」).
                  result={choiceResultAt(state, question, choiceIndex)}
                  onSelect={(index) => dispatch({ type: "selectChoice", choiceIndex: index })}
                />
              ))}
            </view>
          )}

          {question === null ? (
            <text className="word-choice-screen-complete" data-testid="word-choice-screen-complete">
              문항을 모두 마쳤어요
            </text>
          ) : null}
        </view>
      </scroll-view>

      {/* [고정] 액션 행. 흐르는 영역이 아니라 화면의 직계 자식으로 남는다(계약
          §1.9(b)). 응답 여부의 프로브다 — 존재 자체가 상태이므로 속성을 또 붙이지
          않는다. 판정 전에는 렌더하지 않는다. 영구 `disabled` 버튼을 두지 않는다 —
          「다음」은 *아직* 불가이지 *영구히* 불가가 아니다(ADR-0016 D10). */}
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

      {/* 완료의 단일 프로브. 두 출구의 라벨이 다른 문자열이라 음성 제어에서 갈린다.
          진행을 쓰는 자리는 여전히 App이고, 완료 여부의 판정은 평가가 진다(계약
          §1.13). 이 화면이 넘기는 것은 「끝났다」와 「무엇이 일어났는지」뿐이다 —
          통과 여부를 계산하지도, 알지도 않는다. */}
      {question === null ? (
        <view
          className="word-choice-screen-finish"
          data-testid="word-choice-screen-finish"
          accessibility-element={true}
          accessibility-label="결과 보기"
          accessibility-traits="button"
          bindtap={() =>
            onFinish(stepId, wordChoiceSessionResults(questions, state.answeredChoiceIndexes))
          }
        >
          <text className="word-choice-screen-finish-label">결과 보기</text>
        </view>
      ) : null}
    </view>
  );
}
