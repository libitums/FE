import { useReducer, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { useMotion } from "@libitums/ui-lynx/motion";
import { PageIndicator } from "@libitums/ui-lynx/page-indicator";

import { useUiCopy } from "../../lib/ui-copy";
import { lessonCounter } from "../learning/activity-finish";
import { LearningShell } from "../learning/LearningShell";
import {
  cultureCardActionOf,
  cultureCardFaceClassName,
  cultureCardLabelOf,
  cultureCardPhotoOf,
  cultureCardSessionReducer,
  cultureCardStepOf,
  initialCultureCardSessionState,
} from "./culture-card";
import type { CultureCardActivityProps } from "./culture-card.contract";
import { CultureCardFace } from "./CultureCardFace";

import "./culture-card-activity.css";

// 문화 카드를 덱에서 한 장씩 보이는 활동입니다(카탈로그 CULTURE_CARD). 고를 것도 칠 것도 없어서 판정하지 않고,
// 마지막 카드의 버튼이 빈 결과를 한 번 올립니다. 뼈대는 `LearningShell`이 집니다.
//
// 카드는 앞 · 뒤 두 면입니다 — 앞면은 사진(없으면 브랜드 면) 위 제목, 뒷면은 영어 본문과 한국어 상자입니다. 카드를 누르거나
// 아래 버튼을 누르면 뒤집히고, 뒷면의 아래 버튼이 다음 카드(앞면)로 넘깁니다. 앞면의 버튼이 늘 뒤집기인 것은 본문을 보지
// 않고 넘어가지 않게 하려는 것입니다. 덱의 뒤 두 장 · 점은 장식이고 위치는 셸의 `Lesson n / N`이 말합니다.
export function CultureCardActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
}: CultureCardActivityProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const [state, dispatch] = useReducer(cultureCardSessionReducer, initialCultureCardSessionState);
  // 한 번 실패한 사진 주소입니다 — 같은 주소는 다시 부르지 않고 브랜드 면으로 섭니다(다음 카드는 주소가 달라 다시 시도).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const finished = useRef(false);

  // 상한은 화면이 지킵니다 — 문항이 줄어든 뒤에도 던지지 않도록 마지막 카드에 붙입니다.
  const cardIndex = Math.min(state.cardIndex, Math.max(0, questions.length - 1));
  const card = questions[cardIndex];
  const step = cultureCardStepOf(lesson, cardIndex, questions.length);
  const action = cultureCardActionOf(state.face, step);
  const counter = lessonCounter(lesson, cardIndex, questions.length);
  const photoUrl = card === undefined ? null : cultureCardPhotoOf(card.imageUrl, failedUrl);

  // 연타해도 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finish = (): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish([], 0);
  };

  const flip = (): void => dispatch({ type: "flip" });
  const onAction = (): void => {
    if (action === "flip") flip();
    else if (action === "advance") dispatch({ type: "nextCard" });
    else finish();
  };
  const actionLabel =
    action === "flip"
      ? copy.cultureCard.flipCard
      : action === "advance"
        ? copy.cultureCard.nextCard
        : action === "hand-off"
          ? copy.common.next
          : copy.common.seeResults;

  const labelInput =
    card === undefined ? null : { position: cardIndex + 1, total: questions.length, card };

  return (
    <LearningShell
      form="culture-card"
      gemCount={gemCount}
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      instruction={copy.cultureCard.instruction}
      onExit={onExit}
      actionLabel={actionLabel}
      onAction={onAction}
      // 덱은 면을 스스로 그립니다 — 셸의 흰 카드 안에 두면 카드 속 카드가 됩니다. 긴 뒷면은 스크롤이 집니다.
      stage="bare"
      scrollCard
      card={
        <view
          className="culture-card-activity-content"
          data-testid="culture-card-content"
          data-cardIndex={cardIndex}
        >
          {/* 덱의 위치 숫자입니다. 셸의 `Lesson n / N`과 겹쳐 들리지 않게 낭독에서 뺍니다. */}
          <view className="culture-card-activity-meta">
            <text
              className="culture-card-activity-counter"
              data-testid="culture-card-counter"
              accessibility-element={false}
            >
              {copy.cultureCard.counter(cardIndex + 1, questions.length)}
            </text>
          </view>

          <view className="culture-card-activity-deck">
            {/* 뒤에 깔린 두 장 — 장식입니다(글이 없는 면이라 접근성 트리에 서지 않습니다). */}
            <view
              className="culture-card-activity-layer-far"
              data-testid="culture-card-layer-far"
            />
            <view
              className="culture-card-activity-layer-near"
              data-testid="culture-card-layer-near"
            />
            {card === undefined || labelInput === null ? null : (
              <CultureCardFace
                // 카드가 바뀔 때만 새로 세웁니다 — 뒤집기마다 다시 세우면 스크린리더 초점이 풀립니다. 움직임은
                // 면마다 다른 클래스(`-flip-front` · `-flip-back`)가 다시 돌립니다.
                key={cardIndex}
                card={card}
                face={state.face}
                className={cultureCardFaceClassName(state.face, state.flipped, motion)}
                label={cultureCardLabelOf(state.face, labelInput, copy.cultureCard)}
                photoUrl={photoUrl}
                reducedMotion={motion === "reduced"}
                onPhotoError={() => setFailedUrl(card.imageUrl)}
                onTap={flip}
              />
            )}
          </view>

          <view className="culture-card-activity-dots">
            <PageIndicator pageCount={questions.length} currentPage={cardIndex + 1} decorative />
          </view>
        </view>
      }
    />
  );
}
