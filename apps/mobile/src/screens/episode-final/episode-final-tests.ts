// 튜토리얼에서 배운 다섯 표현만 사용하는 3문항 복습입니다.
// 콘텐츠 공급 경로가 정해지면 이 고정 표를 교체합니다.
import { tutorialFinalStory } from "./tutorial-final-story";
import type { EpisodeFinalTest, EpisodeFinalUnitId } from "./episode-final.contract";

const episodeFinalTests: Record<EpisodeFinalUnitId, EpisodeFinalTest> = {
  "tutorial-final-test": {
    format: "visual-novel",
    unitId: "tutorial-final-test",
    story: tutorialFinalStory,
    questions: [
      {
        kind: "word-choice",
        id: "hello",
        context: "Minseo arrives at the café. What will you say first?",
        speakerName: "Me",
        before: "",
        after: "",
        translation: "Hello.",
        options: ["안녕하세요", "내일 만나요", "물 좀 주세요"],
        romanizations: ["annyeonghaseyo", "naeil mannayo", "mul jom juseyo"],
        answerIndex: 0,
      },
      {
        kind: "word-choice",
        id: "water",
        context: "You sit down together. Ask for a glass of water.",
        speakerName: "Me",
        before: "",
        after: "",
        translation: "Water, please.",
        options: ["내일 만나요", "물 좀 주세요", "이름이 뭐예요?"],
        romanizations: ["naeil mannayo", "mul jom juseyo", "ireumi mwoyeyo?"],
        answerIndex: 1,
      },
      {
        kind: "word-choice",
        id: "tomorrow",
        context: "Time to leave. You will meet again tomorrow. What will you say?",
        speakerName: "Me",
        before: "",
        after: "",
        translation: "See you tomorrow.",
        options: ["역이 어디예요?", "안녕하세요", "내일 만나요"],
        romanizations: ["yeogi eodiyeyo?", "annyeonghaseyo", "naeil mannayo"],
        answerIndex: 2,
      },
    ],
  },
};

export function episodeFinalTestFor(unitId: EpisodeFinalUnitId): EpisodeFinalTest {
  return episodeFinalTests[unitId];
}
