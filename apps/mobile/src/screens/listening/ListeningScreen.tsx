import { useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { ListeningPrompt } from "./ListeningPrompt";
import { ListeningChoice } from "./ListeningChoice";
import {
  choiceResultAt,
  hasAnswered,
  initialListeningSessionState,
  isSessionComplete,
  listeningScreenTitle,
  listeningSessionReducer,
  questionProgressLabel,
  questionsForStep,
} from "./listening";
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
  onFinish: (id: JourneyStepId) => void;
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
  const question = isSessionComplete(state, questions.length)
    ? null
    : questions[state.questionIndex];

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
          한 글자도 바뀌지 않는다 (계약 R7). prop을 적지 않는다 — 기본값이 원하는 값이다
          (계약 R5). accessibility-*를 붙이지 않는다 — 조작 단위가 아니라 상자다
          (계약 R6). */}
      <scroll-view className="listening-screen-scroll" data-testid="listening-screen-scroll">
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
            문항을 모두 마쳤어요
          </text>
        ) : null}
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
          진행 갱신의 주체는 App이고, 화면은 어느 스텝을 마쳤는지만 되돌려 준다. */}
      {question === null ? (
        <view
          className="listening-screen-finish"
          data-testid="listening-screen-finish"
          accessibility-element={true}
          accessibility-label="맵으로 돌아가기"
          accessibility-traits="button"
          bindtap={() => onFinish(stepId)}
        >
          <text className="listening-screen-finish-label">맵으로 돌아가기</text>
        </view>
      ) : null}
    </view>
  );
}
