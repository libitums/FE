// 에피소드 서사(서사 표지의 `Next` 뒤에 서는 비주얼 노벨)의 대본과 순수 계산입니다.
// 화면은 이 결과를 그리기만 합니다.
//
// **대본은 임시입니다.** 에피소드마다의 대본이 아직 없어, 디자인(Figma 79-6304)의 장면 —
// 뷰티 스토어 · 직원 이유나 — 에 맞춘 세 장면을 모든 에피소드가 함께 씁니다. 대본이 오면
// `episodeNarrativeFor`만 에피소드별로 갈라집니다.

export type EpisodeNarrativeBeat = {
  readonly speakerName: string;
  /** 학습 대사입니다(한국어). */
  readonly line: string;
  /** 대사의 번역입니다(영어). */
  readonly translation: string;
};

export type EpisodeNarrative = {
  readonly beats: readonly [EpisodeNarrativeBeat, ...EpisodeNarrativeBeat[]];
};

const placeholderNarrative: EpisodeNarrative = {
  beats: [
    {
      speakerName: "이유나",
      line: "어서 오세요! 찾으시는 거 있으세요?",
      translation: "Welcome! Are you looking for anything?",
    },
    {
      speakerName: "이유나",
      line: "처음 오셨죠? 제가 매장을 안내해 드릴게요.",
      translation: "Is this your first visit? Let me show you around.",
    },
    {
      speakerName: "이유나",
      line: "필요한 게 있으면 언제든 불러 주세요.",
      translation: "Call me anytime if you need anything.",
    },
  ],
};

// `episodeId`를 받는 것은 대본이 에피소드별로 갈라질 자리이기 때문입니다. 오늘은 모두 같습니다.
export function episodeNarrativeFor(_episodeId: string): EpisodeNarrative {
  return placeholderNarrative;
}

/** 다음 장면의 번호입니다. 마지막 장면이면 `null` — 서사가 끝났습니다. */
export function nextEpisodeNarrativeBeat(
  narrative: EpisodeNarrative,
  index: number,
): number | null {
  return index + 1 < narrative.beats.length ? index + 1 : null;
}

/** 화면 아래쪽 진행 표시에 쓰는 낭독 문구입니다 — `1 / 3`. */
export function episodeNarrativeProgressLabel(narrative: EpisodeNarrative, index: number): string {
  return `${index + 1} / ${narrative.beats.length}`;
}
