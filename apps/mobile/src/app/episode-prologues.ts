// 에피소드마다의 서사 전개(형식 하나와 그 대본)를 소유합니다. 화면 폴더끼리는 값을
// 주고받을 수 없어(`code.md` 「import」), 형식별 대본을 모으는 표는 결선 자리에 둡니다.

import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";
import { episodeNarrativeFor } from "../screens/episode-narrative/episode-narrative";

// ⚠ 이음매입니다(「임시 입력값의 이음매」 — `docs/conventions/code.md`).
//
// **무엇이 임시인가** — 튜토리얼의 서사 형식(비주얼 노벨)과 그 대본입니다. 대본은
// `episodeNarrativeFor`의 임시 장면(뷰티 스토어 · 직원 이유나)입니다. `EpisodePrologue`
// 타입은 임시가 아닙니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 표의 값입니다. 에피소드가 늘면 그 에피소드의
// 서사가 형식 하나(통화 · 메신저 · 비주얼 노벨)로 여기 더해집니다. 표에 없는 에피소드는
// 표지의 `Next`가 곧장 유닛을 엽니다.
//
// 통화 · 메신저 형식을 쓰는 에피소드는 아직 없습니다. 그 화면들은 `App`의
// `episodePrologueFor`로 대본을 바꿔 끼워 봅니다.
const prologuesByEpisode: Readonly<Record<string, EpisodePrologue>> = {
  tutorial: { kind: "visual-novel", narrative: episodeNarrativeFor("tutorial") },
};

/** 그 에피소드의 서사 전개입니다. 없으면 `undefined`입니다 — 오류가 아닙니다. */
export function episodePrologueFor(episodeId: string): EpisodePrologue | undefined {
  return prologuesByEpisode[episodeId];
}
