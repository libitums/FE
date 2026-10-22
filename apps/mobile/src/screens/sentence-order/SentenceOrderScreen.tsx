import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { LearningItemGuide } from "../../components/LearningItemGuide";
import { useListenAudio } from "../../components/use-listen-audio";
import { useLearningItemGuide } from "../../components/use-learning-item-guide";
import { announce, announceCompletion } from "../../lib/accessibility";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { ItemAnswerReporter } from "../../lib/item-answer";
import { answerEchoCueOf, listenCueOf, standaloneLessonAudio } from "../../lib/question-audio";
import type { LessonAudio } from "../../lib/question-audio";
import { initialSessionOptions } from "../../lib/session-options";
import { useAudioCue } from "../../lib/use-audio-cue";
import { LearningShell } from "../learning/LearningShell";
import { LearningActivityComplete } from "../learning/LearningActivityComplete";
import { useLearningDensity } from "../learning/use-learning-density";
import { SentenceOrderChip, SentenceOrderChipPlaceholder } from "./SentenceOrderChip";
import { SentenceOrderDialogue } from "./SentenceOrderDialogue";
import { SentenceOrderDialogueBank } from "./SentenceOrderDialogueBank";
import { SentenceOrderLines } from "./SentenceOrderLines";
import { SentenceOrderListenHeader } from "./SentenceOrderListenHeader";
import { SentenceOrderTextHeader } from "./SentenceOrderTextHeader";
import {
  canPlaceChip,
  judgeSentenceOrder,
  dialogueSpeakersOf,
  initialSentenceOrderSessionState,
  isSentenceOrderSessionComplete,
  sentenceOrderAnnouncement,
  sentenceOrderCompletionAnnouncement,
  sentenceOrderResultAt,
  sentenceOrderSessionReducer,
  sentenceOrderSessionResults,
} from "./sentence-order";
import {
  sentenceOrderBottomActionOf,
  sentenceOrderLayoutOf,
  sentenceOrderPlacedResultsOf,
  sentenceOrderReadingShown,
} from "./sentence-order-layout";
import type { SentenceOrderInteraction } from "./sentence-order-layout";
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

import "./sentence-order-screen.css";

// 문장 만들기(Figma 65-14)입니다. 상단 바 · 세션 헤더 · 지시문 · 무대 · 작업 영역 · 아래 버튼은 `LearningShell`이
// 집니다. 이 화면이 아는 것은 무대 안(줄 배치의 위 줄 + 답 줄 둘, 또는 대화 칸)과 작업 영역(조각 창고), 그리고 아래 버튼이 지금
// 무엇을 하는가뿐입니다.
//
// 줄 배치(듣고 조립 · 문장 순서)는 카드 없이 서고 Check가 흐름 안에 늘 서 있습니다 — 다 놓아도 저절로 채점되지 않고
// Check로만 판정이 납니다. 판정 배지는 셸 지시문 자리에 섭니다(`verdict`). 대화 배치는 칸이 다 차면 Check가 섭니다.
export type SentenceOrderActivityProps = {
  readonly questions: readonly SentenceOrderQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 활동 하나가 한 세션이면 주지 않습니다. */
  readonly lesson?: LessonPosition;
  /** 대화 조립 출연진(이름 · 그림)입니다. */
  readonly cast?: ConversationCast;
  /** 문항이 처음 판정되는 순간 한 번 부릅니다(측정). */
  readonly onItemAnswered?: ItemAnswerReporter;
  /** 레슨의 소리 설정(속도 · 자동 재생 · 보고)입니다. 없으면 단독 활동의 기본값입니다. */
  readonly lessonAudio?: LessonAudio;
};

export function SentenceOrderActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
  cast,
  onItemAnswered,
  lessonAudio,
}: SentenceOrderActivityProps): ReactNode {
  const copy = useUiCopy();
  const density = useLearningDensity();
  const [state, dispatch] = useReducer(
    sentenceOrderSessionReducer,
    initialSentenceOrderSessionState,
  );

  const firstQuestion = questions[0];
  const guide = useLearningItemGuide(
    firstQuestion === undefined ? null : { form: "sentence-order", chips: firstQuestion.chips },
  );

  const complete = isSentenceOrderSessionComplete(state, questions.length);
  const question = complete ? null : questions[state.questionIndex];
  const result = question == null ? null : sentenceOrderResultAt(question, state);

  // 문항 음성입니다. 듣기 조립은 듣기 갈래 — 위 줄의 재생 · 다시 듣기 · 자동 재생 · 보고, 문장 순서는 정답 뒤 재생
  // 갈래 — 확인한 순간 1.0으로 한 번(정오 무관, 조작 없음)입니다.
  const audioLesson = lessonAudio ?? standaloneLessonAudio(initialSessionOptions);
  const audioKey = String(state.questionIndex);
  const listen = useListenAudio(listenCueOf(audioKey, question?.audio), audioLesson);
  useAudioCue(
    answerEchoCueOf(audioKey, question?.audio, state.phase === "checked", audioLesson.autoPlay),
  );

  // 채점 전이마다 한 번 판정을 낭독합니다.
  useEffect(() => {
    if (question == null || result === null) {
      return;
    }
    announce(sentenceOrderAnnouncement(result, copy));
    // 문항 순번 · 국면이 바뀔 때만 한 번 냅니다 — `question` · `result`는 그 둘에서 파생하므로
    // 넣지 않습니다(넣으면 같은 채점을 다시 낭독할 수 있습니다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  useEffect(() => {
    if (!complete) {
      return;
    }
    announceCompletion(sentenceOrderCompletionAnnouncement(copy.common.seeResults, copy));
  }, [complete]);

  // 안내가 떠 있는 동안은 조각이 움직이지 않습니다 — 겹침 층에만 기대지 않습니다.
  const toggle = (chipIndex: number) => {
    if (guide.visible) return;
    dispatch({ type: "toggleChip", chipIndex });
  };

  const layout = question == null ? "lines" : sentenceOrderLayoutOf(question);
  const interaction: SentenceOrderInteraction = state.phase === "checked" ? "locked" : "tappable";
  const bankInteraction: SentenceOrderInteraction =
    question != null && canPlaceChip(question, state) ? "tappable" : "locked";
  const bottom = sentenceOrderBottomActionOf(question ?? null, state);

  const check = () => {
    if (question == null) return;
    const judged = judgeSentenceOrder(question, state.placedChipIndexes);
    onItemAnswered?.({ questionIndex: state.questionIndex, outcome: judged, density });
    dispatch({ type: "check" });
    listen.answered(judged);
  };
  const handsOff = handsOffAfter(lesson, state.questionIndex, questions.length);
  const finish = () => onFinish(sentenceOrderSessionResults(questions, state.submittedOrders), 0);

  // 아래 버튼입니다: `Check`(줄 배치는 늘 · 대화는 칸이 다 차면) · `Next`(채점 뒤) · `See results`(완료). Check만 상태가
  // 읽히는 버튼이라 ui-lynx `Button`이고, 나머지는 셸 기본 버튼입니다. 레슨의 중간 활동은 마지막 문항 뒤 완료 카드 없이
  // 곧바로 결과를 올립니다.
  const action: { label: string; run: () => void } | undefined =
    bottom.kind === "results"
      ? { label: copy.common.seeResults, run: finish }
      : bottom.kind === "next"
        ? {
            label: copy.common.next,
            run: () => (handsOff ? finish() : dispatch({ type: "nextQuestion" })),
          }
        : undefined;
  const checkButton =
    bottom.kind === "check" ? (
      <view className="sentence-order-check" data-testid="sentence-order-check">
        <Button
          label={copy.common.check}
          variant="brand"
          size="xl"
          width="fill"
          disabled={bottom.availability === "disabled"}
          bindtap={check}
        />
      </view>
    ) : undefined;

  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
  );
  const reading =
    question == null ? null : sentenceOrderReadingShown(question.reading, state.phase);
  const placedResults =
    question != null && state.phase === "checked"
      ? sentenceOrderPlacedResultsOf(question, state.placedChipIndexes)
      : null;

  const linesBody =
    question == null ? null : (
      <SentenceOrderLines
        chips={question.chips}
        placedChipIndexes={state.placedChipIndexes}
        results={placedResults}
        interaction={interaction}
        onReturn={toggle}
      >
        {question.audio?.kind === "listen" ? (
          <SentenceOrderListenHeader control={listen} romanization={reading} />
        ) : (
          <SentenceOrderTextHeader prompt={question.prompt} romanization={reading} />
        )}
      </SentenceOrderLines>
    );

  const bank =
    question == null ? undefined : layout === "dialogue" ? (
      state.phase === "checked" ? undefined : (
        <SentenceOrderDialogueBank
          chips={question.chips}
          meanings={question.chipMeanings}
          speakers={question.dialogue?.chipSpeakers ?? []}
          placedChipIndexes={state.placedChipIndexes}
          interaction={bankInteraction}
          onTap={toggle}
        />
      )
    ) : (
      // 창고 — 조각이 빠져나가도 그 자리에 회색 칸이 남아 배치가 흔들리지 않습니다.
      <view className="sentence-order-screen-bank" data-testid="sentence-order-screen-bank">
        {question.chips.map((text, chipIndex) =>
          state.placedChipIndexes.includes(chipIndex) ? (
            <SentenceOrderChipPlaceholder key={chipIndex} index={chipIndex} text={text} />
          ) : (
            <SentenceOrderChip
              key={chipIndex}
              index={chipIndex}
              text={text}
              placedOrdinal={null}
              disabled={bankInteraction === "locked"}
              onTap={toggle}
            />
          ),
        )}
      </view>
    );

  return (
    <>
      <LearningShell
        form="sentence-order"
        obscured={guide.visible}
        gemCount={gemCount}
        questionIndex={counter.questionIndex}
        questionCount={counter.questionCount}
        complete={complete}
        instruction={question?.instruction ?? copy.sentenceOrder.instruction}
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        actionButton={checkButton}
        actionPlacement={layout === "lines" ? "in-flow" : "floating"}
        stage={question != null && layout === "lines" ? "bare" : "card"}
        verdict={result ?? undefined}
        workspace={bank}
        card={
          <view
            className="sentence-order-screen-content"
            data-testid="sentence-order-screen-content"
          >
            {question == null ? (
              <LearningActivityComplete
                questionCount={questions.length}
                lesson={lesson}
                testId="sentence-order-screen-complete"
              />
            ) : layout === "dialogue" ? (
              <SentenceOrderDialogue
                speakers={dialogueSpeakersOf(question)}
                chips={question.chips}
                placedChipIndexes={state.placedChipIndexes}
                results={placedResults}
                interaction={interaction}
                onReturn={toggle}
                cast={cast}
              />
            ) : (
              linesBody
            )}
          </view>
        }
      />
      {guide.visible ? <LearningItemGuide kind={guide.kind} onDismiss={guide.dismiss} /> : null}
    </>
  );
}
