// 에피소드 서사(서사 표지의 `Next` 뒤에 서는 비주얼 노벨)의 대본과 순수 계산입니다.
// 화면은 이 결과를 그리기만 합니다.
//
// **대본은 임시입니다.** 에피소드마다의 대본이 아직 없어, 디자인(Figma 79-6304)의 장면 —
// 뷰티 스토어 · 직원 이유나 — 에 맞춘 세 장면을 모든 에피소드가 함께 씁니다. 대본이 오면
// `episodeNarrativeFor`만 에피소드별로 갈라집니다.

export type EpisodeNarrativeBeat = {
  readonly speakerName: string;
  /** 독백은 기존 다이알로그의 narration 변형을 쓰며 화자와 아바타를 숨깁니다. */
  readonly variant?: "speech" | "narration";
  /** 장면별 배경입니다. 생략하면 기존 스토어 배경을 씁니다. */
  readonly background?: string;
  /** 이 장면에 들어올 때 재생하고 장면을 떠날 때 멈추는 번들 음원입니다. */
  readonly audioSource?: string;
  /** 번들 음원의 대사 시작과 길이에 맞춘 출력 시간입니다(ms). */
  readonly revealTiming?: { readonly delayMs: number; readonly durationMs: number };
  /** 학습 대사입니다(한국어). */
  readonly line: string;
  /** 대사의 번역입니다(영어). */
  readonly translation: string;
};

export type EpisodeNarrative = {
  readonly beats: readonly [EpisodeNarrativeBeat, ...EpisodeNarrativeBeat[]];
  /** 인물 없는 1인칭 장면은 null, 기존 대본은 생략해 기본 인물을 유지합니다. */
  readonly character?: string | null;
};

const placeholderNarrative: EpisodeNarrative = {
  beats: [
    {
      speakerName: "Yuna",
      line: "어서 오세요! 찾으시는 거 있으세요?",
      translation: "Welcome! Are you looking for anything?",
    },
    {
      speakerName: "Yuna",
      line: "처음 오셨죠? 제가 매장을 안내해 드릴게요.",
      translation: "Is this your first visit? Let me show you around.",
    },
    {
      speakerName: "Yuna",
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
