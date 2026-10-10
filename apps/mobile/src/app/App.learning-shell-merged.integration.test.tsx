import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { productJourneySeed } from "./journey-progress";
import { renderSignedInApp } from "./test-helpers/signed-in-app";
import { learningShellScrollId } from "../screens/learning/learning-shell-scroll";

// `integration` 계층: 껍데기가 한 스크롤로 합쳐진 흐름(learning-shell-large-font)에서 듣기 유닛을
// 앱 수준으로 끝까지 마치고 맵으로 돌아오는가(IN1). 합침은 작업 영역 스크롤에 낮은 높이의
// `layoutchange`를 쏘아 세운다(높이 읽기는 ui 계층이 닫는다). 오디오 호스트 경계(`NativeModules`)만
// 대체하고 나머지는 실물이다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tap = (id: string): void => void fireEvent.tap(screen.getByTestId(id), {});
const tapButtonIn = (id: string): void =>
  void fireEvent.tap(within(screen.getByTestId(id)).getByTestId("ui-lynx-button"), {});

/** 껍데기 스크롤에 높이를 보고합니다(`<scroll-view>`는 NodesRef로만 쏠 수 있습니다). */
function reportShellHeight(height: number): void {
  const ref = lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height } });
  });
}

// 듣기 형태를 쓰는 유닛은 오늘 `tutorial-listening` 하나이고 문항이 하나다(보기 둘, 정답은 「Hello」).
const unitId = "tutorial-listening";
const correctChoice = 0;

test("[IN1] 합친 흐름에서 듣기 유닛을 끝까지 풀어 맵으로 돌아오고 완료가 기록되며 재생은 문항당 1회다", async () => {
  const play = vi.fn<(source: string, done: (result: unknown) => void) => void>();
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: { play, stop: vi.fn<() => void>() },
  });
  await renderSignedInApp(
    <App
      completedEpisodeIntroIds={["tutorial-intro"]}
      journeySeed={{
        ...productJourneySeed,
        completedStepCount: 5,
        completedMessengerUnitIds: ["appointment-confirmation"],
        completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
        visualNovelProgress: { status: "completed", beatIndex: 2 },
      }}
    />,
  );

  tap(`ui-lynx-learning-unit-${unitId}`);
  tap("step-sheet-start");
  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
  // 합치기 전: 가른 배치다.
  expect(screen.queryByTestId("learning-shell-flow")).toBeNull();

  reportShellHeight(0);
  const flow = screen.getByTestId("learning-shell-flow");
  expect(within(flow).getByTestId("listening-choice-0")).toBeInTheDocument();
  expect(within(flow).getByTestId("listening-choice-1")).toBeInTheDocument();
  // 합쳐도 이 문항의 소리는 한 번이다(합치며 재시작하지 않는다).
  expect(play).toHaveBeenCalledTimes(1);

  tap(`listening-choice-${correctChoice}`);
  expect(screen.getByTestId("learning-shell-flow")).toBeInTheDocument();
  tap("learning-shell-advance");
  tap("learning-shell-action");
  expect(screen.getByTestId("lesson-complete-screen")).toBeInTheDocument();
  tapButtonIn("lesson-complete-screen-exit");

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.getByTestId(`ui-lynx-learning-unit-${unitId}`)).toHaveAttribute(
    "data-status",
    "clear",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-tutorial-speaking")).toHaveAttribute(
    "data-status",
    "active",
  );
  expect(play).toHaveBeenCalledTimes(1);
});
