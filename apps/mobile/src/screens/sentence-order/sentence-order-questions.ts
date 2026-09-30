import type { JourneyStepId } from "../journey-map/journey-map";

export type SentenceOrderQuestion = {
  /**
   * 상대의 말입니다 — 대화 카드의 왼쪽 말풍선에 섭니다. 학습자는 그 말에 답하는 문장을
   * 만듭니다(Figma 65-14 「Complete the conversation」). 빈칸 표기 규약을 두지 않습니다.
   */
  readonly prompt: string;
  /** 처음 보는 표현의 뜻·발음과 조작 안내입니다. 없는 문항은 기존 방식으로 표시합니다. */
  readonly support?: {
    readonly translation: string;
    readonly romanization: string;
    readonly instruction: string;
  };
  /**
   * 화면에 제시되는 조각입니다. 이 배열의 순서가 곧 창고의 제시 순서이고 정답 순서가
   * 아닙니다. ⟨2026-09-28⟩ **정답에 쓰이지 않는 조각(오답 낱말)이 섞일 수 있습니다** —
   * 정답에 없는 인덱스가 그것입니다.
   */
  readonly chips: readonly string[];
  /**
   * 정답 = chips의 인덱스를 정답 순서대로 나열한 것입니다. 문자열이 아니라 인덱스입니다.
   * chips의 부분집합이고, 이 길이가 곧 「놓을 칸 수」입니다.
   */
  readonly answerOrder: readonly number[];
};

// 첫 인사는 한글을 모르는 사용자도 뜻과 발음 표기를 보며 한 번 답하는 안내 활동입니다.
// 오답·조합·작별 구분은 요구하지 않고 안녕하세요 한 표현만 사용합니다.
// 튜토리얼은 한 유닛에 한 표현이며, 뒤로 갈수록 조합 순서의 직접 안내를 줄입니다.
export const sentenceOrderQuestionsByStep: Record<JourneyStepId, readonly SentenceOrderQuestion[]> =
  {
    greeting: [
      {
        prompt: "안녕하세요",
        support: {
          translation: "Hello",
          romanization: "annyeonghaseyo",
          instruction: "Tap the greeting below to say hello back.",
        },
        chips: ["안녕하세요"],
        answerOrder: [0],
      },
    ],
    introduction: [
      {
        prompt: "이름이 뭐예요?",
        support: {
          translation: "What's your name?",
          romanization: "ireumi mwoyeyo?",
          instruction: "Tap the whole phrase below to ask someone's name.",
        },
        chips: ["이름이 뭐예요?"],
        answerOrder: [0],
      },
    ],
    ordering: [
      {
        prompt: "물 주세요",
        support: {
          translation: "Water, please.",
          romanization: "mul juseyo",
          instruction: "Tap 물 (water), then 주세요 (please).",
        },
        chips: ["주세요", "물"],
        answerOrder: [1, 0],
      },
    ],
    appointment: [
      {
        prompt: "내일 만나요",
        support: {
          translation: "See you tomorrow.",
          romanization: "naeil mannayo",
          instruction: "Build “See you tomorrow” using the phrase above.",
        },
        chips: ["만나요", "내일"],
        answerOrder: [1, 0],
      },
    ],
    directions: [
      {
        prompt: "역이 어디예요?",
        support: {
          translation: "Where is the station?",
          romanization: "yeogi eodiyeyo?",
          instruction: "Ask “Where is the station?” using the two pieces.",
        },
        chips: ["어디예요?", "역이"],
        answerOrder: [1, 0],
      },
    ],
  };
