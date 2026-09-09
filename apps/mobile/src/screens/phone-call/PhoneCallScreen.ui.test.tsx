import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import type { PhoneCallConversation } from "./phone-call.contract";
import { PhoneCallScreen } from "./PhoneCallScreen";

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../../lib/audio", () => audio);
const { playAudio, stopAudio } = audio;

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "지민",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "지민",
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
  it("첫 진입은 자동 재생 없이 header·지민·준비·첫 transcript·통화 시작을 보인다", () => {
    render(<PhoneCallScreen {...props()} />);
    expect(screen.getByTestId("phone-call-screen")).toBeTruthy();
    expect(screen.getByTestId("phone-call-title")).toHaveTextContent("약속 확인 전화");
    expect(screen.getByTestId("phone-call-contact-name")).toHaveTextContent("지민");
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 준비");
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-time")).toHaveTextContent(
      "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
    );
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("통화 시작");
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
      "통화 시작",
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

  it("세 턴을 수동 재생·답장하고 transcript ID 1·3·5·6과 완료를 검증한다", () => {
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
    expect(transcriptIds()).toEqual(["phone-call-transcript-jimin-confirm-time"]);
    expect(playAudio).toHaveBeenCalledTimes(0);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(playAudio).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("상대방이 말하는 중");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("다시 듣기");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "다시 듣기",
    );
    expect(screen.queryByTestId("phone-call-reply-confirm-time-reply")).toBeNull();
    act(() => finish?.());
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("답장할 차례");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "다시 듣기",
    );
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-time-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 준비");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("듣기");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "듣기",
    );
    expect(transcriptIds()).toEqual([
      "phone-call-transcript-jimin-confirm-time",
      "phone-call-transcript-self-confirm-time-reply",
      "phone-call-transcript-jimin-confirm-place",
    ]);
    expect(playAudio).toHaveBeenCalledTimes(1);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(playAudio).toHaveBeenLastCalledWith("phone-call-confirm-02", expect.any(Function));
    act(() => finish?.());
    fireEvent.tap(screen.getByTestId("phone-call-reply-confirm-place-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 준비");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveTextContent("듣기");
    expect(screen.getByTestId("phone-call-audio-button")).toHaveAttribute(
      "accessibility-label",
      "듣기",
    );
    expect(transcriptIds()).toEqual([
      "phone-call-transcript-jimin-confirm-time",
      "phone-call-transcript-self-confirm-time-reply",
      "phone-call-transcript-jimin-confirm-place",
      "phone-call-transcript-self-confirm-place-reply",
      "phone-call-transcript-jimin-goodbye",
    ]);
    expect(playAudio).toHaveBeenCalledTimes(2);
    fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
    expect(playAudio).toHaveBeenLastCalledWith("phone-call-confirm-03", expect.any(Function));
    act(() => finish?.());
    fireEvent.tap(screen.getByTestId("phone-call-reply-goodbye-reply"), {});
    expect(screen.getByTestId("phone-call-status")).toHaveTextContent("통화 완료");
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

  it("완료 상태 replay는 첫 transcript로 돌아가며 자동 audio와 완료 callback을 만들지 않는다", () => {
    const onComplete = vi.fn();
    const onExit = vi.fn();
    render(<PhoneCallScreen {...props("completed")} onComplete={onComplete} onExit={onExit} />);
    const replay = screen.getByTestId("phone-call-replay-button");
    expect(replay).toHaveAttribute("accessibility-element", "true");
    expect(replay).toHaveAttribute("accessibility-traits", "button");
    expect(replay).toHaveAttribute("accessibility-label", "처음부터 보기");
    fireEvent.tap(replay, {});
    expect(
      screen
        .queryAllByTestId(/^phone-call-transcript-/)
        .map((node) => node.getAttribute("data-testid")),
    ).toEqual(["phone-call-transcript-jimin-confirm-time"]);
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-time")).toBeTruthy();
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
    expect(exit).toHaveAttribute("accessibility-label", "맵으로");
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
    expect(nodes[0]).toHaveAttribute("accessibility-label", expect.stringContaining("지민"));
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-time")).toHaveAttribute(
      "accessibility-label",
      "지민, 토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
    );
    expect(screen.getByTestId("phone-call-transcript-self-confirm-time-reply")).toHaveAttribute(
      "accessibility-label",
      "나, 네, 토요일 오후 2시에 만나요.",
    );
    expect(screen.getByTestId("phone-call-transcript-jimin-confirm-place")).toHaveAttribute(
      "accessibility-label",
      "지민, 카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
    );
    expect(screen.getByTestId("phone-call-transcript-self-confirm-place-reply")).toHaveAttribute(
      "accessibility-label",
      "나, 네, 2번 출구 오른쪽 카페예요.",
    );
    expect(screen.getByTestId("phone-call-transcript-jimin-goodbye")).toHaveAttribute(
      "accessibility-label",
      "지민, 좋아요. 그럼 토요일에 봐요!",
    );
    expect(screen.getByTestId("phone-call-transcript-self-goodbye-reply")).toHaveAttribute(
      "accessibility-label",
      "나, 네, 토요일에 봐요!",
    );
  });
});
