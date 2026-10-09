import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { NarrativeBackground } from "./NarrativeBackground";

const loadImage = () =>
  fireEvent(screen.getByTestId("narrative-background-image"), new window.Event("bindEvent:load"));
const endAnimation = (element: Element, animationName: string) =>
  fireEvent.animationend(element, {
    params: { animation_type: "keyframe-animation", animation_name: animationName },
  });
const getFrame = () => screen.getByTestId("narrative-background-frame");
const getMotion = () => screen.getByTestId("narrative-background-motion");
const getPreviousMotion = () => screen.getByTestId("narrative-background-previous-motion");
const readCssRules = () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/screens/episode-narrative/narrative-background.css"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1]!.split(",").map((selector) => selector.trim()),
    declarations: match[2]!
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const colon = declaration.indexOf(":");
        return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()] as const;
      }),
  }));
};
const imageSources = (container: Element) =>
  [...container.querySelectorAll("image")].map((image) => image.getAttribute("src"));

test("일반 전환은 새 배경을 읽는 동안 이전 배경을 보존하고 해당 페이드 완료 뒤 해제한다", () => {
  const { container } = render(
    <NarrativeBackground src="street.jpg" previousSrc="airplane.jpg" animated={true} />,
  );
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  const frame = getFrame();
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
  endAnimation(getMotion(), "narrative-background-drift");
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
  expect(getPreviousMotion()).not.toHaveClass("narrative-background-motion-imagination-departing");
  expect(screen.queryByTestId("narrative-imagination-veil")).not.toBeInTheDocument();
  loadImage();
  expect(getPreviousMotion()).toHaveClass("narrative-background-motion-imagination-departing");
  expect(getPreviousMotion().querySelector("image")).toHaveAttribute("src", "airplane.jpg");
  expect(getMotion()).toHaveClass("narrative-background-motion-imagination");
  expect(getFrame()).toHaveClass("narrative-background-frame-imagination");
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
  const veil = screen.getByTestId("narrative-imagination-veil");
  endAnimation(getMotion(), "narrative-imagination-drift");
  endAnimation(getFrame(), "narrative-imagination-reveal");
  endAnimation(getPreviousMotion(), "narrative-imagination-depart");
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
  expect(getFrame()).toHaveAttribute("class", "narrative-background-frame");
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
  expect(getFrame()).toHaveClass("narrative-background-frame-loading");
  loadImage();
  unmount();
  expect(container.querySelectorAll("image")).toHaveLength(0);
  expect(screen.queryByTestId("narrative-background")).not.toBeInTheDocument();
});

test("현실 복귀는 기내 그림을 읽은 뒤 시작하고 현실 베일의 종료 때만 카페를 정리한다", () => {
  const { container } = render(
    <NarrativeBackground
      src="airplane.jpg"
      previousSrc="cafe.jpg"
      animated={true}
      transition="reality"
    />,
  );
  expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "reality");
  expect(imageSources(container)).toEqual(["cafe.jpg", "airplane.jpg"]);
  expect(getFrame()).toHaveClass("narrative-background-frame-loading");
  expect(screen.queryByTestId("narrative-reality-veil")).not.toBeInTheDocument();
  loadImage();
  const veil = screen.getByTestId("narrative-reality-veil");
  expect(getMotion()).toHaveClass("narrative-background-motion-reality");
  expect(getFrame()).toHaveClass("narrative-background-frame-reality");
  expect(getPreviousMotion()).toHaveClass("narrative-background-motion-reality-departing");
  expect(getPreviousMotion().querySelector("image")).toHaveAttribute("src", "cafe.jpg");
  endAnimation(getFrame(), "narrative-background-reveal");
  endAnimation(veil, "narrative-imagination-veil");
  expect(imageSources(container)).toEqual(["cafe.jpg", "airplane.jpg"]);
  endAnimation(veil, "narrative-reality-veil");
  expect(imageSources(container)).toEqual(["airplane.jpg"]);
  expect(screen.queryByTestId("narrative-reality-veil")).not.toBeInTheDocument();
});

test.each(["imagination", "reality"] as const)(
  "%s: 같은 배경의 다음 독백은 진행 중 출발 그림과 전환을 유지하고 완료 후 다시 시작하지 않는다",
  (transition) => {
    const { container, rerender } = render(
      <NarrativeBackground
        key="destination.jpg"
        src="destination.jpg"
        previousSrc="source.jpg"
        animated={true}
        transition={transition}
      />,
    );
    loadImage();
    const image = screen.getByTestId("narrative-background-image");
    const veil = screen.getByTestId(`narrative-${transition}-veil`);
    const nextBeat = (
      <NarrativeBackground
        key="destination.jpg"
        src="destination.jpg"
        previousSrc="destination.jpg"
        animated={true}
      />
    );
    rerender(nextBeat);
    expect(screen.getByTestId("narrative-background-image")).toBe(image);
    expect(screen.getByTestId(`narrative-${transition}-veil`)).toBe(veil);
    expect(imageSources(container)).toEqual(["source.jpg", "destination.jpg"]);
    expect(screen.getByTestId("narrative-background")).toHaveAttribute(
      "data-transition",
      transition,
    );
    endAnimation(veil, `narrative-${transition}-veil`);
    rerender(nextBeat);
    loadImage();
    expect(imageSources(container)).toEqual(["destination.jpg"]);
    expect(screen.queryByTestId(`narrative-${transition}-veil`)).not.toBeInTheDocument();
    expect(getFrame()).toHaveClass(`narrative-background-frame-${transition}`);
  },
);

test("현실 복귀 중 움직임 감소를 켜면 기내 정지 화면만 남긴다", () => {
  const props = {
    src: "airplane.jpg",
    previousSrc: "cafe.jpg",
    animated: true,
    transition: "reality" as const,
  };
  const { container, rerender } = render(<NarrativeBackground {...props} />);
  loadImage();
  expect(screen.getByTestId("narrative-reality-veil")).toBeInTheDocument();
  rerender(<NarrativeBackground {...props} reducedMotion={true} />);
  expect(imageSources(container)).toEqual(["airplane.jpg"]);
  expect(screen.queryByTestId("narrative-reality-veil")).not.toBeInTheDocument();
  expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("data-motion", "static");
  expect(getFrame()).toHaveAttribute("class", "narrative-background-frame");
});

const motionProps = {
  src: "street.jpg",
  previousSrc: "airplane.jpg",
  animated: true,
} as const;

test("NB1: 어떤 상태에서도 그림 요소의 클래스는 animation을 선언한 CSS 규칙에 걸리지 않는다", () => {
  const rules = readCssRules();
  const states = [
    { props: motionProps, loaded: true },
    { props: { ...motionProps, transition: "imagination" as const }, loaded: true },
    { props: { ...motionProps, transition: "reality" as const }, loaded: true },
    { props: motionProps, loaded: false },
    { props: { ...motionProps, animated: false }, loaded: true },
  ];
  const offenders: string[] = [];
  for (const state of states) {
    const { container, unmount } = render(<NarrativeBackground {...state.props} />);
    if (state.loaded) loadImage();
    const images = [...container.querySelectorAll("image")];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      for (const className of (image.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)) {
        for (const rule of rules) {
          const hits = rule.selectors.some((selector) =>
            new RegExp(`\\.${className}(?![\\w-])`).test(selector),
          );
          if (hits && rule.declarations.some(([property]) => property === "animation")) {
            offenders.push(`${className} -> ${rule.selectors.join(", ")}`);
          }
        }
      }
    }
    unmount();
  }
  expect(offenders).toEqual([]);
});

test.each(["current", "imagination", "reality"] as const)(
  "NB2: %s 로드 후 움직임 상자는 frame의 자식이고 그림의 부모이며 -motion-<프로필> 클래스를 가진다",
  (profile) => {
    render(
      <NarrativeBackground
        {...motionProps}
        transition={profile === "current" ? undefined : profile}
      />,
    );
    loadImage();
    const motion = getMotion();
    expect(motion.parentElement).toBe(getFrame());
    expect(screen.getByTestId("narrative-background-image").parentElement).toBe(motion);
    expect(motion).toHaveClass("narrative-background-motion");
    expect(motion).toHaveClass(`narrative-background-motion-${profile}`);
  },
);

test.each(["imagination", "reality"] as const)(
  "NB3: %s 로드 후 이전 그림 상자가 -departing 클래스를 지고 그림은 기본 클래스만 가진다",
  (transition) => {
    render(<NarrativeBackground {...motionProps} transition={transition} />);
    loadImage();
    const previous = getPreviousMotion();
    expect(previous).toHaveClass(`narrative-background-motion-${transition}-departing`);
    const image = previous.querySelector("image");
    expect(image).toHaveAttribute("src", "airplane.jpg");
    expect(image).toHaveAttribute("class", "narrative-background-image");
  },
);

test("NB4: 정적/움직임 줄이기/로딩 중에는 두 상자 모두 기본 클래스만 가진다", () => {
  const { unmount } = render(<NarrativeBackground {...motionProps} transition="imagination" />);
  expect(getMotion()).toHaveAttribute("class", "narrative-background-motion");
  expect(getPreviousMotion()).toHaveAttribute("class", "narrative-background-motion");
  unmount();

  for (const props of [
    { ...motionProps, animated: false },
    { ...motionProps, reducedMotion: true },
  ]) {
    const view = render(<NarrativeBackground {...props} transition="reality" />);
    loadImage();
    expect(getMotion()).toHaveAttribute("class", "narrative-background-motion");
    expect(screen.queryByTestId("narrative-background-previous-motion")).not.toBeInTheDocument();
    view.unmount();
  }
});

test("NB5: CSS는 움직임 상자를 inset 0 묶음에 두고 애니메이션을 상자 선택자로 옮겼다", () => {
  const rules = readCssRules();
  const inset = rules.find((rule) => rule.selectors.includes(".narrative-background-motion"));
  expect(inset).toBeDefined();
  expect(inset!.declarations).toEqual([
    ["position", "absolute"],
    ["top", "0"],
    ["right", "0"],
    ["bottom", "0"],
    ["left", "0"],
  ]);
  const boxDeclarations = rules
    .filter((rule) => rule.selectors.includes(".narrative-background-motion"))
    .flatMap((rule) => rule.declarations.map(([property]) => property));
  for (const forbidden of ["overflow", "transform-origin", "background", "background-image"]) {
    expect(boxDeclarations).not.toContain(forbidden);
  }
  const animationOf = (selector: string) =>
    rules
      .filter((rule) => rule.selectors.length === 1 && rule.selectors[0] === selector)
      .flatMap((rule) => rule.declarations)
      .find(([property]) => property === "animation")?.[1];
  expect({
    current: animationOf(".narrative-background-motion-current"),
    imagination: animationOf(".narrative-background-motion-imagination"),
    reality: animationOf(".narrative-background-motion-reality"),
    imaginationDeparting: animationOf(".narrative-background-motion-imagination-departing"),
    realityDeparting: animationOf(".narrative-background-motion-reality-departing"),
  }).toEqual({
    current: "narrative-background-drift 6000ms var(--libitum-motion-easing-easing) both",
    imagination: "narrative-imagination-drift 6000ms ease-out both",
    reality: "narrative-background-drift 2800ms ease-in reverse both",
    imaginationDeparting: "narrative-imagination-depart 3000ms ease-in-out both",
    realityDeparting: "narrative-reality-depart 2800ms ease-out both",
  });
  const css = readFileSync(
    resolve(process.cwd(), "src/screens/episode-narrative/narrative-background.css"),
    "utf8",
  );
  expect(css).not.toMatch(/\.narrative-background-image-(current|imagination|reality)/);
});

test("NB6: crossfade는 움직임 상자의 drift 종료로는 이전 그림을 해제하지 않고 frame의 reveal 종료로 해제한다", () => {
  const { container } = render(<NarrativeBackground {...motionProps} />);
  loadImage();
  endAnimation(getMotion(), "narrative-background-drift");
  expect(imageSources(container)).toEqual(["airplane.jpg", "street.jpg"]);
  endAnimation(getFrame(), "narrative-background-reveal");
  expect(imageSources(container)).toEqual(["street.jpg"]);
});
