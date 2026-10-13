import { useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import {
  initialVocabCardSessionState,
  vocabCardExampleSupportLabel,
  vocabCardSessionReducer,
  vocabCardStepOf,
} from "./vocab-card";
import type { VocabCardActivityProps } from "./vocab-card.contract";

import "./vocab-card-activity.css";

// 낱말 카드를 한 장씩 보이고 넘기는 활동입니다(카탈로그 VOCAB_CARD). 고를 것도 칠 것도 없어서 판정하지
// 않고, 마지막 카드의 버튼이 빈 결과를 한 번 올립니다. 뼈대(상단 바 · 세션 헤더 · 지시문 · 무대 카드 ·
// 아래 버튼)는 `LearningShell`이 집니다 — 이 화면이 아는 것은 카드 안과 아래 버튼이 하는 일뿐입니다.
//
// 「채점 없음」은 모양으로 드러납니다: 판정 배지 자리에 중립 표식이 서고(판정 색 · 아이콘 · 판정음 없음),
// 아래 버튼이 처음부터 서 있으며, 완료 카드를 두지 않습니다(풀어낸 문항이 없습니다).
// DOM 순서 = 낭독 순서입니다: 표식 → 표제어 → 로마자 → 뜻 → 예문 → 예문 지원 줄 → 버튼.
export function VocabCardActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: VocabCardActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(vocabCardSessionReducer, initialVocabCardSessionState);
  const finished = useRef(false);

  // 상한은 화면이 지킵니다 — 버튼이 `advance`일 때만 카드를 넘기므로 넘칠 일이 없지만, 문항이 줄어든
  // 뒤에도 던지지 않도록 마지막 카드에 붙입니다.
  const cardIndex = Math.min(state.cardIndex, Math.max(0, questions.length - 1));
  const card = questions[cardIndex];
  const step = vocabCardStepOf(lesson, cardIndex, questions.length);
  const counter = lessonCounter(lesson, cardIndex, questions.length);
  const supportLabel =
    card?.example == null ? null : vocabCardExampleSupportLabel(card.example, copy);

  // 연타해도 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish([], 0);
  };

  return (
    <LearningShell
      form="vocab-card"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={copy.vocabCard.instruction}
      onExit={onExit}
      actionLabel={step === "finish" ? copy.common.seeResults : copy.common.next}
      onAction={step === "advance" ? () => dispatch({ type: "nextCard" }) : finish}
      // 큰 글자에서 카드가 길어져도 아래 버튼은 스크롤 밖에 남습니다.
      scrollCard
      card={
        <view
          className="vocab-card-activity-content"
          data-testid="vocab-card-content"
          data-cardIndex={cardIndex}
        >
          {/* 판정 배지 자리에 서는 중립 표식입니다 — 다른 활동과 같은 위치 · 높이를 지킵니다. */}
          <view className="vocab-card-activity-badge-slot">
            {card === undefined ? null : (
              <view className="vocab-card-activity-badge">
                <text className="vocab-card-activity-badge-text" data-testid="vocab-card-badge">
                  {copy.vocabCard.badge}
                </text>
              </view>
            )}
          </view>

          {card === undefined ? null : (
            <>
              {/* 표제어는 접근성 속성이 없습니다 — 보이는 글자가 이름이고, 다른 줄과 묶지 않아야 한국어
                  음성이 읽습니다. */}
              <view className="vocab-card-activity-headword">
                <text className="vocab-card-activity-word" data-testid="vocab-card-word">
                  {card.word}
                </text>
                {card.romanization === null ? null : (
                  <text
                    className="vocab-card-activity-romanization"
                    data-testid="vocab-card-romanization"
                    accessibility-label={copy.vocabCard.pronunciation(card.romanization)}
                  >
                    {card.romanization}
                  </text>
                )}
              </view>

              <view className="vocab-card-activity-divider" />

              <text
                className="vocab-card-activity-meaning"
                data-testid="vocab-card-meaning"
                accessibility-label={copy.vocabCard.meaning(card.meaning)}
              >
                {card.meaning}
              </text>

              {card.example === null ? null : (
                <view className="vocab-card-activity-example" data-testid="vocab-card-example">
                  <text
                    className="vocab-card-activity-example-title"
                    data-testid="vocab-card-example-title"
                    accessibility-elements-hidden={true}
                  >
                    {copy.vocabCard.exampleTitle}
                  </text>
                  <text
                    className="vocab-card-activity-example-text"
                    data-testid="vocab-card-example-text"
                    accessibility-label={copy.vocabCard.example(card.example.text)}
                  >
                    {card.example.text}
                  </text>
                  {supportLabel === null ? null : (
                    <view
                      className="vocab-card-activity-example-support"
                      data-testid="vocab-card-example-support"
                      accessibility-element={true}
                      accessibility-traits="text"
                      accessibility-label={supportLabel}
                    >
                      {card.example.romanization === null ? null : (
                        <text
                          className="vocab-card-activity-example-romanization"
                          data-testid="vocab-card-example-romanization"
                        >
                          {card.example.romanization}
                        </text>
                      )}
                      {card.example.translation === null ? null : (
                        <text
                          className="vocab-card-activity-example-translation"
                          data-testid="vocab-card-example-translation"
                        >
                          {card.example.translation}
                        </text>
                      )}
                    </view>
                  )}
                </view>
              )}
            </>
          )}
        </view>
      }
    />
  );
}
