// 듣기 학습 화면의 순수 로직 + 고정 데이터 (ADR-0006 D4 — 순수 로직은 unit 계층 대상).
//
// LIB-223 (logic): 계약(.agent-harness/work/lib-223/spec.md §1.3~§1.5)이 고정한
// 타입·고정 데이터·순수 함수 아홉을 구현한다. DOM·컴포넌트·저장소를 만지지 않는다.
//
// UI를 import하지 않는다 — 화면 폴더에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈이다 (계약 §1.2 「왜 순수 로직이 lib/가 아니라 화면 폴더인가」).
//
// journey-map에서 가져오는 것은 **타입 하나뿐**이다. 값(journeyStepOrdinal ·
// completeStep · initialCompletedStepCount)은 App이 읽어 props로 내린다 (계약 §8.4).

import type { AudioPlayOutcome } from "../../lib/audio";
import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입 (계약 §1.3)

export type ListeningAnswerResult = "correct" | "incorrect";

export type ListeningQuestion = {
  readonly prompt: string;
  // 호스트가 해석하는 **불투명 문자열**이다 — 번들 키인지 원격 URL인지 계약이 정하지
  // 않았다 (보류 표 「오디오 자산의 출처·형식」). 데이터가 지는 것은 **안정적 식별자**
  // 하나뿐이고, 자산이 오면 `AudioPlaybackModule.resolve`에 **해석만** 붙는다
  // (계약 §9.4). 옵셔널이 아니다 — `audioSource?`면 "아직 없는 문항"이 타입에 생긴다.
  readonly audioSource: string;
  readonly choices: readonly [string, string, string, string];
  readonly answerIndex: 0 | 1 | 2 | 3;
};

// 세션 상태 (계약 §1.3(c)). 완료도 판정 결과도 응답 여부도 상태에 적지 않는다 —
// 전부 파생이다 (isSessionComplete · choiceResultAt · hasAnswered).
export type ListeningSessionState = {
  readonly questionIndex: number;
  readonly selectedChoiceIndex: number | null;
};

export type ListeningSessionAction =
  | { readonly type: "selectChoice"; readonly choiceIndex: number }
  | { readonly type: "nextQuestion" };

export const initialListeningSessionState: ListeningSessionState = {
  questionIndex: 0,
  selectedChoiceIndex: null,
};

// ---------------------------------------------------------------- 고정 데이터 (계약 §1.4)
// 계약이 값까지 고정했다 — 5 스텝 × 3 문항 × 보기 4개. 한 스텝 안에서 세 문항의
// 정답 인덱스가 서로 다르다(계약 §1.4의 불변식). 하류가 지어내지 않는다.
export const listeningQuestionsByStep: Record<JourneyStepId, readonly ListeningQuestion[]> = {
  greeting: [
    {
      prompt: "안녕하세요, 처음 뵙겠습니다.",
      audioSource: "greeting-1",
      choices: [
        "처음 만난 사람에게 인사하고 있다",
        "헤어지면서 인사하고 있다",
        "고맙다고 말하고 있다",
        "미안하다고 말하고 있다",
      ],
      answerIndex: 0,
    },
    {
      prompt: "반갑습니다.",
      audioSource: "greeting-2",
      choices: [
        "미안하다고 말하고 있다",
        "만나서 기쁘다고 말하고 있다",
        "잘 가라고 말하고 있다",
        "이름을 묻고 있다",
      ],
      answerIndex: 1,
    },
    {
      prompt: "안녕히 계세요.",
      audioSource: "greeting-3",
      choices: [
        "처음 만나서 인사하고 있다",
        "같이 가자고 말하고 있다",
        "남는 사람에게 작별 인사를 하고 있다",
        "다시 오라고 말하고 있다",
      ],
      answerIndex: 2,
    },
  ],
  introduction: [
    {
      prompt: "이름이 어떻게 되세요?",
      audioSource: "introduction-1",
      choices: ["나이를 묻고 있다", "사는 곳을 묻고 있다", "직업을 묻고 있다", "이름을 묻고 있다"],
      answerIndex: 3,
    },
    {
      prompt: "저는 민준이라고 합니다.",
      audioSource: "introduction-2",
      choices: [
        "자기 이름을 말하고 있다",
        "상대의 이름을 부르고 있다",
        "이름을 잊었다고 말하고 있다",
        "이름을 바꾸겠다고 말하고 있다",
      ],
      answerIndex: 0,
    },
    {
      prompt: "만나서 반가워요.",
      audioSource: "introduction-3",
      choices: [
        "다시 만나자고 약속하고 있다",
        "처음 만나서 반갑다고 말하고 있다",
        "사과하고 있다",
        "먼저 가겠다고 말하고 있다",
      ],
      answerIndex: 1,
    },
  ],
  ordering: [
    {
      prompt: "따뜻한 아메리카노 한 잔 주세요.",
      audioSource: "ordering-1",
      choices: [
        "차가운 커피를 두 잔 주문하고 있다",
        "주문을 취소하고 있다",
        "따뜻한 커피를 한 잔 주문하고 있다",
        "물을 달라고 하고 있다",
      ],
      answerIndex: 2,
    },
    {
      prompt: "주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?",
      audioSource: "ordering-2",
      choices: [
        "음료 온도를 묻고 있다",
        "계산 방법을 묻고 있다",
        "자리를 안내하고 있다",
        "영업 시간을 알리고 있다",
      ],
      answerIndex: 0,
    },
    {
      prompt: "카드로 결제할게요.",
      audioSource: "ordering-3",
      choices: [
        "현금으로 내겠다고 말하고 있다",
        "값을 나중에 내겠다고 말하고 있다",
        "할인을 요구하고 있다",
        "카드로 값을 치르겠다고 말하고 있다",
      ],
      answerIndex: 3,
    },
  ],
  appointment: [
    {
      prompt: "내일 세 시에 만날까요?",
      audioSource: "appointment-1",
      choices: [
        "만남을 취소하고 있다",
        "만날 시간을 제안하고 있다",
        "지금 어디냐고 묻고 있다",
        "약속 장소를 알리고 있다",
      ],
      answerIndex: 1,
    },
    {
      prompt: "그때는 좀 어려울 것 같아요.",
      audioSource: "appointment-2",
      choices: [
        "그 시간에 꼭 만나자고 말하고 있다",
        "시간을 모르겠다고 말하고 있다",
        "그 시간에는 만나기 힘들다고 말하고 있다",
        "약속을 잊었다고 말하고 있다",
      ],
      answerIndex: 2,
    },
    {
      prompt: "그럼 토요일 저녁은 어때요?",
      audioSource: "appointment-3",
      choices: [
        "다른 시간을 다시 제안하고 있다",
        "약속을 없던 일로 하자고 말하고 있다",
        "장소를 묻고 있다",
        "늦겠다고 알리고 있다",
      ],
      answerIndex: 0,
    },
  ],
  directions: [
    {
      prompt: "혹시 지하철역이 어디예요?",
      audioSource: "directions-1",
      choices: [
        "지하철 요금을 묻고 있다",
        "지하철 시간표를 묻고 있다",
        "지하철역의 위치를 묻고 있다",
        "지하철을 타자고 말하고 있다",
      ],
      answerIndex: 2,
    },
    {
      prompt: "이 길로 쭉 가시면 됩니다.",
      audioSource: "directions-2",
      choices: [
        "곧장 가라고 알려 주고 있다",
        "왼쪽으로 돌라고 알려 주고 있다",
        "돌아가라고 알려 주고 있다",
        "길을 모른다고 말하고 있다",
      ],
      answerIndex: 0,
    },
    {
      prompt: "여기서 얼마나 걸려요?",
      audioSource: "directions-3",
      choices: [
        "거리의 이름을 묻고 있다",
        "가는 데 걸리는 시간을 묻고 있다",
        "요금을 묻고 있다",
        "같이 가자고 말하고 있다",
      ],
      answerIndex: 1,
    },
  ],
};

// ---------------------------------------------------------------- 순수 함수 (계약 §1.5(b))
// 아홉 전부 부수효과가 없다. 방어 분기를 두지 않는다 — Record가 다섯 스텝을 전부
// 갖는 것은 tsc가 지고, 범위 밖 입력에도 아래 식이 그대로 적용된다.

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는 총함수다
// (계약 §1.5(b) 「던지지 않는다」).
export function questionsForStep(id: JourneyStepId): readonly ListeningQuestion[] {
  return listeningQuestionsByStep[id];
}

// 계약 §1.5(b) 표: `${ordinal}단계 · 듣기` — 구분자는 가운뎃점 양옆 공백이다.
export function listeningScreenTitle(ordinal: number): string {
  return `${ordinal}단계 · 듣기`;
}

// 계약 §1.5(b) 표: `문항 ${index + 1} / ${total}` — index는 0-based다.
export function questionProgressLabel(index: number, total: number): string {
  return `문항 ${index + 1} / ${total}`;
}

// 계약 §1.5(b) 표 그대로. 일치 비교라 answerIndex가 0인 문항에서도 0번 보기가
// correct로 나온다 — 0을 거짓으로 다루는 자리를 만들지 않는다.
export function judgeAnswer(
  question: ListeningQuestion,
  choiceIndex: number,
): ListeningAnswerResult {
  return choiceIndex === question.answerIndex ? "correct" : "incorrect";
}

// 판정을 지는 보기는 **고른 하나뿐**이다 — 고르지 않은 보기는 정답이어도 null이다
// (계약 §1.1 「정답을 알려 주지 않는다」).
//
// 미응답(selectedChoiceIndex === null)은 어떤 choiceIndex와도 같지 않으므로 아래
// 한 줄에 함께 들어간다. 0번 보기를 골랐을 때도 0 === 0이라 판정이 나온다 —
// truthy 검사를 쓰면 0번 보기가 조용히 미응답으로 읽힌다.
export function choiceResultAt(
  state: ListeningSessionState,
  question: ListeningQuestion,
  choiceIndex: number,
): ListeningAnswerResult | null {
  if (state.selectedChoiceIndex !== choiceIndex) {
    return null;
  }
  return judgeAnswer(question, choiceIndex);
}

// 접미사 표 (계약 §1.5(b)). export하지 않는 모듈 내부 상수 — journey-map.ts의
// stepStatusSuffix와 같은 형태이고, 구분자는 쉼표 + 공백이다 (ADR-0016 D3).
// 판정이 **없는** 경우는 이 표에 없다: 접미사를 붙이지 않는 것이 계약이라
// null 칸을 만들면 빈 문자열을 이어 붙이는 자리가 생긴다.
const choiceResultSuffix: Record<ListeningAnswerResult, string> = {
  correct: "정답",
  incorrect: "오답",
};

// 응답 전 네 보기가 전부 접미사를 달면 답을 미리 알려 주는 것이 된다 (계약 §1.5(b)).
export function choiceAccessibilityLabel(
  text: string,
  result: ListeningAnswerResult | null,
): string {
  if (result === null) {
    return text;
  }
  return `${text}, ${choiceResultSuffix[result]}`;
}

// 응답 여부는 파생이다 (계약 §1.3(c)). null 비교라 0번 보기도 응답으로 센다.
export function hasAnswered(state: ListeningSessionState): boolean {
  return state.selectedChoiceIndex !== null;
}

// 완료도 파생이다 — 상태에 done을 적지 않는다 (계약 §1.3(c)).
export function isSessionComplete(state: ListeningSessionState, total: number): boolean {
  return state.questionIndex >= total;
}

// 계약 §1.5(b) 전이표 네 줄이 이 함수의 정본이다. 변화 없으면 같은 참조를
// 돌려준다 — navReducer · stepSheetReducer와 같은 규약.
//
// **막는 자리가 여기 하나다.** "이미 응답했는가"는 상태 안에 전부 있으므로
// 컴포넌트에 두 번째 게이트를 두지 않는다 (계약 §1.5(b)).
export function listeningSessionReducer(
  state: ListeningSessionState,
  action: ListeningSessionAction,
): ListeningSessionState {
  switch (action.type) {
    case "selectChoice": {
      if (hasAnswered(state)) {
        return state;
      }
      return { questionIndex: state.questionIndex, selectedChoiceIndex: action.choiceIndex };
    }
    case "nextQuestion": {
      if (!hasAnswered(state)) {
        return state;
      }
      return { questionIndex: state.questionIndex + 1, selectedChoiceIndex: null };
    }
  }
}

// ---------------------------------------------------------------- 재생 상태 어휘 (계약 §9.5(c))
// 이 파일이 제시 필드 하나에 더해 **재생 어휘 둘**을 진다 (계약 §9.11의 재고정 3).
// 컴포넌트 안 삼항으로 두면 `unit`이 전이를 볼 수 없다.

// **CSS 클래스가 되지 않는다.** ADR-0003 D7의 예약 상태어는 넷 그대로이고
// (selected · done · current · locked) 이 줄은 한 낱말도 더하지 않는다 —
// 갈리는 것은 아이콘 모양 · current-color · 문구 셋이다.
export type ListeningPlaybackState = "idle" | "playing";

// 계약 §9.5(c) 표: "started" → "playing" · "unavailable" → "idle".
// **모듈이 없으면 「재생 중」으로 보이지 않는다** 가 이 축에서 가장 조용히 깨지는
// 판정이고, 이 함수가 그것을 자동 계층이 볼 수 있는 자리로 끌어낸다.
export function playbackStateAfterPlay(outcome: AudioPlayOutcome): ListeningPlaybackState {
  // `switch`로 적는다 — `AudioPlayOutcome`에 셋째 결과가 생기면 `tsc`가 이 자리를
  // 가리킨다. `outcome === "started"` 삼항이면 새 결과가 조용히 `idle`로 흡수된다.
  switch (outcome) {
    case "started":
      return "playing";
    case "unavailable":
      return "idle";
  }
}
