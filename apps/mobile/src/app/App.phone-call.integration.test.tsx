import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import { App } from "./App";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

function openJourney() {
  render(<App />);
  fireEvent.tap(screen.getByTestId("bottom-navigator-tab-journey"), {});
}

describe("App · phone-call integration", () => {
  beforeEach(() => vi.resetAllMocks());

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

  // LIB-255 계약 §2.8 「콜백 구현」: 여정 전화 진입(`onStartPhoneCallUnit`)에 열림
  // 이벤트가 새로 는다 — `push` 직전에 `entrySource: "journey"` · `entryStatus`.
  // 계획: test-plan.md integration § `App.phone-call.integration.test.tsx`(추가).
  it("맵 항목 tap마다 push 전에 phone_call_unit_opened(journey)이 entryStatus와 함께 1건 온다", () => {
    const phoneCallEventSink = vi.fn<NonNullable<PhoneCallEventSink>>();
    render(<App phoneCallEventSink={phoneCallEventSink} />);
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

    // 완료 뒤 재진입은 entryStatus가 completed로 바뀐다.
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
