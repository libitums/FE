import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useMemo, useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { announce, announceCompletion } from "../../lib/accessibility";
import { LearningShell } from "../learning/LearningShell";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { QuestionOptions } from "../../components/QuestionOptions";
import { useListenAudio } from "../../components/use-listen-audio";
import { WordChoicePresentation, wordChoiceStageOf } from "./WordChoicePresentation";
import { useWordChoicePicture } from "./use-word-choice-picture";
import { canAnswerWordChoice } from "./word-choice-picture";
import {
  answeredResultOf,
  choiceResultAt,
  hasAnswered,
  initialWordChoiceSessionState,
  isWordChoiceSessionComplete,
  optionAccessibilityLabel,
  wordChoiceCompletionAnnouncement,
  wordChoiceSessionReducer,
  wordChoiceSessionResults,
} from "./word-choice";
import {
  cultureFeedbackAnnouncement,
  cultureFeedbackOf,
  wordChoiceAfterAnswerOf,
  wordChoiceOptionsStateOf,
  wordChoiceQuestionDensityOf,
} from "./word-choice-follow-up";
import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { ItemAnswerReporter } from "../../lib/item-answer";
import { answerEchoCueOf, listenCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import type { LessonAudio } from "../../lib/question-audio";
import { initialSessionOptions } from "../../lib/session-options";
import { useAudioCue } from "../../lib/use-audio-cue";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";
import { useLearningDensity } from "../learning/use-learning-density";
import type { WordChoiceQuestion } from "./word-choice-questions";

import "./word-choice-screen.css";

// `ListeningActivity`의 형태를 그대로 잇되 **제시 채널에서 오디오가 빠집니다**
// — `ListeningPrompt` · `lib/audio.ts` · 재생 상태를 이 화면이 가져오지
// 않습니다. 제시문은 `<text>` 하나입니다 — 카드 표면을 두지 않습니다.
//
// 세션 상태는 이 화면이 소유하고 순수 함수 `wordChoiceSessionReducer`를
// 소비합니다. 판정·완료·응답 여부를 상태에 적지 않습니다 — 전부 파생입니다.
//
// **뼈대는 이 화면의 것이 아닙니다.** 상단 바·세션 헤더·지시문·무대 카드·아래 버튼은 `LearningShell`이
// 집니다(ADR-0022 D1-2). 이 화면이 아는 것은 카드 **안**에 무엇이 서는가와 작업 영역에 무엇이 서는가뿐입니다.
// 판정 배지는 카드 안 칸이 아니라 셸의 지시문 자리에 섭니다(`verdict`). 문화 확인은 판정 배지 대신 해설 판이 서고
// 저절로 넘어가지 않습니다 — 아래 버튼 `Continue`가 다음 문항으로 보냅니다.
export type WordChoiceActivityProps = {
  readonly questions: readonly WordChoiceQuestion[];
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 활동 하나가 한 세션이면 주지 않습니다. */
  readonly lesson?: LessonPosition;
  /** 레슨의 소리 설정(속도 · 자동 재생 · 보고)입니다. 없으면 단독 활동의 기본값입니다. */
  readonly lessonAudio?: LessonAudio;
  /** 문화 확인 장면의 출연진(상대 · 학습자)입니다. */
  readonly cast?: ConversationCast;
  /** 문항이 처음 판정되는 순간 한 번 부릅니다(측정). */
  readonly onItemAnswered?: ItemAnswerReporter;
};

const emptyCast: ConversationCast = { counterpart: {}, me: {} };

export function WordChoiceActivity({
  questions,
  onExit,
  onFinish,
  lesson,
  lessonAudio,
  cast = emptyCast,
  onItemAnswered,
}: WordChoiceActivityProps): ReactNode {
  const copy = useUiCopy();
  const deviceDensity = useLearningDensity();
  const [state, dispatch] = useReducer(wordChoiceSessionReducer, initialWordChoiceSessionState);

  // 완료는 파생입니다. 완료 시점에는 `questionIndex`가 문항 수와 같아
  // 조회할 문항이 없습니다 — 여기서 한 번만 갈라 아래에서 다시 묻지
  // 않습니다.
  const complete = isWordChoiceSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const answered = question !== null && hasAnswered(state);
  const density =
    question === null ? deviceDensity : wordChoiceQuestionDensityOf(deviceDensity, question);
  // 답한 뒤: 문화 확인은 해설 판을 세우고 Continue를 기다리고(`explain`), 나머지는 판정 배지 뒤 저절로 넘어갑니다.
  const explains = question !== null && wordChoiceAfterAnswerOf(question) === "explain";
  const result = question !== null && answered ? answeredResultOf(state, question) : null;

  // 문항 음성입니다. 단어 선택(REPLY_SELECT)은 듣기 갈래 — 간이 줄 · 자동 재생 · 보고, 그림 고르기 · 뜻 고르기는
  // 정답 뒤 재생 갈래 — 고른 순간 1.0으로 한 번(정오 무관, 조작 없음)입니다.
  const audioLesson = lessonAudio ?? standaloneLessonAudio(initialSessionOptions);
  const audioKey = String(state.questionIndex);
  const listen = useListenAudio(listenCueOf(audioKey, question?.audio), audioLesson);
  useAudioCue(answerEchoCueOf(audioKey, question?.audio, hasAnswered(state), audioLesson.autoPlay));

  // 그림 문항이면 그림이 설 때까지(최대 6초) 보기를 잠급니다. 그림 문항이 아니면 상태도 타이머도 없이
  // 처음부터 열려 있습니다.
  const picture = useWordChoicePicture(question, state.questionIndex);
  const answerable = question == null ? false : canAnswerWordChoice(question, picture.state);

  // 연타해도 결과는 한 번만 올라갑니다 — 부모가 화면을 걷기 전의 두 번째 탭을 막습니다.
  const finished = useRef(false);
  const finishOnce = (results: readonly AnswerResult[]): void => {
    if (finished.current) return;
    finished.current = true;
    onFinish(results, 0);
  };

  // 종료 상태가 **처음 존재하게 되는 순간**, 정확히 한 번입니다(ADR-0016 D11-2). dep이 `complete` 하나입니다 —
  // 리듀서가 `questionIndex`를 늘리기만 하므로 이 파생값은 false→true로 **한 번만** 갈립니다. cleanup이 없습니다 —
  // 낭독은 취소할 수 있는 자원이 아닙니다(D11-2).
  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(wordChoiceCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 레슨의 중간 활동이면 마지막 문항에서 완료 카드를 거치지 않고 곧바로 결과를 올려 다음 학습형으로 갑니다.
  const handsOff =
    question !== null && handsOffAfter(lesson, state.questionIndex, questions.length);
  const goNext = (selected: number): void => {
    if (handsOff) {
      finishOnce(wordChoiceSessionResults(questions, [...state.answeredChoiceIndexes, selected]));
    } else {
      dispatch({ type: "nextQuestion" });
    }
  };

  // 아래 버튼입니다. 세션이 끝났을 때는 결과 보기이고, 해설 판이 선 문화 확인 문항에서는 Continue입니다. 그 밖의 문항 사이는
  // 버튼 없이 스스로 넘어갑니다(아래 `advance`).
  const selectedIndex = state.selectedChoiceIndex;
  const action =
    question === null
      ? {
          label: copy.common.seeResults,
          // 이 화면에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다(D8, speaking만 다른 값을 냅니다).
          run: () => finishOnce(wordChoiceSessionResults(questions, state.answeredChoiceIndexes)),
        }
      : explains && selectedIndex !== null
        ? { label: copy.common.continue, run: () => goNext(selectedIndex) }
        : undefined;

  // 고른 뒤 2.5초입니다 — 듣기와 같은 값입니다. **참조가 곧 걸음의 정체입니다**(껍데기가 그것으로 타이머를 갈고
  // 겹침을 막습니다). 매 렌더 새로 만들면 관계없는 리렌더 하나가 기다림을 처음부터 되돌립니다.
  const advance = useMemo(() => {
    const selected = state.selectedChoiceIndex;
    if (question === null || selected === null || explains) return undefined;
    return {
      label: copy.common.continue,
      run: () => goNext(selected),
      delayMs: 2500,
    };
  }, [question, state.selectedChoiceIndex, copy]);
  const counter = lessonCounter(
    lesson,
    question === null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );

  const feedback =
    explains && result !== null ? cultureFeedbackOf(question, result, copy) : undefined;

  const instruction =
    question?.instruction ??
    (question?.culture?.scene == null
      ? copy.wordChoice.instruction
      : copy.wordChoice.culture.sceneInstruction);

  const select = (index: number): void => {
    if (question === null || !answerable) return;
    const judged = index === question.answerIndex ? "correct" : "incorrect";
    if (!hasAnswered(state)) {
      onItemAnswered?.({ questionIndex: state.questionIndex, outcome: judged, density });
      const entering = cultureFeedbackOf(question, judged, copy);
      if (entering !== undefined) announce(cultureFeedbackAnnouncement(entering));
    }
    dispatch({ type: "selectChoice", choiceIndex: index });
    listen.answered(judged);
  };

  return (
    <LearningShell
      form="word-choice"
      // 문화 확인 문항은 같은 낱말 고르기 형이어도 이름표가 `Culture quiz`입니다.
      formLabel={question?.culture === undefined ? undefined : copy.learningShell.cultureQuizLabel}
      // 세션 헤더가 세는 것은 문항입니다. 완료 상태에는 지금 푸는 문항이 없으므로
      // 마지막 문항 자리에 둡니다 — 문항이 0개인 스텝에서는 계약이 순번을 안 읽습니다.
      questionIndex={counter.questionIndex}
      questionCount={counter.questionCount}
      complete={complete}
      instruction={instruction}
      onExit={onExit}
      actionLabel={action?.label}
      onAction={action?.run}
      advance={advance}
      verdict={explains ? undefined : (result ?? undefined)}
      feedback={feedback}
      stage={question === null ? "card" : wordChoiceStageOf(question)}
      densityOverride={density === "compact" ? "compact" : undefined}
      /* 보기는 무대 카드 **밖**입니다 — 카드는 「무엇을 묻나」를 말하고, 고르는 일은 그 아래 작업 영역에서 합니다.
         그림 문항은 2열 격자, 나머지는 세로로 쌓습니다. */
      workspace={
        question === null ? undefined : (
          <QuestionOptions
            testId="word-choice-screen-options"
            groupLabel={instruction}
            options={question.choices.map((text, index) => {
              const meaning = question.choiceTranslations?.[index];
              return meaning === undefined ? { text } : { text, meaning };
            })}
            accessibilityLabels={question.choices.map((text, index) =>
              // 판정을 지는 보기는 고른 하나뿐입니다 — 고르지 않은 정답 보기는 접미사가 없습니다.
              optionAccessibilityLabel(
                text,
                choiceResultAt(state, question, index),
                copy,
                question.choiceTranslations?.[index],
              ),
            )}
            layout={question.picture === undefined ? "stack" : "grid"}
            density={density}
            state={wordChoiceOptionsStateOf(question, state, picture.state)}
            onSelect={select}
          />
        )
      }
      card={
        // 문항 상태든 완료 상태든 **언제나 서는 상자**입니다 — 이 화면의 정체를 가리는 앵커가 이것입니다(듣기의
        // `listening-screen-content`와 같은 자리). 제시문은 문항이 있을 때만 서므로 앵커가 될 수 없습니다: 실물 문항
        // 표가 아직 비어 있어 마운트가 곧 완료인 갈래가 있습니다.
        <view className="word-choice-screen-content" data-testid="word-choice-screen-content">
          {question === null ? null : (
            <WordChoicePresentation
              question={question}
              questionIndex={state.questionIndex}
              answered={answered}
              pictureState={picture.state}
              listen={question.audio?.kind === "listen" ? listen : undefined}
              onLoad={picture.onLoad}
              onError={picture.onError}
              density={density}
              cast={cast}
              answer={
                result === null || selectedIndex === null
                  ? null
                  : { reply: question.choices[selectedIndex] ?? "", result }
              }
            />
          )}

          {/* 완료문입니다. 문항이 서 있던 그 카드 안에 결과가 대신 섭니다. */}
          {question === null ? (
            <LearningActivityComplete
              questionCount={questions.length}
              lesson={lesson}
              testId="word-choice-screen-complete"
            />
          ) : null}
        </view>
      }
    />
  );
}
