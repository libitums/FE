// 듣기 학습 화면의 문항 타입과 스텝별 고정 데이터를 소유합니다(ADR-0006 D4
// — 순수 로직은 unit 계층 대상입니다). UI를 import하지 않습니다.

import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입

export type ListeningQuestion = {
  readonly prompt: string;
  // 호스트가 해석하는 **불투명 문자열**입니다 — 번들 키인지 원격 URL인지는
  // 아직 정해지지 않았습니다. 데이터가 지는 것은 **안정적 식별자** 하나뿐이고,
  // 자산이 오면 `AudioPlaybackModule.resolve`에 **해석만** 붙습니다.
  // 옵셔널이 아닙니다 — `audioSource?`면 "아직 없는 문항"이 타입에 생깁니다.
  readonly audioSource: string;
  readonly choices: readonly [string, string, string, string];
  readonly answerIndex: 0 | 1 | 2 | 3;
};

// ---------------------------------------------------------------- 고정 데이터
// 값까지 고정돼 있습니다 — 5 스텝 × 3 문항 × 보기 4개. 한 스텝 안에서 세
// 문항의 정답 인덱스가 서로 다릅니다. 하류가 지어내지 않습니다.
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

// ---------------------------------------------------------------- 조회

// Record가 JourneyStepId 다섯을 전부 갖는 것을 tsc가 강제하므로 조회는
// 총함수입니다.
export function questionsForStep(id: JourneyStepId): readonly ListeningQuestion[] {
  return listeningQuestionsByStep[id];
}
