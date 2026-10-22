// 문장 만들기 활동 테스트가 쓰는 고정 문항 표입니다(스텝 이름 → 문항). 튜토리얼 route와 그 문항 표가 사라진 뒤에도
// 활동 테스트가 같은 모양의 입력(조각 하나짜리 문항 · 조각 셋 이상인 문항)으로 서게 합니다. 제품 코드가 import하지 않습니다.

import type { SentenceOrderQuestion } from "./sentence-order";

export type SentenceOrderStepId =
  | "greeting"
  | "introduction"
  | "ordering"
  | "appointment"
  | "directions";

export const stepQuestions: Readonly<
  Record<SentenceOrderStepId, readonly SentenceOrderQuestion[]>
> = {
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
      prompt: "물 좀 주세요",
      support: {
        translation: "Water, please.",
        romanization: "mul jom juseyo",
        instruction: "Tap 물, then 좀, then 주세요 to say ‘Water, please.’",
      },
      chips: ["주세요", "물", "좀"],
      answerOrder: [1, 2, 0],
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
