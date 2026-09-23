import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type { LearningForm } from "../lib/learning-form";
import { questionsForStep } from "../screens/listening/listening";
// `termsSections()`가 절 id 목록의 데이터 앵커입니다(리터럴을 쓰지 않습니다).
import { termsSections } from "../screens/terms/terms-sections";
// `authTokenStorageKey`는 토큰 스텁의 유일한 키입니다. `entrySplashDurationMs`는
// 스플래시 전이 시각입니다.
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

// 이 파일이 무엇을 위해 있나: `ui`(`CultureScreen.ui.test.tsx`의 `[X9]`)는 문화
// 화면 하나만 렌더합니다. `App`은 바텀 내비게이터를 **항상 함께** 렌더하므로, 이
// 계층만이 「제목 축에 오른 자리가 이 합성 트리에 정확히 얼마나 있는가」를 물을 수
// 있습니다. `ui`가 원리적으로 만들 수 없는 트리입니다(ADR-0016 D12-4의 (나)).
//
// 1) **기존 통합 파일 둘을 0줄로 둡니다**. `App.integration.test.tsx` ·
//    `App.learning-form.integration.test.tsx`는 다른 이슈의 무대입니다. 새 파일
//    하나가 이 이슈의 통합 델타 전부입니다.
// 2) **대역 형태**는 `App.learning-form.integration.test.tsx`가 세운 것을 그대로
//    씁니다 — `vi.mock(경로, importOriginal)`로 `learningFormForStep` **하나만**
//    부분 대역해 배정을 `"culture"`로 돌립니다. `learningFormByStep`(실물 표)은
//    손대지 않습니다. 나머지 export는 `importOriginal`로 그대로 통과해 맵·진행이
//    실물로 돕니다.
// 3) **서사는 대역하지 않습니다.** `cultureNarrativeForStep`의 실물 값이 `App`을
//    거쳐 `CultureScreen`으로 내려옵니다 — `ui`가 fixture를 props로 넣는 것과
//    갈리는 지점입니다.
// 4) **좌표를 적지 않습니다.** 가리키는 것은 전부 앵커(`data-testid` = 클래스명)입니다.

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
  vi.unstubAllGlobals();
});

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

// 여정 탭 → 스텝 tap → 시트 `시작` tap입니다. 다른 통합 파일들과 같은 형태입니다
// (파일이 다르므로 다시 선언합니다).
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId(`journey-step-node-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

// 문항을 순서대로 전부 응답하고 매번 `다음`을 누릅니다. `App.integration.test.tsx`의
// 동명 헬퍼와 같은 형태입니다(파일이 다르므로 다시 선언합니다) — `listening-complete`
// 상태에 닿는 유일한 수단입니다.
function answerAllQuestions(
  stepId: JourneyStepId,
  pick: (answerIndex: number, questionIndex: number) => number,
): void {
  questionsForStep(stepId).forEach((question, questionIndex) => {
    const choiceIndex = pick(question.answerIndex, questionIndex);

    fireEvent.tap(screen.getByTestId(`listening-choice-${choiceIndex}`), {});
    fireEvent.tap(screen.getByTestId("listening-screen-next"), {});
  });
}

// 정답/오답을 섞습니다 — `App.integration.test.tsx`의 동명 헬퍼와 같은 형태입니다.
// 이 파일이 묻는 것은 판정값이 아니라 제목 축이므로 섞는 규칙 자체는 결과에 영향을
// 주지 않습니다.
function mixedPick(answerIndex: number, questionIndex: number): number {
  return questionIndex === 1 ? (answerIndex + 1) % 4 : answerIndex;
}

// 제목 축에 오른 자리를 트리 순서대로 앵커로 냅니다. `data-testid`가 없는
// 요소는 클래스명으로 찍습니다 — 게이트가 배제한 자리 중에는 `data-testid`가 없는
// 것이 있고, `null`로 찍히면 러너 출력이 어느 자리인지 말하지 못합니다
// (`.culture-screen-exit-label` · `.assessment-screen-verdict-label`).
// `getAttribute("class")` 갈래는 발명이 아닙니다 — `ListeningPrompt.ui.test.tsx`가
// 클래스 목록을 같은 방식으로 대조한 선례를 따릅니다.
//
// ⚠ 이 `class` 갈래는 속성 **전체**를 찍습니다. 이 저장소는 상태 클래스를 base
// 클래스 뒤에 **더해** 붙이므로(예: `BottomNavigator`의 선택된 탭 라벨 —
// `bottom-navigator-label bottom-navigator-label-selected`), 그런 잎에 `header`가
// 새면 같은 자리가 상태에 따라 서로 다른 문자열로 찍힐 수 있습니다. 첫 토큰만 쓰는
// 정규화는 **하지 않습니다** — 상태 정보가 러너 출력에서 사라지는 대가가 더 큽니다.
//
// ⚠ 셀렉터를 `[accessibility-traits="header"]`에서 `[accessibility-traits]`로
// 넓히고 값을 쉼표로 갈라 `header`를 포함하는 것만 남깁니다. 벤더된 Pod
// (`LynxConverter+UI.m`)의 `toAccessibilityTraits:`가 값을 쉼표로 split해 OR로
// 합치므로, `accessibility-traits="button,header"`도 iOS에서 실제로 머리말
// 역할을 싣습니다 — 좁은 셀렉터는 그 형태를 못 봅니다. `ADR-0016 D2`가 이 속성에
// 단일 값을 요구하므로 오늘 이 저장소에 쉼표 복수값은 0건이고, 이 갈래는 그
// 형태가 새로 생겨도 잡히게 하는 방어입니다. 조작 단위 축(`button`·`tab` 단독)은
// 여전히 안 섞입니다 — `header`를 포함하지 않으면 필터가 버립니다.
function headingAxis(container: HTMLElement): readonly (string | null)[] {
  return [...container.querySelectorAll("[accessibility-traits]")]
    .filter((el) => (el.getAttribute("accessibility-traits") ?? "").split(",").includes("header"))
    .map((el) => el.getAttribute("data-testid") ?? el.getAttribute("class"));
}

// **결선으로 실제로 연** 문화 화면에서, 실물 서사의 제목이 제목 축에 오릅니다.
// `ui`의 `[X9]`와 겹치는 것이 아니라 한 겹 아래를 봅니다: 여기서 화면에 선 서사는
// fixture가 아니라 `cultureNarrativeForStep`이 돌려준 실물이고, 그것이 `App` →
// 화면 배선을 타고 내려온 뒤에도 속성이 붙어 있는지를 짓습니다(ADR-0016 D12-4의
// (나)).
//
// `toBeInTheDocument`를 먼저 둬 대상이 없어서 통과하는 공허한 통과가 아님을
// 보입니다. 화면 제목을 대조로 함께 단언해 판별 쌍을 만듭니다 — 절 제목만 빠지는
// 경우와 둘 다 빠지는 경우가 러너 출력에서 갈립니다.
test("[I1] 결선으로 연 문화 화면에서 절 제목이 accessibility-traits='header'를 진다", () => {
  formStub.current = "culture";
  renderApp(<App />);

  startStep("ordering");

  const narrativeTitle = screen.getByTestId("culture-screen-narrative-title");
  expect(narrativeTitle).toBeInTheDocument();
  expect(narrativeTitle).toHaveAttribute("accessibility-traits", "header");

  // 대조 — 화면 제목이 여전히 제목 축에 있습니다.
  expect(screen.getByTestId("culture-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// **이 계층의 존재 이유입니다.** 합성 트리 **전체**를 쓸어 제목 축에 오른 자리를
// 세고 그 DOM 순서까지 짓습니다. 형태는 `WordChoiceScreen.ui.test.tsx`가 조작
// 단위를 셀 때 세운 것을 그대로 씁니다(`querySelectorAll` → `data-testid` 배열 →
// `toEqual`) — 새로 발명하지 않습니다.
//
// **개수를 문면이 아니라 기계가 집니다.** 사람이 센 개수를 문면에 박는 대신,
// 테스트가 매 실행마다 다시 셉니다: 이 화면에 제목이 하나 더 서면 배열이 자라서
// 단언이 알아서 그것을 봅니다. 자리를 열거하는 것이 아니라 나온 것을 비교하는
// 것입니다.
//
// `ui`는 이 단언을 만들 수 없습니다 — `CultureScreen` 하나만 렌더하므로 바텀
// 내비게이터가 함께 선 트리가 존재하지 않습니다. 아래 대조가 그 트리가 실재함을
// 짓습니다.
test("[I2] 문화 화면이 선 합성 트리에서 제목 축에 오른 자리가 화면 제목·절 제목 둘이고 그 순서다", () => {
  formStub.current = "culture";
  const { container } = renderApp(<App />);

  startStep("ordering");

  expect(headingAxis(container)).toEqual([
    "culture-screen-title",
    "culture-screen-narrative-title",
  ]);

  // 대조 — 이 트리가 `ui`가 만들 수 있는 트리가 아님을 짓습니다. 바텀 내비게이터가
  // 같은 container 안에 함께 서 있고, 조작 단위 축(`button`)에 있지 제목 축에 있지
  // 않습니다. 이것이 참이어야 위 배열이 「화면만 본 것」이 아니라 「트리 전체를 쓴
  // 것」입니다.
  const journeyTab = screen.getByTestId("bottom-navigator-tab-journey");
  expect(container.contains(journeyTab)).toBe(true);
  expect(journeyTab).toHaveAttribute("accessibility-traits", "button");
});

// **훑기의 반대 방향입니다.** `[I2]`가 짓는 것은 「이 상태의 트리에 제목 축 자리가
// 이만큼 **있다**」이고, 여기서 짓는 것은 「게이트가 배제한 자리가 이 상태의
// 트리에 **없다**」입니다. 수단은 같습니다(`headingAxis` → `toEqual` 닫힌 집합) —
// 방향만 반대입니다. 게이트가 배제한 자리에 `accessibility-traits="header"`가
// 붙으면, 그 자리의 앵커(테스트가 있으면 `data-testid`, 없으면 클래스명)가 아래
// 배열에 끼어들어 `toEqual`이 깨집니다. 상태마다 케이스를 나눈 이유는 탐침이
// **자리 하나에만** 속성을 붙였을 때 **그 상태를 여는 케이스 하나만** 빨개지는
// 것을 다음 단계가 이름으로 구분해 확인해야 하기 때문입니다 — 묶으면 그 구분이
// 안 됩니다.
//
// `[I1]`·`[I2]`와 같은 자리를 두 번 안 짓습니다: 그 둘은 `culture` 상태 하나만
// 열고, 여기는 그 상태를 다시 열지 않습니다 — `culture` 행은 `[I2]`가 이미 집니다.

test("[I3] 제목 축 닫힌 집합이 상태 listening-complete에서 계약이 고정한 목록과 정확히 같다", () => {
  // 대역 없음 — 오늘 배정표가 `ordering`에 이미 `listening`을 돌려줍니다.
  const { container } = renderApp(<App />);

  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["listening-screen-title"]);
});

// 닫힌 집합 대조는 배열이 **자라야** 빨개집니다 — 이 상태가 무대에 올리는 배제
// 자리(`.assessment-screen-verdict-label`) 자신이 트리에서 없어지면 배열은 안
// 자라고 아래 `toEqual`은 계속 통과합니다. `assessment-screen-title`만 확인하는
// 것으로는 이 자리의 존재를 아무도 안 지으므로(공허하게 통과할 수 있는 자리이므로)
// 그 자리 자신을 `querySelector`로 먼저 짓습니다. `data-testid`가 없어
// `getByTestId`를 못 씁니다.
test("[I3] 제목 축 닫힌 집합이 상태 assessment에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  startStep("ordering");
  answerAllQuestions("ordering", mixedPick);
  fireEvent.tap(screen.getByTestId("listening-screen-finish"), {});
  expect(screen.getByTestId("assessment-screen-title")).toBeInTheDocument();
  expect(container.querySelector(".assessment-screen-verdict-label")).not.toBeNull();

  expect(headingAxis(container)).toEqual(["assessment-screen-title"]);
});

// 아래 케이스들(`word-choice`·`sentence-order`·`culture-quiz`)은 각 화면의 문항
// 표가 오늘 비어 있어 **종료 상태**를 엽니다. 배제 자리(`*-screen-complete`)가 곧
// 종료 상태의 프로브이므로, 그 자리 자신을 `getByTestId`로 먼저 짓습니다(이들은
// 클래스명과 같은 이름의 `data-testid`를 가집니다) — 화면 제목만으로는 이 자리의
// 존재를 아무도 안 집니다.
//
// 문항 표가 채워지는 날 이 케이스들은 조용히 **문항 상태**를 열게 됩니다(도달
// 절차만 낡습니다) — 그날 이 앵커(`getByTestId`)가 문항 상태의 트리에서 그 자리를
// 못 찾아 던지고, 정확히 이 케이스가 빨개집니다. 기대값(제목 축 목록)은 안
// 바뀝니다.
test("[I3] 제목 축 닫힌 집합이 상태 word-choice에서 계약이 고정한 목록과 정확히 같다", () => {
  formStub.current = "word-choice";
  const { container } = renderApp(<App />);

  startStep("ordering");
  expect(screen.getByTestId("word-choice-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("word-choice-screen-complete")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["word-choice-screen-title"]);
});

test("[I3] 제목 축 닫힌 집합이 상태 sentence-order에서 계약이 고정한 목록과 정확히 같다", () => {
  formStub.current = "sentence-order";
  const { container } = renderApp(<App />);

  startStep("ordering");
  expect(screen.getByTestId("sentence-order-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("sentence-order-screen-complete")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["sentence-order-screen-title"]);
});

test("[I3] 제목 축 닫힌 집합이 상태 culture-quiz에서 계약이 고정한 목록과 정확히 같다", () => {
  formStub.current = "culture";
  const { container } = renderApp(<App />);

  startStep("ordering");
  fireEvent.tap(screen.getByTestId("culture-screen-quiz"), {});
  expect(screen.getByTestId("culture-quiz-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("culture-quiz-screen-complete")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["culture-quiz-screen-title"]);
});

// 위 케이스들이 여는 상태 전부는 학습 세션 안입니다. 사용자가 실제로 먼저 닿는
// 상태들 — 네 탭 뿌리, 시트 열림, 듣기의 문항 상태(가장 오래 머무는 상태) — 은
// 앵커는 올라 있지만 어느 `toEqual`에도 들어온 적이 없었습니다. 그 상태에 잎
// 하나가 `header`를 잘못 지고 서도 오늘은 아무것도 안 빨개집니다. 아래가 그
// 자리를 첫 훑기 안으로 들입니다 — 기대값은 그 앵커 목록에서 그 상태가 여는
// 것만 뽑습니다.

// 홈 탭이 걷혔으므로 알림은 여정 탭에서 엽니다. 알림 버튼은 제목이 아니므로
// 여기서도 제목 축엔 알림 화면 제목만 오릅니다.
test("[I3] 제목 축 닫힌 집합이 상태 notifications에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("journey-map-screen-notifications"), {});
  expect(screen.getByTestId("notifications-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["notifications-screen-title"]);
});

test("[I3] 제목 축 닫힌 집합이 상태 journey-map에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  expect(screen.getByTestId("journey-map-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["journey-map-screen-title"]);
});

test("[I3] 제목 축 닫힌 집합이 상태 roleplay-list에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-roleplay"), {});
  expect(screen.getByTestId("roleplay-list-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["roleplay-list-screen-title"]);
});

test("[I3] 제목 축 닫힌 집합이 상태 settings에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["settings-screen-title"]);
});

// 시트 열림 — `journey-step-node-<stepId>` tap 직후, `시작`은 아직 안 눌렀습니다.
// 맵 제목과 시트 제목이 같은 트리에 함께 섭니다(맵 컨테이너는
// `accessibility-elements-hidden`로 가려지지만 그 속성은 조작 단위 축이고, 맵
// 제목 자체는 그 컨테이너 밖에 있어 가려지지 않습니다).
test("[I3] 제목 축 닫힌 집합이 상태 step-sheet-open에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
  fireEvent.tap(screen.getByTestId("journey-step-node-ordering"), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["journey-map-screen-title", "step-sheet-title"]);
});

// 듣기의 문항 상태 — `startStep`으로 세션에 들어간 직후, 아직 한 문항도 안 풀었습니다
// (`answerAllQuestions`를 부르지 않습니다). 오늘 사용자가 실제로 닿는 유일한 학습
// 형식이고, 그 화면이 가장 오래 머무는 상태입니다. `listening-choice-0`이 문항
// 상태의 프로브입니다 — 종료 상태(`listening-screen-complete`)에는 없습니다.
test("[I3] 제목 축 닫힌 집합이 상태 listening-question에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  startStep("ordering");
  expect(screen.getByTestId("listening-choice-0")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["listening-screen-title"]);
});

// ErrorBoundary 오류 상태(`error-boundary-title`)는 이 회차에서 열지 않습니다 —
// 던지는 자식이 필요해 이 계층이 아니라 `ui`가 맞는 자리입니다.

// 위 `[I3]` 「상태 settings」 케이스는 **불변**입니다 — 새 화면이 기존 상태의 제목
// 축을 건드리지 않습니다(회귀 가드). 여기서는 설정 탭 아래에서 새로 여는
// 프로필·약관 상태의 제목 축을 짓습니다. 형태는 위 `[I3]` 계열과 같습니다
// (`headingAxis` → `toEqual` 닫힌 집합).

test("[HT1] 제목 축 닫힌 집합이 상태 profile에서 계약이 고정한 목록과 정확히 같다", () => {
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  fireEvent.tap(screen.getByTestId("settings-nav-item-profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual(["profile-screen-title"]);
});

// 절 제목 넷이 `header`입니다(ADR-0016 D12 G1) — 그래서 약관 상태의 제목 축 닫힌
// 집합은 화면 제목 + 절 제목 넷, **다섯**입니다. 절 id는 `termsSections()`에서
// 뽑습니다 — 리터럴 넷을 여기 다시 쓰지 않습니다(데이터 앵커).
test("[HT2] 제목 축 닫힌 집합이 상태 terms에서 계약이 고정한 목록과 정확히 같다", () => {
  const sections = termsSections();
  const { container } = renderApp(<App />);

  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
  fireEvent.tap(screen.getByTestId("settings-nav-item-terms"), {});
  expect(screen.getByTestId("terms-screen-title")).toBeInTheDocument();

  expect(headingAxis(container)).toEqual([
    "terms-screen-title",
    ...sections.map((section) => `terms-section-title-${section.id}`),
  ]);
});

// HT-E1: 진입 상태 여섯의 제목 축 닫힌 집합입니다 — 스플래시는 `header`가 0개,
// 나머지 다섯은 각각 1개입니다. 위 `[I3]`·`[HT1]`·`[HT2]`와 같은 도구
// (`headingAxis` → `toEqual` 닫힌 집합)를 여섯 상태에 순서대로 씁니다 — 이 파일이
// 이미 세운 방식을 새로 발명하지 않습니다.
//
// **토큰을 스텁하지 않습니다** — 위 `renderApp` 헬퍼는 토큰이 **있는** 상태를
// 만들어 스플래시를 건너뛰는 용도라 이 케이스와 반대입니다. 여기는 스플래시
// 자체와 그 뒤 다섯 상태를 순서대로 관찰해야 하므로 토큰 없는 상태에서 가짜
// 타이머만 직접 전진시킵니다.
//
// 여섯 상태를 **한 케이스 안에서** 순서대로 잇습니다 — 상태마다 별도 `test`로
// 쪼개면 기대 수가 달라집니다.
function emptyStorageStub(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });
}

// 코드 칸 넷(CompactNumericInput)에 한 자리씩 넣습니다 — `VerificationCodeScreen.ui.test.tsx`의
// `typeCode`와 같은 형태입니다(파일이 다르므로 다시 선언합니다).
function typeVerificationCode(value: string): void {
  const EventConstructor = document.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  Array.from(value).forEach((digit, index) => {
    const ref = lynx
      .createSelectorQuery()
      .select(`.verification-code-screen-digit-${index} .ui-lynx-compact-numeric-input`);
    fireEvent(
      ref as unknown as Element,
      new EventConstructor("bindEvent:input", { detail: { value: digit } }),
    );
  });
}

function tapVerificationSubmit(): void {
  fireEvent.tap(
    within(screen.getByTestId("verification-code-screen-submit")).getByTestId("ui-lynx-button"),
    {},
  );
}

test("[HT-E1] 제목 축 닫힌 집합이 진입 상태 여섯 각각에서 계약이 고정한 목록과 정확히 같다", () => {
  emptyStorageStub();
  vi.useFakeTimers();
  const { container } = render(<App />);

  // 상태 splash — 화면 제목이 다섯뿐이고 스플래시 서비스 이름은 `header`가
  // 아니므로 닫힌 집합이 비어 있습니다. 앵커로 먼저 스플래시 자신을 짓습니다 —
  // 그래야 이 빈 배열이 「스플래시 상태에서 실제로 0개」이지 「아직 아무 화면도
  // 없어서 0개」가 아니라고 말할 수 있습니다(공허하게 통과할 수 있는 자리입니다).
  expect(screen.getByTestId("splash-screen-logo")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual([]);

  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });

  // 상태 onboarding
  expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["onboarding-screen-title"]);

  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
  fireEvent.tap(
    within(screen.getByTestId("onboarding-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  // 상태 login
  expect(screen.getByTestId("login-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["login-screen-title"]);

  fireEvent.tap(
    within(screen.getByTestId("login-screen-method-phone")).getByTestId("ui-lynx-button"),
    {},
  );

  // 상태 verification-code
  expect(screen.getByTestId("verification-code-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["verification-code-screen-title"]);

  typeVerificationCode("1234");
  tapVerificationSubmit();

  // 상태 language-select
  expect(screen.getByTestId("language-select-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["language-select-screen-title"]);

  fireEvent.tap(
    within(screen.getByTestId("language-select-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );

  // 상태 journey-entry
  expect(screen.getByTestId("journey-entry-screen-title")).toBeInTheDocument();
  expect(headingAxis(container)).toEqual(["journey-entry-screen-title"]);
});
