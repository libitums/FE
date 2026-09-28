// 에피소드의 서사 전개(통화 · 메신저)의 대본 자리입니다.

import type { EpisodePrologue } from "./episode-intro.contract";

// ⚠ 이음매입니다(「임시 입력값의 이음매」 — `docs/conventions/code.md`).
//
// **무엇이 임시인가** — 튜토리얼 서사의 형식(통화)과 그 대본(상대 이름 · 대사) 전부입니다.
// `EpisodePrologue` 타입은 임시가 아닙니다.
//
// **무엇이 막고 있나** — 서사의 대본이 아직 없습니다. 튜토리얼 이야기(카페에서 지민을
// 만나는 줄기)에 맞춰 짧게 지은 값입니다.
//
// **진짜가 오는 날 무엇만 바뀌나** — 이 표의 값입니다. 에피소드가 늘면 그 에피소드의
// 서사가 형식 하나(통화 · 메신저)로 여기 더해집니다. 서사가 없는 에피소드는 표지의
// `Next`가 곧장 유닛을 엽니다.
//
// export하지 않습니다 — 읽는 함수가 계약입니다.
const prologuesByEpisode: Readonly<Record<string, EpisodePrologue>> = {
  tutorial: {
    kind: "call",
    call: {
      callerName: "지민",
      lines: [
        { text: "여보세요?", translation: "Hello?" },
        { text: "나 지민이야. 오늘 시간 있어?", translation: "It's Jimin. Are you free today?" },
        { text: "카페에서 만나자!", translation: "Let's meet at the cafe!" },
        { text: "이따 봐!", translation: "See you later!" },
      ],
    },
  },
};

/** 그 에피소드의 서사 전개입니다. 없으면 `undefined`입니다 — 오류가 아닙니다. */
export function episodePrologueFor(episodeId: string): EpisodePrologue | undefined {
  return prologuesByEpisode[episodeId];
}
