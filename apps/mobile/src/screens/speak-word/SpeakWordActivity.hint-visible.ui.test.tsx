import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { recognized, stubSpeechHost } from "../../lib/speech-host.test-support";
import type { SpeechHostResult } from "../../lib/speech-host.test-support";
import { SpeakWordActivity } from "./SpeakWordActivity";
import type { SpeakWordQuestion } from "./speak-word.contract";

// `ui` 계층: 인식을 쓸 수 없게 되면 그 까닭(안내 줄)을 화면 안으로 끌어온다. 작은 화면(360×640)에서는 그림 카드 ·
// 파형 아래로 안내 줄이 접힌 아래에 남아, 사용자는 까닭 없이 Skip 하나만 봤다(2026-11-23 에뮬레이터 확인).

type Invocation = { readonly selector: string; readonly method: string; readonly params?: unknown };

const cardQuestion: SpeakWordQuestion = {
  pictureUrl: "https://cdn/card.jpg",
  meaning: "card",
  answers: ["카드"],
  romanization: "kadeu",
};

const languageUnavailable: SpeechHostResult = {
  status: "recognition-failed",
  text: "",
  errorDomain: "android.speech.SpeechRecognizer",
  errorCode: 13,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function recordQueries(): Invocation[] {
  const calls: Invocation[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: { method: string; params?: unknown }) => {
            calls.push({ selector, method: options.method, params: options.params });
            return { exec: () => {} };
          },
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  return calls;
}

function mount(): void {
  render(<SpeakWordActivity questions={[cardQuestion]} onExit={() => {}} onFinish={() => {}} />);
  fireEvent(screen.getByTestId("speak-word-picture-image"), new window.Event("bindEvent:load"));
}

function hintScrolls(calls: readonly Invocation[]): Invocation[] {
  return calls.filter(
    (call) => call.method === "scrollIntoView" && call.selector === "#speak-word-hint",
  );
}

function layOut(testId: string): void {
  fireEvent(screen.getByTestId(testId), new window.Event("bindEvent:layoutchange"));
}

test("SWH1. 인식 실패로 선 안내 줄이 자리를 잡으면 그 줄을 화면 아래 끝까지 끌어온다", () => {
  stubSpeechHost({ result: () => languageUnavailable });
  const calls = recordQueries();
  mount();

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  expect(screen.getByTestId("speak-word-hint")).toHaveTextContent(
    "Speech recognition isn't available right now",
  );
  // 배치가 끝나기 전(글자 높이 0)에는 끌어오지 않습니다.
  expect(hintScrolls(calls)).toEqual([]);

  layOut("speak-word-hint");

  expect(hintScrolls(calls)).toEqual([
    {
      selector: "#speak-word-hint",
      method: "scrollIntoView",
      params: { scrollIntoViewOptions: { block: "end", behavior: "smooth" } },
    },
  ]);
});

test("SWH2. 준비 국면에서는 안내 줄이 없어 끌어오지 않는다", () => {
  stubSpeechHost({ result: () => languageUnavailable });
  const calls = recordQueries();
  mount();

  expect(screen.queryByTestId("speak-word-hint")).toBeNull();
  expect(hintScrolls(calls)).toEqual([]);
});

test("SWH3. 들은 뒤의 「Tap the screen to continue」 줄은 끌어오지 않는다 — 판정 상자를 가리지 않게", () => {
  stubSpeechHost({ result: () => recognized("카드") });
  const calls = recordQueries();
  mount();

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});
  expect(screen.getByTestId("speak-word-content")).toHaveAttribute("data-phase", "heard");
  layOut("speak-word-hint");

  expect(hintScrolls(calls)).toEqual([]);
});
