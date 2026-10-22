import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { CatalogProgress } from "../../lib/catalog-progress";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { catalogUnitNodesOf } from "./catalog-map";
import type { CatalogReadySection } from "./catalog-map.contract";
import { catalogProps, catalogReadySections, mapScreen } from "./JourneyMapScreen.test-support";

// 맵은 카탈로그 구획만 그립니다 — 이 파일의 단언이 보는 축(유닛 노드 · 시트 · 스크롤)은 첫 구획(u01)이
// 맡습니다. 말풍선 배치 검증은 표지와 레슨 둘(S1 · S3)을 끝낸 진행에서 합니다: S4가 열려 있고 S5부터 잠깁니다.
const twoLessonsDone: CatalogProgress = { "u01-water": ["intro", "S1", "S3"] };
const unitTestId = (key: string): string => `ui-lynx-learning-unit-catalog-unit-u01-water-${key}`;
const firstSection = catalogReadySections[0] as CatalogReadySection;

const atTwo = () => mapScreen({ catalog: catalogProps({ progress: twoLessonsDone }) });

// 앱 상태 어휘를 `LearningUnit`의 어휘로 옮기는 표입니다.
function unitStatusOf(status: "completed" | "available" | "locked"): string {
  return status === "completed" ? "clear" : status === "available" ? "available" : "default";
}

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 흐름 영역에 맵 상자를 그립니다 — 머리(칩 · 알림 버튼)는 전역 레이아웃이 집니다.
test("여정 맵 화면이 렌더된다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// 재고정 2026-09-27: 화면 제목 줄이 없어졌습니다(상단 바 디자인 반영). 이 화면에서
// heading을 지는 것은 에피소드 헤더 카드입니다 — 「지금 어느 에피소드인가」가 화면의
// 제목 자리를 대신 맡습니다.
// ⟨§20⟩ 띠는 말풍선이 열려 있는 동안만 섭니다 — 유닛을 탭해 연 뒤에 본다.
test("여정 맵의 heading은 에피소드 헤더 카드다 (말풍선이 열린 동안)", () => {
  render(atTwo());
  fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 300 } });

  expect(screen.getAllByTestId("ui-lynx-episode-header")[0]).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// `toHaveClass`·`toHaveStyle`·`toBeVisible`을 쓰지 않습니다. 텍스트 질의(`getByText`)를
// 쓰지 않습니다 — 화면 제목과 탭 라벨이 같은 문자열을 공유하는 조합이 있어 모호합니다.

// 단언 7
test("첫 구획의 레슨 노드가 전부 렌더되고 각자 data-status가 파생 상태와 같다", () => {
  render(atTwo());

  const nodes = catalogUnitNodesOf(firstSection, twoLessonsDone).filter(
    (node) => node.role === "lesson",
  );
  expect(nodes).toHaveLength(firstSection.lessonKeys.length);
  nodes.forEach((node) => {
    // 화면이 내는 것은 유닛 어휘입니다 — 앱의 `completed`·`available`·`locked`를
    // `LearningUnit`의 `clear`·`active`·`default`로 옮겨 봅니다. 두 어휘가 어긋나면
    // 화면이 엉뚱한 표식을 그리므로, 표를 여기 못 박아 둡니다.
    expect(screen.getByTestId(unitTestId(node.key))).toHaveAttribute(
      "data-status",
      unitStatusOf(node.status),
    );
  });
});

// 단언 8
test("처음에는 시트가 렌더되지 않는다", () => {
  render(atTwo());

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
});

// 단언 9
test("열린 유닛을 tap하면 말풍선이 열리고 그 유닛의 순번·제목을 낸다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3: “Alley”");
});

// 단언 10
test("닫기를 tap하면 시트가 사라지고 화면은 그대로다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen")).toBeInTheDocument();
});

// 단언 11 — 제목이 갈립니다. 시트가 둘이 되지 않습니다.
test("시트가 열린 채 다른 유닛을 tap하면 시트가 그 유닛으로 바뀐다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3");

  fireEvent.tap(screen.getByTestId(unitTestId("S3")), {});

  expect(screen.getAllByTestId("step-sheet-panel")).toHaveLength(1);
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 2");
});

// 단언 12 (재고정): 부재 단언은 code.md의 표대로 queryByTestId + not.toBeInTheDocument입니다.
// 잠긴 유닛은 애초에 시트를 열지 않으므로 맵 컨테이너의 accessibility-elements-hidden도
// 움직이지 않습니다 — 같은 tap 하나가 낸 결과를 시트의 부재와 맵의 가림 여부 두 채널로 함께 봅니다.
test("잠긴 유닛을 tap해도 시트가 열리지 않는다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S5")), {});

  expect(screen.queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// 단언 12-b ("아무 일도 일어나지 않는다"의 나머지 절반): 열려 있던 시트가 있으면
// 잠긴 유닛의 tap이 그 시트를 닫는 수단도 되지 않습니다 — 그대로 열려 있습니다.
test("시트가 열린 채로 잠긴 유닛을 tap해도 시트는 그대로 열려 있다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3");

  fireEvent.tap(screen.getByTestId(unitTestId("S5")), {});

  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3");
});

// 단언 13: `시작`이 열린 유닛의 에피소드 · 유닛 키를 그대로 위로 올립니다. 이 화면은 시트를 명시적으로
// 닫지 않습니다 — 닫히는 것은 App이 학습 화면을 렌더해 이 화면이 언마운트될 때이고, 그것은 integration의 몫입니다.
test("시작을 tap하면 onStartUnit이 열린 유닛의 에피소드 · 키로 한 번 불린다", () => {
  const catalog = catalogProps({ progress: twoLessonsDone });
  render(mapScreen({ catalog }));

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});

  expect(catalog.onStartUnit).toHaveBeenCalledTimes(1);
  expect(catalog.onStartUnit).toHaveBeenCalledWith("u01-water", "S4");
  // 시트를 닫는 주체는 이 화면이 아닙니다 — 화면 전환이 언마운트로 버립니다.
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-title")).toHaveTextContent("Lesson 3");
});

// ---------------------------------------------------------------- 단언 14~16 (보정)
// 겹침 계약입니다 — 이 시트는 비모달이고, 맵은 가리되 탭 바는 가리지 않습니다.
// `journey-map-screen-map` 하나를 세 시점(닫힘·열림·다시 닫힘)에 읽습니다.
//
// 값의 형태는 계약이 고정한 대로입니다 — accessibility-elements-hidden은 시트가
// 닫혀 있을 때도 "붙지 않는" 것이 아니라 언제나 붙고 값만 "false"/"true"로
// 갈립니다(BottomNavigator.ui.test.tsx의 accessibility-elements-hidden/data-selected
// 단언과 같은 형태입니다).
//
// 탭 바(BottomNavigator)는 여기서 단언하지 않습니다 — 이 파일은 JourneyMapScreen만
// 고립 렌더하므로 탭 바가 트리에 없습니다. 실제로 서브트리 전체에 먹는지는 실기가 판정합니다
// (ADR-0016 D6, docs/e2e/journey-map.md E1-a/b/c).

// 단언 14
test("시트가 닫혀 있을 때 맵의 accessibility-elements-hidden은 false다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// 단언 15 — 언마운트가 아니라 가림이라는 것을 유닛 노드가 여전히 문서에 있다는 것으로 함께 단언합니다.
test("유닛을 tap해 시트를 열면 맵의 accessibility-elements-hidden이 true가 되고 맵과 유닛은 여전히 문서에 있다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("journey-map-screen-map")).toBeInTheDocument();
  expect(screen.getByTestId(unitTestId("S4"))).toBeInTheDocument();
});

// 단언 16 — A안(accessibility-exclusive-focus)을 버린 이유가 "복원 실패"였고,
// B가 그 실패를 물려받지 않는다는 것을 자동 계층에서 볼 수 있는 자리가 이 단언뿐입니다.
test("닫기를 tap하면 맵의 accessibility-elements-hidden이 다시 false로 돌아온다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});

  expect(screen.getByTestId("journey-map-screen-map")).toHaveAttribute(
    "accessibility-elements-hidden",
    "false",
  );
});

// ------------------------------------------------- 더하는 단언
// 진행이 **모듈 상수가 아니라 props**에서 온다는 것의 `ui` 쪽 관찰입니다. 단언 7이 보는 것과 같은
// 채널(`data-status`)을 다른 값으로 읽어, 화면이 받은 값을 실제로 소비하는지를 가릅니다.
test("레슨 셋을 끝낸 진행으로 렌더하면 S4가 clear, S5가 available, S6이 default다", () => {
  render(
    mapScreen({
      catalog: catalogProps({ progress: { "u01-water": ["intro", "S1", "S3", "S4"] } }),
    }),
  );

  expect(screen.getByTestId(unitTestId("S4"))).toHaveAttribute("data-status", "clear");
  expect(screen.getByTestId(unitTestId("S5"))).toHaveAttribute("data-status", "available");
  expect(screen.getByTestId(unitTestId("S6"))).toHaveAttribute("data-status", "default");
});

// 엣지 (「여정이 전부 완료된다」): 레슨 전부를 끝내면 전부 clear이고 **available인 레슨이 하나도 없는 것이
// 정상**입니다. 새 상태어도 새 분기도 없다는 것을 화면 쪽에서 한 번 못박습니다.
test("레슨 전부를 끝낸 진행으로 렌더하면 레슨 전부가 clear이고 available인 레슨이 없다", () => {
  render(
    mapScreen({
      catalog: catalogProps({
        progress: { "u01-water": ["intro", ...firstSection.lessonKeys] },
      }),
    }),
  );

  firstSection.lessonKeys.forEach((key) => {
    expect(screen.getByTestId(unitTestId(key))).toHaveAttribute("data-status", "clear");
  });
});

// ---------------------------------------------------------------- 스크롤 영역
//
// 여정 맵은 액션 행이 없습니다 — 고정은 제목과 액션 래퍼를 담은 머리뿐이고
// 흐름은 맵 하나입니다.
// 시트는 스크롤 밖의 겹침 레이어입니다(R9). 이 계층이 판정하는 것은 "구조가
// 계약대로 짜였다"까지입니다 — 실제 스크롤·가림 서브트리 동작은 실기 몫입니다.

test("[U1] journey-map-screen-scroll이 존재한다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen-scroll")).toBeInTheDocument();
});

test("[U2] journey-map-screen-map이 스크롤 컨테이너 안에 있다", () => {
  render(atTwo());

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(within(scroll).getByTestId("journey-map-screen-map")).toBeInTheDocument();
});

// 머리(칩 · 알림 버튼)는 전역 레이아웃(`app/AppHeader`)으로 올라갔습니다 — 이 화면은
// 머리를 그리지 않습니다.
test("[U3] 여정 맵은 머리를 그리지 않는다", () => {
  render(atTwo());

  expect(screen.queryByTestId("journey-map-screen-actions")).not.toBeInTheDocument();
  expect(screen.queryByTestId("top-bar-notifications")).not.toBeInTheDocument();
});

// U4: 시트는 스크롤 밖의 겹침 레이어입니다(R9) — 열려 있어도 스크롤 컨테이너
// 안에서는 찾을 수 없습니다.
test("[U4] 시트를 열어도 step-sheet-panel은 스크롤 컨테이너 밖이다", () => {
  render(atTwo());

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(within(scroll).queryByTestId("step-sheet-panel")).not.toBeInTheDocument();
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재
//
// R6·R6.1의 「없음」을 지키는 회귀 그물입니다. 오늘의 구현은 이 넷을 하나도
// 붙이지 않습니다 — **red가 없는 것이 이 케이스의 성질입니다.** 다음 편집이 넷
// 중 하나라도 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가
// 아니라 계약으로 되돌아가라는 신호입니다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(atTwo());

  const scroll = screen.getByTestId("journey-map-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작
//
// R5 폐기 → R5.1~R5.3. `<scroll-view>`는 `scroll-orientation` prop이 없으면
// `_enableScrollY` 초기값이 NO라 세로 스크롤이 원리적으로 불가능합니다. jsdom은
// 레이아웃이 없어 실제로 스크롤되는지는 이 계층이 원리적으로 못 봅니다(실기가
// 답합니다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로
// 직렬화합니다.

test("[U9] journey-map-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[U11] journey-map-screen-scroll에 scroll-bar-enable='false'가 붙는다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "false",
  );
});

// ⟨신규 2026-09-29⟩ 구획의 유닛 노드 수를 헤더의 분모와 맞대 봅니다. 두 수가 갈리는 상태가 실제로 있었습니다 —
// 표지 데이터가 먼저 서고 표식 컴포넌트가 아직 없던 동안 헤더는 열을 세는데 줄에는 아홉만 섰습니다.
// 한쪽만 보면 그 어긋남이 안 잡힙니다.
//
// 세는 대상을 testid 목록으로 적는 것은 클래스 이름이 앵커가 되지 않게 하기
// 위해서입니다(`journey-map-screen-episode`는 배치용 상자일 뿐입니다).
const firstSectionTestIds: readonly string[] = [
  "ui-lynx-special-unit-catalog-cover-u01-water",
  ...firstSection.lessonKeys.map(unitTestId),
  "ui-lynx-special-unit-catalog-unit-u01-water-RP",
];

test("[U12] 첫 구획에 선 유닛 수가 에피소드 헤더의 분모와 같다", () => {
  render(atTwo());

  const map = screen.getByTestId("journey-map-screen-map");
  const rendered = map.querySelectorAll(
    firstSectionTestIds.map((id) => `[data-testid=${id}]`).join(","),
  );
  expect(rendered).toHaveLength(firstSectionTestIds.length);

  // ⟨§20⟩ 띠는 말풍선이 열린 동안만 서므로 유닛을 눌러 연 뒤에 분모를 읽는다.
  fireEvent.tap(screen.getByTestId(unitTestId("S1")), { detail: { y: 300 } });
  const count = screen.getAllByTestId("ui-lynx-episode-header-count")[0]?.textContent ?? "";
  expect(count.split(" / ")[1]).toBe(String(rendered.length));
});

// U10 — 여정 맵은 오늘도 직계 자식이 하나(journey-map-screen-map)뿐이라
// green입니다(R7.1의 「나머지 넷은 안 샌다」 표).
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(atTwo());

  expect(screen.getByTestId("journey-map-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// 말풍선이 열린 동안 셸의 전역 머리도 가려야 합니다 — 머리가 이 화면 밖으로 나가면서
// 화면이 열림을 알립니다(`onLayerChange`).
test("[U-L1] 말풍선이 열리고 닫힐 때 onLayerChange가 true → false로 불린다", () => {
  const onLayerChange = vi.fn<(open: boolean) => void>();
  render(
    <JourneyMapScreen
      catalog={catalogProps({ progress: twoLessonsDone })}
      onLayerChange={onLayerChange}
    />,
  );
  expect(onLayerChange).toHaveBeenLastCalledWith(false);

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});
  expect(onLayerChange).toHaveBeenLastCalledWith(true);

  fireEvent.tap(screen.getByTestId("step-sheet-close"), {});
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

// JM1-M — 화면이 여는 시트의 낱말은 문구표에서 읽습니다(하드코딩 영어는 표시 표에서 남아 잡힙니다).
test("[JM1-M] 문구표를 주입하고 유닛을 열면 시트의 시작 · 닫기 · 진행 줄이 표의 경로로 나온다", () => {
  const catalog = {
    ...catalogProps({ progress: twoLessonsDone }),
    unitItemCountOf: () => 4,
  };
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <JourneyMapScreen catalog={catalog} />
    </UiCopyContext.Provider>,
  );

  fireEvent.tap(screen.getByTestId(unitTestId("S4")), {});

  expect(screen.getByTestId("step-sheet-start")).toHaveTextContent("⟦journeyMap.start⟧");
  expect(screen.getByTestId("step-sheet-close")).toHaveAttribute(
    "accessibility-label",
    "⟦common.close⟧",
  );
  expect(screen.getByTestId("step-sheet-progress-count")).toHaveTextContent(
    "⟦journeyMap.activityCount⟧(",
  );
});
