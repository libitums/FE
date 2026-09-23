import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { App } from "./App";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";
import { authTokenStorageKey } from "../lib/auth-token";
import { entrySplashDurationMs } from "../lib/entry-flow";

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다. 이 파일의 단언은 App이 스플래시를 실제로 건너뛰든 아니든
// 한 줄도 바뀌지 않습니다.
function renderApp(ui: Parameters<typeof render>[0]) {
  const previousNativeModules = (globalThis as { NativeModules?: unknown }).NativeModules;
  const tokenStore = new Map<string, string>();
  tokenStore.set(authTokenStorageKey, "existing-token");
  vi.stubGlobal("NativeModules", {
    ...(typeof previousNativeModules === "object" && previousNativeModules !== null
      ? previousNativeModules
      : {}),
    StorageModule: {
      get: (key: string) => tokenStore.get(key) ?? null,
      set: (key: string, value: string) => void tokenStore.set(key, value),
      remove: (key: string) => void tokenStore.delete(key),
    },
  });
  vi.useFakeTimers();
  const result = render(ui);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  vi.useRealTimers();
  return result;
}

function openJourney() {
  renderApp(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
}

describe("App · phone-call integration", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("맵에서 messenger 뒤 directions 앞에 전화 항목을 표시하고 선택한다", () => {
    openJourney();
    const items = screen
      .getAllByTestId(/^journey-(?:messenger|map-phone-call|step-node-directions)/)
      .map((node) => node.getAttribute("data-testid"));
    expect(items).toEqual([
      "journey-messenger-item-appointment-confirmation",
      "journey-map-phone-call-appointment-confirmation-phone-call",
      "journey-step-node-directions",
    ]);
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
    expect(playAudio).toHaveBeenCalledTimes(0);
  });

  it("전화 3턴은 수동 재생·답장으로 완료되고 맵 완료 표식만 바꾼다", () => {
    openJourney();
    const before = ["greeting", "introduction", "ordering", "appointment", "directions"].map((id) =>
      screen.getByTestId(`journey-step-node-${id}`).getAttribute("data-status"),
    );
    expect(before).toEqual(["done", "done", "current", "locked", "locked"]);
    expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
      "data-status",
      "available",
    );
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    let finish: (() => void) | undefined;
    playAudio.mockImplementation((_source: string, done: () => void) => {
      finish = done;
      return "started";
    });
    for (const [source, reply] of [
      ["phone-call-confirm-01", "phone-call-reply-confirm-time-reply"],
      ["phone-call-confirm-02", "phone-call-reply-confirm-place-reply"],
      ["phone-call-confirm-03", "phone-call-reply-goodbye-reply"],
    ] as const) {
      fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
      expect(playAudio).toHaveBeenLastCalledWith(source, expect.any(Function));
      act(() => finish?.());
      fireEvent.tap(screen.getByTestId(reply), {});
    }
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toHaveLength(6);
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
    ).toHaveAttribute("data-status", "completed");
    expect(screen.getByTestId("journey-messenger-item-appointment-confirmation")).toHaveAttribute(
      "data-status",
      "available",
    );
    const after = ["greeting", "introduction", "ordering", "appointment", "directions"].map((id) =>
      screen.getByTestId(`journey-step-node-${id}`).getAttribute("data-status"),
    );
    expect(after).toEqual(before);
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toHaveLength(6);
    fireEvent.tap(screen.getByTestId("phone-call-replay-button"), {});
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
    ).toHaveAttribute("data-status", "completed");
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toHaveLength(6);
  });

  it("미완료 이탈은 stop하고 재진입을 첫 transcript로 시작한다", () => {
    openJourney();
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    playAudio.mockReturnValue("started");
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(stopAudio).toHaveBeenCalled();
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toEqual(["phone-call-transcript-jimin-confirm-time"]);
  });

  it("탭 복귀 후 전화 화면을 유지하고 exit 뒤 메신저와 공존한다", () => {
    openJourney();
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    fireEvent.tap(screen.getByTestId("bottom-navigator-tab-settings"), {});
    expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
    fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
    expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    fireEvent.tap(screen.getByTestId("journey-messenger-item-appointment-confirmation"), {});
    expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  });

  // 여정 전화 진입(`onStartPhoneCallUnit`)에 열림 이벤트가 새로 늡니다 — `push`
  // 직전에 `entrySource: "journey"` · `entryStatus`가 함께 실립니다.
  it("맵 항목 tap마다 push 전에 phone_call_unit_opened(journey)이 entryStatus와 함께 1건 온다", () => {
    const phoneCallEventSink = vi.fn<NonNullable<PhoneCallEventSink>>();
    renderApp(<App phoneCallEventSink={phoneCallEventSink} />);
    fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});

    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );
    expect(phoneCallEventSink).toHaveBeenCalledTimes(1);
    expect(phoneCallEventSink).toHaveBeenNthCalledWith(1, {
      name: "phone_call_unit_opened",
      unitId: "appointment-confirmation-phone-call",
      entrySource: "journey",
      entryStatus: "available",
    });

    // 완료 뒤 재진입은 entryStatus가 completed로 바뀝니다.
    let finish: (() => void) | undefined;
    playAudio.mockImplementation((_source: string, done: () => void) => {
      finish = done;
      return "started";
    });
    for (const [, reply] of [
      ["phone-call-confirm-01", "phone-call-reply-confirm-time-reply"],
      ["phone-call-confirm-02", "phone-call-reply-confirm-place-reply"],
      ["phone-call-confirm-03", "phone-call-reply-goodbye-reply"],
    ] as const) {
      fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
      act(() => finish?.());
      fireEvent.tap(screen.getByTestId(reply), {});
    }
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    fireEvent.tap(
      screen.getByTestId("journey-map-phone-call-appointment-confirmation-phone-call"),
      {},
    );

    expect(phoneCallEventSink).toHaveBeenCalledTimes(2);
    expect(phoneCallEventSink).toHaveBeenNthCalledWith(2, {
      name: "phone_call_unit_opened",
      unitId: "appointment-confirmation-phone-call",
      entrySource: "journey",
      entryStatus: "completed",
    });
  });
});
