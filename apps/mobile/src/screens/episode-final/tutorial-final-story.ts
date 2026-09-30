import flight from "../../assets/story/tutorial/final-flight.jpg";
import cafe from "../../assets/story/tutorial/final-cafe.jpg";
import arrival from "../../assets/story/tutorial/final-arrival.jpg";
import type { EpisodeFinalStory } from "./episode-final-story.contract";

/** 첫 서사의 상상을 이어 마지막 연습을 하고, 통과한 뒤에 현실의 한국에 도착합니다. */
export const tutorialFinalStory: EpisodeFinalStory = {
  title: "Almost There",
  minimumCorrect: 2,
  background: cafe,
  introduction: {
    character: null,
    beats: [
      {
        speakerName: "Me",
        variant: "narration",
        background: flight,
        line: "창밖으로 공항이 가까워진다. 연습한 첫마디가 떠오른다.",
        translation: "The airport draws closer. I remember the first words I practiced.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: cafe,
        transition: "imagination",
        line: "여러 방법으로 첫마디를 연습했다. 눈을 감으니 같은 카페에서 민서가 기다리고 있다.",
        translation:
          "I have practiced my first words. I close my eyes. Minseo is waiting at our imagined café.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: cafe,
        line: "이번에는 내가 먼저 말해 볼까?",
        translation:
          "This time, I'll speak first. Choose a reply in each scene. Get 2 of 3 right to continue the story.",
      },
    ],
  },
  retry: {
    character: null,
    beats: [
      {
        speakerName: "Me",
        variant: "narration",
        background: cafe,
        line: "괜찮아. 아직 상상 속이니까, 한 번 더 해 보자.",
        translation:
          "It's okay. This is still my imagination. Let's try the three replies again. Get 2 right to continue.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: cafe,
        line: "안녕하세요. 물 좀 주세요. 내일 만나요.",
        translation: "Hello. Water, please. See you tomorrow. I can take my time.",
      },
    ],
  },
  ending: {
    character: null,
    beats: [
      {
        speakerName: "Me",
        variant: "narration",
        background: cafe,
        line: "민서가 웃으며 손을 흔든다. 나도 웃으며 인사를 건넨다.",
        translation:
          "Minseo smiles and waves. I smile back. Those first words feel a little more familiar now.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: flight,
        transition: "reality",
        line: "눈을 뜬다. 곧 비행기가 착륙한다. 이제 상상에서 현실로.",
        translation:
          "I open my eyes. Moments later, the plane lands. My imagined journey is becoming real.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: arrival,
        line: "비행기에서 내려 첫걸음을 내딛는다. 드디어 한국이다.",
        translation: "I step off the plane and into the airport. I'm finally in Korea.",
      },
      {
        speakerName: "Me",
        variant: "narration",
        background: arrival,
        line: "안녕하세요. 이제, 나의 이야기가 시작된다.",
        translation: "Hello. This is where my story begins.",
      },
    ],
  },
};
