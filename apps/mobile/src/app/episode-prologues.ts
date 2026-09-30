// 에피소드마다의 서사 전개(형식 하나와 그 대본)를 소유합니다. 화면 폴더끼리는 값을
// 주고받을 수 없어(`code.md` 「import」), 형식별 대본을 모으는 표는 결선 자리에 둡니다.

import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";
import { tutorialPrologue } from "./tutorial-prologue";

// 시작 유닛의 혼합 대본은 한 모듈에서 관리합니다. 본편 대본이 오면 이 표에 추가합니다.
const prologuesByEpisode: Readonly<Record<string, EpisodePrologue>> = {
  tutorial: tutorialPrologue,
};

/** 그 에피소드의 서사 전개입니다. 없으면 `undefined`입니다 — 오류가 아닙니다. */
export function episodePrologueFor(episodeId: string): EpisodePrologue | undefined {
  return prologuesByEpisode[episodeId];
}
