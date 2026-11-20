import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { listenButtonIn } from "../../components/listen-round-buttons.test-support";
import type { ItemAnswerReport } from "../../lib/item-answer";
import {
  echoAudioOf,
  lessonAudioStub,
  listenAudioOf,
  testIdOrder,
  withAudio,
} from "../../lib/question-audio.test-support";
import { SentenceOrderActivity } from "./SentenceOrderScreen";
import {
  bottomAction,
  checkButton,
  checkState,
  tapAction,
} from "./sentence-order-check.test-support";
import type { SentenceOrderQuestion } from "./sentence-order-questions";

// `ui` 계층: 줄 배치(LISTEN_BUILD · WORD_ORDER) — 위 줄 · 답 줄 둘 · 뭉치 · 흐름 안 Check. 다 놓아도 저절로 채점되지
// 않고 Check로만 판정이 납니다. 문항은 매핑이 내는 꼴(u00 S7 · u03 WORD_ORDER)로 손으로 세웠습니다.

const audio = vi.hoisted(() => ({
  playAudio: vi.fn<(source: string, onFinished: () => void, rate?: number) => string>(),
  stopAudio: vi.fn<() => void>(),
  pauseAudio: vi.fn<() => void>(),
  resumeAudio: vi.fn<() => void>(),
  isAudioAvailable: vi.fn<() => boolean>(),
  slowPlaybackSupport: vi.fn<() => string>(),
}));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const listenBuild: SentenceOrderQuestion = withAudio(
  {
    prompt: "Hello! Is this your first time in Korea?",
    chips: ["안녕하세요!", "한국은", "처음이세요?", "잘하시네요!", "감사합니다!"],
    chipsSource: ["안녕하세요!", "한국은", "처음이세요?", "잘하시네요!", "감사합니다!"],
    answerOrder: [0, 1, 2],
    instruction: "Listen and build the sentence.",
    reading: { romanization: "annyeonghaseyo! hangugeun cheoeumiseyo?", shown: "always" },
  } satisfies SentenceOrderQuestion,
  listenAudioOf("LISTEN_BUILD", "S7-01"),
);

const wordOrder: SentenceOrderQuestion = withAudio(
  {
    prompt: "Here's my passport.",
    chips: ["있어요.", "여권", "여기"],
    answerOrder: [1, 2, 0],
    instruction: "Build the sentence.",
    reading: { romanization: "yeogwon yeogi isseoyo.", shown: "after-check" },
  } satisfies SentenceOrderQuestion,
  echoAudioOf(),
);

const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const place = (order: readonly number[]): void => {
  for (const index of order) fireEvent.tap(chip(index), {});
};

beforeEach(() => {
  playAudio.mockReset();
  stopAudio.mockReset();
  playAudio.mockReturnValue("started");
});

afterEach(() => {
  cleanup();
});

function mount(
  questions: readonly SentenceOrderQuestion[],
  onItemAnswered?: (report: ItemAnswerReport) => void,
) {
  const { lesson } = lessonAudioStub();
  return render(
    <SentenceOrderActivity
      questions={questions}
      onExit={() => {}}
      onFinish={() => {}}
      lessonAudio={lesson}
      {...(onItemAnswered === undefined ? {} : { onItemAnswered })}
    />,
  );
}

describe("LISTEN_BUILD — 줄 배치", () => {
  test("SO7. 무대는 카드 없이 서고 위 줄은 재생 → 다시 듣기 · Slow만이다 — 로마자는 위 줄에 서지 않는다", () => {
    // QA 2026-11-20(s03-l2-2): 재생 단추 옆에 로마자가 몰려 섰습니다. 로마자는 판정 뒤 정답 공개(SO-R)로 옮겼습니다.
    const { container } = mount([listenBuild]);

    expect(
      within(screen.getByTestId("learning-shell-stage")).queryByTestId("ui-lynx-card"),
    ).toBeNull();
    expect(
      testIdOrder(container, [
        "sentence-order-listen-playback",
        "sentence-order-listen-replay",
        "sentence-order-listen-slow",
      ]),
    ).toEqual([
      "sentence-order-listen-playback",
      "sentence-order-listen-replay",
      "sentence-order-listen-slow",
    ]);
    expect(
      within(screen.getByTestId("sentence-order-header")).queryByTestId("sentence-order-reading"),
    ).toBeNull();
    expect(listenButtonIn("sentence-order-listen-playback")).toHaveClass("ui-lynx-round-button-xl");
    expect(listenButtonIn("sentence-order-listen-replay")).toHaveClass("ui-lynx-round-button-l");
  });

  test("SO7. 답 줄 둘과 뭉치가 서고 Check는 처음부터 꺼진 채 서 있다", () => {
    mount([listenBuild]);

    const lines = screen.getByTestId("sentence-order-lines");
    expect(within(lines).getByTestId("sentence-order-line-0")).toBeInTheDocument();
    expect(within(lines).getByTestId("sentence-order-line-1")).toBeInTheDocument();
    const bank = screen.getByTestId("sentence-order-screen-bank");
    for (const index of [0, 1, 2, 3, 4]) {
      expect(within(bank).getByTestId(`sentence-order-chip-${index}`)).toBeInTheDocument();
    }
    expect(checkState()).toBe("disabled");
    expect(screen.queryByTestId("sentence-order-action")).toBeNull();
  });

  test("SO8. 조각 하나로 Check가 켜지고 정답 길이만큼 놓아도 판정이 나지 않는다", () => {
    mount([listenBuild]);

    fireEvent.tap(chip(0), {});
    expect(checkState()).toBe("enabled");

    place([1, 2]);

    expect(screen.queryByTestId("learning-shell-verdict")).toBeNull();
    expect(screen.queryByTestId("answer-verdict")).toBeNull();
    for (const index of [0, 1, 2]) {
      expect(screen.getByTestId(`sentence-order-chip-${index}`)).not.toHaveAttribute("data-result");
    }
    expect(checkState()).toBe("enabled");
  });

  test("SO8. Check를 누르면 셸 판정과 줄 위 조각 판정이 서고 같은 흐름 안 자리에 Next가 선다", () => {
    mount([listenBuild]);
    place([0, 2, 1]);
    const actionsBefore = screen.getByTestId("learning-shell-actions");
    expect(actionsBefore).toHaveClass("learning-shell-actions-in-flow");

    tapAction("Check");

    expect(
      within(screen.getByTestId("learning-shell-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "incorrect");
    const lines = screen.getByTestId("sentence-order-lines");
    expect(within(lines).getByTestId("sentence-order-chip-0")).toHaveAttribute(
      "data-result",
      "correct",
    );
    expect(within(lines).getByTestId("sentence-order-chip-2")).toHaveAttribute(
      "data-result",
      "incorrect",
    );
    expect(within(lines).getByTestId("sentence-order-chip-1")).toHaveAttribute(
      "data-result",
      "incorrect",
    );
    expect(screen.queryByTestId("sentence-order-check")).toBeNull();
    expect(screen.getByTestId("learning-shell-actions")).toHaveClass(
      "learning-shell-actions-in-flow",
    );
    expect(bottomAction()).toHaveAttribute("accessibility-label", "Next");
  });

  test("SO10. 쓴 자리는 폭을 지키는 빈칸이고 낭독에서 빠진다", () => {
    mount([listenBuild]);

    fireEvent.tap(chip(3), {});

    const bank = screen.getByTestId("sentence-order-screen-bank");
    const slot = within(bank).getByTestId("sentence-order-bank-slot-3");
    expect(slot).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(within(bank).queryByTestId("sentence-order-chip-3")).toBeNull();
  });

  test("AX3. Check의 이름은 Check이고 조각을 놓으면 disabled에서 button으로 바뀐다", () => {
    mount([listenBuild]);

    expect(checkButton()).toHaveAttribute("accessibility-label", "Check");
    expect(checkButton()).toHaveAttribute("accessibility-traits", "disabled");

    fireEvent.tap(chip(0), {});

    expect(checkButton()).toHaveAttribute("accessibility-label", "Check");
    expect(checkButton()).toHaveAttribute("accessibility-traits", "button");
  });

  test("AX1. 읽는 순서는 지시문 → 위 줄 → 답 줄 → 뭉치 → 버튼이다", () => {
    const { container } = mount([listenBuild]);
    fireEvent.tap(chip(0), {});

    expect(
      testIdOrder(container, [
        "learning-shell-instruction",
        "sentence-order-header",
        "sentence-order-lines",
        "sentence-order-screen-bank",
        "sentence-order-check",
      ]),
    ).toEqual([
      "learning-shell-instruction",
      "sentence-order-header",
      "sentence-order-lines",
      "sentence-order-screen-bank",
      "sentence-order-check",
    ]);
  });

  test("EV5. 문항 판정은 Check에서 한 번만 보고된다", () => {
    const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
    mount([listenBuild], onItemAnswered);
    place([0, 1, 2]);
    expect(onItemAnswered).not.toHaveBeenCalled();

    tapAction("Check");

    expect(onItemAnswered).toHaveBeenCalledTimes(1);
    expect(onItemAnswered).toHaveBeenCalledWith({
      questionIndex: 0,
      outcome: "correct",
      density: "regular",
      // 놓은 타일을 놓은 순서대로 공백으로 이은 글자입니다(UA2).
      selectedAnswer: "안녕하세요! 한국은 처음이세요?",
    });
  });
});

// QA 2026-11-20(위키 QA 3번, u00 S2-02): 틀린 뒤 로마자만 서고 정답 한글 문장 · 뜻이 없었습니다. 판정 뒤에는 타자 입력 ·
// 음절 조립과 같은 정답 상자(`AnswerReveal`, 「Answer: …」)와 그 아래 로마자(보기 로마자 설정) · 뜻이 섭니다.
describe("LISTEN_BUILD — 판정 뒤 정답 공개 (SO-R)", () => {
  const withMeaning: SentenceOrderQuestion = {
    ...listenBuild,
    meaning: "Hello! Is this your first time in Korea?",
  };

  test("SO-R4. 틀리게 놓고 Check하면 정답 상자 · 로마자 · 뜻이 답 줄 아래에 선다", () => {
    const { container } = mount([withMeaning]);
    expect(screen.queryByTestId("sentence-order-reveal")).toBeNull();
    place([4, 3]);
    tapAction("Check");

    expect(screen.getByTestId("sentence-order-reveal")).toHaveTextContent(
      "Answer: 안녕하세요! 한국은 처음이세요?",
    );
    expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent(
      "annyeonghaseyo! hangugeun cheoeumiseyo?",
    );
    expect(screen.getByTestId("sentence-order-reveal-meaning")).toHaveTextContent(
      "Hello! Is this your first time in Korea?",
    );
    expect(
      testIdOrder(container, [
        "sentence-order-lines",
        "sentence-order-reveal",
        "sentence-order-reading",
        "sentence-order-reveal-meaning",
        "sentence-order-screen-bank",
      ]),
    ).toEqual([
      "sentence-order-lines",
      "sentence-order-reveal",
      "sentence-order-reading",
      "sentence-order-reveal-meaning",
      "sentence-order-screen-bank",
    ]);
  });

  test("SO-R5. 보기 로마자 설정이 꺼지면 정답 상자 · 뜻만 서고 로마자는 없다", () => {
    const { lesson } = lessonAudioStub();
    render(
      <SentenceOrderActivity
        questions={[withMeaning]}
        onExit={() => {}}
        onFinish={() => {}}
        lessonAudio={lesson}
        choiceRomanization="hidden"
      />,
    );
    place([4]);
    tapAction("Check");

    expect(screen.getByTestId("sentence-order-reveal")).toBeInTheDocument();
    expect(screen.queryByTestId("sentence-order-reading")).toBeNull();
    expect(screen.getByTestId("sentence-order-reveal-meaning")).toBeInTheDocument();
  });

  test("SO-R6. 맞아도 정답 상자가 선다(타자 입력 · 음절 조립과 같은 규칙)", () => {
    mount([withMeaning]);
    place([0, 1, 2]);
    tapAction("Check");
    expect(screen.getByTestId("sentence-order-reveal")).toHaveTextContent(
      "Answer: 안녕하세요! 한국은 처음이세요?",
    );
  });
});

describe("WORD_ORDER — 줄 배치", () => {
  test("SO9. 위 줄은 영어 문장이고 로마자는 Check 전에는 없고 Check 뒤에 선다", () => {
    mount([wordOrder]);

    expect(screen.getByTestId("sentence-order-screen-prompt")).toHaveTextContent(
      "Here's my passport.",
    );
    expect(screen.queryByTestId("sentence-order-reading")).not.toBeInTheDocument();
    place([1, 2, 0]);
    expect(screen.queryByTestId("sentence-order-reading")).not.toBeInTheDocument();

    tapAction("Check");

    expect(screen.getByTestId("sentence-order-reading")).toHaveTextContent(
      "yeogwon yeogi isseoyo.",
    );
    expect(
      within(screen.getByTestId("learning-shell-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "correct");
  });

  test("SO9. 정답을 확인한 순간 정답 뒤 재생이 한 번 난다", () => {
    mount([wordOrder]);
    place([1, 2, 0]);
    expect(playAudio).not.toHaveBeenCalled();

    tapAction("Check");

    expect(playAudio).toHaveBeenCalledTimes(1);
  });
});
