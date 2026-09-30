import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { NarrativeBackground } from "./NarrativeBackground";

const loadImage = () =>
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
const endAnimation = (element: Element, animationName: string) =>
  fireEvent.animationend(element, {
    params: { animation_type: "keyframe-animation", animation_name: animationName },
  });
const imageSources = (container: Element) =>
  [...container.querySelectorAll("image")].map((image) => image.getAttribute("src"));

test("일반 전환은 새 배경을 읽는 동안 이전 배경을 보존하고 해당 페이드 완료 뒤 해제한다", () => {
  const { container } = render(
    <NarrativeBackground src="street.jpg" previousSrc="airplane.jpg" animated={true} />,
  );
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  const frame = screen.getByTestId("narrative-background-image").parentElement!;
  expect(frame).toHaveClass("narrative-background-frame-loading");
  expect(screen.getByTestId("narrative-background")).toHaveAttribute(
    "data-transition",
    "crossfade",
  );
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  endAnimation(frame, "narrative-background-reveal");
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  loadImage();
  expect(frame).toHaveClass("narrative-background-frame-current");
  endAnimation(frame, "narrative-background-drift");
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  endAnimation(frame, "narrative-background-reveal");
  expect(imageSources(container)).toEqual(["street.jpg"]);
});

test("상상 전환은 그림이 로드된 뒤에만 기내 퇴장, 거리 등장, 빛의 베일을 함께 시작한다", () => {
  const { container } = render(
    <NarrativeBackground
      src="street.jpg"
      previousSrc="airplane.jpg"
      animated={true}
      transition="imagination"
    />,
  );
  expect(screen.getByTestId("narrative-background")).toHaveAttribute(
    "data-transition",
    "imagination",
  );
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  expect(container.querySelector(".narrative-background-image-departing")).toBeNull();
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  loadImage();
  expect(container.querySelector(".narrative-background-image-departing")).toHaveAttribute(
    "src",
    "airplane.jpg",
  );
  expect(screen.getByTestId("narrative-background-image")).toHaveClass(
    "narrative-background-image-imagination",
  );
  expect(screen.getByTestId("narrative-background-image").parentElement).toHaveClass(
    "narrative-background-frame-imagination",
  );
  expect(screen.getByTestId("narrative-imagination-veil")).toBeInTheDocument();
});

test("상상 전환은 다른 층의 종료와 다른 애니메이션 이름을 무시하고 베일 완료 때만 정리한다", () => {
  const { container } = render(
    <NarrativeBackground
      src="street.jpg"
      previousSrc="airplane.jpg"
      animated={true}
      transition="imagination"
    />,
  );
  loadImage();
  const image = screen.getByTestId("narrative-background-image");
  const veil = screen.getByTestId("narrative-imagination-veil");
  endAnimation(image, "narrative-imagination-drift");
  endAnimation(image.parentElement!, "narrative-imagination-reveal");
  endAnimation(
    container.querySelector(".narrative-background-image-departing")!,
    "narrative-imagination-depart",
  );
  endAnimation(veil, "narrative-background-reveal");
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  expect(veil).toBeInTheDocument();
  endAnimation(veil, "narrative-imagination-veil");
  expect(imageSources(container)).toEqual(["street.jpg"]);
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  // 이미지 load가 재보고되어도 완료한 진입을 다시 재생하지 않습니다.
  loadImage();
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
});

test.each([
  { animated: false, reducedMotion: false },
  { animated: true, reducedMotion: true },
])("정적/움직임 감소 설정에서는 현재 그림만 보인다: %j", (motion) => {
  const { container } = render(
    <NarrativeBackground
      src="store.jpg"
      previousSrc="airplane.jpg"
      transition="imagination"
      {...motion}
    />,
  );
  loadImage();
  expect(imageSources(container)).toEqual(["store.jpg"]);
  expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "none");
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("data-motion", "static");
  expect(screen.getByTestId("narrative-background-image")).toHaveClass(
    "narrative-background-image",
  );
  expect(screen.getByTestId("narrative-background-image").parentElement).toHaveAttribute(
    "class",
    "narrative-background-frame",
  );
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
});

test("상상 중 움직임 감소 설정을 켜면 이전 그림과 베일을 즉시 제거한다", () => {
  const props = {
    src: "street.jpg",
    previousSrc: "airplane.jpg",
    animated: true,
    transition: "imagination" as const,
  };
  const { container, rerender } = render(<NarrativeBackground {...props} />);
  loadImage();
  expect(screen.getByTestId("narrative-imagination-veil")).toBeInTheDocument();
  rerender(<NarrativeBackground {...props} reducedMotion={true} />);
  expect(imageSources(container)).toEqual(["street.jpg"]);
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("data-motion", "static");
});

test("진행 중 장면의 key가 교체되면 새 이미지의 로드를 기다리고 언마운트 때 모든 층을 제거한다", () => {
  const { container, rerender, unmount } = render(
    <NarrativeBackground
      key="street.jpg"
      src="street.jpg"
      previousSrc="airplane.jpg"
      animated={true}
      transition="imagination"
    />,
  );
  loadImage();
  expect(screen.getByTestId("narrative-imagination-veil")).toBeInTheDocument();
  rerender(
    <NarrativeBackground key="cafe.jpg" src="cafe.jpg" previousSrc="street.jpg" animated={true} />,
  );
  expect(imageSources(container)).toEqual(["street.jpg", "cafe.jpg"]);
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  expect(screen.getByTestId("narrative-background-image").parentElement).toHaveClass(
    "narrative-background-frame-loading",
  );
  loadImage();
  unmount();
  expect(container.querySelectorAll("image")).toHaveLength(0);
  expect(screen.queryByTestId("narrative-background")).not.toBeInTheDocument();
});
