import { u01OpenSeed } from "./test-helpers/progress-seed";
import { catalogNodeTestId } from "./test-helpers/map-unit-testid";
import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// `integration` 계층: 여러 실제 모듈의 협력을 봅니다(ADR-0006 D4).
// 여기서는 App · navReducer · BottomNavigator · 화면 셋 · ErrorBoundary가 맞물립니다.
// 목킹하지 않습니다 — 외부 IO가 생기면 그 경계에서만 대체합니다.
//
// 텍스트 질의(`getByText`)는 쓰지 않습니다 — 화면 제목과 탭 라벨이 같은 문자열을
// 공유하는 조합이 있어(`홈`, `설정`) 모호합니다. 전부 `data-testid`로 질의합니다.

const S1 = catalogNodeTestId("u01-water", "S1");

afterEach(() => {
  vi.unstubAllGlobals();
});

test("루트가 현재 탭 스택의 최상단 화면을 렌더한다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

test("설정 탭에서 여정 탭으로 전환하면 여정 맵 화면이 나오고 설정 화면은 사라진다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("여정 탭에서 롤플레이 탭으로 전환하면 롤플레이 화면이 나오고 여정 맵 화면은 사라진다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("Roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("여정 탭에서 설정 탭으로 전환하면 설정 화면이 나오고 여정 맵 화면은 사라진다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("Settings");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("설정 → 여정 → 설정으로 왕복하면 설정의 루트 화면이 그대로 다시 나온다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("Settings");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

// ---------------------------------------------------------------- 여정 맵 + 스텝 시트
// `App` · `navReducer` · `BottomNavigator` · `JourneyMapScreen` · `JourneyStepNode` ·
// `StepSheet`가 실제로 맞물리는지를 봅니다. 목킹하지 않습니다 — 외부 IO가 없습니다.

test("여정 탭으로 전환하면 u01의 레슨 노드가 렌더된다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  for (const key of ["S1", "S2", "S3"]) {
    expect(screen.getByTestId(catalogNodeTestId("u01-water", key))).toBeInTheDocument();
  }
});

// 스택 깊이 불변의 **대리 관찰**입니다. `Nav` 스택 깊이는 밖으로 노출되지 않으므로
// 직접 셀 수 없습니다 — 시트가 열려도 셸(탭 셋 · 여정 탭의 선택 상태)이 그대로라는
// 것으로 대신 봅니다. 셸이 사라지거나 선택이 바뀌면 스택이 깊어졌다는 신호입니다.
test("스텝을 누르면 시트가 열리고 셸이 그대로다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  fireEvent.tap(screen.getByTestId(S1), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-journey")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

test("시트를 닫으면 시트만 사라지고 화면 제목과 셸은 그대로다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(S1), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

// 시트 상태는 `Nav`가 아니라 화면 로컬 상태입니다(ADR-0007 D1) — 탭을 떠나면
// `JourneyMapScreen`이 언마운트되며 `useReducer` 상태가 버려집니다. 그래서
// 되돌아왔을 때 시트는 닫혀 있는 것이 정상입니다. 「다른 탭」은 설정입니다(홈
// 탭이 없으므로).
test("시트를 연 채 다른 탭으로 갔다 여정 탭으로 돌아오면 시트가 닫혀 있다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(S1), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

test("시트가 열린 동안에도 탭 전환이 동작한다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(S1), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});

  expect(screen.getByTestId("roleplay-list-screen-title")).toHaveTextContent("Roleplay");
  expect(screen.queryByTestId("journey-map-screen")).not.toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

// -------------------------------------------------------------------- 스크롤 영역
//
// **왜 `integration`인가.** 탭 전환·스택 진입을 거쳐 여섯 화면 전부에서 스크롤
// 컨테이너를 확인하는 것은 단일 컴포넌트를 고립 렌더해서는 성립하지 않습니다 —
// `App` · `navReducer` · `BottomNavigator` · 화면 여섯의 협력입니다. 목킹하지
// 않습니다 — 외부 IO가 없습니다.
//
// **왜 이 자리에 두는가.** 이 이슈의 위험은 한 화면의 버그가 아니라 **부분
// 적용**입니다 — 같은 모양 여섯 곳이 남아 있다가 다른 세션의 실측으로 찾아진
// 적이 있습니다. 다음번에는 실측이 아니라 이 케이스가 찾습니다. 화면이 스물 몇
// 개로 늘 때 여기에 행을 더하는 것이 규약을 유지하는 값싼 방법입니다.
//
// **`integration`이 못 보는 것은 `ui`와 같습니다** — jsdom에는 레이아웃이
// 없습니다. 여기서 단언하는 것은 "스크롤 컨테이너가 testid로 존재/부재한다"까지
// 입니다. 실제로 스크롤되는가·고정이 지켜지는가는 실기(e2e)의 몫입니다.

// 탭 셋을 순회하며 각 화면에 스크롤 컨테이너가 하나씩 있는지 봅니다. 화면을
// 옮길 때마다 이전 화면의 스크롤 컨테이너가 사라지는 것도 함께 봅니다 —
// "어딘가에 하나 있다"가 아니라 "그 화면의 것이 있다"를 확인하기 위해서입니다.
// 첫 화면이 여정 맵이라(홈 탭 제거) 순회는 여정 맵 → 롤플레이 → 설정입니다.
test("탭 셋을 순회하며 각 화면에 스크롤 컨테이너가 하나씩 있다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen-scroll")).not.toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
  expect(screen.getByTestId("settings-screen-scroll")).toBeInTheDocument();
  expect(screen.queryByTestId("roleplay-list-screen-scroll")).not.toBeInTheDocument();
});

// 탭 스택이 아니라 **스택에 쌓인 화면**에도 스크롤 컨테이너가 있는지 봅니다 —
// 여정 맵 → 스텝 tap → 시트 `시작` → 듣기 화면.
test("탭이 아니라 스택에 쌓인 화면(듣기)에도 스크롤 컨테이너가 있다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(S1), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(screen.getByTestId("learning-shell-stage")).toBeInTheDocument();
  expect(screen.queryByTestId("journey-map-screen-scroll")).not.toBeInTheDocument();
});

// 회귀 절반입니다: 여정 맵 화면도 스크롤 컨테이너를 갖는다는 것을 시트가 열려도
// 그대로 유지합니다 — 시트는 스크롤 밖이므로 시트가 열려도 맵의 스크롤
// 컨테이너는 사라지지 않습니다.
test("시트가 열려 있어도 여정 맵의 스크롤 컨테이너는 그대로다", async () => {
  await renderSignedInApp(<App progressSeed={u01OpenSeed} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId(S1), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();
});
