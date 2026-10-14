import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { WordChoicePicture } from "./WordChoicePicture";
import type { WordChoicePictureAnswer, WordChoicePictureProps } from "./word-choice-picture";

// `ui` 계층: 그림 틀 조각 단독 — 받은 로드 상태대로 그림 · 대체 글자 · 이름표를 그리고 load · error를 올립니다.
// 상태 전이 계산은 unit이, 시간 초과는 활동 쪽 ui가 집니다.

const url = "https://cdn/a.jpg";

afterEach(cleanup);

function mount(overrides: Partial<WordChoicePictureProps> = {}) {
  const onLoad = vi.fn<() => void>();
  const onError = vi.fn<() => void>();
  render(
    <WordChoicePicture
      url={url}
      meaning="water"
      state="loading"
      answer={null}
      onLoad={onLoad}
      onError={onError}
      {...overrides}
    />,
  );
  return { onLoad, onError };
}

test("UWP1. 로딩 중에는 이미지 틀이 주소로 서고 틀의 낭독은 Picture, loading이며 대체 글자와 이름표는 없다", () => {
  mount({ state: "loading" });

  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "loading");
  const frame = screen.getByTestId("word-choice-picture-frame");
  expect(frame).toHaveAttribute("accessibility-traits", "image");
  expect(frame).toHaveAttribute("accessibility-label", "Picture, loading");
  expect(screen.getByTestId("word-choice-picture-image")).toHaveAttribute("src", url);
  expect(screen.queryByTestId("word-choice-picture-fallback")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-picture-caption")).not.toBeInTheDocument();
  expect(screen.queryByTestId("word-choice-picture-answer")).not.toBeInTheDocument();
});

test("UWP2. 로드됨이면 틀이 Picture: 뜻으로 읽히고 그림이 있다", () => {
  mount({ state: "loaded" });

  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "loaded");
  expect(screen.getByTestId("word-choice-picture-frame")).toHaveAttribute(
    "accessibility-label",
    "Picture: water",
  );
  expect(screen.getByTestId("word-choice-picture-image")).toHaveAttribute("src", url);
  expect(screen.queryByTestId("word-choice-picture-fallback")).not.toBeInTheDocument();
});

test("UWP3. 실패하면 그림이 빠지고 뜻 글자와 안내 글자가 서며 틀이 그 사실을 읽는다", () => {
  mount({ state: "failed" });

  expect(screen.getByTestId("word-choice-picture")).toHaveAttribute("data-load-state", "failed");
  expect(screen.queryByTestId("word-choice-picture-image")).not.toBeInTheDocument();
  expect(screen.getByTestId("word-choice-picture-fallback")).toHaveTextContent("water");
  expect(screen.getByTestId("word-choice-picture-caption")).toHaveTextContent(
    "Picture unavailable",
  );
  expect(screen.getByTestId("word-choice-picture-frame")).toHaveAttribute(
    "accessibility-label",
    "Picture unavailable. Meaning: water",
  );
});

test("UWP4. 그림의 load · error 이벤트가 각각 한 번씩 올라간다", () => {
  const { onLoad, onError } = mount({ state: "loading" });
  const image = screen.getByTestId("word-choice-picture-image");

  fireEvent(image, new window.Event("bindEvent:load"));
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledTimes(0);

  fireEvent(image, new window.Event("bindEvent:error"));
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledTimes(1);
});

test.each([
  {
    name: "로마자 있음",
    answer: { word: "물", romanization: "mul" } as WordChoicePictureAnswer,
    label: "Answer: 물, mul, water",
  },
  {
    name: "로마자 없음",
    answer: { word: "물", romanization: null } as WordChoicePictureAnswer,
    label: "Answer: 물, water",
  },
])("UWP5. 이름표($name)는 답 낭독을 갖고 그림 틀의 자손이 아니다", ({ answer, label }) => {
  mount({ state: "loaded", answer });

  const tag = screen.getByTestId("word-choice-picture-answer");
  expect(tag).toHaveAttribute("accessibility-label", label);
  const frame = screen.getByTestId("word-choice-picture-frame");
  expect(frame.contains(tag)).toBe(false);
  expect(tag.contains(frame)).toBe(false);
});
