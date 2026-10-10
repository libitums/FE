import { useEffect } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { learningShellScrollId } from "./learning-shell-scroll";

// `ui` 계층: 작업 영역이 좁아지면 지시문 · 무대 · 작업 영역이 한 스크롤(`learning-shell-flow`)로
// 합쳐지는 배치(learning-shell-large-font)의 **구조**를 봅니다. 높이 · 실제 스크롤 · 픽셀은
// 이 계층이 못 봅니다(e2e의 몫). `toHaveClass` · `toHaveStyle`을 쓰지 않습니다
// (docs/conventions/code.md) — 클래스는 `getAttribute("class")`의 낱말로 봅니다.
//
// **측정을 흉내 내는 법.** `<scroll-view>`는 요소를 그대로 넘기면 `fireEvent`가 거부하므로
// (`JourneyMapScreen.anchor.ui.test.tsx`) `lynx.createSelectorQuery().select("#…")`가 준
// NodesRef에 `layoutchange`를 `detail: { height }`로 쏩니다. NodesRef는 쏘는 순간 id로 요소를
// 찾으므로 스크롤 요소가 갈려도(합칠 때) 같은 ref가 새 요소를 가리킵니다. 기기에서는
// `detail`과 `params`가 둘 다 오고 값이 같습니다(spike SP3).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type ShellProps = Parameters<typeof LearningShell>[0];

const workspace = <text data-testid="fixture-workspace">낱말</text>;
const noAction = { actionLabel: undefined, onAction: undefined } as const;

function shellElement(overrides: Partial<ShellProps> = {}): ReactNode {
  return (
    <LearningShell
      form="listening"
      questionIndex={0}
      questionCount={4}
      instruction="대화를 완성하세요"
      onExit={() => {}}
      card={<text data-testid="fixture-card">카드 안</text>}
      workspace={workspace}
      {...noAction}
      {...overrides}
    />
  );
}

function renderShell(overrides: Partial<ShellProps> = {}) {
  const view = render(shellElement(overrides));
  return {
    ...view,
    // 다시 렌더할 때도 기본 프롭을 같이 넘깁니다 — 바꿀 것만 적습니다.
    again: (next: Partial<ShellProps>) => view.rerender(shellElement({ ...overrides, ...next })),
  };
}

/** 껍데기 스크롤을 가리키는 NodesRef입니다. 선택자 대역을 세우기 **전에** 만들어 둡니다. */
function scrollRef(): unknown {
  return lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
}

function reportHeight(ref: unknown, height: number): void {
  act(() => {
    fireEvent.layoutchange(ref as Element, { detail: { height } });
  });
}

/** 렌더 뒤 한 번에: 높이를 보고합니다. */
function renderMeasured(height: number, overrides: Partial<ShellProps> = {}) {
  const view = renderShell(overrides);
  const ref = scrollRef();
  reportHeight(ref, height);
  return { ...view, ref };
}

const byId = (testId: string): HTMLElement => screen.getByTestId(testId);
const flow = (): HTMLElement | null => screen.queryByTestId("learning-shell-flow");
const scroll = (): HTMLElement => byId("learning-shell-scroll");
// 조건부로 서는 자식은 렌더러가 `<wrapper>`로 감싸 둡니다 — 구조가 아니라 렌더러의 사정이므로
// 풀어서 봅니다(빈 wrapper는 자식이 없는 것과 같습니다).
const elementChildrenOf = (parent: Element): Element[] =>
  Array.from(parent.children).flatMap((child) =>
    child.tagName.toLowerCase() === "wrapper" ? elementChildrenOf(child) : [child],
  );
const testIdsOf = (parent: Element): (string | null)[] =>
  elementChildrenOf(parent).map((child) => child.getAttribute("data-testid"));
const classesOf = (el: Element): string[] => (el.getAttribute("class") ?? "").split(/\s+/);
const accessibilityAttrsOf = (el: Element): string[] =>
  el.getAttributeNames().filter((name) => name.startsWith("accessibility-"));
/** 지시문은 루트의 직계이고 스크롤 밖입니다(split · 카드 스크롤 모두). */
function expectInstructionOutsideScroll(): void {
  expect(testIdsOf(byId("learning-shell"))).toContain("learning-shell-instruction");
  expect(scroll().contains(byId("learning-shell-instruction"))).toBe(false);
}

/** split: 무대도 루트의 직계이고 스크롤 밖입니다. */
function expectStageBesideScroll(): void {
  expectInstructionOutsideScroll();
  expect(testIdsOf(byId("learning-shell"))).toContain("learning-shell-stage");
  expect(scroll().contains(byId("learning-shell-stage"))).toBe(false);
}

/** 카드 스크롤(말하기): 무대는 스크롤 안입니다. */
function expectStageInsideScroll(): void {
  expectInstructionOutsideScroll();
  expect(testIdsOf(byId("learning-shell"))).not.toContain("learning-shell-stage");
  expect(scroll().contains(byId("learning-shell-stage"))).toBe(true);
}
const allFogs = (): HTMLElement[] => screen.queryAllByTestId("ui-lynx-fog");

// ---------------------------------------------------------------- 선택자 대역

type Invocation = {
  readonly selector: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
};

/** `JourneyMapScreen.anchor.ui.test.tsx`의 `stubSelectorQuery`와 같은 꼴입니다(질의를 모읍니다). */
function stubSelectorQuery(): Invocation[] {
  const invocations: Invocation[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: { method: string; params?: Record<string, unknown> }) => ({
            exec: () => {
              invocations.push({ selector, method: options.method, params: options.params });
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  return invocations;
}

const scrollToCalls = (invocations: readonly Invocation[]): Invocation[] =>
  invocations.filter((call) => call.method === "scrollTo");

const SCROLL_TO_TOP: Invocation = {
  selector: "#learning-shell-scroll",
  method: "scrollTo",
  params: { offset: 0, smooth: false },
};

// ---------------------------------------------------------------- MG1 ~ MG3 구조

test("[MG1] 높이 0을 보고하면 지시문 · 무대 · 작업 영역이 한 흐름 상자로 스크롤 안에 선다", () => {
  renderMeasured(0);

  const flowBox = flow();
  expect(flowBox).not.toBeNull();
  expect(within(scroll()).getByTestId("learning-shell-flow")).toBe(flowBox);
  expect(testIdsOf(flowBox as HTMLElement)).toEqual([
    "learning-shell-instruction",
    "learning-shell-stage",
    "fixture-workspace",
  ]);
  expect(screen.getAllByTestId("learning-shell-instruction")).toHaveLength(1);
  expect(screen.getAllByTestId("learning-shell-stage")).toHaveLength(1);
});

test("[MG2] 합친 스크롤은 하나이고 클래스 셋과 스크롤 속성을 갖고 접근성 속성이 없다", () => {
  renderMeasured(0);

  expect(screen.getAllByTestId("learning-shell-scroll")).toHaveLength(1);
  const merged = scroll();
  expect(classesOf(merged)).toEqual(
    expect.arrayContaining([
      "learning-shell-scroll",
      "learning-shell-card-scroll",
      "learning-shell-body-scroll",
    ]),
  );
  expect(merged).toHaveAttribute("scroll-orientation", "vertical");
  expect(merged).toHaveAttribute("scroll-bar-enable", "false");
  expect(merged).not.toHaveAttribute("enable-scroll");
  expect(accessibilityAttrsOf(merged)).toEqual([]);
  expect(accessibilityAttrsOf(flow() as HTMLElement)).toEqual([]);
});

// 가드: 지금도 참입니다. 「늘 합친다」 · 「문턱을 뺀다」 변이로 red를 확인합니다.
test("[MG3] 96 이상이면 합치지 않는다 — 지시문 · 무대는 루트의 직계이고 스크롤은 split 모양이다", () => {
  for (const height of [96, 400]) {
    renderMeasured(height);

    expect(flow()).toBeNull();
    expectStageBesideScroll();
    const classes = classesOf(scroll());
    expect(classes).not.toContain("learning-shell-card-scroll");
    expect(classes).not.toContain("learning-shell-body-scroll");
    cleanup();
  }
});

test("[MG3] 96 바로 아래(95.9)는 합친다 — 문턱의 경계", () => {
  renderMeasured(95.9);

  expect(flow()).not.toBeNull();
});

// 가드: 못 잰 값은 합치는 근거가 되지 않습니다.
test("[MG4] 보고가 없거나 detail이 없거나 높이가 NaN이면 split이다", () => {
  renderShell();
  expect(flow()).toBeNull();
  cleanup();

  renderShell();
  act(() => {
    fireEvent.layoutchange(scrollRef() as Element, {});
  });
  expect(flow()).toBeNull();
  cleanup();

  renderShell();
  reportHeight(scrollRef(), Number.NaN);
  expect(flow()).toBeNull();
  expect(classesOf(scroll())).not.toContain("learning-shell-card-scroll");
});

// ---------------------------------------------------------------- MG5 걸쇠

test("[MG5] 한 번 합치면 껍데기가 떠날 때까지 되돌아가지 않는다", () => {
  const { again, ref } = renderMeasured(0);
  const mergedScroll = scroll();

  // (a) 합친 스크롤이 크게 잰 값(800)을 보고해도 그대로입니다.
  reportHeight(ref, 800);
  expect(flow()).not.toBeNull();

  // (b) 문항이 바뀌어도 그대로입니다.
  again({ questionIndex: 1 });
  expect(flow()).not.toBeNull();

  // (c) 작업 영역이 사라지고 완료가 되어도 스크롤은 서 있고 무대만 흐름 안에 남습니다.
  again({ questionIndex: 1, workspace: undefined, complete: true });
  expect(flow()).not.toBeNull();
  expect(within(flow() as HTMLElement).getByTestId("learning-shell-stage")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-shell-instruction")).toBeNull();
  expect(screen.queryByTestId("fixture-workspace")).toBeNull();
  expect(scroll()).toBe(mergedScroll);
});

// ---------------------------------------------------------------- MG6, MG7 제외

// 가드: 쓰기(스크롤 꺼짐)는 합치지 않습니다. 규칙을 빼는 변이로 red를 확인합니다.
test("[MG6] workspaceScrolls가 거짓이면 높이 0이어도 합치지 않는다", () => {
  renderMeasured(0, { workspaceScrolls: false });

  expect(flow()).toBeNull();
  expect(scroll()).toHaveAttribute("enable-scroll", "false");
});

// 가드: 말하기(scrollCard)는 이미 카드 스크롤이라 흐름 상자가 없습니다.
test("[MG7] scrollCard는 높이 0이어도 흐름 상자 없이 무대 · 작업 영역이 스크롤의 직계다", () => {
  renderShell({ scrollCard: true });
  const cardScroll = scroll();

  expect(cardScroll).not.toHaveAttribute("id");
  // `id`가 없어 id 선택자로는 닿지 못하므로 testid 속성 선택자로 NodesRef를 만듭니다.
  const cardScrollRef = lynx.createSelectorQuery().select('[data-testid="learning-shell-scroll"]');
  reportHeight(cardScrollRef, 0);

  expect(flow()).toBeNull();
  expect(testIdsOf(cardScroll)).toEqual(["learning-shell-stage", "fixture-workspace"]);
  expectStageInsideScroll();
  expect(classesOf(cardScroll)).not.toContain("learning-shell-body-scroll");
});

// ---------------------------------------------------------------- MG8 끝 상자 · fog

test("[MG8] 합친 스크롤 안은 흐름 → 끝 상자 순서이고 fog 상자는 스크롤 밖에서 터치를 받지 않는다", () => {
  renderMeasured(0);

  expect(testIdsOf(scroll())).toEqual(["learning-shell-flow", "learning-shell-scroll-end"]);
  const fog = byId("learning-shell-rest-fog");
  expect(scroll().contains(fog)).toBe(false);
  expect(allFogs()).toHaveLength(1);
  // ADR-0055 D6: `event-through`는 Lynx 안의 형제로 터치를 내려보내지 않습니다.
  expect(fog).toHaveAttribute("user-interaction-enabled", "false");
  expect(fog).not.toHaveAttribute("event-through");
});

// ---------------------------------------------------------------- MG9 액션 행

test("[MG9] 합친 흐름에서 액션 행이 서면 스크롤 밖 · 흐름 안 모양이고 fog 상자가 걷힌다", () => {
  const onAction = vi.fn<() => void>();
  const { again } = renderMeasured(0);

  again({ actionLabel: "Check", onAction });

  const actions = byId("learning-shell-actions");
  expect(classesOf(actions)).toContain("learning-shell-actions-in-flow");
  expect(allFogs()).toHaveLength(0);
  expect(screen.queryByTestId("learning-shell-scroll-end")).toBeNull();
  expect(screen.queryByTestId("learning-shell-rest-fog")).toBeNull();
  expect(scroll().contains(actions)).toBe(false);
  // DOM 순서에서 스크롤 뒤입니다(낭독 순서).
  expect(scroll().compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  fireEvent.tap(byId("learning-shell-action"), {});
  expect(onAction).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- MG10, MG11

test("[MG10] 합친 뒤에도 obscured가 루트의 낭독 가림을 따르고 흐름은 그대로다", () => {
  const { again } = renderMeasured(0, { obscured: true });
  const mergedFlow = flow();

  expect(mergedFlow).not.toBeNull();
  expect(byId("learning-shell")).toHaveAttribute("accessibility-elements-hidden", "true");

  again({ obscured: false });

  expect(byId("learning-shell").getAttribute("accessibility-elements-hidden")).not.toBe("true");
  expect(flow()).toBe(mergedFlow);
});

test("[MG11] 합친 뒤에도 넘김 층이 한 번 밟히고 나가기 확인이 뜬다", () => {
  const run = vi.fn<() => void>();
  renderMeasured(0, { advance: { label: "다음으로", run, delayMs: 60_000 } });

  expect(flow()).not.toBeNull();
  fireEvent.tap(byId("learning-shell-advance"), {});
  expect(run).toHaveBeenCalledTimes(1);

  fireEvent.tap(byId("learning-shell-exit"), {});
  expect(screen.getByTestId("ui-lynx-dialog")).toBeInTheDocument();
});

// ---------------------------------------------------------------- MG12

// 가드(스캐폴드가 더합니다): 측정과 맨 위 이동이 같은 id를 겨눕니다.
test("[MG12] 껍데기 스크롤의 id가 상수 learningShellScrollId다", () => {
  renderShell();

  expect(scroll().getAttribute("id")).toBe(learningShellScrollId);
  expect(learningShellScrollId).toBe("learning-shell-scroll");
});

// ---------------------------------------------------------------- MG13 ~ MG14 맨 위로

test("[MG13] 합친 스크롤은 문항이 바뀔 때와 완료로 갈 때 맨 위로 가고, 합쳐지는 순간에는 가지 않는다", () => {
  const { again } = renderShell();
  const ref = scrollRef();
  const invocations = stubSelectorQuery();

  reportHeight(ref, 0);
  expect(flow()).not.toBeNull();
  expect(scrollToCalls(invocations)).toHaveLength(0);

  again({ questionIndex: 1 });
  expect(scrollToCalls(invocations)).toEqual([SCROLL_TO_TOP]);

  again({ questionIndex: 1, workspace: undefined, complete: true });
  expect(scrollToCalls(invocations)).toEqual([SCROLL_TO_TOP, SCROLL_TO_TOP]);
});

// 가드: 합친 스크롤일 때만, 문항 · 완료가 바뀔 때만 부릅니다.
test("[MG14] split · scrollCard · 쓰기에서는 문항이 바뀌어도 맨 위로 보내지 않고, 합친 뒤 관계없는 프롭은 보내지 않는다", () => {
  // (a) 측정 없음(split)
  let invocations = stubSelectorQuery();
  const split = renderShell();
  split.again({ questionIndex: 1 });
  expect(scrollToCalls(invocations)).toHaveLength(0);
  cleanup();
  vi.restoreAllMocks();

  // (b) scrollCard
  invocations = stubSelectorQuery();
  const card = renderShell({ scrollCard: true });
  card.again({ questionIndex: 1 });
  expect(scrollToCalls(invocations)).toHaveLength(0);
  cleanup();
  vi.restoreAllMocks();

  // (d) 쓰기(스크롤 꺼짐)는 높이 0이어도 합쳐지지 않으므로 보내지 않는다
  const writing = renderShell({ workspaceScrolls: false });
  const writingRef = scrollRef();
  invocations = stubSelectorQuery();
  reportHeight(writingRef, 0);
  writing.again({ questionIndex: 1 });
  expect(scrollToCalls(invocations)).toHaveLength(0);
  cleanup();
  vi.restoreAllMocks();

  // (c) 합친 뒤 questionIndex · complete가 같은 값으로 다시 렌더(다른 프롭만 바뀜)
  const merged = renderShell();
  const mergedRef = scrollRef();
  invocations = stubSelectorQuery();
  reportHeight(mergedRef, 0);
  merged.again({ actionLabel: "Check", onAction: () => {} });
  merged.again({ actionLabel: "Next", onAction: () => {} });
  expect(flow()).not.toBeNull();
  expect(scrollToCalls(invocations)).toHaveLength(0);
});

// ---------------------------------------------------------------- MG15 다시 mount

let mountCount = 0;
function MountProbe(): ReactNode {
  useEffect(() => {
    mountCount += 1;
  }, []);
  return <text data-testid="mount-probe">탐침</text>;
}

test("[MG15] 합칠 때 한 번만 다시 서고, 그 뒤 다시 렌더에서는 같은 노드가 유지되며 다시 서지 않는다", () => {
  mountCount = 0;
  const { again } = renderShell({ card: <MountProbe /> });
  expect(mountCount).toBe(1);

  reportHeight(scrollRef(), 0);
  expect(flow()).not.toBeNull();
  expect(mountCount).toBe(2);

  const mergedScroll = scroll();
  const mergedFlow = flow();

  again({ card: <MountProbe />, questionIndex: 1 });
  expect(mountCount).toBe(2);
  expect(scroll()).toBe(mergedScroll);
  expect(flow()).toBe(mergedFlow);

  again({ card: <MountProbe />, questionIndex: 1, actionLabel: "Check", onAction: () => {} });
  expect(mountCount).toBe(2);
  expect(scroll()).toBe(mergedScroll);
  expect(flow()).toBe(mergedFlow);

  again({ card: <MountProbe />, questionIndex: 1, workspace: undefined, complete: true });
  expect(mountCount).toBe(2);
  expect(scroll()).toBe(mergedScroll);
  expect(flow()).toBe(mergedFlow);
});

// ---------------------------------------------------------------- MG16

test("[MG16] 흐름 상자와 끝 상자는 흐름 안의 상자라 터치를 가로채는 속성이 없다", () => {
  renderMeasured(0);

  for (const box of [byId("learning-shell-flow"), byId("learning-shell-scroll-end")]) {
    expect(box).not.toHaveAttribute("event-through");
    expect(box).not.toHaveAttribute("user-interaction-enabled");
  }
});

// ---------------------------------------------------------------- MG17 ~ MG23 답하면 맨 위로 (r03)

// 넘김 걸음은 객체입니다. 같은 내용의 새 객체를 만들 수 있도록 함수로 둡니다.
const newAdvance = (run: () => void = () => {}) => ({ label: "다음으로", run, delayMs: 2500 });

// 가드(C1): 합친 흐름의 카드 `z-index: 0` 규칙은 클래스 `ui-lynx-card`에 기댑니다. CSS 값은
// 이 계층이 못 보므로(순서는 e2e L11) 선택자가 기대는 구조만 봅니다.
test("[MG17] 합친 흐름 안에 클래스 ui-lynx-card인 요소가 정확히 하나이고 무대의 자식이다", () => {
  renderMeasured(0);

  const cards = Array.from(byId("learning-shell-flow").querySelectorAll("*")).filter((el) =>
    classesOf(el).includes("ui-lynx-card"),
  );
  expect(cards).toHaveLength(1);
  expect(elementChildrenOf(byId("learning-shell-stage"))).toContain(cards[0]);
});

test("[MG18] 합친 흐름에서 넘김 걸음이 생기면(답함) 맨 위로 정확히 한 번 간다", () => {
  const { again } = renderShell();
  const ref = scrollRef();
  const invocations = stubSelectorQuery();
  reportHeight(ref, 0);
  expect(scrollToCalls(invocations)).toHaveLength(0);

  again({ advance: newAdvance() });

  expect(scrollToCalls(invocations)).toEqual([SCROLL_TO_TOP]);
});

// 가드: split에서는 답해도 · 버튼을 눌러도 보내지 않는다. 조건 `merged`를 빼는 변이로 red를 확인한다.
test("[MG19] 측정 없음(split)에서는 답해도 아래 버튼을 눌러도 맨 위로 보내지 않고 onAction은 한 번 불린다", () => {
  const onAction = vi.fn<() => void>();
  const { again } = renderShell();
  const invocations = stubSelectorQuery();
  const advance = newAdvance();

  again({ advance });
  again({ advance, actionLabel: "Check", onAction });
  expect(flow()).toBeNull();
  fireEvent.tap(byId("learning-shell-action"), {});

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(scrollToCalls(invocations)).toHaveLength(0);
});

// 가드: 말하기(scrollCard)는 높이 0이어도 카드 스크롤이라 보내지 않는다.
test("[MG20] scrollCard는 높이 0이어도 답해도 아래 버튼을 눌러도 맨 위로 보내지 않는다", () => {
  const onAction = vi.fn<() => void>();
  const { again } = renderShell({ scrollCard: true });
  const cardScrollRef = lynx.createSelectorQuery().select('[data-testid="learning-shell-scroll"]');
  const invocations = stubSelectorQuery();
  reportHeight(cardScrollRef, 0);
  const advance = newAdvance();

  again({ advance });
  again({ advance, actionLabel: "Check", onAction });
  fireEvent.tap(byId("learning-shell-action"), {});

  expect(flow()).toBeNull();
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(scrollToCalls(invocations)).toHaveLength(0);
});

test("[MG21] 문항 · 완료와 답함이 같은 렌더에서 바뀌면 한 번만 보낸다 — 1 → 2 → 3 → 4", () => {
  const { again } = renderShell();
  const ref = scrollRef();
  const invocations = stubSelectorQuery();
  reportHeight(ref, 0);
  const count = () => scrollToCalls(invocations).length;

  // 답함
  again({ advance: newAdvance() });
  expect(count()).toBe(1);

  // 넘김이 끝나 문항이 바뀐다(문항 · 답함 동시)
  again({ questionIndex: 1, advance: undefined });
  expect(count()).toBe(2);

  // 다음 문항에 답함
  again({ questionIndex: 1, advance: newAdvance() });
  expect(count()).toBe(3);

  // 넘김이 끝나 완료가 선다(완료 · 답함 동시)
  again({ questionIndex: 1, complete: true, workspace: undefined, advance: undefined });
  expect(count()).toBe(4);
});

test("[MG22] 합친 흐름에서 아래 버튼을 누르면 onAction보다 먼저 맨 위로 한 번 간다", () => {
  const { again } = renderShell();
  const ref = scrollRef();
  const invocations = stubSelectorQuery();
  reportHeight(ref, 0);
  // onAction이 불리는 순간에 이미 나간 scrollTo 수를 기록합니다(1이면 앞선 것입니다).
  const scrollsSeenByOnAction: number[] = [];
  const onAction = vi.fn<() => void>(() => {
    scrollsSeenByOnAction.push(scrollToCalls(invocations).length);
  });

  again({ actionLabel: "Check", onAction });
  expect(scrollToCalls(invocations)).toHaveLength(0);
  fireEvent.tap(byId("learning-shell-action"), {});

  expect(scrollToCalls(invocations)).toEqual([SCROLL_TO_TOP]);
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(scrollsSeenByOnAction).toEqual([1]);
});

// 가드: 「있음 · 없음」을 본다. 의존을 `advance` 객체로 바꾸는 변이로 red(2회)를 확인한다.
test("[MG23] 같은 걸음이 새 객체로 다시 오거나 관계없는 프롭이 바뀌어도 더 보내지 않는다", () => {
  const { again } = renderShell();
  const ref = scrollRef();
  const invocations = stubSelectorQuery();
  reportHeight(ref, 0);

  again({ advance: newAdvance() });
  expect(scrollToCalls(invocations)).toHaveLength(1);

  again({ advance: newAdvance() });
  expect(scrollToCalls(invocations)).toHaveLength(1);

  again({ advance: newAdvance(), trophyCount: 3 });
  expect(scrollToCalls(invocations)).toHaveLength(1);
});
