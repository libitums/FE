// 카탈로그 레슨 활동 하나를 그 학습형의 화면으로 옮깁니다. `render-catalog.tsx`가 커서 떼어 둔 것입니다.
// 소리가 있는 일곱 학습형은 활동마다 한 번 지은 `LessonAudio`(속도 · 자동 재생 · 보고)를 받습니다.

import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { LessonPosition } from "../screens/learning/activity-finish";
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
import type { CatalogActivity } from "./catalog-lesson-plan";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

type LessonScreen = Extract<Screen, { name: "catalog-lesson" }>;

// 활동 하나를 그 학습형의 화면으로 그립니다. 망라 `switch`가 새 학습형을 컴파일 타임에 강제합니다.
// `counterpartName`은 대화 조립 아바타만 씁니다 — 학습자 이름과 함께 문장 순서 활동에 넘깁니다.
export function renderCatalogActivity(
  activity: CatalogActivity,
  lesson: LessonPosition,
  screen: LessonScreen,
  wiring: ScreenWiring,
  counterpartName: string,
): ReactNode {
  const { episodeId, unitKey, activityIndex } = screen;
  const key = `${episodeId}:${unitKey}:${activityIndex}`;
  const onFinish = (results: readonly AnswerResult[], skippedCount: number) =>
    wiring.onFinishCatalogActivity(episodeId, unitKey, activityIndex, results, skippedCount);
  const onExit = wiring.onExitCatalogSession;
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
          speakerNames={{ counterpart: counterpartName, me: wiring.learnerFill.name }}
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
        />
      );
    default: {
      const exhaustive: never = activity;
      return exhaustive;
    }
  }
}
