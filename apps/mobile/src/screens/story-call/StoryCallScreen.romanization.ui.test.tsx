import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { ChoiceRomanization } from "../../lib/session-options";
import { StoryCallScreen } from "./StoryCallScreen";
import { storyCallTestIds as ids, type StoryCallView } from "./story-call.contract";

// `ui` 계층(ADR-0188 D3): 전화 막간 대사 · 끝 지문의 로마자 줄이 스위치를 따르는지 봅니다.

const call: StoryCallView = {
  counterpart: "사장님",
  counterpartAvatarUrl: null,
  backgroundUrl: null,
  lines: [
    {
      kind: "caller",
      label: "사장님",
      text: { ko: "어디예요?", roman: "eodiyeyo?", en: "Where are you?" },
      audioSource: null,
      holdMs: 3000,
    },
    {
      kind: "self",
      label: "",
      // 콘텐츠 로마자가 없는 줄 — 화면이 변환합니다.
      text: { ko: "같이 가요.", en: "Let's go." },
      audioSource: null,
      holdMs: 3000,
    },
  ],
  end: { ko: "뚝.", roman: "ttuk.", en: "Click." },
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(romanization?: ChoiceRomanization) {
  render(
    <StoryCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      call={call}
      onComplete={() => undefined}
      onExit={() => undefined}
      {...(romanization === undefined ? {} : { romanization })}
    />,
  );
  fireEvent.tap(screen.getByTestId(ids.answer), {});
}
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

test("SCR-U1. 켬이면 대사 한글 아래 로마자 줄이 서고, 없으면 변환한 읽기가 선다 · 끝 지문도", () => {
  mount("shown");
  wait(1300);
  expect(screen.getByTestId("story-call-line-roman").textContent).toBe("eodiyeyo?");
  wait(3100);
  expect(screen.getByTestId("story-call-line-roman").textContent).toBe("gachi gayo.");
  wait(3100);
  wait(1000);
  expect(screen.getByTestId("story-call-end-roman").textContent).toBe("ttuk.");
});

test.each([["hidden" as const], [undefined]])(
  "SCR-U2. 끔(%s)이면 로마자 줄이 없다 — 이 변경 전 모양",
  (romanization) => {
    mount(romanization);
    wait(1300);
    expect(screen.getByTestId(ids.lineText).textContent).toBe("어디예요?");
    expect(screen.queryByTestId("story-call-line-roman")).toBeNull();
  },
);
