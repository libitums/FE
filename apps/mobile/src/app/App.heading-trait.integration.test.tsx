import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type { LearningForm } from "../lib/learning-form";

// LIB-243 (integration-design) §6.3.3 — `I1` · `I2`.
//
// 이 파일이 무엇을 위해 있나: `ui`(`CultureScreen.ui.test.tsx`의 `[X9]`)는 문화
// 화면 하나만 렌더한다. `App`은 바텀 내비게이터를 **항상 함께** 렌더하므로, 이
// 계층만이 「제목 축에 오른 자리가 이 합성 트리에 정확히 얼마나 있는가」를 물을 수
// 있다. `ui`가 원리적으로 만들 수 없는 트리다(§6.3.1 PROBE-4).
//
// 1) **기존 통합 파일 둘을 0줄로 둔다**(§0.2.1). `App.integration.test.tsx` ·
//    `App.learning-form.integration.test.tsx`는 다른 이슈의 무대다. 새 파일 하나가
//    이 이슈의 통합 델타 전부다.
// 2) **대역 형태**는 `App.learning-form.integration.test.tsx`가 세운 것을 그대로
//    쓴다 — `vi.mock(경로, importOriginal)`로 `learningFormForStep` **하나만** 부분
//    대역해 배정을 `"culture"`로 돌린다. `learningFormByStep`(실물 표)은 손대지
//    않는다(LIB-244 D6). 나머지 export는 `importOriginal`로 그대로 통과해 맵·진행이
//    실물로 돈다.
// 3) **서사는 대역하지 않는다.** `cultureNarrativeForStep`의 실물 값이 `App`을 거쳐
//    `CultureScreen`으로 내려온다 — `ui`가 fixture를 props로 넣는 것과 갈리는 지점이다.
// 4) **좌표를 적지 않는다.** 가리키는 것은 전부 앵커(`data-testid` = 클래스명)다.

const formStub = vi.hoisted(() => ({
  current: null as LearningForm | null,
}));

vi.mock("../screens/journey-map/journey-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../screens/journey-map/journey-map")>();
  return {
    ...actual,
    learningFormForStep: (id: JourneyStepId) =>
      formStub.current === null ? actual.learningFormForStep(id) : formStub.current,
  };
});

afterEach(() => {
  formStub.current = null;
});

// 여정 탭 → 스텝 tap → 시트 `시작` tap. 다른 통합 파일들과 같은 형태다(파일이
// 다르므로 다시 선언한다).
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-step-node-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

// ---------------------------------------------------------------- I1 (LIB-243)
//
// 계약 §6.3.3 — **결선으로 실제로 연** 문화 화면에서, 실물 서사의 제목이 제목 축에
// 오른다. `ui`의 `[X9]`와 겹치는 것이 아니라 한 겹 아래를 본다: 여기서 화면에 선
// 서사는 fixture가 아니라 `cultureNarrativeForStep`이 돌려준 실물이고, 그것이
// `App` → 화면 배선을 타고 내려온 뒤에도 속성이 붙어 있는지를 짓는다.
//
// `toBeInTheDocument`를 먼저 둬 대상이 없어서 통과하는 공허한 통과가 아님을 보인다.
// 화면 제목을 대조로 함께 단언해 판별 쌍을 만든다 — 절 제목만 빠지는 경우와 둘 다
// 빠지는 경우가 러너 출력에서 갈린다.
test("[I1] 결선으로 연 문화 화면에서 절 제목이 accessibility-traits='header'를 진다", () => {
  formStub.current = "culture";
  render(<App />);

  startStep("ordering");

  const narrativeTitle = screen.getByTestId("culture-screen-narrative-title");
  expect(narrativeTitle).toBeInTheDocument();
  expect(narrativeTitle).toHaveAttribute("accessibility-traits", "header");

  // 대조 — 화면 제목이 여전히 제목 축에 있다.
  expect(screen.getByTestId("culture-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- I2 (LIB-243)
//
// 계약 §6.3.3 — **이 계층의 존재 이유다.** 합성 트리 **전체**를 쓸어 제목 축에 오른
// 자리를 세고 그 DOM 순서까지 짓는다. 형태는 `WordChoiceScreen.ui.test.tsx`가 조작
// 단위를 셀 때 세운 것을 그대로 쓴다(`querySelectorAll` → `data-testid` 배열 →
// `toEqual`) — 새로 발명하지 않는다.
//
// **개수를 문면이 아니라 기계가 진다.** ADR-0016 D4의 정정이 고친 병이 「사람이 센
// 개수를 문면에 박은 것」이었다. 여기서는 테스트가 매 실행마다 다시 센다: 이 화면에
// 제목이 하나 더 서면 배열이 자라서 단언이 알아서 그것을 본다. 자리를 열거하는 것이
// 아니라 나온 것을 비교하는 것이다(§6.3.3의 마지막 경고).
//
// `ui`는 이 단언을 만들 수 없다 — `CultureScreen` 하나만 렌더하므로 바텀 내비게이터가
// 함께 선 트리가 존재하지 않는다. 아래 대조가 그 트리가 실재함을 짓는다.
test("[I2] 문화 화면이 선 합성 트리에서 제목 축에 오른 자리가 화면 제목·절 제목 둘이고 그 순서다", () => {
  formStub.current = "culture";
  const { container } = render(<App />);

  startStep("ordering");

  const headings = [...container.querySelectorAll('[accessibility-traits="header"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(headings).toEqual(["culture-screen-title", "culture-screen-narrative-title"]);

  // 대조 — 이 트리가 `ui`가 만들 수 있는 트리가 아님을 짓는다. 바텀 내비게이터가
  // 같은 container 안에 함께 서 있고, 조작 단위 축(`button`)에 있지 제목 축에 있지
  // 않다. 이것이 참이어야 위 배열이 「화면만 본 것」이 아니라 「트리 전체를 쓴 것」이다.
  const journeyTab = screen.getByTestId("bottom-navigator-tab-journey");
  expect(container.contains(journeyTab)).toBe(true);
  expect(journeyTab).toHaveAttribute("accessibility-traits", "button");
});
