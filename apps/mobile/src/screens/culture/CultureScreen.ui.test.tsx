import { expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { CultureNarrative } from "./culture";
import { CultureScreen } from "./CultureScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다 (ADR-0006 D4). `vi.mock`을
// 쓰지 않는다 — narrative는 fixture를 prop으로 그대로 넘긴다(계약 §6.2, §3.1). `./culture`
// 로부터는 타입만 가져온다 — `cultureScreenTitle`·`cultureNarrativeForStep` 같은 값은
// import하지 않는다. `toHaveClass`·`toHaveStyle`·`toBeVisible`을 쓰지 않는다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」).
//
// 계약: LIB-238 실행 브리프 u8 §6.2 (ui — required, X1~X8) · §3.3 · §3.4 · §2.4.

// fixture 문자열은 culture.ts의 다섯 서사(§2.4) 어떤 값과도 겹치지 않는다 — 겹치면
// 화면이 실제 데이터에 붙어 있어도 X4·X5가 우연히 통과해 버린다. 문단이 셋이라
// 실제 표(전부 둘)와 모양이 다르다.
const FIXTURE_NARRATIVE: CultureNarrative = {
  title: "저녁에 나누는 인사말",
  paragraphs: [
    "테스트 전용 첫째 문단이다.",
    "테스트 전용 둘째 문단이다.",
    "테스트 전용 셋째 문단이다.",
  ],
};

// 문단 수가 다른 둘째 fixture — X5의 루프가 fixture에 따라 실제로 갈리는 것을 본다
// (공허한 통과 방지). 제목도 첫째 fixture·실제 다섯 서사 어느 것과도 겹치지 않는다.
const SINGLE_PARAGRAPH_NARRATIVE: CultureNarrative = {
  title: "혼자 남은 문단 서사",
  paragraphs: ["단 하나뿐인 문단이다."],
};

function renderScreen(
  overrides: {
    stepOrdinal?: number;
    narrative?: CultureNarrative;
    onExit?: () => void;
  } = {},
) {
  return render(
    <CultureScreen
      stepOrdinal={overrides.stepOrdinal ?? 3}
      narrative={overrides.narrative ?? FIXTURE_NARRATIVE}
      onExit={overrides.onExit ?? (() => {})}
    />,
  );
}

// ---------------------------------------------------------------- X1: 제목

test("[X1] 제목이 3단계 · 문화이고 accessibility-traits='header'다", () => {
  renderScreen({ stepOrdinal: 3 });

  const title = screen.getByTestId("culture-screen-title");
  expect(title).toHaveTextContent("3단계 · 문화");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

// ---------------------------------------------------------------- X2: 나가는 수단

test("[X2] 나가는 수단이 accessibility-element·label·traits를 전부 갖는다", () => {
  renderScreen();

  const exit = screen.getByTestId("culture-screen-exit");
  expect(exit).toHaveAttribute("accessibility-element", "true");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
});

// ---------------------------------------------------------------- X3: 나가기 탭

test("[X3] 나가는 수단을 탭하면 onExit이 정확히 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderScreen({ onExit });

  fireEvent.tap(screen.getByTestId("culture-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- X4: 서사 제목

test("[X4] culture-screen-narrative-title이 fixture의 제목이다", () => {
  renderScreen({ narrative: FIXTURE_NARRATIVE });

  expect(screen.getByTestId("culture-screen-narrative-title")).toHaveTextContent(
    FIXTURE_NARRATIVE.title,
  );
});

// ---------------------------------------------------------------- X5: 문단

test("[X5] culture-screen-paragraph-0/1/2가 fixture의 문단 셋이고 그 순서다", () => {
  renderScreen({ narrative: FIXTURE_NARRATIVE });

  FIXTURE_NARRATIVE.paragraphs.forEach((paragraph, index) => {
    expect(screen.getByTestId(`culture-screen-paragraph-${index}`)).toHaveTextContent(paragraph);
  });
  expect(screen.queryByTestId("culture-screen-paragraph-3")).not.toBeInTheDocument();
});

// 문단 1개짜리 fixture — 루프가 fixture 크기를 실제로 따라가는지 본다. 0은 있고
// 1은 없다.
test("[X5] 문단이 하나뿐인 fixture에서는 culture-screen-paragraph-0만 있다", () => {
  renderScreen({ narrative: SINGLE_PARAGRAPH_NARRATIVE });

  expect(screen.getByTestId("culture-screen-paragraph-0")).toHaveTextContent(
    SINGLE_PARAGRAPH_NARRATIVE.paragraphs[0] ?? "",
  );
  expect(screen.queryByTestId("culture-screen-paragraph-1")).not.toBeInTheDocument();
});

// ---------------------------------------------------------------- X6: 스크롤 속성

test("[X6] culture-screen-scroll에 scroll-orientation='vertical'·scroll-bar-enable='true'가 붙는다", () => {
  renderScreen();

  const scroll = screen.getByTestId("culture-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
});

// ---------------------------------------------------------------- X7: 스크롤에 accessibility-* 없음

// 인자 하나짜리 부정형만 쓴다 — 인자 둘짜리는 다른 값으로 붙어 있어도 통과해
// 부재를 못 짓는다. culture-screen-scroll 자체는 실재한다(getByTestId가 던지지
// 않는다) — 대상이 비어서 통과하는 공허한 통과가 아니다.
test("[X7] culture-screen-scroll에 accessibility-*가 없다", () => {
  renderScreen();

  const scroll = screen.getByTestId("culture-screen-scroll");
  expect(scroll).toBeInTheDocument();
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- X8: 화면 전체에 accessibility-elements-hidden 0건

test("[X8] 화면 전체에 accessibility-elements-hidden이 0건이다", () => {
  const { container } = renderScreen();

  // 트리가 비어 있지 않다는 것을 먼저 보여, 0건이 "볼 것이 없어서" 나온 값이
  // 아님을 짓는다.
  expect(container.querySelectorAll("*").length).toBeGreaterThan(0);
  expect(container.querySelectorAll("[accessibility-elements-hidden]")).toHaveLength(0);
});
