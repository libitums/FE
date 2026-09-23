import { expect, test } from "vitest";
import { fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { SpeechProbeScreen } from "./SpeechProbeScreen";
import {
  speechNormalizationId,
  speechNormalizationLabel,
  speechNormalizations,
} from "./speech-probe";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). 계산된 스타일·레이아웃은
// jsdom이 계산하지 않으므로 `toBeVisible`·`toHaveStyle`·`toHaveClass`를 쓰지 않습니다
// (vitest.setup.ts). 형태의 정본: ../handwriting-probe/HandwritingProbeScreen.ui.test.tsx
//
// ⚠ 이 계층에는 `NativeModules` 전역이 **아예 없습니다.** 그래서 여기 초록은 「모듈이
// 없는 환경에서 화면이 던지지 않는다」까지를 보이고, 모듈이 있을 때의 값은
// integration이 집니다 — 무대가 다르면 답도 다릅니다.
//
// ⚠ **후보 목록의 개수를 이 파일이 적지 않습니다.** 순수 로직이 축의 곱으로 짓는
// 목록이라 축에 값이 늘면 개수가 바뀝니다. 여기서 세면 그때 이 파일이 두 번째
// 정본이 됩니다.

test("[SP1] 스크롤 영역이 정확히 하나이고 이름·속성·자식이 ADR-0022 3분할 그대로다", () => {
  const { container } = render(<SpeechProbeScreen />);

  expect(container.querySelectorAll("scroll-view")).toHaveLength(1);

  const scroll = screen.getByTestId("speech-probe-screen-scroll");
  expect(scroll.getAttribute("class")).toBe("speech-probe-screen-scroll");
  expect(scroll).toHaveAttribute("scroll-orientation", "vertical");
  expect(scroll).toHaveAttribute("scroll-bar-enable", "true");
  expect(
    [...scroll.attributes]
      .map((attribute) => attribute.name)
      .filter((name) => name.startsWith("scroll") || name === "bounces" || name === "enable-scroll")
      .sort(),
  ).toEqual(["scroll-bar-enable", "scroll-orientation"]);

  // 스크롤 컨테이너는 조작 단위가 아니라 상자입니다(ADR-0022 D5).
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");

  // 직계 자식은 관측 상자 하나뿐입니다.
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "speech-probe-screen-observations");
});

test("[SP2] 제목이 header이고 조작 수단마다 이름 있는 button 속성이 그 순서로 붙는다", () => {
  render(<SpeechProbeScreen />);

  const title = screen.getByTestId("speech-probe-screen-title");
  expect(title).toHaveAttribute("accessibility-traits", "header");
  expect(title).toHaveTextContent("말하기 탐침");

  const actions = screen.getByTestId("speech-probe-screen-actions");
  expect(
    [...actions.querySelectorAll("[data-testid]")].map((node) => node.getAttribute("data-testid")),
  ).toEqual([
    "speech-probe-screen-require-on-device",
    "speech-probe-screen-request",
    "speech-probe-screen-refresh",
    "speech-probe-screen-start",
    "speech-probe-screen-stop",
  ]);

  for (const [testId, label] of [
    ["speech-probe-screen-require-on-device", "온디바이스 요구 바꾸기"],
    ["speech-probe-screen-request", "권한 요청"],
    ["speech-probe-screen-refresh", "상태 읽기"],
    ["speech-probe-screen-start", "듣기 시작"],
    ["speech-probe-screen-stop", "멈추기"],
  ]) {
    const button = screen.getByTestId(testId);
    expect(button).toHaveAttribute("accessibility-element", "true");
    expect(button).toHaveAttribute("accessibility-traits", "button");
    expect(button).toHaveAttribute("accessibility-label", label);
  }
});

// SP3 — ⭐ 권한 둘이 **각각** 자리를 갖습니다. 거부 조합 넷이 화면에서 갈리려면
// 값이 둘이어야 하고, 한 줄로 합치면 그 갈림이 사라집니다.
test("[SP3] 권한 상태가 마이크와 음성 인식으로 따로 서고 아직 안 읽었을 때 비어 있다", () => {
  render(<SpeechProbeScreen />);

  const microphone = screen.getByTestId("speech-probe-screen-microphone");
  const speech = screen.getByTestId("speech-probe-screen-speech-recognition");

  expect(microphone).toHaveAttribute("data-permission", "");
  expect(speech).toHaveAttribute("data-permission", "");
  expect(microphone).not.toBe(speech);
});

// SP4 — ADR-0026 D3의 1단계입니다. 모듈이 없는 환경이므로 「접점 없음」이 서야
// 합니다.
test("[SP4] 접점 유무가 관찰값으로 서고 요청 전에는 마지막 요청이 비어 있다", () => {
  render(<SpeechProbeScreen />);

  const capability = screen.getByTestId("speech-probe-screen-capability");
  expect(capability).toHaveAttribute("data-available", "false");
  expect(capability).toHaveAttribute("data-outcome", "");
});

// SP5 — ⭐ 「빈 문자열을 받았다」와 「아직 아무것도 안 왔다」를 가르는 자리.
test("[SP5] 결과가 오기 전 인식 결과 줄은 본문이 비어 있고 안 왔다고 적는다", () => {
  render(<SpeechProbeScreen />);

  const recognized = screen.getByTestId("speech-probe-screen-recognized");
  // `toHaveTextContent("")`은 jest-dom이 거절합니다 — 본문은 `textContent`로 직접
  // 봅니다.
  expect(recognized.textContent).toBe("");
  expect(recognized).toHaveAttribute("data-received", "no");
  expect(recognized).toHaveAttribute("data-length", "");

  // 상태와 온디바이스도 같은 규칙으로 비어 있습니다 — 빈 값이 「안 왔다」입니다.
  expect(screen.getByTestId("speech-probe-screen-status")).toHaveAttribute("data-status", "");
  expect(screen.getByTestId("speech-probe-screen-on-device")).toHaveAttribute("data-ondevice", "");
});

test("[SP6] 온디바이스 요구 토글이 값을 뒤집고 그 값을 속성으로 낸다", () => {
  render(<SpeechProbeScreen />);

  const toggle = screen.getByTestId("speech-probe-screen-require-on-device");
  expect(toggle).toHaveAttribute("data-require", "true");

  fireEvent.tap(toggle, {});
  expect(toggle).toHaveAttribute("data-require", "false");

  fireEvent.tap(toggle, {});
  expect(toggle).toHaveAttribute("data-require", "true");
});

// SP7 — 화면이 후보를 고르지 않습니다. 순수 로직이 낸 것 **전부**가 그 순서로
// 섭니다.
test("[SP7] 대조 표가 정규화 후보 전부를 순수 로직의 순서로 내고 라벨도 그것을 쓴다", () => {
  render(<SpeechProbeScreen />);

  const comparisons = screen.getByTestId("speech-probe-screen-comparisons");
  const expectedIds = speechNormalizations.map(
    (normalization) => `speech-probe-screen-comparison-${speechNormalizationId(normalization)}`,
  );

  expect([...comparisons.children].map((row) => row.getAttribute("data-testid"))).toEqual(
    expectedIds,
  );

  for (const normalization of speechNormalizations) {
    const id = speechNormalizationId(normalization);
    // 화면이 한국어 문구를 짓지 않습니다 — 라벨의 정본은 순수 로직입니다.
    expect(screen.getByTestId(`speech-probe-screen-comparison-${id}-label`)).toHaveTextContent(
      speechNormalizationLabel(normalization),
    );
    expect(screen.getByTestId(`speech-probe-screen-comparison-${id}-prompt`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`speech-probe-screen-comparison-${id}-recognized`),
    ).toBeInTheDocument();
  }
});

// SP8 — 판정하지 않습니다. `identical`은 관찰값이라 그대로 냅니다.
test("[SP8] 결과가 오기 전에도 후보 행마다 identical 관찰값이 서고 인식 쪽이 비어 있다", () => {
  render(<SpeechProbeScreen />);

  const prompt = screen.getByTestId("speech-probe-screen-prompt").textContent ?? "";
  expect(prompt.length).toBeGreaterThan(0);

  for (const normalization of speechNormalizations) {
    const id = speechNormalizationId(normalization);
    const row = screen.getByTestId(`speech-probe-screen-comparison-${id}`);

    // 제시문이 비어 있지 않으므로 인식 결과가 안 온 동안에는 어느 후보에서도 붙지
    // 않습니다. 「맞았다/틀렸다」를 말하는 자리가 화면에 없다는 것이 여기서 보입니다.
    expect(row).toHaveAttribute("data-identical", "false");
    expect(screen.getByTestId(`speech-probe-screen-comparison-${id}-recognized`).textContent).toBe(
      "",
    );
  }
});

// SP9 — 인식 결과의 모양입니다. 안 온 동안에도 줄이 서고 세는 값이 0입니다.
test("[SP9] 문자열 모양 줄이 길이·공백·양끝·연속을 각각 낸다", () => {
  render(<SpeechProbeScreen />);

  const shape = screen.getByTestId("speech-probe-screen-shape");
  expect(shape).toHaveAttribute("data-length", "0");
  expect(shape).toHaveAttribute("data-whitespace", "0");
  expect(shape).toHaveAttribute("data-edges", "false");
  expect(shape).toHaveAttribute("data-repeats", "false");
});

// SP10 — 조작 수단은 권한 조합과 무관하게 **늘 전부 섭니다.** 무엇을 감출지가 곧
// 거부 조합의 처방이고, 그것은 이 단위가 정하지 않습니다.
test("[SP10] 모듈이 없어도 어느 버튼을 눌러도 던지지 않는다", () => {
  expect(() => render(<SpeechProbeScreen />)).not.toThrow();

  for (const testId of [
    "speech-probe-screen-request",
    "speech-probe-screen-refresh",
    "speech-probe-screen-start",
    "speech-probe-screen-stop",
  ]) {
    expect(() => fireEvent.tap(screen.getByTestId(testId), {})).not.toThrow();
  }
});
