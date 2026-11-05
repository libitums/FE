import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import { backHandlers } from "../lib/back-handler";
import { UiCopyContext, uiCopyFor } from "../lib/ui-copy";
import { LearningItemGuide } from "./LearningItemGuide";

// `ui` 계층: 활동 안내 종류의 문구(언어별 표를 그대로) · 화살표 오르내림(standard) · 정지(reduced) — ADR-0104 D4 · D5.

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

const arrow = (): Element => {
  const found = screen
    .getByTestId("learning-item-guide-activity-listening")
    .querySelector('[class~="first-unit-guide-arrow"]');
  expect(found, "first-unit-guide-arrow").not.toBeNull();
  return found as Element;
};
const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

test("[AU1] 활동 안내는 그 언어 표의 제목 · 설명을 그린다", () => {
  const copy = uiCopyFor("vi");
  render(
    <UiCopyContext.Provider value={copy}>
      <LearningItemGuide kind="activity-listening" onDismiss={() => {}} />
    </UiCopyContext.Provider>,
  );
  expect(screen.getByTestId("learning-item-guide-title")).toHaveTextContent(
    copy.learningItemGuide["activity-listening"].title,
  );
  expect(screen.getByTestId("learning-item-guide-description")).toHaveTextContent(
    copy.learningItemGuide["activity-listening"].description,
  );
});

test("[AU2] 기본 움직임에서는 화살표가 오르내림 클래스를 단다", () => {
  render(<LearningItemGuide kind="activity-listening" onDismiss={() => {}} />);
  expect(classes(arrow())).toContain("learning-item-guide-arrow-bob");
});

test("[AU3] 움직임 줄이기에서는 오르내림 클래스가 없다", () => {
  render(
    <MotionProvider motion="reduced">
      <LearningItemGuide kind="activity-listening" onDismiss={() => {}} />
    </MotionProvider>,
  );
  expect(classes(arrow())).not.toContain("learning-item-guide-arrow-bob");
});

test("[AU4] 오르내림은 CSS keyframes(translateY)이고 무한 반복이 아니다(5초 안에 멈춤)", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/components/learning-item-guide.css"),
    "utf8",
  );
  expect(css).toMatch(/@keyframes\s+learning-item-guide-arrow-bob/);
  expect(css).toMatch(
    /\.learning-item-guide-arrow-bob\s*\{[^}]*animation:[^}]*learning-item-guide-arrow-bob/,
  );
  expect(css).toMatch(/translateY\(/);
  expect(css).not.toMatch(/learning-item-guide-arrow-bob[^}]*infinite/);
});
