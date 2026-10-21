import { afterEach, expect, test, vi } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { PlaybackPrompt } from "./ListeningPrompt.test-support";
import type { SessionOptions } from "../../lib/session-options";

// `ui` 계층: `ListeningPrompt`의 `revealed` prop(V2-2) — 대본(한국어 + 로마자)은
// `show-transcript || revealed`일 때만 렌더됩니다. 설정 두 값 × revealed 두 값 네 조합입니다.
// 렌더를 거르는지를 봅니다(CSS 숨김이 아니라 문서에 없음).

const TEXT = "진짜요? 감사합니다!";
const ROMANIZATION = "jinjjayo? gamsahamnida!";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPrompt(showTranscript: boolean, revealed: boolean) {
  const sessionOptions: SessionOptions = {
    "auto-play-audio": false,
    "show-transcript": showTranscript,
  };
  return render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={sessionOptions}
      revealed={revealed}
    />,
  );
}

const text = () => screen.queryByTestId("listening-prompt-text");
const romanization = () => screen.queryByTestId("listening-prompt-romanization");

test("[RV1] 설정 꺼짐 + 아직 안 답함 — 한국어도 로마자도 문서에 없다", () => {
  renderPrompt(false, false);

  expect(text()).not.toBeInTheDocument();
  expect(romanization()).not.toBeInTheDocument();
});

test("[RV2] 설정 꺼짐 + 답함(revealed) — 한국어와 로마자가 보인다", () => {
  renderPrompt(false, true);

  expect(text()).toHaveTextContent(TEXT);
  expect(romanization()).toHaveTextContent(ROMANIZATION);
});

test("[RV3] 설정 켜짐 + 아직 안 답함 — 처음부터 보인다", () => {
  renderPrompt(true, false);

  expect(text()).toHaveTextContent(TEXT);
  expect(romanization()).toHaveTextContent(ROMANIZATION);
});

test("[RV4] 설정 켜짐 + 답함 — 보인다", () => {
  renderPrompt(true, true);

  expect(text()).toHaveTextContent(TEXT);
  expect(romanization()).toHaveTextContent(ROMANIZATION);
});

test("[RV5] 대본이 없어도 재생 조작은 그대로 있다", () => {
  renderPrompt(false, false);

  expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
  expect(screen.getByTestId("listening-prompt-replay")).toBeInTheDocument();
});
