import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";

import { WordChoicePicture } from "./WordChoicePicture";
import { wordChoicePictureAnswerOf } from "./word-choice-picture";
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
  readonly onLoad: () => void;
  readonly onError: () => void;
};

// 단어 선택 카드 안의 제시 자리입니다 — 그림 문항이면 그림 틀, 아니면 제시문과 지원 줄입니다. 상태는 없고
// 받은 값대로 그릴 뿐입니다(세션 상태는 화면이, 그림 로드 상태는 `useWordChoicePicture`가 집니다).
export function WordChoicePresentation({
  question,
  questionIndex,
  answered,
  pictureState,
  onLoad,
  onError,
}: WordChoicePresentationProps): ReactNode {
  const copy = useUiCopy();
  // 빈칸이 있는 줄만 낭독 라벨을 둡니다 — 없으면 보이는 글자가 그대로 읽힙니다.
  const spokenOf = (text: string): string | undefined => {
    const spoken = wordChoiceSpokenText(text, copy.common.blank);
    return spoken === text ? undefined : spoken;
  };
  if (question.picture !== undefined) {
    // 그림 문항은 제시문 대신 그림 틀이 섭니다. 문항마다 새 요소로 세워 앞 문항 그림의 늦은
    // 이벤트가 새 문항에 닿지 않게 합니다.
    return (
      <WordChoicePicture
        key={questionIndex}
        url={question.picture.url}
        meaning={question.prompt}
        state={pictureState}
        answer={answered ? wordChoicePictureAnswerOf(question) : null}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }
  return (
    <>
      <text
        // 번역 줄이 있는 문항(문화 확인)은 질문이 산문 길이라 제시문이 문장 크기로 섭니다.
        className={
          question.choiceTranslations === undefined
            ? "word-choice-screen-prompt"
            : "word-choice-screen-prompt word-choice-screen-prompt-sentence"
        }
        data-testid="word-choice-screen-prompt"
        accessibility-label={spokenOf(question.prompt)}
      >
        {question.prompt}
      </text>
      {/* 카탈로그 문항의 지원 줄입니다 — 값이 있을 때만 섭니다. 뜻 줄은 정답을 드러내는
          문항에는 실리지 않습니다(그 판단은 문항을 만드는 쪽이 집니다). */}
      {question.romanization === undefined ? null : (
        <text
          className="word-choice-screen-support"
          data-testid="word-choice-screen-romanization"
          accessibility-label={spokenOf(question.romanization)}
        >
          {question.romanization}
        </text>
      )}
      {question.translation === undefined ? null : (
        <text className="word-choice-screen-support" data-testid="word-choice-screen-translation">
          {question.translation}
        </text>
      )}
    </>
  );
}
