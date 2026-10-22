import { afterEach, expect, test } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import { bootItemAudioApp } from "./test-helpers/item-audio-harness";
import { resetApp, tapId, tapNode } from "./test-helpers/episode-format-harness";

// `integration` 계층: 내장 u00 튜토리얼 S2의 듣기 문항(실데이터)이 앱 전체 트리에서 대본을 가린 채
// 서고(기본 옵션 — 정답이 드러나지 않는다), 답하면 한국어 · 로마자가 보이는지(V2-1~V2-3)를 봅니다.
// 대역은 경계뿐입니다(`NativeModules` · `fetch` · env). 계획 · 화면 · 결선은 실물입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";
const afterS1 = { [u00]: ["intro", "S1"] };
const SENTENCE = "진짜요? 감사합니다!";
const ROMAN = "jinjjayo? gamsahamnida!";

const text = () => screen.queryByTestId("listening-prompt-text");
const romanization = () => screen.queryByTestId("listening-prompt-romanization");

test("LR1. u00 S2 듣기 문항은 처음에 한글 대본이 없고 로마자 참고 줄 · 재생 조작 · 보기가 있다", async () => {
  await bootItemAudioApp({ progress: afterS1 });

  tapNode(u00, "S2");

  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
  expect(screen.getByTestId("listening-prompt-playback")).toBeInTheDocument();
  expect(text()).not.toBeInTheDocument();
  expect(romanization()).toHaveTextContent(ROMAN);
  expect(screen.getByTestId("listening-choice-0")).toBeInTheDocument();
});

test("LR2. 정답을 고르면 한국어와 로마자 대본이 보인다", async () => {
  await bootItemAudioApp({ progress: afterS1 });
  tapNode(u00, "S2");

  tapId("listening-choice-1");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "correct");
  expect(text()).toHaveTextContent(SENTENCE);
  expect(romanization()).toHaveTextContent(ROMAN);
});

test("LR3. 오답을 골라도 대본이 보인다", async () => {
  await bootItemAudioApp({ progress: afterS1 });
  tapNode(u00, "S2");

  tapId("listening-choice-0");

  expect(screen.getByTestId("answer-verdict")).toHaveAttribute("data-result", "incorrect");
  expect(text()).toHaveTextContent(SENTENCE);
  expect(romanization()).toHaveTextContent(ROMAN);
});
