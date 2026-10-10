import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { LearningShell } from "./LearningShell";
import { SentenceOrderChip } from "../sentence-order/SentenceOrderChip";
import { PlaybackPrompt } from "../listening/ListeningPrompt.test-support";
import { initialSessionOptions } from "../../lib/session-options";

afterEach(() => vi.unstubAllGlobals());

function stubSound() {
  const play = vi.fn<(id: string) => void>();
  vi.stubGlobal("NativeModules", { SoundEffectsModule: { play, stopRing: vi.fn<() => void>() } });
  return play;
}

function renderShell(actionSound: "button" | "none" = "button") {
  const onAction = vi.fn<() => void>();
  render(
    <LearningShell
      form="sentence-order"
      questionIndex={0}
      questionCount={1}
      instruction="문장을 완성하세요"
      onExit={() => {}}
      card={<text>문장</text>}
      actionLabel="Next"
      actionSound={actionSound}
      onAction={onAction}
    />,
  );
  return onAction;
}

test("일반 학습의 다음 버튼은 다른 버튼과 같은 클릭음을 한 번 낸다", () => {
  const play = stubSound();
  const onAction = renderShell();

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(play).toHaveBeenCalledExactlyOnceWith("button");
});

test("채점 직후 판정음이 나오는 확인 버튼은 클릭음을 겹치지 않는다", () => {
  const play = stubSound();
  const onAction = renderShell("none");

  fireEvent.tap(screen.getByTestId("learning-shell-action"), {});

  expect(onAction).toHaveBeenCalledTimes(1);
  expect(play).not.toHaveBeenCalled();
});

test("학습 나가기 버튼도 공통 클릭음을 낸다", () => {
  const play = stubSound();
  renderShell();

  fireEvent.tap(screen.getByTestId("learning-shell-exit"), {});

  expect(play).toHaveBeenCalledExactlyOnceWith("button");
});

test("문장 만들기 칩은 넣기와 빼기 모두 클릭음을 내고 비활성 칩은 조용하다", () => {
  const play = stubSound();
  const onTap = vi.fn<(index: number) => void>();
  const view = render(
    <SentenceOrderChip index={0} text="학교" placedOrdinal={null} onTap={onTap} />,
  );

  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  view.rerender(<SentenceOrderChip index={0} text="학교" placedOrdinal={1} onTap={onTap} />);
  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});
  view.rerender(
    <SentenceOrderChip index={0} text="학교" placedOrdinal={null} disabled onTap={onTap} />,
  );
  fireEvent.tap(screen.getByTestId("sentence-order-chip-0"), {});

  expect(onTap).toHaveBeenCalledTimes(2);
  expect(play).toHaveBeenCalledTimes(2);
  expect(play).toHaveBeenNthCalledWith(1, "button");
  expect(play).toHaveBeenNthCalledWith(2, "button");
});

test("듣기 재생과 다시 듣기 버튼은 공통 클릭음을 낸다", () => {
  const play = stubSound();
  render(
    <PlaybackPrompt
      text="안녕하세요"
      romanization="annyeonghaseyo"
      audioSource="fixture"
      sessionOptions={{ ...initialSessionOptions, "auto-play-audio": false }}
    />,
  );

  fireEvent.tap(screen.getByTestId("listening-prompt-playback"), {});
  fireEvent.tap(screen.getByTestId("listening-prompt-replay"), {});

  expect(play).toHaveBeenCalledTimes(2);
  expect(play).toHaveBeenNthCalledWith(1, "button");
  expect(play).toHaveBeenNthCalledWith(2, "button");
});
