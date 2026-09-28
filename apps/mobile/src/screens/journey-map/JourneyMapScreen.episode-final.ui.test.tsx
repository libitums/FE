import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { initialCompletedStepCount, journeySteps } from "./journey-map";

// `ui` 계층: 맵의 최종 테스트 항목이 진행에 따라 잠기고 열리는지 봅니다.

const finalTestId = "ui-lynx-learning-unit-tutorial-final-test";

function renderMap(allOthersDone: boolean, completedEpisodeFinalIds: EpisodeFinalUnitId[] = []) {
  const onStartEpisodeFinal = vi.fn<(id: EpisodeFinalUnitId) => void>();
  render(
    <JourneyMapScreen
      completedStepCount={allOthersDone ? journeySteps.length : initialCompletedStepCount}
      onStartStep={() => {}}
      completedMessengerUnitIds={allOthersDone ? ["appointment-confirmation"] : []}
      onStartMessengerUnit={() => {}}
      completedPhoneCallUnitIds={allOthersDone ? ["appointment-confirmation-phone-call"] : []}
      onStartPhoneCallUnit={() => {}}
      completedVisualNovelUnitIds={allOthersDone ? ["cafe-arrival-visual-novel"] : []}
      completedEpisodeFinalIds={completedEpisodeFinalIds}
      onStartEpisodeFinal={onStartEpisodeFinal}
    />,
  );
  return onStartEpisodeFinal;
}

test("[EMS1] 다른 항목이 남아 있으면 자물쇠로 서고, 눌러도 열리지 않는다", () => {
  const onStart = renderMap(false);

  const unit = screen.getByTestId(finalTestId);
  expect(unit).toHaveAttribute("data-status", "default");
  expect(screen.getByText("최종 테스트")).toBeInTheDocument();
  fireEvent.tap(unit, {});

  expect(onStart).not.toHaveBeenCalled();
});

test("[EMS2] 다른 항목을 모두 끝내면 열리고, 누르면 그 테스트를 연다", () => {
  const onStart = renderMap(true);

  const unit = screen.getByTestId(finalTestId);
  expect(unit).toHaveAttribute("data-status", "available");
  fireEvent.tap(unit, {});

  expect(onStart).toHaveBeenCalledWith("tutorial-final-test");
});

test("[EMS3] 끝낸 최종 테스트는 완료로 선다", () => {
  renderMap(true, ["tutorial-final-test"]);

  expect(screen.getByTestId(finalTestId)).toHaveAttribute("data-status", "clear");
});
