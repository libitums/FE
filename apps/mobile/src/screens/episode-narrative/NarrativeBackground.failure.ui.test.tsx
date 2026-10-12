import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { NarrativeBackground } from "./NarrativeBackground";

// `ui` 계층: 그림 로드 실패 — 실패하면 이전 그림 층을 걷고 베일을 시작하지 않으며, 루트가 로드 상태를 알린다.
// 이미지 이벤트는 테스트 렌더러의 `bindEvent:*` 이벤트로 쏩니다.

const failImage = () =>
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:error"));
const loadImage = () =>
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
const loadState = () => screen.getByTestId("narrative-background").getAttribute("data-load-state");
const imageSources = (container: Element) =>
  [...container.querySelectorAll("image")].map((image) => image.getAttribute("src"));

test("NB-F1. 이전 그림이 있는 전환에서 새 그림이 실패하면 이전 그림 층이 걷히고 실패 상태가 되며 베일은 없다", () => {
  const { container } = render(
    <NarrativeBackground src="b.jpg" previousSrc="a.jpg" animated={true} />,
  );
  expect(imageSources(container)).toEqual(["a.jpg", "b.jpg"]);

  failImage();

  expect(screen.queryByTestId("narrative-background-previous-motion")).not.toBeInTheDocument();
  expect(imageSources(container)).toEqual(["b.jpg"]);
  expect(loadState()).toBe("failed");
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  expect(screen.queryByTestId("narrative-reality-veil")).not.toBeInTheDocument();
});

test("NB-F2. 로드 전에는 loading이고 로드 뒤에는 loaded다", () => {
  render(<NarrativeBackground src="b.jpg" previousSrc={null} animated={true} />);
  expect(loadState()).toBe("loading");

  loadImage();

  expect(loadState()).toBe("loaded");
});

test("NB-F3. 전환 없는 배경에서 실패해도 예외 없이 실패 상태가 되고 이전 층은 원래 없다", () => {
  const { container } = render(
    <NarrativeBackground src="b.jpg" previousSrc="a.jpg" animated={false} />,
  );
  expect(imageSources(container)).toEqual(["b.jpg"]);

  expect(() => failImage()).not.toThrow();

  expect(loadState()).toBe("failed");
  expect(imageSources(container)).toEqual(["b.jpg"]);
  expect(screen.queryByTestId("narrative-background-previous-motion")).not.toBeInTheDocument();
});

test("NB-F4. 실패한 뒤 같은 요소에 로드가 와도 실패 상태를 유지한다", () => {
  render(<NarrativeBackground src="b.jpg" previousSrc="a.jpg" animated={true} />);

  failImage();
  loadImage();

  expect(loadState()).toBe("failed");
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  expect(screen.queryByTestId("narrative-background-previous-motion")).not.toBeInTheDocument();
});
