import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { useWordChoicePicture } from "./use-word-choice-picture";
import type { WordChoicePictureState } from "./word-choice-picture";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 그림 문항의 로드 상태 훅 — 걷힌 앞 문항의 뒤늦은 이벤트가 새 문항 상태를 덮지 않습니다.
// 훅이 돌려준 핸들러를 문항이 바뀐 뒤에 부르는 것으로 그 상황을 만듭니다. 타이머는 가짜입니다.

const question = (url: string): WordChoiceQuestion => ({
  prompt: "water",
  choices: ["카드", "현금", "물", "영수증"],
  answerIndex: 2,
  instruction: "Which word matches the picture?",
  picture: { url, answerRomanization: "mul" },
});

type Latest = {
  readonly state: WordChoicePictureState;
  readonly onLoad: () => void;
  readonly onError: () => void;
};

let latest: Latest;

function Harness(props: { readonly question: WordChoiceQuestion; readonly index: number }): null {
  latest = useWordChoicePicture(props.question, props.index);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: { accessibilityAnnounce: () => {} },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mountSecondQuestion(): { readonly first: Latest } {
  const view = render(<Harness question={question("https://cdn/a.jpg")} index={0} />);
  const first = latest;
  view.rerender(<Harness question={question("https://cdn/b.jpg")} index={1} />);
  return { first };
}

test("UHP1. 앞 문항 몫의 뒤늦은 load는 새 문항의 로드됨 상태를 덮지 않고 6000ms 뒤에도 실패로 바뀌지 않는다", () => {
  const { first } = mountSecondQuestion();
  act(() => latest.onLoad());
  expect(latest.state).toBe("loaded");

  act(() => first.onLoad());
  act(() => {
    vi.advanceTimersByTime(6000);
  });

  expect(latest.state).toBe("loaded");
});

test("UHP2. 앞 문항 몫의 뒤늦은 error는 로딩 중인 새 문항을 실패로 만들지 않는다", () => {
  const { first } = mountSecondQuestion();
  expect(latest.state).toBe("loading");

  act(() => first.onError());

  expect(latest.state).toBe("loading");
});
