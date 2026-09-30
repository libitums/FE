// 문화 학습 화면의 순수 로직과 고정 데이터를 소유합니다(ADR-0006 D4 — 순수
// 로직은 unit 계층 대상입니다). 화면 폴더에 있지만 화면 컴포넌트를 참조하지
// 않는 순수 모듈입니다(listening.ts · journey-map.ts · assessment.ts와 같은
// 형태) — UI를 import하지 않습니다.

import type { UiCopy } from "../../lib/ui-copy.contract";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입
// 옵셔널 필드가 없습니다. `imageSource?` 같은 필드를 만들지 않습니다 — `x?`면
// 「아직 없는 서사」가 타입에 생깁니다. 이미지는 보류입니다.

export type CultureNarrative = {
  /** 서사의 제목입니다. 화면 제목(`N단계 · 문화`)과 다른 것이고, 서사 데이터가 집니다. */
  readonly title: string;
  /** 서사 본문입니다. 배열 순서가 곧 읽는 순서입니다. 빈 배열이 아닙니다. */
  readonly paragraphs: readonly string[];
};

// --------------------------------------------- 스텝의 문화 서사
//
// journey-map.ts의 「스텝의 학습형」 표 주석(learningFormByStep 위)이 쓴 것과 같은
// 결로 이 표도 셋을 적습니다.
//
// **무엇이 임시인가** — 아래 다섯 값의 `title`과 `paragraphs`뿐입니다. 왼쪽 키
// (JourneyStepId 다섯)와 오른쪽 타입(CultureNarrative)은 임시가 아닙니다.
//
// **무엇이 막고 있나** — 진짜 서사는 아직 나오지 않은 페르소나 기획에서 옵니다.
// 그 기획이 아직 나오지 않아 여기서는 자리표(placeholder) 문장을 대신 채웁니다.
//
// **값이 오는 날 무엇만 바뀌나** — 이 표의 오른쪽 다섯 값뿐입니다. 형태도 export
// 목록도 화면도 안 바뀝니다.
//
// **이 표가 배정 근거가 아닙니다** — 다섯 키 전부에 서사가 있는 것은 표의 타입이
// `Record<JourneyStepId, …>`이고 `CultureNarrative`에 빈 값이 없기 때문이지,
// 다섯 스텝이 전부 문화라는 뜻이 아닙니다. 문항 표 셋(listening · sentence-order ·
// word-choice)이 쓴 「빈 배열 + 사유 주석」을 이 자리는 쓸 수 없습니다.
const cultureNarrativeByStep: Record<JourneyStepId, CultureNarrative> = {
  "tutorial-listening": {
    title: "Hearing a greeting",
    paragraphs: ["One greeting can start a conversation."],
  },
  "tutorial-speaking": {
    title: "Trying a greeting",
    paragraphs: ["Take your time when greeting someone for the first time."],
  },
  "tutorial-writing": {
    title: "Writing one letter",
    paragraphs: ["Korean letters form syllable blocks. Start with one block."],
  },
  greeting: {
    title: "Bowing when you greet",
    paragraphs: [
      "When you meet someone for the first time, greet them with a slight bow. Hugging or waving is only for very close relationships.",
      "「안녕하세요」 works in the morning, afternoon, and evening. Unlike languages with a different greeting for each time of day, one phrase covers them all.",
    ],
  },
  introduction: {
    title: "The order for asking names",
    paragraphs: [
      "It's natural to introduce yourself before asking someone's name. Say 「저는 ○○입니다」 first, then ask for theirs.",
      "When you've just met, add a title such as 「○○ 씨」. Leaving it off doesn't sound friendly — it sounds rude.",
    ],
  },
  ordering: {
    title: "Getting attention at a café",
    paragraphs: [
      "To call a staff member, say 「저기요」. Pointing or clapping looks rude.",
      "An order ends with 「○○ 주세요」. 「주세요」 is already polite, so you don't need to add anything.",
    ],
  },
  appointment: {
    title: "Making plans politely",
    paragraphs: [
      "Set a time by first asking what works for the other person, as in 「언제가 괜찮으세요」. Naming a time first can sound pushy.",
      "If you're going to be late, let them know ahead of time instead of apologizing when you arrive. Letting them know is itself seen as polite.",
    ],
  },
  directions: {
    title: "Asking for and giving directions",
    paragraphs: [
      "Start with 「실례합니다」 when asking a stranger for directions. Jumping straight to the question sounds rude.",
      "When giving directions, name a building or shop before the direction. Use landmarks you can see, as in 「편의점에서 오른쪽」.",
    ],
  },
};

// ---------------------------------------------------------------- 순수 함수

// 구분자는 가운뎃점 양옆 공백입니다 — 듣기·평가·문장 순서·단어 선택과 같습니다.
export function cultureScreenTitle(ordinal: number, copy: UiCopy): string {
  return copy.common.stepTitle(ordinal, copy.culture.activity);
}

// 던지지 않는 총함수입니다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로
// 방어 분기도 `undefined` 반환도 없습니다.
export function cultureNarrativeForStep(id: JourneyStepId): CultureNarrative {
  return cultureNarrativeByStep[id];
}
