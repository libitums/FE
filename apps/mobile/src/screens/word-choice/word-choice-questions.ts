// 낱말 고르기의 문항 타입과 스텝별 고정 데이터를 소유합니다(ADR-0006 D4 — 순수
// 로직은 unit 계층 대상입니다). UI를 import하지 않습니다.
//
// 듣기(`listening-questions.ts`)와 같은 자리에 같은 꼴로 섭니다 — 파일을 가른 것은
// `word-choice.ts`가 300줄 한도에 닿았기 때문이고, 그 한도가 아니었어도 데이터와
// 세션 로직은 갈리는 이유가 다릅니다(내용이 바뀌는 자리와 규칙이 바뀌는 자리).

import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입

export type WordChoiceQuestion = {
  /** 문항 제시문입니다. 빈칸 문장이면 그 빈칸이 이 문자열 안에 있습니다 — 요소로 쪼개지 않습니다. */
  readonly prompt: string;
  readonly choices: readonly [string, string, string, string];
  readonly answerIndex: 0 | 1 | 2 | 3;
};

// ---------------------------------------------------------------- 고정 데이터
//
// **문항을 가진 스텝은 `introduction` 하나입니다.** 다섯 전부 채우지 않는 것은 교차
// 불변식 때문입니다(`journey-map.unit.test.ts`): 스텝의 활동 목록과 문항이 있는
// 표가 서로를 정확히 가리켜야 하고, 그 짝을 어기는 순간 「문항 0개짜리 활동을
// 여는 스텝」이 생깁니다. 그래서 문항을 채우는 일은 **배정을 함께 옮기는 일**이고,
// 여기서 옮긴 것은 `introduction` 하나입니다(`journey-map-learning-form.ts`가 그 스텝을
// `["listening", "word-choice"]`로 잇습니다).
//
// **왜 `introduction`인가.** `ordering`은 통합 테스트가 「학습 한 판」을 세우는 기준
// 픽스처입니다 — 스텝 하나 = 활동 하나로 도는 그 경로를 열댓 개 테스트가 딛고 섭니다.
// 거기에 둘째 활동을 얹으면 그 픽스처가 말하던 것이 통째로 갈립니다. `introduction`은
// 두 번째 스텝이라 기기에서도 한 판만 마치면 닿고, 문항 표가 비어 있었습니다.
//
// 나머지 넷이 빈 배열인 것은 자리를 비워 둔 것입니다 — 그 스텝들이 낱말 고르기를
// 돌 것인지가 아직 컨텐츠 판단이고, 지어내면 그 보류를 조용히 덮습니다.
//
// 세 문항의 정답 인덱스가 서로 다릅니다 — 순서를 외워서 맞히는 길을 데이터가
// 열어 주지 않습니다. 듣기와 같은 규약입니다.
//
// ⚠ **언어 담당의 검수를 받지 않았습니다.** 손으로 적은 초급 어휘이고, 실물
// 커리큘럼이 오면 통째로 갈립니다. 화면·계약·테스트는 이 값에 기대지 않습니다
// (테스트는 자기 픽스처를 씁니다) — 이 표가 지는 것은 「기기에서 화면이 실제로
// 돌아간다」 하나입니다.
//
// **보기는 낱말입니다.** 고르는 것이 문장이 아니라 낱말이라는 것이 이 학습형의
// 정체이고, 디자인의 칩(60×60 하한, 낱말만큼 늘어남)이 그 위에 섭니다. 여기에 긴 구를
// 넣어도 줄이 바뀌지는 않지만(넷이 한 줄에 서고 폭을 나눠 갖습니다) 칩이 바닥까지
// 줄어 낱말이 칩 안에서 접힙니다 — 그 모양은 「낱말 고르기」로 읽히지 않습니다.
export const wordChoiceQuestionsByStep: Record<JourneyStepId, readonly WordChoiceQuestion[]> = {
  "tutorial-listening": [],
  "tutorial-speaking": [],
  "tutorial-writing": [],
  greeting: [],
  introduction: [
    {
      prompt: "저는 한국에서 공부하는 ___이에요.",
      choices: ["학생", "우산", "시장", "지갑"],
      answerIndex: 0,
    },
    {
      prompt: "제 ___은 김민수예요.",
      choices: ["나이", "이름", "직업", "취미"],
      answerIndex: 1,
    },
    {
      prompt: "저는 서울에 ___.",
      choices: ["먹어요", "읽어요", "살아요", "만나요"],
      answerIndex: 2,
    },
  ],
  ordering: [],
  appointment: [],
  directions: [],
};

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는 총함수입니다.
export function wordChoiceQuestionsForStep(id: JourneyStepId): readonly WordChoiceQuestion[] {
  return wordChoiceQuestionsByStep[id];
}
