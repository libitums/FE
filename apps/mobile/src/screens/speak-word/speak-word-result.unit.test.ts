import { describe, expect, it } from "vitest";

import type { SpokenAnswerJudgement } from "../../lib/speaking-judge";
import { speakWordResultView } from "./speak-word-result";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `unit` 계층: 말하기 퀴즈 결과 시트의 보기 모형(시안 S2 perfect · S3 close · S4 오답).

const question: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드", "카아드"],
  romanization: "kadeu",
};
const judged = (
  grade: SpokenAnswerJudgement["grade"],
  expected = "카드",
): SpokenAnswerJudgement => ({
  result: grade === "incorrect" ? "incorrect" : "correct",
  grade,
  expected,
  similarity: 1,
});
const marked = (pieces: readonly { text: string; differs: boolean }[] | null) =>
  pieces === null ? null : pieces.map((p) => (p.differs ? `[${p.text}]` : p.text)).join("");

describe("SV1 결과 시트", () => {
  it("perfect — 초록 · 제목 Perfect · 정답 상자만(들은 말 없음)", () => {
    const view = speakWordResultView(question, judged("perfect"), "카드");
    expect(view).toMatchObject({ tone: "correct", title: "perfect", answerLabel: null });
    expect(marked(view.answer)).toBe("카드");
    expect(view.romanization).toBe("kadeu");
    expect(view.heard).toBeNull();
  });

  it("close — 맞음 · Model answer · 들은 말의 다른 음절 표시", () => {
    const view = speakWordResultView(question, judged("close"), "카트");
    expect(view).toMatchObject({ tone: "correct", title: "close", answerLabel: "model" });
    expect(marked(view.answer)).toBe("카드");
    expect(marked(view.heard)).toBe("카[트]");
  });

  it("오답 — You said ↔ Answer, 양쪽 다른 음절 표시", () => {
    const view = speakWordResultView(question, judged("incorrect"), "카페");
    expect(view).toMatchObject({ tone: "incorrect", title: "incorrect", answerLabel: "answer" });
    expect(marked(view.heard)).toBe("카[페]");
    expect(marked(view.answer)).toBe("카[드]");
  });

  it("들은 말이 비면 들은 줄이 없다", () => {
    expect(speakWordResultView(question, judged("incorrect"), "").heard).toBeNull();
  });

  it("로마자는 첫 정답일 때만 — 둘째 정답이 모범 답이면 없다", () => {
    expect(
      speakWordResultView(question, judged("close", "카아드"), "카아도").romanization,
    ).toBeNull();
  });
});
