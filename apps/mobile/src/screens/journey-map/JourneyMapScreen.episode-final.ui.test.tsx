import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { initialCompletedStepCount, journeySteps } from "./journey-map";

// `ui` 계층: 맵의 최종 테스트 항목이 진행에 따라 잠기고 열리는지 봅니다.

const finalTestId = "ui-lynx-learning-unit-tutorial-final-test";

// ⟨개정⟩ **「다른 항목」에 표지가 낍니다**(D2·D6). 전에는 여덟이었고 이제 아홉입니다 —
// `allOthersDone`이 표지 완료를 **함께** 넘기지 않으면 최종은 잠긴 채입니다. 그 한
// 자리를 빠뜨린 채 「모두 끝냈다」고 적으면 케이스 이름이 거짓말을 하므로, 인자 하나가
// 아홉을 함께 움직이게 둡니다. 「넘기지 않으면 잠긴 채」는 아래 `EMS4`가 따로 봅니다.
function renderMap(
  allOthersDone: boolean,
  completedEpisodeFinalIds: EpisodeFinalUnitId[] = [],
  completedEpisodeIntroIds: readonly EpisodeIntroUnitId[] = allOthersDone ? ["tutorial-intro"] : [],
) {
  const onStartEpisodeFinal = vi.fn<(id: EpisodeFinalUnitId) => void>();
  render(
    <JourneyMapScreen
      completedStepCount={allOthersDone ? journeySteps.length : initialCompletedStepCount}
      onStartStep={() => {}}
      completedEpisodeIntroIds={completedEpisodeIntroIds}
      onStartEpisodeIntroUnit={() => {}}
      completedMessengerUnitIds={allOthersDone ? ["appointment-confirmation"] : []}
      onStartMessengerUnit={() => {}}
      completedPhoneCallUnitIds={allOthersDone ? ["appointment-confirmation-phone-call"] : []}
      onStartPhoneCallUnit={() => {}}
      completedVisualNovelUnitIds={allOthersDone ? ["cafe-arrival-visual-novel"] : []}
      onStartVisualNovelUnit={() => {}}
      completedEpisodeFinalIds={completedEpisodeFinalIds}
      onStartEpisodeFinal={onStartEpisodeFinal}
    />,
  );
  return onStartEpisodeFinal;
}

// ⟨개정⟩ 관찰은 그대로이고 **근거가 둘로 늘었습니다** — 스텝이 남아 있는 것과 표지가
// 남아 있는 것 둘 다 이 자물쇠를 설명합니다. 표지 축만 떼어 보는 것이 `EMS4`입니다.
test("[EMS1] 다른 항목이 남아 있으면 자물쇠로 서고, 눌러도 열리지 않는다", () => {
  const onStart = renderMap(false);

  const unit = screen.getByTestId(finalTestId);
  expect(unit).toHaveAttribute("data-status", "default");
  expect(screen.getByText("Final test")).toBeInTheDocument();
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

// ⟨신규⟩ `EMS2`의 뒷면입니다 — 표지 하나만 빼고 여덟을 다 끝내도 최종은 **잠긴 채**입니다.
// 표지가 「다른 항목」에 실제로 세어지는지를 이 한 자리가 가릅니다: 표지를 안 세는
// 구현은 `EMS2`를 통과하면서 여기서만 빨개집니다.
test("[EMS4] 표지만 남겨 두면 나머지를 다 끝내도 잠긴 채다", () => {
  const onStart = renderMap(true, [], []);

  const unit = screen.getByTestId(finalTestId);
  expect(unit).toHaveAttribute("data-status", "default");
  fireEvent.tap(unit, {});

  expect(onStart).not.toHaveBeenCalled();
});
