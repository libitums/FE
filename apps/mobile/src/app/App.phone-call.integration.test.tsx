import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";
import { App } from "./App";
import type { PhoneCallEventSink } from "../screens/phone-call/phone-call.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 서사 표지를 이미 끝낸 채로 부팅합니다 — 이 파일이 보는 것은 표지 뒤의 흐름입니다. 표지
// 자체는 `App.episode-intro.integration.test.tsx`가 봅니다.
const completedIntros = ["tutorial-intro"] as const;

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

async function openJourney() {
  await renderSignedInApp(<App completedEpisodeIntroIds={completedIntros} />);
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
}

describe("App · phone-call integration", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("맵에서 messenger 뒤 directions 앞에 전화 항목을 표시하고 선택한다", async () => {
    await openJourney();
    const items = screen
      .getAllByTestId(
        // 유닛 하위 testid(-ring · -icon · -badge)가 아니라 유닛 자체만 셉니다.
        /^(?:ui-lynx-learning-unit-appointment-confirmation|ui-lynx-learning-unit-appointment-confirmation-phone-call|ui-lynx-learning-unit-directions)$/,
      )
      .map((node) => node.getAttribute("data-testid"));
    expect(items).toEqual([
      "ui-lynx-learning-unit-appointment-confirmation",
      "ui-lynx-learning-unit-appointment-confirmation-phone-call",
      "ui-lynx-learning-unit-directions",
    ]);
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
    expect(playAudio).toHaveBeenCalledTimes(0);
  });

  it("전화 3턴은 수동 재생·답장으로 완료되고 맵 완료 표식만 바꾼다", async () => {
    await openJourney();
    const before = ["greeting", "introduction", "ordering", "appointment", "directions"].map((id) =>
      screen.getByTestId(`ui-lynx-learning-unit-${id}`).getAttribute("data-status"),
    );
    // 스텝은 `LearningUnit`이 그리므로 유닛 어휘입니다 — 특수 항목(메신저 · 전화 ·
    // 비주얼 노벨)은 자기 컴포넌트의 어휘(`available`·`completed`)를 그대로 씁니다.
    expect(before).toEqual(["clear", "clear", "active", "default", "default"]);
    expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
      "data-status",
      "available",
    );
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
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
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
    ).toHaveAttribute("data-status", "clear");
    expect(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation")).toHaveAttribute(
      "data-status",
      "available",
    );
    const after = ["greeting", "introduction", "ordering", "appointment", "directions"].map((id) =>
      screen.getByTestId(`ui-lynx-learning-unit-${id}`).getAttribute("data-status"),
    );
    expect(after).toEqual(before);
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
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
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
    ).toHaveAttribute("data-status", "clear");
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toHaveLength(6);
  });

  it("미완료 이탈은 stop하고 재진입을 첫 transcript로 시작한다", async () => {
    await openJourney();
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    playAudio.mockReturnValue("started");
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(stopAudio).toHaveBeenCalled();
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toEqual(["phone-call-transcript-jimin-confirm-time"]);
  });

  // **뒤집힙니다**(ADR-0007 2026-09-27 개정). 전화는 여정 탭 위에 쌓인 자리라 탭이
  // 없습니다. 남는 것은 **exit 뒤 메신저와 공존한다**이고, 그것이 이 케이스의 내용입니다.
  it("전화 화면에는 탭이 없고 exit 뒤 메신저와 공존한다", async () => {
    await openJourney();
    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
      {},
    );
    expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);

    fireEvent.tap(screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation"), {});
    expect(screen.getByTestId("messenger-screen")).toBeInTheDocument();
  });

  // 여정 전화 진입(`onStartPhoneCallUnit`)에 열림 이벤트가 새로 늡니다 — `push`
  // 직전에 `entrySource: "journey"` · `entryStatus`가 함께 실립니다.
  it("맵 항목 tap마다 push 전에 phone_call_unit_opened(journey)이 entryStatus와 함께 1건 온다", async () => {
    const phoneCallEventSink = vi.fn<NonNullable<PhoneCallEventSink>>();
    await renderSignedInApp(
      <App completedEpisodeIntroIds={completedIntros} phoneCallEventSink={phoneCallEventSink} />,
    );
    fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});

    fireEvent.tap(
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
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
      screen.getByTestId("ui-lynx-learning-unit-appointment-confirmation-phone-call"),
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
