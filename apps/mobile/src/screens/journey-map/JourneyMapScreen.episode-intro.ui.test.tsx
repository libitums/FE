import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import bookmark from "@libitums/icons/lynx/bookmark";

import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen, type JourneyMapScreenProps } from "./JourneyMapScreen";
import { initialCompletedStepCount, journeySteps, type JourneyStepId } from "./journey-map";

// `ui` 계층: 표지 유닛이 **에피소드 줄의 첫 자리**에 서고, 그것이 끝나기 전에는 그
// 구획의 나머지 아홉이 잠기는지를 봅니다(D6). 잠김을 **내는** 것은 순수 파생
// (`mapItemStatus`)이고 `unit`이 그 규칙을 집니다 — 여기서는 화면이 그 파생을 실제로
// 소비해 표식과 조작 가능성으로 옮기는지까지입니다.

const introTestId = "ui-lynx-learning-unit-tutorial-intro";
const finalTestId = "ui-lynx-learning-unit-tutorial-final-test";

// 맵의 세로 줄 순서입니다 — `journey-map-units.ts`의 유닛 목록에서 나온 열 자리이고,
// **표지가 0번**입니다. 이 배열이 곧 UI-I2의 기댓값입니다.
const mapUnitIds = [
  "tutorial-intro",
  "greeting",
  "introduction",
  "ordering",
  "appointment",
  "appointment-confirmation",
  "appointment-confirmation-phone-call",
  "cafe-arrival-visual-novel",
  "directions",
  "tutorial-final-test",
] as const;

// 표지 뒤에 서는 특별 유닛 넷입니다 — 표지 전에는 넷 다 잠깁니다(UI-L1).
const specialUnitIds = [
  "appointment-confirmation",
  "appointment-confirmation-phone-call",
  "cafe-arrival-visual-novel",
  "tutorial-final-test",
] as const;

const introDone: readonly EpisodeIntroUnitId[] = ["tutorial-intro"];

function renderMap(overrides: Partial<JourneyMapScreenProps> = {}) {
  const handlers = {
    onStartStep: vi.fn<(id: JourneyStepId) => void>(),
    onStartEpisodeIntroUnit: vi.fn<(id: EpisodeIntroUnitId) => void>(),
    onStartMessengerUnit: vi.fn<(id: MessengerUnitId) => void>(),
    onStartPhoneCallUnit: vi.fn<(id: PhoneCallUnitId) => void>(),
    onStartVisualNovelUnit: vi.fn<(id: VisualNovelUnitId) => void>(),
    onStartEpisodeFinal: vi.fn<(id: EpisodeFinalUnitId) => void>(),
  };
  const view = render(
    <JourneyMapScreen
      completedStepCount={initialCompletedStepCount}
      completedEpisodeIntroIds={[]}
      completedMessengerUnitIds={[]}
      completedPhoneCallUnitIds={[]}
      completedVisualNovelUnitIds={[]}
      completedEpisodeFinalIds={[]}
      {...handlers}
      {...overrides}
    />,
  );
  // 한 케이스가 두 진행을 잇달아 보는 자리가 있어(`UI-I3`·`UI-I6`·`UI-I7`) 언마운트를
  // 함께 돌려줍니다 — 둘을 한 문서에 두면 testid가 겹칩니다.
  return { ...handlers, unmount: view.unmount };
}

// 맵 상자 안에서 유닛 표식만 문서 순서로 뽑습니다. 선택자를 testid로 적는 것은
// 클래스 이름이 앵커가 되지 않게 하기 위해서입니다(`JourneyMapScreen.messenger.ui.test.tsx`
// C1과 같은 형태입니다).
function renderedUnitIdsInOrder(): (string | null)[] {
  const map = screen.getByTestId("journey-map-screen-map");
  return [
    ...map.querySelectorAll(
      mapUnitIds.map((id) => `[data-testid=ui-lynx-learning-unit-${id}]`).join(","),
    ),
  ].map((node) => node.getAttribute("data-testid"));
}

test("[UI-I1] 맵에 표지 항목이 선다", () => {
  renderMap();

  expect(screen.getByTestId(introTestId)).toBeInTheDocument();
  expect(screen.getByText("Episode intro")).toBeInTheDocument();
});

// 표지가 **맨 앞**에 서면 「줄의 자리 ≠ 스텝의 서수」가 모든 스텝에서 어긋납니다 —
// 앞부분만 맞는 구현으로는 통과하지 못하는 첫 배치입니다(ADR-0024 C2).
test("[UI-I2] 표지가 맵 상자의 첫 자식 유닛이고 뒤로 아홉이 목록 순서대로 선다", () => {
  renderMap();

  const rendered = renderedUnitIdsInOrder();
  expect(rendered[0]).toBe(introTestId);
  expect(rendered).toEqual(mapUnitIds.map((id) => `ui-lynx-learning-unit-${id}`));
});

test("[UI-I3] 미완료면 열린 표식, 완료면 완료 표식으로 선다", () => {
  const { unmount } = renderMap();
  expect(screen.getByTestId(introTestId)).toHaveAttribute("data-status", "available");
  unmount();

  renderMap({ completedEpisodeIntroIds: introDone });
  expect(screen.getByTestId(introTestId)).toHaveAttribute("data-status", "clear");
});

// 표지 자신은 잠기지 않습니다 — 구획의 첫 항목이라 앞에 걸 것이 없습니다(spec §2.9).
// 진행이 0이어도 참이라는 것을 못박습니다: 여기서 `default`가 나오면 잠김 파생이
// 표지까지 덮은 것이고, 그러면 **아무것도 열 수 없는 맵**이 됩니다.
test("[UI-I4] 진행이 0이어도 표지는 잠기지 않는다", () => {
  renderMap({ completedStepCount: 0 });

  const intro = screen.getByTestId(introTestId);
  expect(intro).not.toHaveAttribute("data-status", "default");
  expect(intro).toHaveAttribute("data-status", "available");
  expect(intro).toHaveAttribute("accessibility-traits", "button");
});

test("[UI-I5] 표지를 누르면 onStartEpisodeIntroUnit이 그 id로 한 번 불린다", () => {
  const handlers = renderMap();

  fireEvent.tap(screen.getByTestId(introTestId), {});

  expect(handlers.onStartEpisodeIntroUnit).toHaveBeenCalledTimes(1);
  expect(handlers.onStartEpisodeIntroUnit).toHaveBeenCalledWith("tutorial-intro");
  // 표지의 탭은 스텝 말풍선을 열지 않습니다 — 특별 유닛은 시트를 거치지 않습니다.
  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// ⚠ 낭독 이름의 제목이 「에피소드 **표지**」인 것은 계약이 정한 것입니다
// (`episode-intro.contract.ts`의 `EpisodeIntroTitle`). 상태 접미사와 「이야기 연결」은
// `LearningUnit`이 붙입니다(ADR-0016 D3) — `available`에는 접미사가 없습니다.
test("[UI-I6] 표지의 낭독 이름이 상태에 따라 갈린다", () => {
  const { unmount } = renderMap();
  expect(screen.getByTestId(introTestId)).toHaveAttribute(
    "accessibility-label",
    "Episode intro, story",
  );
  unmount();

  renderMap({ completedEpisodeIntroIds: introDone });
  expect(screen.getByTestId(introTestId)).toHaveAttribute(
    "accessibility-label",
    "Episode intro, completed, story",
  );
});

// 헤더 막대가 재는 것은 **그 아래 줄에 선 것**의 진행입니다 — 화면에 열 줄이 서는데
// 아홉을 세면 사용자가 대조할 수 없습니다(spec §2.7). 분자도 같은 단위입니다.
test("[UI-I7] 에피소드 헤더의 분모가 13이고 분자가 끝낸 맵 항목 수다", () => {
  const { unmount } = renderMap();
  expect(screen.getAllByTestId("ui-lynx-episode-header-count")[0]).toHaveTextContent("0 / 13");
  unmount();

  // 표지를 끝내면 분자가 하나 늡니다 — 표지가 진행의 여섯째 출처입니다.
  renderMap({ completedEpisodeIntroIds: introDone });
  expect(screen.getAllByTestId("ui-lynx-episode-header-count")[0]).toHaveTextContent("1 / 13");
});

// 「줄 중간에 낀 항목 뒤」를 **줄 머리에 낀** 경우로 한 번 더 봅니다. `directions`는
// 줄에서 아홉째 자리인데 스텝 서수는 다섯째입니다 — 자리로 세면 잠긴 채로 남습니다.
test("[UI-I8] 표지 뒤의 스텝 다섯이 여전히 자기 서수의 상태를 낸다", () => {
  renderMap({ completedEpisodeIntroIds: introDone, completedStepCount: 4 });

  const expected: Record<JourneyStepId, string> = {
    greeting: "clear",
    introduction: "clear",
    ordering: "clear",
    appointment: "clear",
    directions: "default",
    "tutorial-listening": "default",
    "tutorial-speaking": "default",
    "tutorial-writing": "default",
  };
  journeySteps.forEach((step) => {
    expect(screen.getByTestId(`ui-lynx-learning-unit-${step.id}`)).toHaveAttribute(
      "data-status",
      expected[step.id],
    );
  });
});

// UI-B1 — 표지는 `bookmark`를 그립니다. 계약 기본값 `clapper`는 `LearningUnit`이
// `narrative` 유닛에 찍는 **배지**가 이미 쓰고 있어 한 표식 안에 같은 글리프가 둘
// 섭니다(design.md §1.1). 글리프 비교는 `EpisodeIntroMapItem.ui.test.tsx`가 자세히
// 하고, 여기서는 **맵에 선 표지**가 그 아이콘을 실어 내는지만 봅니다.
test("[UI-B1] 맵의 표지 항목이 bookmark를 그린다", () => {
  renderMap();

  const icon = screen.getByTestId(`${introTestId}-icon`);
  const painted = icon.getAttribute("current-color") ?? "";
  expect((icon.getAttribute("content") ?? "").split(painted).join("currentColor")).toBe(bookmark);
});

// ---------------------------------------------------------------- 잠김 축 (D6)
//
// 부팅 직후 맵이 통째로 바뀝니다 — 전에는 「완료 둘 · 현재 하나 · 잠김 여섯」이었고
// 이제는 **표지만 열리고 나머지 아홉이 전부 잠깁니다**(spec §2.7의 관찰 델타 표).
// 이것은 숨기는 관찰이 아니라 사용자가 답으로 준 결정입니다.

test("[UI-L1] 표지 미완료면 특별 유닛 넷이 자물쇠로 서고 눌러도 열리지 않는다", () => {
  const handlers = renderMap();

  specialUnitIds.forEach((id) => {
    const unit = screen.getByTestId(`ui-lynx-learning-unit-${id}`);
    expect(unit).toHaveAttribute("data-status", "default");
    fireEvent.tap(unit, {});
  });

  expect(handlers.onStartMessengerUnit).not.toHaveBeenCalled();
  expect(handlers.onStartPhoneCallUnit).not.toHaveBeenCalled();
  expect(handlers.onStartVisualNovelUnit).not.toHaveBeenCalled();
  expect(handlers.onStartEpisodeFinal).not.toHaveBeenCalled();
});

// 스텝 노드는 `mapItemStatus`를 쓰지 않습니다 — `done`/`current`가 그 어휘에 없기
// 때문입니다(spec §2.9). 대신 표지 미완료면 `locked`로 **덮는** 한 겹이 앞에 붙습니다.
// ⚠ `initialCompletedStepCount`가 2인데도 둘이 잠기는 것이 그 덮기의 관찰입니다 —
// 씨앗을 고쳐 이 관찰을 0으로 만들지 않습니다(spec §2.7).
test("[UI-L2] 표지 미완료면 스텝 다섯도 잠기고 시트가 열리지 않는다", () => {
  const handlers = renderMap();

  journeySteps.forEach((step) => {
    const unit = screen.getByTestId(`ui-lynx-learning-unit-${step.id}`);
    expect(unit).toHaveAttribute("data-status", "default");
    expect(unit).toHaveAttribute("accessibility-traits", "disabled");
    fireEvent.tap(unit, {});
  });

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(handlers.onStartStep).not.toHaveBeenCalled();
});

// 잠김이 완료를 **지우는** 것이 아니라 **가리는** 것입니다 — 표지를 끝내면 가려져
// 있던 `initialCompletedStepCount`가 그대로 드러납니다.
test("[UI-L3] 표지를 끝내면 첫 학습만 열리고 뒤 유닛은 잠긴다", () => {
  renderMap({ completedEpisodeIntroIds: introDone });
  expect(screen.getByTestId("ui-lynx-learning-unit-greeting")).toHaveAttribute(
    "data-status",
    "active",
  );
  expect(screen.getByTestId("ui-lynx-learning-unit-introduction")).toHaveAttribute(
    "data-status",
    "default",
  );
  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-greeting"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
});

// 특별 유닛도 선행 학습 완료 전에는 잠깁니다.
test("[엣지] 표지만 완료하면 가운데 특별 유닛 셋은 잠겨 있다", () => {
  const handlers = renderMap({ completedEpisodeIntroIds: introDone });

  const middle = [
    "appointment-confirmation",
    "appointment-confirmation-phone-call",
    "cafe-arrival-visual-novel",
  ] as const;
  middle.forEach((id) => {
    expect(screen.getByTestId(`ui-lynx-learning-unit-${id}`)).toHaveAttribute(
      "data-status",
      "default",
    );
  });

  fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-cafe-arrival-visual-novel"), {});
  expect(handlers.onStartVisualNovelUnit).not.toHaveBeenCalled();
  // 최종 테스트는 여전히 잠깁니다 — 같은 구획의 다른 항목이 모두 끝나야 열립니다.
  expect(screen.getByTestId(finalTestId)).toHaveAttribute("data-status", "default");
});
