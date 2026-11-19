// 에피소드 롤플레이 route 둘(`roleplay-story` · `roleplay-story-complete`)의 콜백입니다. 롤플레이는 연습이라
// 진행 · 티켓을 건드리지 않습니다 — 끝까지 마치면 이벤트 하나를 올리고 결과 화면으로 바꿀 뿐입니다.

import type { Dispatch } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { AppVersion } from "../lib/app-version";
import { submitRoleplayTurnLog } from "../lib/roleplay-turn-log-api";
import type { RoleplayTurnLogEntry } from "../screens/roleplay-story/roleplay-story.contract";
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
  /** 한 판의 턴 로그를 서버에 남깁니다(ADR-0161). 기다리지 않고, 실패해도 화면에 영향이 없습니다. */
  readonly onRoleplayTurnLog: (episodeId: string, log: readonly RoleplayTurnLogEntry[]) => void;
};

export type RoleplayStoryWiringArgs = {
  readonly dispatch: Dispatch<NavAction>;
  readonly episodeIntroEventSink: EpisodeIntroEventSink;
  /** 호스트가 알려 준 앱 버전 — 없으면(Explorer · 테스트) 턴 로그를 보내지 않습니다. */
  readonly appVersion?: AppVersion | null;
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
    onRoleplayTurnLog: (episodeId, log) => {
      "background only";
      void submitRoleplayTurnLog({ episodeId, log, appVersion: args.appVersion ?? null });
    },
  };
}
