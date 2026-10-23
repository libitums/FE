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
  expect(screen.getAllByTestId("ui-lynx-round-button")).toHaveLength(2);
});

// LP4 — 듣고 고르기(LISTEN_SELECT)는 답하기 전에도 정답 문장의 로마자 한 줄을 참고로 보입니다 — 한글 대본은 여전히 가립니다.
test("[RV5] beforeAnswer=romanization + 설정 꺼짐 + 아직 안 답함 — 로마자만 보이고 한국어는 문서에 없다", () => {
  render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": false }}
      revealed={false}
      beforeAnswer="romanization"
    />,
  );

  expect(text()).not.toBeInTheDocument();
  expect(romanization()).toHaveTextContent(ROMANIZATION);
  expect(screen.getAllByTestId("listening-prompt-romanization")).toHaveLength(1);
});

test("[RV6] beforeAnswer=romanization + 답함 — 한국어와 로마자가 함께 보이고 로마자 줄은 하나다", () => {
  render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": false }}
      revealed={true}
      beforeAnswer="romanization"
    />,
  );

  expect(text()).toHaveTextContent(TEXT);
  expect(screen.getAllByTestId("listening-prompt-romanization")).toHaveLength(1);
});

test("LP4. 소리 구별 문항(beforeAnswer 없음)은 답 전에 로마자가 문서에 없고 답한 뒤에 한글과 로마자가 선다", () => {
  const view = render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": false }}
      revealed={false}
    />,
  );

  expect(text()).not.toBeInTheDocument();
  expect(romanization()).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-prompt-divider")).not.toBeInTheDocument();

  view.rerender(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": false }}
      revealed={true}
    />,
  );

  expect(text()).toHaveTextContent(TEXT);
  expect(romanization()).toHaveTextContent(ROMANIZATION);
});

// LP5 — 한글은 글자 수 단계 클래스, 로마자는 글 역할 클래스를 지고 커밋 전 힌트 클래스는 없다.
test("LP5. 한글은 korean-text-heading-l(11자) · 로마자는 text-role-romanization이고 hint 클래스가 없다", () => {
  const view = render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": true }}
      revealed={false}
      beforeAnswer="romanization"
    />,
  );

  expect(text()).toHaveClass("korean-text-heading-l");
  expect(text()).toHaveClass("korean-text-tone-brand-primary");
  expect(romanization()).toHaveClass("text-role-romanization");
  expect(view.container.innerHTML).not.toContain("romanization-hint");
});

test("LP5. compact 밀도는 한글이 한 단계 아래(heading-m)이고 로마자는 s 크기다", () => {
  render(
    <PlaybackPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource="u00-tutorial/d-04"
      sessionOptions={{ "auto-play-audio": false, "show-transcript": true }}
      revealed={false}
      density="compact"
    />,
  );

  expect(text()).toHaveClass("korean-text-heading-m");
  expect(romanization()).toHaveClass("text-role-romanization-s");
});
