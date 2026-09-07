import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AnswerResult } from "../../lib/answer-result";
import { AssessmentScreen } from "./AssessmentScreen";

// `ui` 계층: 실제 컴포넌트를 렌더하고 상태·상호작용을 본다 (ADR-0006 D4). 순수 함수
// (assessment.ts)를 mock하지 않는다 — 화면이 그것을 실제로 부르는지가 이 파일이 보는
// 것의 절반이다. `toHaveClass` · `toHaveStyle` · `toBeVisible`을 쓰지 않는다
// (docs/conventions/code.md 「jest-dom 매처는 절반만 쓴다」).
//
// 계약: .agent-harness/work/lib-227/spec.md §4.2(둘째 행) · §4.2.1(A1~A7) ·
//       §1.7 · §1.9 · §2 · §3.3.
//
// 기대값의 정본은 계약 §1.4의 임계값(minCorrectCount: 2)과 §1.5·§1.7·§3.1의 표다.
// judgeAssessment 자체는 assessment.unit.test.ts가 이미 본다 — 여기서는 화면이 그
// 판정을 실제로 렌더·낭독하는지만 본다. 그래서 아래 결과 배열은 assessment.unit.test.ts
// 와 같은 조합(2/3·1/3)을 그대로 옮긴다 — 지어낸 임계값이 아니다.

const PASSING_RESULTS: readonly AnswerResult[] = ["correct", "incorrect", "correct"]; // 2/3 → passed
const FAILING_RESULTS: readonly AnswerResult[] = ["correct", "incorrect", "incorrect"]; // 1/3 → failed

function renderScreen(
  overrides: {
    stepOrdinal?: number;
    results?: readonly AnswerResult[];
    onExit?: () => void;
  } = {},
) {
  return render(
    <AssessmentScreen
      stepOrdinal={overrides.stepOrdinal ?? 3}
      results={overrides.results ?? PASSING_RESULTS}
      onExit={overrides.onExit ?? (() => {})}
    />,
  );
}

// ------------------------------------------------------------ announce 대역 (계약 §3.2 · §3.4)
//
// 형태의 정본은 `lib/accessibility.unit.test.ts` · `ListeningScreen.ui.test.tsx`의 오디오
// 대역이다. 없던 전역(`NativeModules`)을 세우므로 테스트마다 원복한다 — 지우지 않으면
// 다른 파일로 샌다 (계약 §4.2 마지막 불릿).

type HostCall = { args: readonly unknown[] };

function stubAnnounceHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
  };
  vi.stubGlobal("NativeModules", { LynxAccessibilityModule: mod });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 제목 (계약 §1.7 표)

test("제목이 assessmentScreenTitle(stepOrdinal)의 합성 결과이고 accessibility-traits='header'다", () => {
  renderScreen({ stepOrdinal: 3 });

  const title = screen.getByTestId("assessment-screen-title");
  expect(title).toHaveTextContent("3단계 · 평가");
  expect(title).toHaveAttribute("accessibility-traits", "header");
});

test("다른 서수로 렌더하면 제목이 갈린다", () => {
  renderScreen({ stepOrdinal: 1 });

  expect(screen.getByTestId("assessment-screen-title")).toHaveTextContent("1단계 · 평가");
});

// ---------------------------------------------------------------- 문항 행 개수 (수용 기준 2)

test("문항 행이 results.length개 렌더된다", () => {
  renderScreen({ results: PASSING_RESULTS });

  for (let index = 0; index < PASSING_RESULTS.length; index += 1) {
    expect(screen.getByTestId(`assessment-item-${index}`)).toBeInTheDocument();
  }
  expect(screen.queryByTestId(`assessment-item-${PASSING_RESULTS.length}`)).not.toBeInTheDocument();
});

test("results가 빈 배열이면 문항 행이 하나도 없다", () => {
  renderScreen({ results: [] });

  expect(screen.queryByTestId("assessment-item-0")).not.toBeInTheDocument();
});

test("문항 행의 data-result가 각 자리의 정오와 일치한다", () => {
  renderScreen({ results: FAILING_RESULTS });

  FAILING_RESULTS.forEach((result, index) => {
    expect(screen.getByTestId(`assessment-item-${index}`)).toHaveAttribute("data-result", result);
  });
});

// ---------------------------------------------------------------- 종합 판정 (수용 기준 2)
//
// 판정 낱말 단언은 lib-251 계약(§3.1 조항 C1 · §3.2 조항 C2 · §4.2 U1~U3)이 정확 일치로
// 세운다. `toHaveTextContent`는 부분 일치라 "미통과"가 "통과" 단언을 조용히 통과시킨다
// (`"미통과" ⊃ "통과"`) — 그래서 판정 낱말은 상위 상자가 아니라
// `assessment-screen-verdict-label` 노드의 `textContent`를 정확 비교(`toBe`)로 본다.
// `data-verdict`는 별도 채널(속성)이라 그대로 남긴다 — 둘 다 지우지 않고 강화만 한다
// (계약 §3.3 C3, 형태의 정본은 `ListeningScreen.ui.test.tsx`의 [X-D]).

// [U1] 계약 §4.2.
test("[U1] 2/3 정답이면 data-verdict='passed'이고 판정 낱말이 정확히 '통과'다", () => {
  renderScreen({ results: PASSING_RESULTS });

  const verdict = screen.getByTestId("assessment-screen-verdict");
  expect(verdict).toHaveAttribute("data-verdict", "passed");
  expect(screen.getByTestId("assessment-screen-verdict-label").textContent ?? "").toBe("통과");
});

// [U2] 계약 §4.2.
test("[U2] 1/3 정답이면 data-verdict='failed'이고 판정 낱말이 정확히 '미통과'다", () => {
  renderScreen({ results: FAILING_RESULTS });

  const verdict = screen.getByTestId("assessment-screen-verdict");
  expect(verdict).toHaveAttribute("data-verdict", "failed");
  expect(screen.getByTestId("assessment-screen-verdict-label").textContent ?? "").toBe("미통과");
});

// [U3] 계약 §4.2 — 새 testid가 상자를 대체한 것이 아니라 상자 안의 잎이다.
test("[U3] 판정 낱말 노드가 판정 상자(assessment-screen-verdict) 안에 있다", () => {
  renderScreen({ results: PASSING_RESULTS });

  const box = screen.getByTestId("assessment-screen-verdict");
  expect(within(box).getByTestId("assessment-screen-verdict-label")).toBeInTheDocument();
});

// 종합 판정에는 accessibility-label을 붙이지 않는다 — <text>의 내용이 곧 이름이다
// (계약 §2.3).
test("종합 판정에 accessibility-label이 없다", () => {
  renderScreen({ results: PASSING_RESULTS });

  expect(screen.getByTestId("assessment-screen-verdict")).not.toHaveAttribute(
    "accessibility-label",
  );
});

// ---------------------------------------------------------------- 나가는 수단 (수용 기준 3)

test("나가는 수단이 '맵으로' 문구·라벨·element·traits를 전부 갖는다", () => {
  renderScreen();

  const exit = screen.getByTestId("assessment-screen-exit");
  expect(exit).toHaveTextContent("맵으로");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(exit).toHaveAttribute("accessibility-element", "true");
});

// 나가는 수단이 정확히 하나다 (D3·D5) — 조작 단위(accessibility-traits="button")를
// 화면 전체에서 세어 하나뿐임을 본다. AssessmentItem 행은 button 트레이트가 없으므로
// (AssessmentItem.ui.test.tsx가 그 부재를 이미 본다) 이 개수가 늘지 않는다.
test("화면의 조작 단위(accessibility-traits='button')가 정확히 하나다", () => {
  const { container } = renderScreen({ results: PASSING_RESULTS });

  const buttons = [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
    el.getAttribute("data-testid"),
  );

  expect(buttons).toEqual(["assessment-screen-exit"]);
});

test("맵으로를 탭하면 onExit이 정확히 한 번 불린다", () => {
  const onExit = vi.fn<() => void>();
  renderScreen({ onExit });

  fireEvent.tap(screen.getByTestId("assessment-screen-exit"), {});

  expect(onExit).toHaveBeenCalledTimes(1);
});

test("미통과 화면에서도 나가는 수단의 라벨이 여전히 '맵으로'다 — 판정에 따라 갈리지 않는다", () => {
  renderScreen({ results: FAILING_RESULTS });

  expect(screen.getByTestId("assessment-screen-exit")).toHaveAttribute(
    "accessibility-label",
    "맵으로",
  );
});

// ---------------------------------------------------------------- 점수·정답 수 부재 (D2)

// 계약 §4.2 「「점수·정답 수가 없다」의 단언 형태」: 화면 텍스트에 `\d+\s*\/\s*\d+`나
// '점' 같은 수치 표현이 없다.
test("점수·정답 수 문자열이 화면 어디에도 없다 — 통과", () => {
  const { container } = renderScreen({ results: PASSING_RESULTS });

  expect(container.textContent ?? "").not.toMatch(/\d+\s*\/\s*\d+/);
  expect(container.textContent ?? "").not.toContain("점");
});

test("점수·정답 수 문자열이 화면 어디에도 없다 — 미통과", () => {
  const { container } = renderScreen({ results: FAILING_RESULTS });

  expect(container.textContent ?? "").not.toMatch(/\d+\s*\/\s*\d+/);
  expect(container.textContent ?? "").not.toContain("점");
});

// ---------------------------------------------------------------- announce (§3.3, 수용 기준 6)

test("마운트 때 announce가 정확히 한 번 불리고 content가 '평가 결과, 통과'다", () => {
  const calls = stubAnnounceHost();

  renderScreen({ results: PASSING_RESULTS });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.args).toHaveLength(2);
  expect(calls[0]?.args[0]).toEqual({ content: "평가 결과, 통과" });
});

test("마운트 때 announce가 정확히 한 번 불리고 content가 '평가 결과, 미통과'다", () => {
  const calls = stubAnnounceHost();

  renderScreen({ results: FAILING_RESULTS });

  expect(calls).toHaveLength(1);
  expect(calls[0]?.args[0]).toEqual({ content: "평가 결과, 미통과" });
});

// dep 배열이 비어 있다(계약 §3.3) — 같은 인스턴스가 다시 렌더돼도 다시 밀지 않는다.
test("같은 화면이 다시 렌더돼도 announce가 다시 불리지 않는다", () => {
  const calls = stubAnnounceHost();
  const { rerender } = renderScreen({ results: PASSING_RESULTS, stepOrdinal: 3 });
  expect(calls).toHaveLength(1);

  rerender(<AssessmentScreen stepOrdinal={3} results={PASSING_RESULTS} onExit={() => {}} />);

  expect(calls).toHaveLength(1);
});

test("대역 없이도 화면이 던지지 않는다", () => {
  expect(() => renderScreen()).not.toThrow();
});

// ---------------------------------------------------------------- 스크롤 규약 (계약 §4.2.1 A1~A7)
//
// `@lynx-js/testing-environment`이 `scroll-view`를 실제 요소로 만든다 — `getByTestId`로
// 잡히고 `within()`으로 안쪽을 질의할 수 있다. 여기서 판정하는 것은 "구조가 계약대로
// 짜였다"까지다 — 실제로 스크롤되는가는 이 계층이 원리적으로 못 본다(jsdom엔 레이아웃이
// 없다, FE ADR-0006 D4). 형태의 정본은 `ListeningScreen.ui.test.tsx`의 U1·U8·U9·U10·U11.

// A1: 스크롤 컨테이너가 있다.
test("[A1] assessment-screen-scroll이 존재한다", () => {
  renderScreen();

  expect(screen.getByTestId("assessment-screen-scroll")).toBeInTheDocument();
});

// A2: 흐르는 것 — 종합 판정과 문항 행이 스크롤 컨테이너 안에 있다.
test("[A2] 종합 판정과 문항 행이 스크롤 컨테이너 안에 있다", () => {
  renderScreen({ results: PASSING_RESULTS });

  const scroll = screen.getByTestId("assessment-screen-scroll");
  expect(within(scroll).getByTestId("assessment-screen-verdict")).toBeInTheDocument();
  expect(within(scroll).getByTestId("assessment-item-0")).toBeInTheDocument();
});

// A3: 고정인 것 — 제목과 나가는 수단이 스크롤 컨테이너 밖이다.
test("[A3] 제목과 나가는 수단이 스크롤 컨테이너 밖에 있다", () => {
  renderScreen();

  const scroll = screen.getByTestId("assessment-screen-scroll");
  expect(within(scroll).queryByTestId("assessment-screen-title")).not.toBeInTheDocument();
  expect(within(scroll).queryByTestId("assessment-screen-exit")).not.toBeInTheDocument();

  expect(screen.getByTestId("assessment-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("assessment-screen-exit")).toBeInTheDocument();
});

// A4: scroll-orientation이 문자열 "vertical"로 붙는다 — JSON.stringify를 타지 않는다
// (계약 §1.9(c)의 ⚠ 박스).
test("[A4] assessment-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  renderScreen();

  expect(screen.getByTestId("assessment-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

// A5: scroll-bar-enable이 (JSON.stringify를 거친) 문자열 "true"로 붙는다 — JSX는
// `{true}`(boolean)인데 단언은 문자열이다(계약 §1.9(c)의 ⚠ 박스).
test("[A5] assessment-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  renderScreen();

  expect(screen.getByTestId("assessment-screen-scroll")).toHaveAttribute(
    "scroll-bar-enable",
    "true",
  );
});

// A6: 직계 자식이 하나를 넘지 않는다 — results가 빈 배열일 때와 N개일 때 둘 다 본다.
// 문항 행이 늘어도 자식은 `.assessment-screen-content` 하나다.
test("[A6] results가 빈 배열이어도 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderScreen({ results: [] });

  expect(screen.getByTestId("assessment-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

test("[A6] results가 N개여도 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  renderScreen({ results: PASSING_RESULTS });

  expect(screen.getByTestId("assessment-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// A7: 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다 — 조작 단위가 아니라
// 상자다(계약 §1.9(e)).
test("[A7] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  renderScreen();

  const scroll = screen.getByTestId("assessment-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});
