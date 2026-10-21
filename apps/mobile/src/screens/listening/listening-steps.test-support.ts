// 듣기 활동 테스트가 쓰는 고정 문항 표입니다(스텝 이름 → 문항). 튜토리얼 route와 그 문항 표가 사라진 뒤에도
// 활동 테스트가 같은 모양의 입력(문항 셋 · 보기 넷 · 음성 id)으로 서게 합니다. 제품 코드가 import하지 않습니다.

import { listenAudioOf } from "../../lib/question-audio.test-support";
import type { ListenAudio } from "../../lib/question-audio";
import type { ListeningQuestion } from "./listening-questions";

export type ListeningStepId =
  | "greeting"
  | "introduction"
  | "ordering"
  | "appointment"
  | "directions"
  | "tutorial-listening"
  | "tutorial-speaking"
  | "tutorial-writing";

/** 오디오가 늘 있는 문항입니다(`audio`가 듣기 갈래로 좁혀집니다). */
export type TutorialListeningQuestion = ListeningQuestion & { readonly audio: ListenAudio };

export const listeningQuestionsByStep: Readonly<
  Record<ListeningStepId, readonly TutorialListeningQuestion[]>
> = {
  // 첫 인사는 뜻과 발음을 보며 답하는 안내 활동만 합니다. 듣기는 다음 유닛부터 시작합니다.
  "tutorial-listening": [
    {
      prompt: "안녕하세요",
      romanization: "annyeonghaseyo",
      audio: listenAudioOf("LISTEN_SELECT", "phone-call-confirm-01", "phone-call-confirm-01"),
      choices: ["Hello", "Thank you"],
      answerIndex: 0,
      instruction:
        "Minseo’s hello comes back to me. Listen, then tap its meaning. You can listen again.",
    },
  ],
  "tutorial-speaking": [],
  "tutorial-writing": [],
  greeting: [],
  introduction: [
    {
      prompt: "이름이 어떻게 되세요?",
      romanization: "ireumi eotteoke doeseyo?",
      audio: listenAudioOf("LISTEN_SELECT", "introduction-1", "introduction-1"),
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
      audio: listenAudioOf("LISTEN_SELECT", "introduction-2", "introduction-2"),
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
      audio: listenAudioOf("LISTEN_SELECT", "introduction-3", "introduction-3"),
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
      audio: listenAudioOf("LISTEN_SELECT", "ordering-1", "ordering-1"),
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
      audio: listenAudioOf("LISTEN_SELECT", "ordering-2", "ordering-2"),
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
      audio: listenAudioOf("LISTEN_SELECT", "ordering-3", "ordering-3"),
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
      audio: listenAudioOf("LISTEN_SELECT", "appointment-1", "appointment-1"),
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
      audio: listenAudioOf("LISTEN_SELECT", "appointment-2", "appointment-2"),
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
      audio: listenAudioOf("LISTEN_SELECT", "appointment-3", "appointment-3"),
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
      audio: listenAudioOf("LISTEN_SELECT", "directions-1", "directions-1"),
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
      audio: listenAudioOf("LISTEN_SELECT", "directions-2", "directions-2"),
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
      audio: listenAudioOf("LISTEN_SELECT", "directions-3", "directions-3"),
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

export const questionsForStep = (id: ListeningStepId): readonly TutorialListeningQuestion[] =>
  listeningQuestionsByStep[id];
