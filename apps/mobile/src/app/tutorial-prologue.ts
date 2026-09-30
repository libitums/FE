import type { EpisodePrologue } from "../screens/episode-intro/episode-intro.contract";
import airplane from "../assets/story/tutorial/airplane-window.jpg";
import street from "../assets/story/tutorial/imagined-street.jpg";
import cafe from "../assets/story/tutorial/imagined-cafe.jpg";
import descent from "../assets/story/tutorial/airplane-descent.jpg";

export const tutorialPrologueLabel = "Before We Land";

// 민서는 튜토리얼의 상상 속 친구이며 본편 인물 확정과는 무관합니다. 얼굴 없이 상상임을 먼저 알리고,
// 학습 전에는 정답을 요구하지 않습니다. 대본을 다듬을 때 이 값만 교체합니다.
/** 기내에서 한국의 일상을 상상하고 현실로 돌아오는 시작 유닛의 대본입니다. */
export const tutorialPrologue = {
  kind: "sequence",
  segments: [
    {
      kind: "visual-novel",
      narrative: {
        character: null,
        beats: [
          {
            speakerName: "Me",
            variant: "narration",
            background: airplane,
            line: "구름 너머로 낯선 풍경이 보인다. 이제 곧 한국이다.",
            translation: "An unfamiliar landscape appears beyond the clouds. Korea is almost here.",
          },
          {
            speakerName: "Me",
            variant: "narration",
            background: airplane,
            line: "한국에서는 어떤 하루를 보내게 될까? 잠시 상상해 본다.",
            translation: "What might a day in Korea be like? I let myself imagine it.",
          },
          {
            speakerName: "Me",
            variant: "narration",
            background: street,
            transition: "imagination",
            line: "이런 골목을 걷다가, 아직 만나지 않은 친구에게 연락이 온다면…",
            translation:
              "Perhaps, walking down a street like this, a friend I haven't met yet might message me…",
          },
        ],
      },
    },
    {
      kind: "messenger",
      chat: {
        partnerName: "Minseo",
        messages: [
          {
            id: "invite",
            sender: "other",
            text: "지금 뭐 해? 같이 커피 마실래?",
            translation: "What are you up to? Want to get coffee?",
          },
          {
            id: "accept",
            sender: "self",
            text: "좋아! 어디서 만나?",
            translation: "Sure! Where should we meet?",
          },
          {
            id: "place",
            sender: "other",
            text: "골목 끝 카페에서 만나자.",
            translation: "Let's meet at the café at the end of the street.",
          },
          {
            id: "window",
            sender: "self",
            text: "먼저 가서 창가 자리 맡아둘게.",
            translation: "I'll go ahead and save us a seat by the window.",
          },
        ],
      },
    },
    {
      kind: "visual-novel",
      narrative: {
        character: null,
        beats: [
          {
            speakerName: "Me",
            variant: "narration",
            background: cafe,
            line: "상상 속 카페에 앉아 민서를 기다린다. 그때, 전화가 울린다.",
            translation: "In my imagined café, I sit waiting for Minseo. Then the phone rings.",
          },
        ],
      },
    },
    {
      kind: "call",
      callerPortrait: null,
      call: {
        callerName: "Minseo",
        lines: [
          {
            text: "여보세요? 창가에 있다고 했지?",
            audioSource: "tutorial-minseo-call-01",
            translation: "Hello? You said you were by the window, right?",
          },
          {
            text: "나 거의 다 왔어. 조금만 기다려!",
            audioSource: "tutorial-minseo-call-02",
            translation: "I'm almost there. See you in a moment!",
          },
        ],
      },
    },
    {
      kind: "visual-novel",
      narrative: {
        character: null,
        beats: [
          {
            speakerName: "Cabin crew",
            variant: "narration",
            background: descent,
            transition: "reality",
            transitionFrom: cafe,
            audioSource: "tutorial-cabin-announcement",
            line: "잠시 후 인천국제공항에 도착하겠습니다.",
            translation: "We will shortly be arriving at Incheon International Airport.",
          },
          {
            speakerName: "Me",
            variant: "narration",
            background: descent,
            line: "안내방송에 상상에서 깨어난다. 저런 만남을 위해, 첫마디부터 연습해 볼까?",
            translation:
              "The announcement brings me back. For a meeting like that, perhaps I can start by practicing my first words.",
          },
        ],
      },
    },
  ],
} as const satisfies EpisodePrologue;
