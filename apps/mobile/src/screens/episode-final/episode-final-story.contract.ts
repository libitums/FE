import type { EpisodeNarrative } from "../episode-narrative/episode-narrative";

/** 시험 앞뒤의 서사와 통과 기준. 실패 대본은 재도전을 안내합니다. */
export type EpisodeFinalStory = {
  readonly title: string;
  readonly introduction: EpisodeNarrative;
  readonly ending: EpisodeNarrative;
  readonly retry: EpisodeNarrative;
  readonly minimumCorrect: number;
  readonly background: string;
};
