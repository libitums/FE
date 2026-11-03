// 카탈로그 레슨 활동 하나를 그 학습형의 화면으로 옮깁니다. `render-catalog.tsx`가 커서 떼어 둔 것입니다.
// 소리가 있는 일곱 학습형은 활동마다 한 번 지은 `LessonAudio`(속도 · 자동 재생 · 보고)를 받습니다.

import type { ReactNode } from "@lynx-js/react";

import type { ConversationCast } from "../lib/conversation-cast";
import type { ItemAnswerReport } from "../lib/item-answer";
import type { ActivityFinish, LessonPosition } from "../screens/learning/activity-finish";
import { CultureCardActivity } from "../screens/culture-card/CultureCardActivity";
import { ListeningActivity } from "../screens/listening/ListeningScreen";
import { PairMatchActivity } from "../screens/pair-match/PairMatchActivity";
import { ReadAloudActivity } from "../screens/read-aloud/ReadAloudActivity";
import { SentenceOrderActivity } from "../screens/sentence-order/SentenceOrderScreen";
import { SpeakWordActivity } from "../screens/speak-word/SpeakWordActivity";
import { SyllableBuildActivity } from "../screens/syllable-build/SyllableBuildActivity";
import { TypingActivity } from "../screens/typing/TypingActivity";
import { VocabCardActivity } from "../screens/vocab-card/VocabCardActivity";
import { WordChoiceActivity } from "../screens/word-choice/WordChoiceScreen";
import { catalogLessonAudioOf } from "./catalog-lesson-audio";
import type { CatalogActivity, CatalogItemRef } from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

type LessonScreen = Extract<Screen, { name: "catalog-lesson" }>;

// 활동 하나를 그 학습형의 화면으로 그립니다. 망라 `switch`가 새 학습형을 컴파일 타임에 강제합니다.
// `cast`(상대 · 학습자의 이름 · 그림)는 대화 조립 아바타와 문화 확인 장면이 씁니다. `itemRefs`는 이 활동의 문항 순서대로
// 콘텐츠 문항 참조라, 채점 문항이 처음 판정될 때 올라온 보고를 문항 이벤트로 잇습니다. 다시 풀기 화면(`screen.review`)은
// 결과를 줄 넘기기로 올리고, 문항 이벤트를 내지 않도록 빈 `itemRefs`를 받습니다.
export function renderCatalogActivity(
  activity: CatalogActivity,
  lesson: LessonPosition,
  screen: LessonScreen,
  wiring: ScreenWiring,
  cast: ConversationCast,
  itemRefs: readonly CatalogItemRef[],
): ReactNode {
  const { episodeId, unitKey, activityIndex, review } = screen;
  // 다시 풀기 화면은 줄을 넘길 때마다 새로 섭니다 — 같은 문항이 또 서도(또 틀림) 처음 상태로 열리게 열쇠에 순번을 넣습니다.
  const key =
    review === undefined
      ? `${episodeId}:${unitKey}:${activityIndex}`
      : `${episodeId}:${unitKey}:review:${review.outcomes.length}`;
  const onFinish: ActivityFinish = (results, skippedCount, skippedIndexes) =>
    review === undefined
      ? wiring.onFinishCatalogActivity(
          episodeId,
          unitKey,
          activityIndex,
          results,
          skippedCount,
          skippedIndexes,
        )
      : wiring.onFinishCatalogReview(episodeId, unitKey, review, results);
  const onExit = wiring.onExitCatalogSession;
  const onItemAnswered = (report: ItemAnswerReport): void => {
    const ref = itemRefs[report.questionIndex];
    if (ref !== undefined) wiring.onCatalogItemAnswered(episodeId, unitKey, ref, report);
  };
  // 소리 있는 활동이 함께 받는 값입니다 — 속도는 레슨 동안 이어지므로 활동이 바뀌어도 같은 상태를 읽습니다.
  const lessonAudio = catalogLessonAudioOf(wiring, episodeId, unitKey);
  switch (activity.form) {
    case "listening":
      return (
        <ListeningActivity
          key={key}
          questions={activity.questions}
          onExit={onExit}
          onFinish={onFinish}
          sessionOptions={wiring.sessionOptions}
          gemCount={wiring.gemCount}
          lesson={lesson}
          lessonAudio={lessonAudio}
          onItemAnswered={onItemAnswered}
        />
      );
    case "sentence-order":
      return (
        <SentenceOrderActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
          cast={cast}
          onItemAnswered={onItemAnswered}
        />
      );
    case "word-choice":
      return (
        <WordChoiceActivity
          key={key}
          questions={activity.questions}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
          cast={cast}
          onItemAnswered={onItemAnswered}
        />
      );
    case "typing":
      return (
        <TypingActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
          insets={wiring.safeAreaInsets}
        />
      );
    case "vocab-card":
      return (
        <VocabCardActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "pair-match":
      return (
        <PairMatchActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "culture-card":
      return (
        <CultureCardActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
        />
      );
    case "syllable-build":
      return (
        <SyllableBuildActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
          onItemAnswered={onItemAnswered}
        />
      );
    case "read-aloud":
      return (
        <ReadAloudActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
        />
      );
    case "speak-word":
      return (
        <SpeakWordActivity
          key={key}
          questions={activity.questions}
          gemCount={wiring.gemCount}
          onExit={onExit}
          onFinish={onFinish}
          lesson={lesson}
          lessonAudio={lessonAudio}
          onItemAnswered={onItemAnswered}
        />
      );
    default: {
      const exhaustive: never = activity;
      return exhaustive;
    }
  }
}
