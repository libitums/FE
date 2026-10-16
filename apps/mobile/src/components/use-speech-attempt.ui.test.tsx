import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import type { SpeechAttemptOutcome } from "../lib/speech-attempt";
import {
  audioFailed,
  dictationOff,
  recognized,
  stubSpeechHost,
} from "../lib/speech-host.test-support";
import { useSpeechAttempt } from "./use-speech-attempt";
import type { SpeechAttemptControl } from "./use-speech-attempt";

// `ui` 계층: 말하기 결선 훅 — 시험용 작은 컴포넌트에 걸어 권한 → 시작 → 결말을 본다.
// `lib/speech-recognition.ts`는 mock하지 않고 호스트 모듈 대역만 둔다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

let control: SpeechAttemptControl;

function Harness(props: { readonly onOutcome: (outcome: SpeechAttemptOutcome) => void }): null {
  control = useSpeechAttempt(props.onOutcome);
  return null;
}

function mount() {
  const onOutcome = vi.fn<(outcome: SpeechAttemptOutcome) => void>();
  const view = render(<Harness onOutcome={onOutcome} />);
  return { onOutcome, view };
}

test("UH1. start 한 번에 권한 확인 1회 → 시작 1회 → 들은 글자가 heard로 한 번 올라온다", () => {
  const host = stubSpeechHost({ result: () => recognized("카드") });
  const { onOutcome } = mount();

  act(() => control.start());

  expect(host.calls.request).toBe(1);
  expect(host.calls.start).toBe(1);
  expect(onOutcome).toHaveBeenCalledTimes(1);
  expect(onOutcome).toHaveBeenCalledWith({ kind: "heard", text: "카드" });
});

test.each([
  ["마이크만 거부", { microphone: "denied" }],
  ["인식만 거부", { speechRecognition: "denied" }],
  ["둘 다 거부", { microphone: "denied", speechRecognition: "denied" }],
  ["인식기 없음", { recognizerAvailable: false }],
])("UH2. %s이면 blocked이고 인식을 시작하지 않는다", (_name, permissions) => {
  const host = stubSpeechHost({ ...permissions, result: () => recognized("카드") });
  const { onOutcome } = mount();

  act(() => control.start());

  expect(host.calls.start).toBe(0);
  expect(onOutcome).toHaveBeenCalledTimes(1);
  expect(onOutcome).toHaveBeenCalledWith({ kind: "unavailable", reason: "blocked" });
});

test("UH3. 호스트 모듈이 없으면 던지지 않고 blocked가 한 번 올라온다", () => {
  stubSpeechHost({ module: false });
  const { onOutcome } = mount();

  expect(() => act(() => control.start())).not.toThrow();

  expect(onOutcome).toHaveBeenCalledTimes(1);
  expect(onOutcome).toHaveBeenCalledWith({ kind: "unavailable", reason: "blocked" });
});

test("UH4a. 받아쓰기 꺼짐 결과는 dictation-off로 올라온다", () => {
  stubSpeechHost({ result: () => dictationOff });
  const { onOutcome } = mount();

  act(() => control.start());

  expect(onOutcome).toHaveBeenCalledWith({ kind: "unavailable", reason: "dictation-off" });
});

test("UH4b. 오디오 실패는 failed로 올라온다", () => {
  stubSpeechHost({ result: () => audioFailed });
  const { onOutcome } = mount();

  act(() => control.start());

  expect(onOutcome).toHaveBeenCalledWith({ kind: "unavailable", reason: "failed" });
});

test("UH4c. stop은 호스트 모듈의 stop을 한 번 부른다", () => {
  const host = stubSpeechHost();
  mount();

  act(() => control.start());
  act(() => control.stop());

  expect(host.calls.stop).toBe(1);
});

test("UH5a. 언마운트 뒤에 온 결과는 버리고 언마운트 때 녹음을 멈춘다", () => {
  const host = stubSpeechHost();
  const { onOutcome, view } = mount();

  act(() => control.start());
  expect(host.pending).toHaveLength(1);
  view.unmount();
  expect(host.calls.stop).toBe(1);

  act(() => host.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

  expect(onOutcome).toHaveBeenCalledTimes(0);
});

test("UH5b. 렌더 사이에 onOutcome이 바뀌면 늦게 온 결과는 새 함수를 부른다", () => {
  const host = stubSpeechHost();
  const first = vi.fn<(outcome: SpeechAttemptOutcome) => void>();
  const second = vi.fn<(outcome: SpeechAttemptOutcome) => void>();
  const view = render(<Harness onOutcome={first} />);

  act(() => control.start());
  view.rerender(<Harness onOutcome={second} />);
  act(() => host.pending[0]?.({ status: "recognized", text: "카드", isFinal: true }));

  expect(first).toHaveBeenCalledTimes(0);
  expect(second).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledWith({ kind: "heard", text: "카드" });
});
