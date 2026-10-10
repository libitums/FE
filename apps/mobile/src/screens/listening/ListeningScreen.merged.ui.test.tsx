import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { ListeningScreen } from "./ListeningScreen";
import { learningShellScrollId } from "../learning/learning-shell-scroll";
import { initialSessionOptions } from "../../lib/session-options";
import type { SessionOptions } from "../../lib/session-options";

// `ui` 계층: 듣기 화면을 통해 본 **합친 배치**(learning-shell-large-font)입니다. 껍데기 자신의
// 구조 계약은 `LearningShell.merged.ui.test.tsx`가 집니다 — 여기서는 합쳐진 흐름 안에서 문항이
// 풀리는지(LS2), 그리고 합칠 때 무대가 다시 서도 소리와 재생 상태가 끊기지 않는지(LS3 ~ LS5)를
// 봅니다. 재생의 주인이 화면(`useListeningPlayback`)이라 무대가 다시 서는 것과 무관해야 합니다.
//
// `ListeningScreen.ui.test.tsx`의 `stubHost()`는 `pause` · `resume`이 없고 그 파일의
// 「`vi.stubGlobal`은 하나」 규칙이 있어, 이 파일에 같은 꼴의 대역을 **케이스마다 하나만** 세웁니다.
// `lib/audio.ts`는 mock하지 않고 호스트 경계(`NativeModules`) 하나만 대체합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STOP = "<stop>";
const PAUSE = "<pause>";
const RESUME = "<resume>";

type HostCall = { source: string; done: (result: unknown) => void };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: {
      play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
      stop: () => void calls.push({ source: STOP, done: () => {} }),
      pause: () => void calls.push({ source: PAUSE, done: () => {} }),
      resume: () => void calls.push({ source: RESUME, done: () => {} }),
    },
  });
  return calls;
}

const controls = new Set([STOP, PAUSE, RESUME]);
const playCalls = (calls: readonly HostCall[]): HostCall[] =>
  calls.filter((call) => !controls.has(call.source));
const countOf = (calls: readonly HostCall[], source: string): number =>
  calls.filter((call) => call.source === source).length;

// 제품 표의 실물입니다(`ListeningScreen.ui.test.tsx`의 ORDERING_QUESTIONS와 같은 값).
const ANSWER_INDEXES = [2, 0, 3] as const;

function renderOrdering(sessionOptions: SessionOptions = initialSessionOptions) {
  return render(
    <ListeningScreen
      stepId="ordering"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={sessionOptions}
    />,
  );
}

function reportHeight(height: number): void {
  const ref = lynx.createSelectorQuery().select(`#${learningShellScrollId}`);
  act(() => {
    fireEvent.layoutchange(ref as unknown as Element, { detail: { height } });
  });
}

const control = () => screen.getByTestId("listening-prompt-playback");
const flow = () => screen.queryByTestId("learning-shell-flow");
const classesOf = (el: Element): string[] => (el.getAttribute("class") ?? "").split(/\s+/);

function answerAndAdvance(questionIndex: number): void {
  fireEvent.tap(screen.getByTestId(`listening-choice-${ANSWER_INDEXES[questionIndex]}`), {});
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});
}

// ---------------------------------------------------------------- LS2

test("[LS2] 합친 흐름에서 보기가 흐름 안에 서고, 고르면 판정이 나며, 마친 뒤 액션 행은 흐름 안 모양이다", () => {
  stubHost();
  renderOrdering();

  reportHeight(0);

  const mergedFlow = flow();
  expect(mergedFlow).not.toBeNull();
  expect(
    within(mergedFlow as HTMLElement).getByTestId("listening-screen-choices"),
  ).toBeInTheDocument();

  fireEvent.tap(screen.getByTestId(`listening-choice-${ANSWER_INDEXES[0]}`), {});
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

  answerAndAdvance(1);
  answerAndAdvance(2);

  expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument();
  expect(flow()).not.toBeNull();
  const actions = screen.getByTestId("learning-shell-actions");
  expect(classesOf(actions)).toContain("learning-shell-actions-in-flow");
});

// 마지막 문항을 넘기는 순간 문항이 사라져 재생 정리가 나갑니다 — 지금 동작과 같은 수입니다.
test("[LS2] 문항을 넘기는 마지막 걸음에서 stop이 정확히 한 번 더 나간다", () => {
  const calls = stubHost();
  renderOrdering();
  reportHeight(0);
  answerAndAdvance(0);
  answerAndAdvance(1);

  const before = countOf(calls, STOP);
  answerAndAdvance(2);

  expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument();
  expect(flow()).not.toBeNull();
  expect(countOf(calls, STOP) - before).toBe(1);
});

// ---------------------------------------------------------------- LS3 ~ LS5 재생 주인

test("[LS3] 합쳐져도 재생은 끊기지 않는다 — play 1회 · stop 0회, 표시가 그대로이고 끝나면 돌아온다", () => {
  const calls = stubHost();
  renderOrdering();

  // 합치기 전: 자동 재생이 한 번 불렸습니다.
  expect(playCalls(calls)).toHaveLength(1);
  expect(control()).toHaveAttribute("accessibility-label", "Pause");

  reportHeight(0);

  // 선행: 합친 구조가 섰습니다(무대가 새 부모 아래 다시 섰습니다).
  expect(flow()).not.toBeNull();
  expect(playCalls(calls)).toHaveLength(1);
  expect(countOf(calls, STOP)).toBe(0);
  expect(control()).toHaveAttribute("accessibility-label", "Pause");

  // 새로 선 무대가 「다 들었다」를 받습니다.
  act(() => {
    playCalls(calls)[0]?.done("done");
  });
  expect(control()).toHaveAttribute("accessibility-label", "Play");
  expect(playCalls(calls)).toHaveLength(1);
});

test("[LS4] 멈춰 둔 상태가 합친 뒤에도 남고, 누르면 처음부터가 아니라 이어서 튼다", () => {
  const calls = stubHost();
  renderOrdering();

  fireEvent.tap(control(), {});
  expect(countOf(calls, PAUSE)).toBe(1);
  expect(control()).toHaveAttribute("accessibility-label", "Resume");

  reportHeight(0);

  expect(flow()).not.toBeNull();
  expect(control()).toHaveAttribute("accessibility-label", "Resume");
  expect(playCalls(calls)).toHaveLength(1);

  fireEvent.tap(control(), {});

  expect(countOf(calls, RESUME)).toBe(1);
  expect(playCalls(calls)).toHaveLength(1);
  expect(control()).toHaveAttribute("accessibility-label", "Pause");
});

test("[LS5] 자동 재생이 꺼진 세션은 합친다고 틀지 않는다", () => {
  const calls = stubHost();
  renderOrdering({ ...initialSessionOptions, "auto-play-audio": false });
  expect(playCalls(calls)).toHaveLength(0);

  reportHeight(0);

  expect(flow()).not.toBeNull();
  expect(playCalls(calls)).toHaveLength(0);
  expect(countOf(calls, STOP)).toBe(0);
});

// ---------------------------------------------------------------- LS6 답하면 맨 위로 (r03)

test("[LS6] 합친 흐름에서 보기를 누르면 맨 위로 한 번 가고 판정 배지가 서며, 넘기면 완료와 함께 한 번만 더 간다", () => {
  stubHost();
  // 문항이 하나인 단계라 넘기면 곧 완료입니다.
  render(
    <ListeningScreen
      stepId="tutorial-listening"
      onExit={() => {}}
      onFinish={() => {}}
      sessionOptions={initialSessionOptions}
    />,
  );
  reportHeight(0);
  expect(flow()).not.toBeNull();

  const scrollTos: string[] = [];
  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (options: { method: string }) => ({
            exec: () => {
              if (options.method === "scrollTo") scrollTos.push(selector);
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );

  try {
    fireEvent.tap(screen.getByTestId("listening-choice-0"), {});

    expect(scrollTos).toEqual([`#${learningShellScrollId}`]);
    const slot = document.querySelector(".listening-screen-verdict-slot");
    expect(slot).not.toBeNull();
    expect(within(slot as HTMLElement).getByTestId("answer-verdict")).toBeInTheDocument();

    // 넘김이 끝나 완료가 서는 렌더에서 완료 · 답함이 함께 바뀌어도 한 번입니다.
    fireEvent.tap(screen.getByTestId("learning-shell-advance"), {});

    expect(screen.getByTestId("listening-screen-complete")).toBeInTheDocument();
    expect(scrollTos).toHaveLength(2);
  } finally {
    vi.restoreAllMocks();
  }
});
