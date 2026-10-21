import { expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { JourneyMapScreen } from "./JourneyMapScreen";

// `ui` 계층: 말풍선이 열린 채 맵을 스크롤하면 말풍선 자리만 바뀌고 **맵 본문(구획 · 노드)은 다시 그리지 않는다** —
// 매 프레임 노드 수십 개를 다시 그리던 것이 스크롤이 끊기던 까닭이었다(JourneyMapBody).

const renders = vi.hoisted(() => ({ count: 0 }));

vi.mock("./TutorialEpisodeSection", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./TutorialEpisodeSection")>();
  return {
    ...actual,
    TutorialEpisodeSection: (props: Parameters<typeof actual.TutorialEpisodeSection>[0]) => {
      renders.count += 1;
      return actual.TutorialEpisodeSection(props);
    },
  };
});

test("[MS1] 말풍선이 열린 채 스크롤해도 맵 본문은 다시 그리지 않고, 말풍선만 스크롤을 따라간다", () => {
  render(
    <JourneyMapScreen
      completedStepCount={2}
      onStartStep={() => {}}
      completedEpisodeIntroIds={["tutorial-intro"]}
      onStartEpisodeIntroUnit={() => {}}
      completedMessengerUnitIds={[]}
      onStartMessengerUnit={() => {}}
      completedPhoneCallUnitIds={[]}
      onStartPhoneCallUnit={() => {}}
      completedVisualNovelUnitIds={[]}
      onStartVisualNovelUnit={() => {}}
      completedEpisodeFinalIds={[]}
      onStartEpisodeFinal={() => {}}
    />,
  );
  const scrollRef = lynx.createSelectorQuery().select("#journey-map-screen-scroll");
  act(() => {
    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-ordering"), { detail: { y: 705 } });
  });
  const style = () =>
    screen.getByTestId("step-sheet-panel").parentElement?.getAttribute("style") ?? "";
  const before = style();
  const rendered = renders.count;

  for (const scrollTop of [40, 80, 120, 160]) {
    act(() => {
      fireEvent.scroll(scrollRef as unknown as Element, { detail: { scrollTop } });
    });
  }

  expect(style()).not.toBe(before);
  expect(renders.count).toBe(rendered);
});
