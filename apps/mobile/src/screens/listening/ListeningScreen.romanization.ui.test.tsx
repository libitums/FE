import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { listenAudioOf } from "../../lib/question-audio.test-support";
import type { SessionOptions } from "../../lib/session-options";
import { ListeningActivity } from "./ListeningScreen";
import type { ListeningQuestion } from "./listening-questions";

// `ui` 계층: 듣기 화면의 보기 로마자 — 답 전부터 보기에 서고, 제시 카드는 답 전에 재생 줄만 남깁니다.
// 문항은 매핑이 내는 꼴로 손으로 세웠습니다.

const listen: ListeningQuestion = {
  prompt: "안녕하세요",
  romanization: "annyeonghaseyo",
  audio: listenAudioOf("LISTEN_SELECT", "u03-greet-01", "u03-greet-01"),
  choices: ["안녕하세요", "감사합니다", "미안합니다", "괜찮아요"],
  choiceRomanizations: ["annyeonghaseyo", "gamsahamnida", "mianhamnida", "gwaenchanayo"],
  answerIndex: 0,
};

const minimalPair: ListeningQuestion = {
  prompt: "불",
  romanization: "bul",
  audio: listenAudioOf("MIN_PAIR_AB", "u03-pair-01", "u03-pair-01"),
  choices: ["불", "풀"],
  choiceRomanizations: ["bul", "pul"],
  answerIndex: 0,
};

const on: SessionOptions = {
  "auto-play-audio": false,
  "show-transcript": false,
  "show-choice-romanization": true,
};
const off: SessionOptions = { ...on, "show-choice-romanization": false };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(question: ListeningQuestion, sessionOptions: SessionOptions) {
  return render(
    <ListeningActivity
      questions={[question]}
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={sessionOptions}
      gemCount={0}
    />,
  );
}

const romanId = (index: number): string => `ui-lynx-option-selector-romanization-choice-${index}`;
const item = (index: number) => screen.getByTestId(`ui-lynx-option-selector-item-choice-${index}`);
const nameOf = (index: number): string | null => item(index).getAttribute("accessibility-label");

describe("듣기 보기 로마자", () => {
  test("UI-CR8. 답 전에 보기 넷에 로마자 줄이 서고 제시 카드는 재생 줄만 남는다", () => {
    mount(listen, on);

    listen.choiceRomanizations?.forEach((roman, index) => {
      expect(screen.getByTestId(romanId(index))).toHaveTextContent(roman ?? "");
      expect(nameOf(index)).toBe(`${listen.choices[index]}, Pronunciation: ${roman}`);
    });
    expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
    expect(screen.queryByTestId("listening-prompt-divider")).toBeNull();
    expect(screen.queryByTestId("listening-prompt-text")).toBeNull();
    expect(screen.queryByTestId("listening-prompt-romanization")).toBeNull();
  });

  test("UI-CR9. 답한 뒤에는 제시문 한글과 로마자가 서고 보기 로마자도 남는다", () => {
    mount(listen, on);

    fireEvent.tap(item(0), {});

    expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent("안녕하세요");
    expect(screen.getByTestId("listening-prompt-romanization")).toHaveTextContent("annyeonghaseyo");
    for (const index of [0, 1, 2, 3]) {
      expect(screen.getByTestId(romanId(index))).toBeInTheDocument();
    }
  });

  test("UI-CR10. 끄면 보기 줄이 없고 이름은 한글만이다", () => {
    mount(listen, off);

    for (const index of [0, 1, 2, 3]) {
      expect(screen.queryByTestId(romanId(index))).toBeNull();
      expect(nameOf(index)).toBe(listen.choices[index]);
    }
  });

  test("UI-CR10. 소리 구별 두 보기도 켜면 줄이 둘 선다", () => {
    mount(minimalPair, on);

    expect(screen.getByTestId(romanId(0))).toHaveTextContent("bul");
    expect(screen.getByTestId(romanId(1))).toHaveTextContent("pul");
  });
});
