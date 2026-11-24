import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { AutoPlayAudio } from "../../lib/question-audio";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { COMPOSE_ECHO_DELAY_MS, composeClipOf } from "./compose-quiz";
import { LettersComposeScreen } from "./LettersComposeScreen";
import { lettersTestIds as ids } from "./letters.contract";

// `ui` 계층: 합치기 퀴즈(ADR-0169) — 음절 조립 형식 · 자동 판정 · 칸 색 · Next / Try again · Hint · 소리.

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type MountOptions = {
  readonly autoPlay?: AutoPlayAudio;
  /** 소리 파일이 없는 음절(버킷에 올리기 전)을 흉내 냅니다 — 주어지면 모든 음절이 소리 없음입니다. */
  readonly silent?: boolean;
  /** 이 음절만 소리 파일이 없습니다(일부만 올라간 상태). */
  readonly missing?: readonly string[];
};

function mount(options: MountOptions = {}) {
  const play = vi.fn<(source: string) => void>();
  const onExit = vi.fn();
  const onAnswered = vi.fn();
  const onComplete = vi.fn();
  render(
    <LettersComposeScreen
      romanization="shown"
      sound={{
        sourceOf: (s) =>
          options.silent === true || options.missing?.includes(s) === true ? null : `src:${s}`,
        letterSourceOf: () => null,
        play,
      }}
      autoPlay={options.autoPlay}
      onExit={onExit}
      onAnswered={onAnswered}
      onComplete={onComplete}
    />,
  );
  return { play, onExit, onAnswered, onComplete };
}

// 타일 순서: ㅏ ㄷ ㄱ ㅗ ㄴ ㅓ
const tileOf: Record<string, number> = { ㅏ: 0, ㄷ: 1, ㄱ: 2, ㅗ: 3, ㄴ: 4, ㅓ: 5 };
const pick = (letter: string) =>
  fireEvent.tap(screen.getByTestId(ids.composeTile(tileOf[letter]!)), {});
const slot = (s: "c" | "v" | "r") => screen.getByTestId(ids.composeSlot(s));
const action = () => screen.getByTestId("learning-shell-action");

test("CS1. 머리 캡션 · 지시 · 「Make “ga”」 · 타일 여섯(로마자) · 지금 칸은 자음 칸", () => {
  mount();
  const root = screen.getByTestId(ids.compose);
  expect(root.textContent).toContain("Letter building");
  expect(root.textContent).toContain("Put two letters together.");
  expect(root.textContent).toContain("Make “ga”");
  expect(screen.getByTestId(ids.composeTile(0)).textContent).toContain("ㅏ");
  expect(screen.getByTestId(ids.composeTile(0)).textContent).toContain("a");
  expect(screen.getByTestId(ids.composeTile(4)).textContent).toContain("n");
  expect(slot("c")).toHaveAttribute("data-state", "current");
  expect(slot("v")).toHaveAttribute("data-state", "empty");
  expect(screen.queryByTestId("learning-shell-action")).not.toBeInTheDocument();
});

test("CS2. ▶는 만들 글자 소리", () => {
  const { play } = mount();
  fireEvent.tap(screen.getByTestId(ids.composePlay), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("CS3. 두 칸이 차면 합친 글자 · 곧바로 Correct · 칸 초록 · Next — 음절 소리는 정답 효과음 뒤", () => {
  vi.useFakeTimers();
  const { play, onAnswered } = mount();
  pick("ㄱ");
  expect(slot("v")).toHaveAttribute("data-state", "current");
  pick("ㅏ");
  expect(slot("r").textContent).toContain("가");
  expect(play).not.toHaveBeenCalled();
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(slot("c")).toHaveAttribute("data-state", "correct");
  expect(slot("v")).toHaveAttribute("data-state", "correct");
  expect(action()).toHaveAttribute("accessibility-label", "Next");
  expect(onAnswered).toHaveBeenCalledExactlyOnceWith(1, "가", true);
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS - 1);
  });
  expect(play).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("CS4. 틀리면 Incorrect · 틀린 칸 빨강 · Try again은 비우고 같은 라운드", () => {
  const { onAnswered } = mount();
  pick("ㄱ");
  pick("ㅓ");
  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(slot("c")).toHaveAttribute("data-state", "correct");
  expect(slot("v")).toHaveAttribute("data-state", "incorrect");
  expect(onAnswered).toHaveBeenCalledWith(1, "가", false);
  expect(action()).toHaveAttribute("accessibility-label", "Try again");
  fireEvent.tap(action(), {});
  expect(slot("c")).toHaveAttribute("data-state", "current");
  expect(screen.getByTestId(ids.compose).textContent).toContain("Make “ga”");
});

test("CS5. Hint를 누르면 첫소리 안내", () => {
  mount();
  fireEvent.tap(screen.getByTestId(ids.composeHint), {});
  expect(screen.getByTestId(ids.composeHintText).textContent).toBe("Start with the sound “g”.");
});

test("CS6. 판정 전 칸을 누르면 비워진다", () => {
  mount();
  pick("ㄱ");
  fireEvent.tap(slot("c"), {});
  expect(slot("c")).toHaveAttribute("data-state", "current");
});

test("CS7. 세 라운드를 끝내면 완료 · 이벤트 · Done으로 나간다", () => {
  const { onComplete, onExit } = mount();
  for (const [c, v] of [
    ["ㄱ", "ㅏ"],
    ["ㄴ", "ㅓ"],
    ["ㄷ", "ㅗ"],
  ] as const) {
    pick(c);
    pick(v);
    fireEvent.tap(action(), {});
  }
  expect(onComplete).toHaveBeenCalledExactlyOnceWith(3, 3);
  expect(screen.getByTestId(ids.compose).textContent).toContain("You built all three sounds!");
  expect(action()).toHaveAttribute("accessibility-label", "Done");
  fireEvent.tap(action(), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("CS8. ×(머리 나가기)는 레슨과 같은 나가기 확인 뒤 onExit", () => {
  const { onExit } = mount();
  fireEvent.tap(within(screen.getByTestId(ids.compose)).getByTestId("learning-shell-exit"), {});
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-dialog-action-leave")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(onExit).toHaveBeenCalledTimes(1);
});

// ---------------------------------------------------------------- 접근성 감사(ADR-0169 a11y)

test("CS9. 누르는 요소는 Android에서도 접근성 트리에 남는다(flatten false)", () => {
  mount();
  for (const id of [
    ids.composeSlot("c"),
    ids.composeSlot("v"),
    ids.composeSlot("r"),
    ids.composeTile(0),
    ids.composeHint,
    ids.composePlay,
  ])
    expect(screen.getByTestId(id)).toHaveAttribute("flatten", "false");
});

test("CS10. 판정 · 힌트 · 완료를 낭독한다", () => {
  const announced: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }) => void announced.push(args.content),
    },
  });
  mount();
  fireEvent.tap(screen.getByTestId(ids.composeHint), {});
  expect(announced).toContain("Start with the sound “g”.");
  pick("ㄱ");
  pick("ㅏ");
  expect(announced).toContain(uiCopyEn.common.resultAnnouncement("correct"));
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- 정답 뒤 음절 소리(ADR-0173)

test("CS11. 틀리면 음절 소리를 내지 않는다(효과음만)", () => {
  vi.useFakeTimers();
  const { play } = mount();
  pick("ㄱ");
  pick("ㅓ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).not.toHaveBeenCalled();
});

test("CS12. 틀린 뒤 다시 맞히면 그때 한 번", () => {
  vi.useFakeTimers();
  const { play } = mount();
  pick("ㄱ");
  pick("ㅓ");
  fireEvent.tap(action(), {});
  pick("ㄱ");
  pick("ㅏ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("CS13. 틈 안에 Next를 누르면 앞 라운드 음절은 나지 않는다", () => {
  vi.useFakeTimers();
  const { play } = mount();
  pick("ㄱ");
  pick("ㅏ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS / 2);
  });
  fireEvent.tap(action(), {});
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).not.toHaveBeenCalled();
  pick("ㄴ");
  pick("ㅓ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS);
  });
  expect(play).toHaveBeenCalledExactlyOnceWith("src:너");
});

test("CS14. 틈 안에 화면을 떠나면 나지 않는다", () => {
  vi.useFakeTimers();
  const { play } = mount();
  pick("ㄱ");
  pick("ㅏ");
  cleanup();
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).not.toHaveBeenCalled();
});

test("CS15. Auto-play가 꺼져 있으면 정답 뒤 소리는 쉬고 ▶는 그대로 난다", () => {
  vi.useFakeTimers();
  const { play } = mount({ autoPlay: "off" });
  pick("ㄱ");
  pick("ㅏ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).not.toHaveBeenCalled();
  fireEvent.tap(screen.getByTestId(ids.composePlay), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

test("CS16. 소리 파일이 아직 없으면(업로드 전) 조용히 넘어가고 판정 · Next는 그대로", () => {
  vi.useFakeTimers();
  const { play, onAnswered } = mount({ silent: true });
  pick("ㄱ");
  pick("ㅏ");
  expect(() =>
    act(() => {
      vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
    }),
  ).not.toThrow();
  fireEvent.tap(screen.getByTestId(ids.composePlay), {});
  expect(play).not.toHaveBeenCalled();
  expect(onAnswered).toHaveBeenCalledExactlyOnceWith(1, "가", true);
  expect(action()).toHaveAttribute("accessibility-label", "Next");
});

test("CS17. 결과 칸 이름에 합친 글자와 그 로마자(틀린 조합도 무엇을 만들었는지 낭독)", () => {
  mount();
  expect(slot("r")).toHaveAttribute("accessibility-label", "Syllable, empty");
  pick("ㄱ");
  pick("ㅓ");
  expect(slot("r").getAttribute("accessibility-label")).toMatch(/거, geo$/);
});

test("CS18. 틈 안에 결선이 포트를 새로 만들어 다시 그려도 틈은 다시 시작되지 않고 새 포트로 한 번", () => {
  vi.useFakeTimers();
  const first = vi.fn<(source: string) => void>();
  const second = vi.fn<(source: string) => void>();
  const ui = (play: (source: string) => void) => (
    <LettersComposeScreen
      romanization="shown"
      sound={{ sourceOf: (s) => `src:${s}`, letterSourceOf: () => null, play }}
      onExit={() => {}}
    />
  );
  const { rerender } = render(ui(first));
  pick("ㄱ");
  pick("ㅏ");
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS / 2);
  });
  rerender(ui(second));
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS / 2);
  });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledExactlyOnceWith("src:가");
});

// ---------------------------------------------------------------- 소리 없는 ▶(2026-11-24 — 눌러도 아무 소리 없던 것)

const speaker = () => screen.getByTestId(ids.composePlay);
const silentLabel = `${uiCopyEn.more.compose.play}, ${uiCopyEn.more.letters.soundUnavailable}`;

test("CS19. 만들 글자의 소리 파일이 없으면 ▶는 회색 · 누를 수 없음 · 「sound not available yet」", () => {
  const { play } = mount({ silent: true });
  expect(speaker()).toHaveAttribute("accessibility-traits", "disabled");
  expect(speaker()).toHaveAttribute("accessibility-enable-tap", "false");
  expect(speaker()).toHaveAttribute("accessibility-label", silentLabel);
  expect(speaker()).toHaveClass("letters-compose-play-silent");
  fireEvent.tap(speaker(), {});
  expect(play).not.toHaveBeenCalled();
});

test("CS20. 소리 파일이 있으면 ▶는 그대로 누르는 단추 · 이름은 「Play」", () => {
  mount();
  expect(speaker()).toHaveAttribute("accessibility-traits", "button");
  expect(speaker()).toHaveAttribute("accessibility-enable-tap", "true");
  expect(speaker()).toHaveAttribute("accessibility-label", uiCopyEn.more.compose.play);
  expect(speaker()).toHaveClass("letters-compose-play");
});

test("CS21. ▶는 라운드마다 그 라운드 글자로 정한다 — 가는 없고 너는 있으면 1번 회색 · 2번 단추", () => {
  const { play } = mount({ missing: ["가"] });
  expect(speaker()).toHaveAttribute("accessibility-traits", "disabled");
  pick("ㄱ");
  pick("ㅏ");
  fireEvent.tap(action(), {});
  expect(screen.getByTestId(ids.compose).textContent).toContain("Make “neo”");
  expect(speaker()).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(speaker(), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:너");
});

test("CS22. 나중에 소리 파일이 올라오면(포트가 주소를 돌려주면) 코드 변경 없이 ▶가 다시 단추가 된다", () => {
  const play = vi.fn<(source: string) => void>();
  const ui = (uploaded: boolean) => (
    <LettersComposeScreen
      romanization="shown"
      sound={{
        sourceOf: (s) => (uploaded ? `src:${s}` : null),
        letterSourceOf: () => null,
        play,
      }}
      onExit={() => {}}
    />
  );
  const { rerender } = render(ui(false));
  expect(speaker()).toHaveAttribute("accessibility-traits", "disabled");
  rerender(ui(true));
  expect(speaker()).toHaveAttribute("accessibility-traits", "button");
  fireEvent.tap(speaker(), {});
  expect(play).toHaveBeenCalledExactlyOnceWith("src:가");
});

// ---------------------------------------------------------------- 앱 내장 음절 녹음(2026-11-24 — 가 · 너 · 도를 앱에 실음)

function mountBundled() {
  const play = vi.fn<(source: string) => void>();
  render(
    <LettersComposeScreen
      romanization="shown"
      sound={{ sourceOf: composeClipOf, letterSourceOf: () => null, play }}
      onExit={() => {}}
    />,
  );
  return play;
}

test("CS23. 앱 내장 음절 녹음이면 세 라운드 모두 ▶가 단추이고 그 라운드 녹음(hangul-s-ga · neo · do)을 낸다", () => {
  const play = mountBundled();
  for (const [consonant, vowel, clip] of [
    ["ㄱ", "ㅏ", "hangul-s-ga"],
    ["ㄴ", "ㅓ", "hangul-s-neo"],
    ["ㄷ", "ㅗ", "hangul-s-do"],
  ] as const) {
    expect(speaker(), clip).toHaveAttribute("accessibility-traits", "button");
    expect(speaker(), clip).toHaveAttribute("accessibility-enable-tap", "true");
    expect(speaker(), clip).toHaveAttribute("accessibility-label", uiCopyEn.more.compose.play);
    play.mockClear();
    fireEvent.tap(speaker(), {});
    expect(play).toHaveBeenCalledExactlyOnceWith(clip);
    pick(consonant);
    pick(vowel);
    fireEvent.tap(action(), {});
  }
});

test("CS24. 앱 내장 음절 녹음이면 맞힌 뒤 효과음 틈 뒤에 그 녹음이 한 번 난다", () => {
  vi.useFakeTimers();
  const play = mountBundled();
  pick("ㄱ");
  pick("ㅏ");
  expect(play).not.toHaveBeenCalled();
  act(() => {
    vi.advanceTimersByTime(COMPOSE_ECHO_DELAY_MS * 3);
  });
  expect(play).toHaveBeenCalledExactlyOnceWith("hangul-s-ga");
});
