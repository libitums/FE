import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutStage, CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층: 통과 뒤 컷(`stage="epilogue"`) — 같은 컷 화면이 마지막 진행 버튼의 낭독만 단계에 따라 가른다.
// 컷 표시 모델은 손으로 세웠고, 타자기가 대사를 끝까지 쓰도록 가짜 타이머로 시간을 흘립니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };

const views: readonly CatalogCutView[] = [
  {
    kind: "narration",
    index: 0,
    text: { ko: "점원이 웃는다.", en: "The clerk smiles.", roman: "jeomwoni unneunda." },
    imageUrl: null,
  },
  {
    kind: "line",
    voice: "speech",
    index: 1,
    speaker: { kind: "named", name: "점원" },
    text: { ko: "또 오세요.", en: "Come again.", roman: "tto oseyo." },
    aside: null,
    imageUrl: null,
  },
  {
    kind: "line",
    voice: "thought",
    index: 2,
    speaker: { kind: "self" },
    text: { ko: "좋은 하루였다.", en: "It was a good day.", roman: "joeun haruyeotda." },
    aside: null,
    imageUrl: null,
  },
];

function cutsOf(list: readonly CatalogCutView[]): CatalogCuts {
  const [first, ...rest] = list;
  if (first === undefined) {
    throw new Error("컷이 하나는 있어야 합니다");
  }
  return [first, ...rest];
}

function mount(stage: CatalogCutStage) {
  const onComplete = vi.fn<() => void>();
  render(
    <CatalogCoverScreen
      stage={stage}
      insets={insets}
      ordinal={1}
      cuts={cutsOf(views)}
      onComplete={onComplete}
      onExit={() => {}}
    />,
  );
  return { onComplete };
}

const nextWrapper = () => screen.getByTestId("catalog-cover-screen-next");
const tapNext = () => fireEvent.tap(within(nextWrapper()).getByTestId("ui-lynx-button"), {});
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
const nextCut = () => {
  settle();
  tapNext();
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogCoverScreen stage", () => {
  test("UE1. 통과 뒤 컷의 마지막 진행 버튼은 에피소드 마침으로 낭독되고 글자는 Continue이며 완료는 한 번이다", () => {
    const { onComplete } = mount("epilogue");

    nextCut();
    nextCut();

    expect(within(nextWrapper()).getByTestId("ui-lynx-button-label")).toHaveTextContent("Continue");
    expect(nextWrapper()).toHaveAttribute("accessibility-label", "Finish episode");
    expect(onComplete).toHaveBeenCalledTimes(0);

    nextCut();
    nextCut();

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("UE2. 표지 컷(prologue)의 마지막 진행 버튼은 지금처럼 Finish intro로 낭독된다", () => {
    mount("prologue");

    nextCut();
    nextCut();

    expect(within(nextWrapper()).getByTestId("ui-lynx-button-label")).toHaveTextContent("Continue");
    expect(nextWrapper()).toHaveAttribute("accessibility-label", "Finish intro");
  });
});
