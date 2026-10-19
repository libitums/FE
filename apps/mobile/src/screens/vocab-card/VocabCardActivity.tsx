import { useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { LearningShell } from "../learning/LearningShell";
import {
  initialVocabCardSessionState,
  vocabCardRunProgress,
  vocabCardSessionReducer,
  vocabCardStepOf,
} from "./vocab-card";
import type { VocabCardActivityProps } from "./vocab-card.contract";

import "./vocab-card-activity.css";

// 낱말 카드를 한 장씩 보이고 넘기는 활동입니다(카탈로그 VOCAB_CARD). 고를 것도 칠 것도 없어서 판정하지
// 않고, 마지막 카드의 버튼이 빈 결과를 한 번 올립니다. 뼈대(상단 바 · 헤더 · 지시문 · 무대 카드 · 아래
// 버튼 자리)는 `LearningShell`이 집니다 — 이 화면이 아는 것은 카드 안과 아래 버튼이 하는 일뿐입니다.
//
// ⟨2026-10-19⟩ 사용자 결정(ADR-0073)으로 세 가지가 바뀌었습니다.
// - 세션 헤더(`Lesson n / N`) 대신 가벼운 헤더 — `×` · 카드마다 한 칸인 막대 · `Word i of n` — 가 섭니다.
//   카드는 레슨 카운터에 세지 않으므로(`catalogActivityPositionOf`) 이 화면은 `lesson`의 오프셋을 쓰지
//   않습니다.
// - 아래 버튼은 `Got it` 하나입니다(ui-lynx `Button`, 마지막 카드도 같은 라벨). 「알아요 / 처음 봐요」 두
//   갈래는 걷었습니다 — 고를 것이 생기면 카드가 시험처럼 읽힙니다.
// - 예문을 그리지 않습니다 — 카드 한 장에 정보가 너무 많았습니다.
//
// 「채점 없음」은 모양으로 드러납니다: 판정 배지 자리에 중립 표식이 서고(판정 색 · 아이콘 · 판정음 없음),
// 아래 버튼이 처음부터 서 있으며, 완료 카드를 두지 않습니다(풀어낸 문항이 없습니다).
// DOM 순서 = 낭독 순서입니다: 헤더 → 지시문 → 표식 → 표제어 → 로마자 → 뜻 → 버튼.
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

  // 연타해도 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish([], 0);
  };

  // 껍데기의 기본 버튼이 내던 누름 소리를 이 버튼이 대신 냅니다.
  const handleGotIt = (): void => {
    "background only";
    playSound("button");
    if (step === "advance") dispatch({ type: "nextCard" });
    else finish();
  };

  return (
    <LearningShell
      form="vocab-card"
      gemCount={gemCount}
      // 껍데기는 이 순번으로 카드가 바뀐 것을 알아 스크롤을 되돌리고 넘김 전환을 겁니다. 세션 헤더가
      // 서지 않으므로 카운터로 읽히지는 않습니다.
      questionIndex={cardIndex}
      questionCount={questions.length}
      runProgress={vocabCardRunProgress(cardIndex, questions.length, copy)}
      instruction={copy.vocabCard.instruction}
      onExit={onExit}
      actionButton={
        <view className="vocab-card-activity-got-it" data-testid="vocab-card-got-it">
          <Button
            label={copy.vocabCard.gotIt}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={handleGotIt}
          />
        </view>
      }
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
            </>
          )}
        </view>
      }
    />
  );
}
