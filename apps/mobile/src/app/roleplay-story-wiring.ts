// 에피소드 롤플레이 route 둘(`roleplay-story` · `roleplay-story-complete`)의 콜백입니다. 롤플레이는 연습이라
// 진행 · 티켓을 건드리지 않습니다 — 끝까지 마치면 이벤트 하나를 올리고 결과 화면으로 바꿀 뿐입니다.

import type { Dispatch } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { EpisodeIntroEventSink } from "../screens/episode-intro/episode-intro.contract";
import type { NavAction } from "./nav-state";

export type RoleplayStoryWiring = {
  readonly onExitRoleplayStory: () => void;
  readonly onFinishRoleplayStory: (
    episodeId: string,
    results: readonly AnswerResult[],
    skippedCount: number,
  ) => void;
  readonly onRetryRoleplayStory: (episodeId: string) => void;
};

export type RoleplayStoryWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
};

export function roleplayStoryWiring(args: RoleplayStoryWiringArgs): RoleplayStoryWiring {
  const { dispatch } = args;
  return {
    onExitRoleplayStory: () => dispatch({ type: "backToRoot" }),
    onFinishRoleplayStory: (episodeId, results, skippedCount) => {
      "background only";
      args.episodeIntroEventSink?.({
        name: "roleplay_story_completed",
        episodeId,
        correctCount: String(results.filter((result) => result === "correct").length),
        judgedCount: String(results.length),
        skippedCount: String(skippedCount),
      });
      dispatch({
        type: "replace",
        screen: { name: "roleplay-story-complete", episodeId, results, skippedCount },
      });
    },
    onRetryRoleplayStory: (episodeId) =>
      dispatch({ type: "replace", screen: { name: "roleplay-story", episodeId } }),
  };
}
