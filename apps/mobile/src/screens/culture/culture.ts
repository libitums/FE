// 문화 학습 화면의 순수 로직 + 고정 데이터 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// LIB-238 (logic): 계약(spec §2.3~§2.5)이 고정한 동작과 값을 채운다. DOM·컴포넌트·
// 저장소를 만지지 않는다 (순수 함수뿐).
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈이다 (listening.ts · journey-map.ts · assessment.ts와 같은 형태).

import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입 (계약 §2.2)
// 옵셔널 필드가 없다. `imageSource?` 같은 필드를 만들지 않는다 — `x?`면 「아직 없는
// 서사」가 타입에 생긴다. 이미지는 보류다.

export type CultureNarrative = {
  /** 서사의 제목. 화면 제목(`N단계 · 문화`)과 다른 것이고, 서사 데이터가 진다. */
  readonly title: string;
  /** 서사 본문. 배열 순서가 곧 읽는 순서다. 빈 배열이 아니다(§3.1 표의 불변식). */
  readonly paragraphs: readonly string[];
};

// --------------------------------------------- 스텝의 문화 서사 (계약 §2.4·§2.5)
//
// journey-map.ts의 「스텝의 학습형」 표 주석(learningFormByStep 위)이 쓴 것과 같은
// 결로 이 표도 셋을 적는다.
//
// **무엇이 임시인가** — 아래 다섯 값의 `title`과 `paragraphs`뿐이다. 왼쪽 키
// (JourneyStepId 다섯)와 오른쪽 타입(CultureNarrative)은 임시가 아니다.
//
// **무엇이 막고 있나** — 진짜 서사는 페르소나 기획(LIB-231~LIB-235)에서 온다. 그
// 기획이 아직 나오지 않아 여기서는 자리표(placeholder) 문장을 대신 채운다.
//
// **값이 오는 날 무엇만 바뀌나** — 이 표의 오른쪽 다섯 값뿐이다. 형태도 export
// 목록도 화면도 안 바뀐다.
//
// **이 표가 배정 근거가 아니다** (계약 §2.5) — 다섯 키 전부에 서사가 있는 것은
// 표의 타입이 `Record<JourneyStepId, …>`이고 `CultureNarrative`에 빈 값이 없기
// 때문이지, 다섯 스텝이 전부 문화라는 뜻이 아니다. 문항 표 셋(listening ·
// sentence-order · word-choice)이 쓴 「빈 배열 + 사유 주석」을 이 자리는 쓸 수 없다.
const cultureNarrativeByStep: Record<JourneyStepId, CultureNarrative> = {
  greeting: {
    title: "고개를 숙이는 인사",
    paragraphs: [
      "처음 만난 사람에게는 고개를 가볍게 숙여 인사한다. 껴안거나 손을 흔드는 인사는 아주 가까운 사이에서만 쓴다.",
      "「안녕하세요」는 아침과 낮과 밤을 가리지 않고 쓴다. 시간대마다 인사말이 갈리는 언어와 다른 자리다.",
    ],
  },
  introduction: {
    title: "이름을 묻는 순서",
    paragraphs: [
      "이름을 묻기 전에 자기를 먼저 밝히는 것이 자연스럽다. 「저는 ○○입니다」 뒤에 상대의 이름을 묻는다.",
      "처음 만난 사이에서는 「○○ 씨」처럼 호칭을 붙인다. 호칭을 빼면 가깝다는 뜻이 아니라 무례하다는 뜻이 된다.",
    ],
  },
  ordering: {
    title: "카페에서 부르는 말",
    paragraphs: [
      "점원을 부를 때는 「저기요」라고 한다. 손가락으로 가리키거나 손뼉을 치는 것은 무례하게 보인다.",
      "주문은 「○○ 주세요」로 끝난다. 「주세요」가 이미 정중한 말이라 더 붙이지 않아도 된다.",
    ],
  },
  appointment: {
    title: "약속을 정하는 말",
    paragraphs: [
      "약속 시간은 「언제가 괜찮으세요」처럼 상대의 사정을 먼저 물어 정한다. 시간을 먼저 못박으면 재촉으로 읽힌다.",
      "늦을 것 같으면 도착해서 사과하지 말고 미리 알린다. 늦는다는 연락 자체가 예의로 여겨진다.",
    ],
  },
  directions: {
    title: "길을 묻고 답하는 법",
    paragraphs: [
      "모르는 사람에게 길을 물을 때는 「실례합니다」로 말을 연다. 바로 질문부터 하면 무례하게 들린다.",
      "길을 알려 줄 때는 방향보다 건물이나 가게 이름을 먼저 댄다. 「편의점에서 오른쪽」처럼 눈에 보이는 것을 기준으로 말한다.",
    ],
  },
};

// ---------------------------------------------------------------- 순수 함수 (계약 §2.3)

// 구분자는 가운뎃점 양옆 공백이다 — 듣기·평가·문장 순서·단어 선택과 같다.
export function cultureScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 문화`;
}

// 던지지 않는 총함수다 — `Record`가 다섯 키를 전부 덮는 것을 tsc가 지므로 방어
// 분기도 `undefined` 반환도 없다.
export function cultureNarrativeForStep(id: JourneyStepId): CultureNarrative {
  return cultureNarrativeByStep[id];
}
