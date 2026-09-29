// 듣기 학습 화면의 문항 타입과 스텝별 고정 데이터를 소유합니다(ADR-0006 D4
// — 순수 로직은 unit 계층 대상입니다). UI를 import하지 않습니다.

import type { JourneyStepId } from "../journey-map/journey-map";

// ---------------------------------------------------------------- 도메인 타입

export type ListeningQuestion = {
  readonly prompt: string;
  /**
   * 제시문의 로마자 표기입니다(국어의 로마자 표기법). 제시문 아래 한 줄로 서서, 한글을
   * 아직 못 읽는 학습자가 소리를 눈으로 짚게 합니다(Figma 53-14231).
   *
   * ⚠ 이 값들은 손으로 적었고 **언어 담당의 검수를 받지 않았습니다.** 자음 동화 ·
   * 격음화가 걸리는 자리(`혹시 지하철역이` · `따뜻한` · `이 길로`)가 특히 그렇습니다.
   * 옵셔널이 아닌 것은 같은 이유입니다 — 빠진 문항이 타입에 생기면 그 자리가 조용히
   * 비어 버립니다.
   */
  readonly romanization: string;
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
      romanization: "annyeonghaseyo, cheoeum boepgetseumnida",
      audioSource: "greeting-1",
      choices: [
        "Greeting someone they're meeting for the first time",
        "Saying goodbye",
        "Saying thank you",
        "Apologizing",
      ],
      answerIndex: 0,
    },
    {
      prompt: "반갑습니다.",
      romanization: "bangapseumnida",
      audioSource: "greeting-2",
      choices: [
        "Apologizing",
        "Saying they're glad to meet you",
        "Saying goodbye to someone who is leaving",
        "Asking your name",
      ],
      answerIndex: 1,
    },
    {
      prompt: "안녕히 계세요.",
      romanization: "annyeonghi gyeseyo",
      audioSource: "greeting-3",
      choices: [
        "Greeting someone on first meeting",
        "Suggesting you go together",
        "Saying goodbye to someone who is staying",
        "Asking you to come again",
      ],
      answerIndex: 2,
    },
  ],
  introduction: [
    {
      prompt: "이름이 어떻게 되세요?",
      romanization: "ireumi eotteoke doeseyo?",
      audioSource: "introduction-1",
      choices: [
        "Asking your age",
        "Asking where you live",
        "Asking what you do",
        "Asking your name",
      ],
      answerIndex: 3,
    },
    {
      prompt: "저는 민준이라고 합니다.",
      romanization: "jeoneun minjunirago hamnida",
      audioSource: "introduction-2",
      choices: [
        "Saying their own name",
        "Calling the other person's name",
        "Saying they forgot a name",
        "Saying they'll change their name",
      ],
      answerIndex: 0,
    },
    {
      prompt: "만나서 반가워요.",
      romanization: "mannaseo bangawoyo",
      audioSource: "introduction-3",
      choices: [
        "Promising to meet again",
        "Saying it's nice to meet you",
        "Apologizing",
        "Saying they'll leave first",
      ],
      answerIndex: 1,
    },
  ],
  ordering: [
    {
      prompt: "따뜻한 아메리카노 한 잔 주세요.",
      romanization: "ttatteutan amerikano han jan juseyo",
      audioSource: "ordering-1",
      choices: [
        "Ordering two iced coffees",
        "Canceling an order",
        "Ordering one hot coffee",
        "Asking for water",
      ],
      answerIndex: 2,
    },
    {
      prompt: "주문하시겠어요? 음료는 따뜻한 것과 차가운 것 중에 무엇으로 드릴까요?",
      romanization:
        "jumunhasigesseoyo? eumnyoneun ttatteutan geotgwa chagaun geot junge mueoseuro deurilkkayo?",
      audioSource: "ordering-2",
      choices: [
        "Asking whether you want your drink hot or iced",
        "Asking how you'll pay",
        "Showing you to a seat",
        "Telling you the opening hours",
      ],
      answerIndex: 0,
    },
    {
      prompt: "카드로 결제할게요.",
      romanization: "kadeuro gyeoljehalgeyo",
      audioSource: "ordering-3",
      choices: [
        "Saying they'll pay in cash",
        "Saying they'll pay later",
        "Asking for a discount",
        "Saying they'll pay by card",
      ],
      answerIndex: 3,
    },
  ],
  appointment: [
    {
      prompt: "내일 세 시에 만날까요?",
      romanization: "naeil se sie mannalkkayo?",
      audioSource: "appointment-1",
      choices: [
        "Canceling a meeting",
        "Suggesting a time to meet",
        "Asking where you are now",
        "Telling you where to meet",
      ],
      answerIndex: 1,
    },
    {
      prompt: "그때는 좀 어려울 것 같아요.",
      romanization: "geuttaeneun jom eoryeoul geot gatayo",
      audioSource: "appointment-2",
      choices: [
        "Insisting on meeting at that time",
        "Saying they don't know the time",
        "Saying that time is hard for them",
        "Saying they forgot the plan",
      ],
      answerIndex: 2,
    },
    {
      prompt: "그럼 토요일 저녁은 어때요?",
      romanization: "geureom toyoil jeonyeogeun eottaeyo?",
      audioSource: "appointment-3",
      choices: [
        "Suggesting a different time",
        "Calling off the plan",
        "Asking about the place",
        "Saying they'll be late",
      ],
      answerIndex: 0,
    },
  ],
  directions: [
    {
      prompt: "혹시 지하철역이 어디예요?",
      romanization: "hoksi jihacheollyeogi eodiyeyo?",
      audioSource: "directions-1",
      choices: [
        "Asking the subway fare",
        "Asking for the subway schedule",
        "Asking where the subway station is",
        "Suggesting you take the subway",
      ],
      answerIndex: 2,
    },
    {
      prompt: "이 길로 쭉 가시면 됩니다.",
      romanization: "i gillo jjuk gasimyeon doemnida",
      audioSource: "directions-2",
      choices: [
        "Telling you to go straight",
        "Telling you to turn left",
        "Telling you to go back",
        "Saying they don't know the way",
      ],
      answerIndex: 0,
    },
    {
      prompt: "여기서 얼마나 걸려요?",
      romanization: "yeogiseo eolmana geollyeoyo?",
      audioSource: "directions-3",
      choices: [
        "Asking the name of the street",
        "Asking how long it takes to get there",
        "Asking the fare",
        "Suggesting you go together",
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
