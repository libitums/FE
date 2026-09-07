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
// 계약: LIB-238 spec §6.2 (ui — required, X1~X8) · §3.3 · §3.4 · §2.4.
//
// LIB-244 D3 — 「액션 행이 없다」던 LIB-238의 근거가 소멸했다(퀴즈가 서면서 나아갈
// 곳이 생겼다). 이 파일 하단의 C1·C2가 그 뒤집힌 판정을 짓는다 — `culture-screen-quiz`가
// 조건 없이 있고 `맵으로`가 여전히 있다(계약 .agent-harness/work/lib-244/spec.md §8.2
// C1~C2 · D3.1).

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

// LIB-244 §5.4 — `onStartQuiz`는 `CultureScreenProps`의 필수 필드다(액션 행이
// 조건 없이 렌더되므로 콜백이 비면 조용히 죽은 버튼이 된다). 헬퍼 하나로 기본값을
// 채워 넘긴다 — 예전에는 `onStartQuiz`를 아직 없는 필드로 보고 excess-property
// 우회(변수에 담아 스프레드)를 쓰는 헬퍼가 따로 있었다. 그 필드가 실제로 필수가
// 된 뒤에는 우회가 필요 없다 — 걷어내고 하나로 합쳤다.
function renderScreen(
  overrides: {
    stepOrdinal?: number;
    narrative?: CultureNarrative;
    onExit?: () => void;
    onStartQuiz?: () => void;
  } = {},
) {
  return render(
    <CultureScreen
      stepOrdinal={overrides.stepOrdinal ?? 3}
      narrative={overrides.narrative ?? FIXTURE_NARRATIVE}
      onExit={overrides.onExit ?? (() => {})}
      onStartQuiz={overrides.onStartQuiz ?? (() => {})}
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

// ---------------------------------------------------------------- C1 · C2 (LIB-244 D3)
//
// LIB-238이 "이 화면에는 나아가는 수단이 없다"로 액션 행을 안 만든 근거가 문화
// 퀴즈가 서면서 소멸했다(계약 §2 D3) — 뒤집힌 판정을 여기 짓는다. `culture-screen-quiz`는
// 조건 없이 렌더되고(D3.1), `맵으로`는 액션 행이 생겨도 걷히지 않는다(둘이 동시에
// 선다 — 이 화면이 스택에서 안 사라지므로 「나가는 수단은 하나」 규칙과 안 어긋난다).

test("[C1] culture-screen-quiz가 조건 없이 있고 라벨 '퀴즈 풀기'·traits='button'이며 탭하면 onStartQuiz가 정확히 한 번 불린다", () => {
  const onStartQuiz = vi.fn<() => void>();
  renderScreen({ onStartQuiz });

  const quiz = screen.getByTestId("culture-screen-quiz");
  expect(quiz).toHaveAttribute("accessibility-element", "true");
  expect(quiz).toHaveAttribute("accessibility-label", "퀴즈 풀기");
  expect(quiz).toHaveAttribute("accessibility-traits", "button");

  fireEvent.tap(quiz, {});

  expect(onStartQuiz).toHaveBeenCalledTimes(1);
});

// 조건 없이 렌더된다는 것을 문단이 하나뿐인 fixture에서도 짓는다 — 내용에 따라
// 조건부로 숨는 자리가 아니다.
test("[C1] 문단이 하나뿐인 fixture에서도 culture-screen-quiz가 있다", () => {
  renderScreen({ narrative: SINGLE_PARAGRAPH_NARRATIVE });

  expect(screen.getByTestId("culture-screen-quiz")).toBeInTheDocument();
});

test("[C2] 액션 행이 생겨도 '맵으로'가 여전히 있다 — 나가는 수단이 걷히지 않는다", () => {
  renderScreen();

  const exit = screen.getByTestId("culture-screen-exit");
  expect(exit).toHaveAttribute("accessibility-label", "맵으로");
  expect(exit).toHaveAttribute("accessibility-traits", "button");
  expect(screen.getByTestId("culture-screen-quiz")).toBeInTheDocument();
});

// 계약 §10-5(e) — 액션 행이 `<scroll-view>` **밖**의 화면 직계 자식이다(ADR-0022
// D1). 존재·라벨·traits·콜백만으로는 이 구조를 못 잡는다 — 누가 `culture-screen-quiz`를
// `<scroll-view culture-screen-scroll>` 안으로 옮겨도 C1·C2는 그대로 초록으로
// 남는다. 그러면 액션 행이 스크롤에 딸려 사라지는데(ADR-0022가 막으려는 바로 그
// 사고) 아무도 못 잡는다. 형태의 정본은
// `CultureQuizScreen.ui.test.tsx`의 `-scroll` 직계 자식 케이스다.
test("[C3] culture-screen-quiz가 culture-screen-scroll 밖의 화면 직계 자식이다", () => {
  const { container } = renderScreen();

  const screenRoot = container.children[0] as HTMLElement;
  const quiz = screen.getByTestId("culture-screen-quiz");
  const scroll = screen.getByTestId("culture-screen-scroll");

  expect(quiz.parentElement).toBe(screenRoot);
  expect(scroll).not.toContainElement(quiz);
});

// ---------------------------------------------------------------- X9 (LIB-243)
//
// 계약: LIB-243 spec §6.2 — 「D12-2가 게이트를 통과시킨 자리 하나가 D4의 속성을
// 실제로 갖는다」를 기계가 진다. 절 제목(`culture-screen-narrative-title`)이
// 제목 축에 오른다.
//
// X1과 합치지 않는다 — X1은 **화면 제목**을, X9는 **절 제목**을 본다. 한 케이스로
// 묶으면 어느 쪽이 실패했는지 러너 출력이 말해 주지 못한다. 대신 같은 케이스 안에서
// 화면 제목을 **대조**로 함께 단언한다 — 절 제목에 딸려 화면 제목이 사라지지 않는
// 것을 짓고, 이 둘이 판별 쌍이 된다(X9만 빨개지고 X1은 초록으로 남아야 한다).
//
// 부재 단언은 인자 하나짜리 부정형만 쓴다 — 인자 둘짜리는 속성이 다른 값으로
// 붙어 있어도 통과해 부재를 못 짓는다(같은 파일 X7의 규율). 절 제목은 조작 단위가
// 아니므로(`bindtap`이 없다) `accessibility-element`로 묶지 않는다(ADR-0016 D12-3).
// `toBeInTheDocument`를 앞에 둬 대상이 없어서 통과하는 공허한 통과가 아님을 보인다.
test("[X9] culture-screen-narrative-title이 accessibility-traits='header'를 갖고 accessibility-element로 묶이지 않는다", () => {
  renderScreen({ narrative: FIXTURE_NARRATIVE });

  const narrativeTitle = screen.getByTestId("culture-screen-narrative-title");
  expect(narrativeTitle).toHaveAttribute("accessibility-traits", "header");

  // 대조 — 화면 제목이 여전히 제목 축에 있다.
  expect(screen.getByTestId("culture-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );

  expect(narrativeTitle).toBeInTheDocument();
  expect(narrativeTitle).not.toHaveAttribute("accessibility-element");
});
