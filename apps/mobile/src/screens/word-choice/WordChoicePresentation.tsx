import type { ReactNode } from "@lynx-js/react";

import { Card } from "@libitums/ui-lynx/card";

import { ItemListenControls } from "../../components/ItemListenControls";
import { TextRoles } from "../../components/TextRoles";
import type { ListenAudioControl } from "../../components/use-listen-audio";
import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import {
  koreanBrandToneOf,
  koreanTextStepOf,
  romanizationSizeFor,
} from "../../lib/korean-text-step";
import type { LearningDensity } from "../../lib/learning-density";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";
import { useUiCopy } from "../../lib/ui-copy";

import { CultureCheckScene } from "./CultureCheckScene";
import { WordChoicePicture } from "./WordChoicePicture";
import { wordChoicePictureAnswerOf, wordChoicePictureRatioOf } from "./word-choice-picture";
import { wordChoiceSpokenText } from "./word-choice";
import type { WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

import "./word-choice-screen.css";

export type WordChoicePresentationProps = {
  readonly question: WordChoiceQuestion;
  readonly questionIndex: number;
  /** 이 문항에 답했는지입니다 — 그림 문항의 정답 이름표가 이것을 따릅니다. */
  readonly answered: boolean;
  readonly pictureState: WordChoicePictureState;
  /** 듣기 갈래 문항 음성의 조작입니다 — 있으면 제시문 · 지원 줄 다음에 간이 줄이 섭니다. */
  readonly listen?: ListenAudioControl | undefined;
  readonly onLoad: () => void;
  readonly onError: () => void;
  /** 문항의 밀도입니다(한글 글자 단계와 장면 말풍선 크기가 갈립니다). */
  readonly density?: LearningDensity;
  /** 문화 확인 장면의 출연진입니다. */
  readonly cast?: ConversationCast;
  /** 고른 보기의 글과 판정입니다 — 답하기 전에는 `null`. 문화 확인 장면의 내 대답이 이것에서 납니다. */
  readonly answer?: { readonly reply: string; readonly result: AnswerResult } | null;
};

const emptyCast: ConversationCast = { counterpart: {}, me: {} };

/** 그림 · 문화 확인 장면은 활동이 스스로 무대 카드를 그립니다(셸 `stage="bare"`). */
export function wordChoiceStageOf(question: WordChoiceQuestion): "card" | "bare" {
  return question.picture !== undefined || question.culture?.scene != null ? "bare" : "card";
}

// 단어 선택 카드 안의 제시 자리입니다 — 그림 문항이면 그림 틀, 문화 확인 장면이면 장면, 아니면 한글 · 로마자 · 구분선 ·
// 뜻 순서의 글 카드입니다. 상태는 없고 받은 값대로 그릴 뿐입니다(세션 상태는 화면이, 그림 로드 상태는
// `useWordChoicePicture`가 집니다).
export function WordChoicePresentation({
  question,
  questionIndex,
  answered,
  pictureState,
  listen,
  onLoad,
  onError,
  density = "regular",
  cast = emptyCast,
  answer = null,
}: WordChoicePresentationProps): ReactNode {
  const copy = useUiCopy();
  // 빈칸이 있는 줄만 낭독 라벨을 둡니다 — 없으면 보이는 글자가 그대로 읽힙니다.
  const spokenOf = (text: string): string | undefined => {
    const spoken = wordChoiceSpokenText(text, copy.common.blank);
    return spoken === text ? undefined : spoken;
  };
  if (question.picture !== undefined) {
    // 그림 문항은 제시문 대신 그림이 가장자리까지 서는 무대 카드입니다. 문항마다 새 요소로 세워 앞 문항 그림의 늦은
    // 이벤트가 새 문항에 닿지 않게 합니다.
    return (
      <view className="word-choice-stage-card">
        <Card elevation="stage">
          <Card.Media>
            <WordChoicePicture
              key={questionIndex}
              url={question.picture.url}
              ratio={wordChoicePictureRatioOf(question.choices.length)}
              meaning={question.prompt}
              state={pictureState}
              answer={answered ? wordChoicePictureAnswerOf(question) : null}
              onLoad={onLoad}
              onError={onError}
            />
          </Card.Media>
        </Card>
      </view>
    );
  }
  const scene = question.culture?.scene ?? null;
  if (scene !== null) {
    return (
      <CultureCheckScene
        scene={scene}
        cast={cast}
        density={density}
        outcome={
          answer === null
            ? { kind: "asking" }
            : { kind: "answered", reply: answer.reply, result: answer.result }
        }
      />
    );
  }
  const step = koreanTextStepOf(question.prompt, density);
  const size = romanizationSizeFor(step);
  // 해설 판이 서는 문화 확인은 답한 뒤 한글 줄만 남깁니다 — 판에 높이를 내줍니다.
  const folded = answered && question.culture !== undefined;
  return (
    <>
      <text
        className={`word-choice-screen-prompt korean-text-${step} korean-text-tone-${koreanBrandToneOf(step)}`}
        data-testid="word-choice-screen-prompt"
        accessibility-label={spokenOf(question.prompt)}
      >
        {question.prompt}
      </text>
      {/* 카탈로그 문항의 지원 줄입니다 — 값이 있을 때만 섭니다. 뜻 줄은 정답을 드러내는 문항에는 실리지 않습니다(그
          판단은 문항을 만드는 쪽이 집니다). 로마자 → 구분선 → 뜻이 한글 바로 아래 이 순서입니다. */}
      {question.romanization === undefined || folded ? null : (
        <TextRoles.Romanization
          segments={romanizationSegmentsOf(question.romanization, question.romanizationEmphasis)}
          size={size}
          testId="word-choice-screen-romanization"
          accessibilityLabel={spokenOf(question.romanization)}
        />
      )}
      {question.translation === undefined || folded ? null : (
        <>
          <TextRoles.Divider testId="word-choice-screen-divider" />
          <TextRoles.Meaning
            text={question.translation}
            size={size}
            testId="word-choice-screen-translation"
          />
        </>
      )}
      {listen === undefined ? null : (
        <ItemListenControls control={listen} testId="word-choice-listen" />
      )}
    </>
  );
}
