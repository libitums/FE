import { useRef, useState } from "@lynx-js/react";
import type { AnswerResult } from "../lib/answer-result";
import { EpisodeFinalScreen } from "../screens/episode-final/EpisodeFinalScreen";
import type { EpisodeFinalScreenProps } from "../screens/episode-final/episode-final.contract";
import { EpisodeNarrativeScreen } from "../screens/episode-narrative/EpisodeNarrativeScreen";
import { passesEpisodeFinalStory } from "../screens/episode-final/episode-final-story";

type Stage = "introduction" | "test" | "retry" | "ending";

/** 마지막 이야기를 다 읽은 뒤에만 App의 결과/완료 경계로 넘깁니다. */
export function EpisodeFinalJourneyScreen(props: EpisodeFinalScreenProps) {
  const { test, insets, onExit, onFinish } = props;
  const story = test.story;
  const [stage, setStage] = useState<Stage>("introduction");
  const [results, setResults] = useState<readonly AnswerResult[]>([]);
  const completed = useRef(false);
  const transition = useRef<Stage | null>(null);

  if (!story) return <EpisodeFinalScreen {...props} />;

  const finishTest = (answers: readonly AnswerResult[]) => {
    "background only";
    if (transition.current === "test") return;
    transition.current = "test";
    setResults(answers);
    setStage(passesEpisodeFinalStory(test, answers) ? "ending" : "retry");
  };
  const finishNarrative = () => {
    "background only";
    if (completed.current || transition.current === stage) return;
    transition.current = stage;
    if (stage === "ending") {
      completed.current = true;
      onFinish(results);
    } else {
      setStage("test");
    }
  };

  if (stage === "test") {
    return <EpisodeFinalScreen {...props} episodeLabel={story.title} onFinish={finishTest} />;
  }
  return (
    <EpisodeNarrativeScreen
      key={stage}
      insets={insets}
      label={story.title}
      narrative={story[stage]}
      onFinish={finishNarrative}
      onExit={onExit}
    />
  );
}
