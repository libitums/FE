import { describe, expect, it } from "vitest";

import type { NonEmpty } from "../../lib/non-empty";
import type { PictureLoadState } from "../../lib/picture-load";
import type { SpeechAttemptPhase } from "../../lib/speech-attempt";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import { uiCopyEn } from "../../lib/ui-copy-en";
import {
  canSpeakWord,
  initialSpeakWordSessionState,
  isSpeakWordSessionComplete,
  judgeSpokenWord,
  speakWordCompletionAnnouncement,
  speakWordControlsOf,
  speakWordHintOf,
  speakWordInstructionOf,
  speakWordMeaningShown,
  speakWordPictureLabel,
  speakWordResultAt,
  speakWordRevealText,
  speakWordSessionReducer,
  speakWordSessionResults,
  speakWordSkippedCount,
} from "./speak-word";
import type { SpeakWordQuestion, SpeakWordSessionState } from "./speak-word.contract";

// `unit` 계층: 낱말 말하기 활동의 리듀서 · 판정 · 결과 · 조작 표 · 문구의 입출력만 봅니다(순수 함수).

const ready: SpeechAttemptPhase = { kind: "ready" };
const listening: SpeechAttemptPhase = { kind: "listening" };
const heard = (text: string): SpeechAttemptPhase => ({ kind: "heard", text });
const blocked: SpeechAttemptPhase = { kind: "unavailable", reason: "blocked" };
const dictationOff: SpeechAttemptPhase = { kind: "unavailable", reason: "dictation-off" };
const failed: SpeechAttemptPhase = { kind: "unavailable", reason: "failed" };

const stateOf = (overrides: Partial<SpeakWordSessionState>): SpeakWordSessionState => ({
  ...initialSpeakWordSessionState,
  ...overrides,
});

const answers = (...words: string[]): NonEmpty<string> => {
  const [first, ...rest] = words;
  if (first === undefined) throw new Error("정답이 하나 이상 필요합니다");
  return [first, ...rest];
};

const question = (overrides: Partial<SpeakWordQuestion> = {}): SpeakWordQuestion => ({
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: answers("카드"),
  romanization: "kadeu",
  ...overrides,
});

describe("speakWordSessionReducer — start", () => {
  it("SW1. 준비 · 받아쓰기 꺼짐에서는 듣는 중이 된다", () => {
    for (const phase of [ready, dictationOff]) {
      expect(speakWordSessionReducer(stateOf({ phase }), { type: "start" }).phase).toEqual(
        listening,
      );
    }
  });

  it("SW1. 들음(판정 뒤) · blocked · failed · 듣는 중에서는 같은 참조다 — 판정 뒤 재시도 없음", () => {
    for (const phase of [heard("카드"), blocked, failed, listening]) {
      const state = stateOf({ phase });

      expect(speakWordSessionReducer(state, { type: "start" })).toBe(state);
    }
  });
});

describe("speakWordSessionReducer — outcome", () => {
  it("SW2. 들린 글자는 국면과 들은 글자 목록에 더해진다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: listening }), {
      type: "outcome",
      outcome: { kind: "heard", text: "카드" },
    });

    expect(next.phase).toEqual(heard("카드"));
    expect(next.heard).toEqual(["카드"]);
  });

  it("SW2. blocked 결말은 불가 국면 · 가용성 blocked이고 목록은 그대로다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: listening, heard: ["카드"] }), {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "blocked" },
    });

    expect(next.phase).toEqual(blocked);
    expect(next.availability).toBe("blocked");
    expect(next.heard).toEqual(["카드"]);
  });

  it("SW2. failed 결말은 잠그지 않는다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: listening }), {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "failed" },
    });

    expect(next.phase).toEqual(failed);
    expect(next.availability).toBe("open");
  });

  it("SW2. 듣는 중이 아닐 때 온 결과는 같은 참조다", () => {
    for (const phase of [ready, heard("카드"), blocked, failed, dictationOff]) {
      const state = stateOf({ phase });

      expect(
        speakWordSessionReducer(state, {
          type: "outcome",
          outcome: { kind: "heard", text: "늦게 온 글자" },
        }),
      ).toBe(state);
    }
  });
});

describe("speakWordSessionReducer — skip · next", () => {
  it("SW3. 준비 · 불가 국면의 Skip은 목록에 null을 더하고 다음 문항으로 간다", () => {
    for (const phase of [ready, blocked, dictationOff, failed]) {
      const next = speakWordSessionReducer(stateOf({ phase, heard: ["카드"] }), { type: "skip" });

      expect(next.questionIndex).toBe(1);
      expect(next.heard).toEqual(["카드", null]);
    }
  });

  it("SW3. 들음 · 듣는 중의 Skip은 같은 참조다", () => {
    for (const phase of [heard("카드"), listening]) {
      const state = stateOf({ phase });

      expect(speakWordSessionReducer(state, { type: "skip" })).toBe(state);
    }
  });

  it("SW3. next는 들음에서만 다음 문항으로 가고 목록은 그대로다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: heard("카드"), heard: ["카드"] }), {
      type: "next",
    });

    expect(next).toEqual({
      questionIndex: 1,
      phase: ready,
      availability: "open",
      heard: ["카드"],
    });
    for (const phase of [ready, listening, blocked, failed, dictationOff]) {
      const state = stateOf({ phase });

      expect(speakWordSessionReducer(state, { type: "next" })).toBe(state);
    }
  });

  it("SW3. 준비 국면 Skip 뒤 다음 문항도 준비 국면이다", () => {
    const next = speakWordSessionReducer(stateOf({ phase: ready }), { type: "skip" });

    expect(next.phase).toEqual(ready);
  });
});

describe("speakWordSessionReducer — 잠금", () => {
  it("SW4. 첫 문항이 blocked면 둘째 문항은 곧장 불가로 서고 start는 무시되며 Skip 둘이 [null, null]이다", () => {
    let state = speakWordSessionReducer(initialSpeakWordSessionState, { type: "start" });
    state = speakWordSessionReducer(state, {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "blocked" },
    });
    state = speakWordSessionReducer(state, { type: "skip" });

    expect(state.phase).toEqual(blocked);
    expect(state.questionIndex).toBe(1);

    const ignored = speakWordSessionReducer(state, { type: "start" });
    expect(ignored).toBe(state);

    state = speakWordSessionReducer(state, { type: "skip" });
    expect(state.heard).toEqual([null, null]);
    expect(state.questionIndex).toBe(2);
  });

  it("SW4. failed 뒤 Skip하면 다음 문항은 준비 국면이다", () => {
    let state = speakWordSessionReducer(initialSpeakWordSessionState, { type: "start" });
    state = speakWordSessionReducer(state, {
      type: "outcome",
      outcome: { kind: "unavailable", reason: "failed" },
    });
    state = speakWordSessionReducer(state, { type: "skip" });

    expect(state.phase).toEqual(ready);
  });
});

describe("judgeSpokenWord", () => {
  it("SW5. 정답 낱말로 시작하는 말은 부호 · 뒤 낱말과 상관없이 정답이다", () => {
    for (const text of ["카드", "카드.", "카드 주세요"]) {
      expect(judgeSpokenWord(answers("카드"), text)).toBe("correct");
    }
  });

  it("SW5. 다른 글자 · 어미 · 붙여 쓴 낱말 · 빈 글자는 오답이다", () => {
    for (const text of ["카드요", "카트", ""]) {
      expect(judgeSpokenWord(answers("카드"), text)).toBe("incorrect");
    }
    expect(judgeSpokenWord(answers("비밀번호"), "비밀 번호")).toBe("incorrect");
  });

  it("SW5. 정답이 여럿이면 하나만 맞아도 정답이다", () => {
    expect(judgeSpokenWord(answers("카드", "카아드"), "카아드")).toBe("correct");
    expect(judgeSpokenWord(answers("카드", "카아드"), "카아")).toBe("incorrect");
  });
});

describe("결과 · 건너뜀 수", () => {
  const three = [question(), question(), question()];

  it("SW6. 건너뜀(null)은 결과에서 빠지고 순서가 지켜진다", () => {
    expect(speakWordSessionResults(three, ["카드", null, "카트"])).toEqual([
      "correct",
      "incorrect",
    ]);
  });

  it("SW6. 건너뜀 수는 null의 수다", () => {
    expect(speakWordSkippedCount(["카드", null, "카트"])).toBe(1);
    expect(speakWordSkippedCount([null, null])).toBe(2);
    expect(speakWordSkippedCount([])).toBe(0);
  });

  it("SW6. 목록이 질문보다 짧으면 짧은 쪽까지만 센다", () => {
    expect(speakWordSessionResults(three, ["카드"])).toEqual(["correct"]);
    expect(speakWordSessionResults([question()], ["카드", "카드"])).toEqual(["correct"]);
  });

  it("SW6. 문항마다 자기 정답으로 판정한다", () => {
    const mixed = [question(), question({ answers: answers("여권") })];

    expect(speakWordSessionResults(mixed, ["카드", "카드"])).toEqual(["correct", "incorrect"]);
  });

  it("SW6. speakWordResultAt은 들음 국면에서만 판정을 낸다", () => {
    expect(speakWordResultAt(question(), stateOf({ phase: heard("카드") }))).toBe("correct");
    expect(speakWordResultAt(question(), stateOf({ phase: heard("카트") }))).toBe("incorrect");
    for (const phase of [ready, listening, blocked, failed, dictationOff]) {
      expect(speakWordResultAt(question(), stateOf({ phase }))).toBeNull();
    }
  });

  it("SW6. 문항을 다 지나면 세션이 끝난 것이다", () => {
    expect(isSpeakWordSessionComplete(stateOf({ questionIndex: 2, heard: ["a", null] }), 2)).toBe(
      true,
    );
    expect(isSpeakWordSessionComplete(stateOf({ questionIndex: 1, heard: ["a"] }), 2)).toBe(false);
    expect(isSpeakWordSessionComplete(initialSpeakWordSessionState, 2)).toBe(false);
  });
});

describe("조작 표", () => {
  const pictures: readonly PictureLoadState[] = ["loading", "loaded", "failed"];

  it("SW7. 준비 국면: 그림이 로딩이면 주 버튼이 없고 서거나 실패면 Speak다 — 보조는 늘 Skip", () => {
    expect(speakWordControlsOf(ready, "loading")).toEqual({ primary: null, secondary: "skip" });
    expect(speakWordControlsOf(ready, "loaded")).toEqual({ primary: "speak", secondary: "skip" });
    expect(speakWordControlsOf(ready, "failed")).toEqual({ primary: "speak", secondary: "skip" });
  });

  it("SW7. 듣는 중 · 판정 뒤 · 불가 국면의 조작", () => {
    for (const picture of pictures.filter((state) => state !== "loading")) {
      expect(speakWordControlsOf(listening, picture)).toEqual({ primary: "stop", secondary: null });
      expect(speakWordControlsOf(heard("카드"), picture)).toEqual({
        primary: null,
        secondary: null,
      });
      expect(speakWordControlsOf(dictationOff, picture)).toEqual({
        primary: "skip",
        secondary: "retry",
      });
      expect(speakWordControlsOf(blocked, picture)).toEqual({ primary: "skip", secondary: null });
      expect(speakWordControlsOf(failed, picture)).toEqual({ primary: "skip", secondary: null });
    }
  });

  it("SW7. 그림이 로딩이면 말할 수 없고 서거나 실패면 말할 수 있다", () => {
    expect(canSpeakWord("loading")).toBe(false);
    expect(canSpeakWord("loaded")).toBe(true);
    expect(canSpeakWord("failed")).toBe(true);
  });
});

describe("안내 · 지시문 · 문구", () => {
  it("SW8. 판정 뒤에는 화면을 눌러 넘기라는 안내다", () => {
    expect(speakWordHintOf(heard("카드"), markedUiCopy)).toBe("⟦speaking.tapToContinue⟧");
  });

  it("SW8. blocked · failed는 낱말용 불가 안내이고 나머지는 안내 줄이 없다", () => {
    expect(speakWordHintOf(blocked, markedUiCopy)).toBe("⟦speakWord.recognitionUnavailable⟧");
    expect(speakWordHintOf(failed, markedUiCopy)).toBe("⟦speakWord.recognitionUnavailable⟧");
    for (const phase of [ready, listening, dictationOff]) {
      expect(speakWordHintOf(phase, markedUiCopy)).toBeNull();
    }
  });

  it("SW8. 지시문은 받아쓰기 꺼짐 > 문항 지시문 > 기본 지시문 순서다", () => {
    expect(
      speakWordInstructionOf(question({ instruction: "Say it." }), dictationOff, markedUiCopy),
    ).toBe("⟦speaking.dictationDisabled⟧");
    expect(speakWordInstructionOf(question({ instruction: "Say it." }), ready, markedUiCopy)).toBe(
      "Say it.",
    );
    expect(speakWordInstructionOf(question(), ready, markedUiCopy)).toBe("⟦speakWord.instruction⟧");
  });

  it("SW9. 정답 상자 글자는 첫 정답에 로마자가 있으면 이어 붙인다", () => {
    expect(speakWordRevealText(question(), uiCopyEn)).toBe("Answer: 카드 · kadeu");
    expect(speakWordRevealText(question({ romanization: null }), uiCopyEn)).toBe("Answer: 카드");
    expect(speakWordRevealText(question({ answers: answers("카드", "카아드") }), uiCopyEn)).toBe(
      "Answer: 카드 · kadeu",
    );
  });

  it("SW10. 뜻 줄은 그림이 실패했을 때만 숨긴다", () => {
    expect(speakWordMeaningShown("loading")).toBe(true);
    expect(speakWordMeaningShown("loaded")).toBe(true);
    expect(speakWordMeaningShown("failed")).toBe(false);
  });

  it("SW10. 그림 틀 낭독 이름은 로드 상태를 따른다", () => {
    expect(speakWordPictureLabel("card", "loading", uiCopyEn)).toBe("Picture, loading");
    expect(speakWordPictureLabel("card", "loaded", uiCopyEn)).toBe("Picture: card");
    expect(speakWordPictureLabel("card", "failed", uiCopyEn)).toBe(
      "Picture unavailable. Meaning: card",
    );
  });

  it("SW10. 완료 낭독은 모두 끝났음과 다음 동작 이름이다", () => {
    expect(speakWordCompletionAnnouncement("See results", uiCopyEn)).toBe(
      "All questions done, See results",
    );
  });
});
