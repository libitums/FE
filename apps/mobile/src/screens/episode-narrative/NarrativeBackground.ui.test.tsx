import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { NarrativeBackground } from "./NarrativeBackground";

test("새 배경을 읽는 동안 이전 배경을 보존하고 페이드 완료 뒤 해제한다", () => {
  const { container } = render(
    <NarrativeBackground src="street.jpg" previousSrc="airplane.jpg" animated={true} />,
  );
  const sources = () =>
    [...container.querySelectorAll("image")].map((image) => image.getAttribute("src"));
  expect(sources()).toEqual(["airplane.jpg", "street.jpg"]);
  const image = screen.getByTestId("narrative-background-image");
  fireEvent(image, new window.Event("bindEvent:load"));
  expect(sources()).toEqual(["airplane.jpg", "street.jpg"]);
  fireEvent.animationend(image.parentElement!);
  expect(sources()).toEqual(["street.jpg"]);
});

test("기존 정적 배경에는 전환용 이미지가 추가되지 않는다", () => {
  const { container } = render(
    <NarrativeBackground src="store.jpg" previousSrc="airplane.jpg" animated={false} />,
  );
  expect(container.querySelectorAll("image")).toHaveLength(1);
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("data-motion", "static");
});
