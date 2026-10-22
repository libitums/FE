import { useUiCopy } from "../../lib/ui-copy";
import { useEffect, useReducer } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AnswerVerdict } from "../../components/AnswerVerdict";
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
import { SentenceOrderChip, SentenceOrderChipPlaceholder } from "./SentenceOrderChip";
import { SentenceOrderDialogue } from "./SentenceOrderDialogue";
import { SentenceOrderPartnerSlot } from "./SentenceOrderPartnerSlot";
import {
  canCheckArrangement,
  canPlaceChip,
  composedSentence,
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
import { handsOffAfter, lessonCounter } from "../learning/activity-finish";
import type { ActivityFinish, LessonPosition } from "../learning/activity-finish";
import type { SentenceOrderQuestion } from "./sentence-order-questions";
import type { DialogueSpeakerNames } from "./sentence-order-avatar";

import "./sentence-order-screen.css";

// 문장 만들기(Figma 65-14)입니다. 상단 바 · 세션 헤더 · 지시문 · 무대 카드 · 작업 영역 ·
// 아래 버튼은 `LearningShell`이 집니다. 이 화면이 아는 것은 카드 **안**(대화 · 답 칸 줄)과
// 작업 영역(낱말 창고), 그리고 아래 버튼이 지금 무엇을 하는가뿐입니다.
//
// 대화 카드의 왼쪽 말풍선이 상대의 말(`prompt`)이고, 학습자는 그 말에 답하는 문장을 창고의
// 조각으로 만듭니다. 창고에는 오답 낱말이 섞여 있고, 정답 길이만큼 놓으면 확인할 수 있습니다.
export type SentenceOrderActivityProps = {
  readonly questions: readonly SentenceOrderQuestion[];
  readonly gemCount: number;
  readonly onExit: () => void;
  readonly onFinish: ActivityFinish;
  /** 카탈로그 레슨 안의 위치입니다. 활동 하나가 한 세션이면 주지 않습니다. */
  readonly lesson?: LessonPosition;
  /** 대화 조립 아바타의 이름(에피소드 상대 · 학습자)입니다. */
  readonly speakerNames?: DialogueSpeakerNames;
  /** 대화 조립 출연진(이름 · 그림)입니다. `speakerNames`를 대신합니다. */
  readonly cast?: ConversationCast;
  /** 문항이 처음 판정되는 순간 한 번 부릅니다(측정). */
  readonly onItemAnswered?: ItemAnswerReporter;
  /** 레슨의 소리 설정(속도 · 자동 재생 · 보고)입니다. 없으면 단독 활동의 기본값입니다. */
  readonly lessonAudio?: LessonAudio;
};

/** 내 말풍선이 비어 있을 때의 표시입니다 — 디자인 표기 그대로입니다. */
const emptyReplyMark = "----";

export function SentenceOrderActivity({
  questions,
  gemCount,
  onExit,
  onFinish,
  lesson,
  speakerNames,
  lessonAudio,
}: SentenceOrderActivityProps): ReactNode {
  const copy = useUiCopy();
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

  // 문항 음성입니다. 듣기 조립은 듣기 갈래 — 상대 말풍선 자리의 3열 · 자동 재생 · 보고, 문장 순서는 정답 뒤 재생
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

  // 아래 버튼은 정확히 하나이거나 없습니다 — `확인`(칸이 다 참) · `다음`(채점 뒤) · `결과
  // 보기`(완료). 칸이 덜 찼으면 버튼이 없습니다(「아직 할 수 없다」를 버튼의 부재로 말합니다).
  const action: { label: string; run: () => void; sound?: "none" } | undefined =
    question == null
      ? {
          label: copy.common.seeResults,
          // 이 화면에는 건너뛰기가 없습니다 — 셋째 인자는 늘 0입니다(D8, speaking만 다른 값을 냅니다).
          run: () => onFinish(sentenceOrderSessionResults(questions, state.submittedOrders), 0),
        }
      : state.phase === "checked"
        ? {
            label: copy.common.next,
            // 레슨의 중간 활동은 마지막 문항 뒤 완료 카드 없이 곧바로 결과를 올립니다.
            run: () =>
              handsOffAfter(lesson, state.questionIndex, questions.length)
                ? onFinish(sentenceOrderSessionResults(questions, state.submittedOrders), 0)
                : dispatch({ type: "nextQuestion" }),
          }
        : canCheckArrangement(question, state)
          ? {
              label: copy.common.check,
              run: () => {
                dispatch({ type: "check" });
                listen.answered(judgeSentenceOrder(question, state.placedChipIndexes));
              },
              sound: "none",
            }
          : undefined;

  const bankFull = question == null ? true : !canPlaceChip(question, state);
  const counter = lessonCounter(
    lesson,
    question == null ? Math.max(0, questions.length - 1) : state.questionIndex,
    questions.length,
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
        instruction={
          question?.instruction ?? question?.support?.instruction ?? copy.sentenceOrder.instruction
        }
        onExit={onExit}
        actionLabel={action?.label}
        onAction={action?.run}
        actionSound={action?.sound ?? "button"}
        workspace={
          question == null ? undefined : (
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
                    disabled={bankFull}
                    onTap={toggle}
                  />
                ),
              )}
            </view>
          )
        }
        card={
          <view
            className="sentence-order-screen-content"
            data-testid="sentence-order-screen-content"
          >
            {/* 판정 배지 자리 — 문항 장면에서는 비어 있어도 자리를 지켜 카드 높이가 흔들리지 않습니다(듣기와 같음). */}
            {complete ? null : (
              <view className="sentence-order-screen-verdict-slot">
                {result === null ? null : <AnswerVerdict result={result} />}
              </view>
            )}

            {question == null ? (
              <LearningActivityComplete
                questionCount={questions.length}
                lesson={lesson}
                testId="sentence-order-screen-complete"
              />
            ) : question.dialogue !== undefined ? (
              <SentenceOrderDialogue
                speakers={dialogueSpeakersOf(question)}
                chips={question.chips}
                placedChipIndexes={state.placedChipIndexes}
                locked={state.phase === "checked"}
                onReturn={toggle}
                speakerNames={speakerNames}
              />
            ) : (
              <>
                {/* 상대의 말 — 왼쪽 말풍선(듣기 조립은 그 자리에 듣기 3열). */}
                <SentenceOrderPartnerSlot question={question} listen={listen} />

                {/* 내 말 — 오른쪽 말풍선. 채우는 동안은 빈 표시(`----`)이고 낭독하지 않습니다.
                    채점하면 만든 문장이 섭니다. */}
                <view
                  className="sentence-order-screen-reply"
                  data-testid="sentence-order-screen-reply"
                  accessibility-elements-hidden={state.phase !== "checked"}
                >
                  <text className="sentence-order-screen-reply-text">
                    {state.phase === "checked"
                      ? composedSentence(question, state.placedChipIndexes)
                      : emptyReplyMark}
                  </text>
                </view>

                {/* 답 칸 줄 — 놓인 조각이 순서대로 섭니다. 누르면 창고로 돌아갑니다. 위아래
                    가는 선이 줄의 자리를 보입니다. */}
                <view
                  className="sentence-order-screen-sentence"
                  data-testid="sentence-order-screen-sentence"
                >
                  {state.placedChipIndexes.map((chipIndex, position) => (
                    <SentenceOrderChip
                      key={chipIndex}
                      index={chipIndex}
                      text={question.chips[chipIndex] ?? ""}
                      placedOrdinal={position + 1}
                      disabled={state.phase === "checked"}
                      onTap={toggle}
                    />
                  ))}
                </view>
              </>
            )}
          </view>
        }
      />
      {guide.visible ? <LearningItemGuide kind={guide.kind} onDismiss={guide.dismiss} /> : null}
    </>
  );
}
