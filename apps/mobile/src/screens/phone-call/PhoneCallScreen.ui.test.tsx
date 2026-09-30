import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { PhoneCallConversation } from "./phone-call.contract";
import { PhoneCallScreen } from "./PhoneCallScreen";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;
afterEach(() => vi.useRealTimers());

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "A Call from Minseo",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "좋아요. 그럼 토요일에 봐요!",
      audioSource: "phone-call-confirm-03",
      reply: { id: "goodbye-reply", text: "네, 토요일에 봐요!" },
    },
  ],
};
const props = (completionStatus: "available" | "completed" = "available") => ({
  unitId: conversation.unitId,
  conversation,
  completionStatus,
  onComplete: vi.fn(),
  onExit: vi.fn(),
});

describe("PhoneCallScreen UI", () => {
  beforeEach(() => vi.resetAllMocks());
  it("재생 때 자막을 타이핑하고 다시 듣기는 재시작하며 재생 완료는 전체 자막을 표시한다", () => {
    vi.useFakeTimers();
    let settled: (() => void) | undefined;
    playAudio.mockImplementation((_source, done) => {
      settled = done;
      return "started";
    });
    render(<PhoneCallScreen {...props()} />);
    const lineId = "phone-call-line-jimin-confirm-time-line";
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(screen.getByTestId(lineId)).toHaveAttribute("data-status", "revealing");
    expect(screen.getByTestId(`${lineId}-translation`)).toHaveStyle({ visibility: "hidden" });
    act(() => {
      vi.advanceTimersByTime(70);
    });
    expect(screen.getByTestId(`${lineId}-text`).textContent).toBe("토요");
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-time")).toHaveAttribute(
      "accessibility-label",
      `Minseo, ${conversation.turns[0].transcript}`,
    );
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    act(() => {
      vi.advanceTimersByTime(35);
    });
    expect(screen.getByTestId(`${lineId}-text`).textContent).toBe("토");
    act(() => settled?.());
    expect(screen.getByTestId(lineId)).toHaveAttribute("data-status", "ready");
    expect(screen.getByTestId(`${lineId}-text`).textContent).toBe(conversation.turns[0].transcript);
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-time-reply"), {});
    expect(screen.queryByTestId(lineId)).toBeNull();
    expect(screen.queryByTestId("phone-call-line-self-confirm-time-reply-line")).toBeNull();
    expect(screen.getByTestId("phone-call-line-jimin-confirm-place-line")).toHaveAttribute(
      "data-status",
      "revealing",
    );
  });

  it("음원 재생이 불가능하면 전체 자막을 남겨 답장할 수 있다", () => {
    playAudio.mockReturnValue("unavailable");
    render(<PhoneCallScreen {...props()} />);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(screen.getByTestId("phone-call-line-jimin-confirm-time-line")).toHaveAttribute(
      "data-status",
      "ready",
    );
    expect(screen.getByTestId("phone-call-line-jimin-confirm-time-line-text")).toHaveTextContent(
      conversation.turns[0].transcript,
    );
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toBeInTheDocument();
  });
  it("첫 진입은 자동 재생과 자막 없이 수신 표지와 받기 버튼을 보인다", () => {
    render(<PhoneCallScreen {...props()} />);
    expect(screen.getByTestId("phone-call-screen")).toBeTruthy();
    expect(screen.getByTestId("phone-call-title")).toHaveTextContent("A Call from Minseo");
    expect(screen.getByTestId("phone-call-contact-name")).toHaveTextContent("Minseo");
    expect(screen.getByTestId("phone-call-caller")).toHaveAttribute("class", "call-stage-caller");
    expect(screen.queryByTestId("phone-call-clock")).toBeNull();
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Incoming call…");
    expect(screen.queryByTestId("phone-call-transcript-jimin-confirm-time")).toBeNull();
    expect(screen.getByTestId("phone-call-audio-button")).toHaveClass("phone-call-answer-button");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("Accept");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-element",
      "true",
    );
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "Accept",
    );
    expect(screen.queryByTestId("phone-call-reply-confirm-time-reply")).toBeNull();
  });

  it("수동 audio tap만 재생하고 callback 전에는 답장을 숨긴다", () => {
    let settled: (() => void) | undefined;
    playAudio.mockImplementation((_source, done) => {
      settled = done;
      return "started";
    });
    render(<PhoneCallScreen {...props()} />);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(playAudio).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
    expect(screen.queryByTestId("phone-call-reply-confirm-time-reply")).toBeNull();
    act(() => settled?.());
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toHaveTextContent(
      "네, 토요일 오후 2시에 만나요.",
    );
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toHaveAttribute(
      "accessibility-element",
      "true",
    );
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toHaveAttribute(
      "accessibility-traits",
      "button",
    );
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toHaveAttribute(
      "accessibility-label",
      "네, 토요일 오후 2시에 만나요.",
    );
  });

  it("한 번 받은 뒤 답장마다 다음 음성을 한 번씩 이어 재생하고 완료 후 전체 기록을 보여준다", () => {
    const onComplete = vi.fn();
    let finish: (() => void) | undefined;
    playAudio.mockImplementation((_source: string, done: () => void) => {
      finish = done;
      return "started";
    });
    render(<PhoneCallScreen {...props()} onComplete={onComplete} />);
    const transcriptIds = () =>
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid"));
    expect(transcriptIds()).toEqual([]);
    expect(playAudio).toHaveBeenCalledTimes(0);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(playAudio).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Speaking…");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("Listen again");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "Listen again",
    );
    expect(screen.queryByTestId("phone-call-reply-confirm-time-reply")).toBeNull();
    act(() => finish?.());
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Your turn to reply");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "Listen again",
    );
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-time-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Speaking…");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("Listen again");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "Listen again",
    );
    expect(transcriptIds()).toEqual(["phone-call-transcript-jimin-confirm-place"]);
    expect(playAudio).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("phone-call-reply-confirm-place-reply")).toBeNull();
    expect(playAudio).toHaveBeenLastCalledWith("phone-call-confirm-02", expect.any(Function));
    act(() => finish?.());
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-place-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Speaking…");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("Listen again");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "Listen again",
    );
    expect(transcriptIds()).toEqual(["phone-call-transcript-jimin-goodbye"]);
    expect(playAudio).toHaveBeenCalledTimes(3);
    expect(playAudio).toHaveBeenLastCalledWith("phone-call-confirm-03", expect.any(Function));
    act(() => finish?.());
    fireEvent.tap(screen.getByTestId("phone-call-reply-goodbye-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Call ended");
    expect(transcriptIds()).toEqual([
      "phone-call-transcript-jimin-confirm-time",
      "phone-call-transcript-self-confirm-time-reply",
      "phone-call-transcript-jimin-confirm-place",
      "phone-call-transcript-self-confirm-place-reply",
      "phone-call-transcript-jimin-goodbye",
      "phone-call-transcript-self-goodbye-reply",
    ]);
    expect(playAudio).toHaveBeenCalledTimes(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("appointment-confirmation-phone-call");
  });

  it("통화 시계는 수동 시작·완료에 맞춰 움직이고 다시보기에서 초기화된다", () => {
    vi.useFakeTimers();
    try {
      playAudio.mockReturnValue("unavailable");
      render(<PhoneCallScreen {...props()} />);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByTestId("phone-call-clock")).toBeNull();
      fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId("phone-call-clock")).toHaveTextContent("0:02");
      fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-time-reply"), {});
      fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-place-reply"), {});
      fireEvent.tap(screen.getByTestId("phone-call-reply-goodbye-reply"), {});
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByTestId("phone-call-clock")).toHaveTextContent("0:02");
      fireEvent.tap(screen.getByTestId("phone-call-replay-button"), {});
      expect(screen.queryByTestId("phone-call-clock")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("unavailable 재생은 즉시 현재 답장을 노출한다", () => {
    playAudio.mockReturnValue("unavailable");
    render(<PhoneCallScreen {...props()} />);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(screen.getByTestId("phone-call-reply-confirm-time-reply")).toHaveTextContent(
      "네, 토요일 오후 2시에 만나요.",
    );
  });

  it("reply-ready에서 다시 듣기는 stop 후 같은 source를 재생하고 callback 전 답장을 숨긴다", () => {
    let finish: (() => void) | undefined;
    playAudio.mockImplementation((_source: string, done: () => void) => {
      finish = done;
      return "started";
    });
    render(<PhoneCallScreen {...props()} />);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    act(() => finish?.());
    playAudio.mockClear();
    stopAudio.mockClear();
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(stopAudio.mock.invocationCallOrder[0]).toBeLessThan(
      playAudio.mock.invocationCallOrder[0],
    );
    expect(playAudio).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
    expect(screen.queryByTestId("phone-call-reply-confirm-time-reply")).toBeNull();
  });

  it("통화 종료 버튼은 오디오를 멈추고 미완료로 나간다", () => {
    playAudio.mockReturnValue("started");
    const onExit = vi.fn();
    const onComplete = vi.fn();
    render(<PhoneCallScreen {...props()} onExit={onExit} onComplete={onComplete} />);
    expect(screen.queryByTestId("phone-call-hang-up")).toBeNull();
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    stopAudio.mockClear();
    fireEvent.tap(screen.getByTestId("phone-call-hang-up"), {});
    expect(stopAudio).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("오디오 시작 뒤 exit과 unmount가 stopAudio를 호출한다", () => {
    playAudio.mockReturnValue("started");
    const onExit = vi.fn();
    const view = render(<PhoneCallScreen {...props()} onExit={onExit} />);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(stopAudio).toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledWith("incomplete");
    stopAudio.mockClear();
    view.unmount();
    expect(stopAudio).toHaveBeenCalled();
  });

  it("완료 상태 replay는 수신 표지로 돌아가며 자동 audio와 완료 callback을 만들지 않는다", () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();
    render(<PhoneCallScreen {...props("completed")} onComplete={onComplete} onExit={onExit} />);
    const replay = screen.getByTestId("phone-call-replay-button");
    expect(replay).toHaveAttribute("accessibility-element", "true");
    expect(replay).toHaveAttribute("accessibility-traits", "button");
    expect(replay).toHaveAttribute("accessibility-label", "Start over");
    fireEvent.tap(replay, {});
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toEqual([]);
    expect(screen.queryByTestId("phone-call-transcript-jimin-confirm-time")).toBeNull();
    expect(playAudio).toHaveBeenCalledTimes(0);
    expect(onComplete).toHaveBeenCalledTimes(0);
    fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});
    expect(onExit).toHaveBeenCalledWith("completed");
  });

  it("나가기 callback은 완료 outcome을 한 번 전달하고 header/button 역할과 이름을 낸다", () => {
    const onExit = vi.fn();
    render(<PhoneCallScreen {...props()} onExit={onExit} />);
    expect(screen.getByTestId("phone-call-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
    const exit = screen.getByTestId("phone-call-exit-button");
    expect(exit).toHaveAttribute("accessibility-element", "true");
    expect(exit).toHaveAttribute("accessibility-traits", "button");
    expect(exit).toHaveAttribute("accessibility-label", "Back to map");
    fireEvent.tap(exit, {});
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith("incomplete");
  });

  it("현재 transcript는 지민 화자 label을 포함하고 시간순 DOM으로 노출한다", () => {
    render(<PhoneCallScreen {...props("completed")} />);
    const ids = ["confirm-time", "confirm-place", "goodbye"];
    const nodes = ids.map((id) => screen.getByTestId(`phone-call-transcript-jimin-${id}`));
    expect(nodes[0].compareDocumentPosition(nodes[1])).toBe(4);
    expect(nodes[1].compareDocumentPosition(nodes[2])).toBe(4);
    expect(nodes[0]).toHaveAttribute("accessibility-label", expect.stringContaining("Minseo"));
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-time")).toHaveAttribute(
      "accessibility-label",
      "Minseo, 토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
    );
    expect(screen.getByTestId("phone-call-transcript-self-confirm-time-reply")).toHaveAttribute(
      "accessibility-label",
      "Me, 네, 토요일 오후 2시에 만나요.",
    );
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-place")).toHaveAttribute(
      "accessibility-label",
      "Minseo, 카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
    );
    expect(screen.getByTestId("phone-call-transcript-self-confirm-place-reply")).toHaveAttribute(
      "accessibility-label",
      "Me, 네, 2번 출구 오른쪽 카페예요.",
    );
    expect(screen.getByTestId("phone-call-transcript-jimin-goodbye")).toHaveAttribute(
      "accessibility-label",
      "Minseo, 좋아요. 그럼 토요일에 봐요!",
    );
    expect(screen.getByTestId("phone-call-transcript-self-goodbye-reply")).toHaveAttribute(
      "accessibility-label",
      "Me, 네, 토요일에 봐요!",
    );
  });
});

function renderMarkedCall(completionStatus: "available" | "completed" = "available") {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <PhoneCallScreen {...props(completionStatus)} />
    </UiCopyContext.Provider>,
  );
}

describe("[ST7-M] 전화 문구는 표에서 읽는다", () => {
  beforeEach(() => vi.resetAllMocks());

  it("상태 · 재생 · 나가기", () => {
    renderMarkedCall();

    expect(screen.getByTestId("phone-call-status")).toHaveTextContent(
      "⟦phoneCall.status.incoming⟧",
    );
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent(
      "⟦phoneCall.play.start⟧",
    );
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "⟦phoneCall.play.start⟧",
    );
    expect(screen.getByTestId("phone-call-exit-button")).toHaveAttribute(
      "accessibility-label",
      "⟦common.exitTo.journey⟧",
    );
  });

  it("재생 중 · 답장 차례 · 다시 듣기 · 다음 턴의 듣기", () => {
    let finish: (() => void) | undefined;
    playAudio.mockImplementation((_source: string, done: () => void) => {
      finish = done;
      return "started";
    });
    renderMarkedCall();

    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("⟦phoneCall.status.playing⟧");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent(
      "⟦phoneCall.play.listen-again⟧",
    );
    act(() => finish?.());
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent(
      "⟦phoneCall.status.reply-ready⟧",
    );
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-time-reply"), {});
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent(
      "⟦phoneCall.play.listen-again⟧",
    );
  });

  it("완료 상태 — 끝 표시 · 처음부터 · 내 화자", () => {
    renderMarkedCall("completed");

    expect(screen.getByTestId("phone-call-status")).toHaveTextContent(
      "⟦phoneCall.status.completed⟧",
    );
    expect(screen.getByTestId("phone-call-replay-button")).toHaveAttribute(
      "accessibility-label",
      "⟦common.startOver⟧",
    );
    expect(screen.getByTestId("phone-call-replay-button")).toHaveTextContent("⟦common.startOver⟧");
    expect(screen.getByTestId("phone-call-transcript-self-confirm-time-reply")).toHaveAttribute(
      "accessibility-label",
      expect.stringContaining("⟦common.me⟧"),
    );
  });
});
