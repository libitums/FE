// 에피소드 최종 테스트의 문항 표입니다.
//
// ⚠ **이음매입니다**(`docs/conventions/code.md` 「임시 입력값의 이음매」).
//
// **무엇이 임시인가** — 문항의 값 전부입니다. 컨텐츠 공급 경로가 정해지지 않았고, 튜토리얼의
// 서사(매장에서 점원이 맞는 장면)와 스텝의 주제(인사 · 이름 묻기 · 주문하기)를 따라 지은
// 것입니다. 3번 · 5번 · 6번은 디자인(Figma 79-6648 · 79-6484 · 79-6378)의 문장입니다. 6번의
// 통과 문턱은 기본값입니다 — 글자별로 덮어쓸 근거(기기 실측)가 아직 없습니다.
//
// **값이 오는 날 무엇이 바뀌나** — 이 표의 값만 갈립니다. 문항의 모양(`EpisodeFinalQuestion`)은
// 임시가 아닙니다.

import { writingPassCriterion } from "../../lib/writing-judge";
import type { EpisodeFinalTest, EpisodeFinalUnitId } from "./episode-final.contract";

const episodeFinalTests: Record<EpisodeFinalUnitId, EpisodeFinalTest> = {
  // 튜토리얼의 서사가 비주얼 노벨이라 최종 테스트도 비주얼 노벨 형식입니다.
  "tutorial-final-test": {
    format: "visual-novel",
    unitId: "tutorial-final-test",
    questions: [
      {
        kind: "word-choice",
        id: "welcome",
        speakerName: "이유나",
        before: "어서 ",
        after: "!",
        translation: "Welcome!",
        options: ["오세요", "주세요", "가세요"],
        answerIndex: 0,
      },
      {
        kind: "speaking",
        id: "hello",
        sentence: "안녕하세요",
        romanization: "[an.nyeong.ha.se.yo]",
      },
      {
        kind: "word-choice",
        id: "find-cosmetic",
        speakerName: "나",
        before: "이 화장품 찾아",
        after: ".",
        translation: "Please help me find this cosmetic product.",
        options: ["오세요", "주세요", "있어요"],
        answerIndex: 1,
      },
      {
        kind: "speaking",
        id: "nice-to-meet-you",
        sentence: "만나서 반가워요",
        romanization: "[man.na.seo.ban.ga.wo.yo]",
      },
      {
        kind: "speaking",
        id: "this-one-please",
        sentence: "이거 주세요",
        romanization: "[i.ɡʌ.ju.se.jo]",
      },
      {
        kind: "writing",
        id: "find-cosmetic-writing",
        before: "이 화장품 찾아",
        syllables: ["주", "세", "요"],
        after: ".",
        translation: "Please help me find this cosmetic product.",
        passCriterion: writingPassCriterion,
      },
    ],
  },
};

export function episodeFinalTestFor(unitId: EpisodeFinalUnitId): EpisodeFinalTest {
  return episodeFinalTests[unitId];
}
