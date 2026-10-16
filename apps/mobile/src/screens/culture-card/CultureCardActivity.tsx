import { useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import {
  cultureCardSessionReducer,
  cultureCardStepOf,
  initialCultureCardSessionState,
} from "./culture-card";
import type { CultureCardActivityProps } from "./culture-card.contract";

import "./culture-card-activity.css";

// 문화 카드를 한 장씩 보이고 넘기는 활동입니다(카탈로그 CULTURE_CARD). 고를 것도 칠 것도 없어서 판정하지
// 않고, 마지막 카드의 버튼이 빈 결과를 한 번 올립니다. 뼈대는 `LearningShell`이 집니다 — 이 화면이 아는
// 것은 카드 안과 아래 버튼이 하는 일뿐입니다. 단어 카드와 같은 골격이고 「채점 없음」도 같은 모양으로
// 드러납니다: 판정 배지 자리의 중립 표식 · 처음부터 서 있는 버튼 · 완료 카드 없음.
//
// 영어 본문이 주이고 한국어는 제목과 작은 보조 상자로 섭니다. 본문은 카드에서 유일하게 왼쪽 정렬입니다.
// DOM 순서 = 낭독 순서입니다: 표식 → 한국어 제목 → 제목 로마자 → 영어 제목 → 영어 본문 → 한국어 상자.
export function CultureCardActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: CultureCardActivityProps): ReactNode {
  const copy = useUiCopy();
  const [state, dispatch] = useReducer(cultureCardSessionReducer, initialCultureCardSessionState);
  const finished = useRef(false);

  // 상한은 화면이 지킵니다 — 문항이 줄어든 뒤에도 던지지 않도록 마지막 카드에 붙입니다.
  const cardIndex = Math.min(state.cardIndex, Math.max(0, questions.length - 1));
  const card = questions[cardIndex];
  const step = cultureCardStepOf(lesson, cardIndex, questions.length);
  const counter = lessonCounter(lesson, cardIndex, questions.length);

  // 연타해도 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish([], 0);
  };

  return (
    <LearningShell
      form="culture-card"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={copy.cultureCard.instruction}
      onExit={onExit}
      actionLabel={step === "finish" ? copy.common.seeResults : copy.common.next}
      onAction={step === "advance" ? () => dispatch({ type: "nextCard" }) : finish}
      // 긴 본문에서 카드가 길어져도 아래 버튼은 스크롤 밖에 남습니다 — 스크롤은 카드 하나가 집니다.
      scrollCard
      card={
        <view
          className="culture-card-activity-content"
          data-testid="culture-card-content"
          data-cardIndex={cardIndex}
        >
          {/* 판정 배지 자리에 서는 중립 표식입니다 — 다른 활동과 같은 위치 · 높이를 지킵니다. */}
          <view className="culture-card-activity-badge-slot">
            {card === undefined ? null : (
              <view className="culture-card-activity-badge">
                <text className="culture-card-activity-badge-text" data-testid="culture-card-badge">
                  {copy.cultureCard.badge}
                </text>
              </view>
            )}
          </view>

          {card === undefined ? null : (
            <>
              {/* 제목 묶음 — 한국어 제목은 접근성 속성이 없어 한국어 음성이 읽고, 로마자만 발음 이름을
                  집니다. */}
              <view className="culture-card-activity-heading">
                <text className="culture-card-activity-title" data-testid="culture-card-title">
                  {card.title}
                </text>
                {card.titleRomanization === null ? null : (
                  <text
                    className="culture-card-activity-romanization"
                    data-testid="culture-card-title-romanization"
                    accessibility-label={copy.cultureCard.pronunciation(card.titleRomanization)}
                  >
                    {card.titleRomanization}
                  </text>
                )}
                {card.titleTranslation === null ? null : (
                  <text
                    className="culture-card-activity-title-translation"
                    data-testid="culture-card-title-translation"
                  >
                    {card.titleTranslation}
                  </text>
                )}
              </view>

              <view className="culture-card-activity-divider" />

              <text className="culture-card-activity-body" data-testid="culture-card-body">
                {card.body}
              </text>

              {card.koreanBody === null ? null : (
                <view className="culture-card-activity-korean" data-testid="culture-card-korean">
                  <text
                    className="culture-card-activity-korean-title"
                    data-testid="culture-card-korean-title"
                    accessibility-elements-hidden={true}
                  >
                    {copy.cultureCard.koreanBodyTitle}
                  </text>
                  <text
                    className="culture-card-activity-korean-text"
                    data-testid="culture-card-korean-text"
                  >
                    {card.koreanBody}
                  </text>
                </view>
              )}
            </>
          )}
        </view>
      }
    />
  );
}
