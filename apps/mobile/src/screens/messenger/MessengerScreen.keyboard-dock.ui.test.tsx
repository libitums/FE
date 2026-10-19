import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import { keyboardDockBodyStyle, keyboardDockEdgesOf } from "../../lib/keyboard-dock";
import type { KeyboardDockBottom } from "../../lib/keyboard-dock";
import type { SafeAreaInsets } from "../../lib/safe-area";
import { messengerConversationFor } from "./messenger";
import { keyboardConversation } from "./messenger-keyboard-fixture.test-support";
import { messengerCorrectDelayMs } from "./messenger-composer";
import { sendMessengerReply, typeMessengerReply } from "./messenger.test-support";
import { MessengerScreen } from "./MessengerScreen";

// `ui` 계층: 자판 화면의 트리(자판이 바깥 상자의 마지막 자식)와 국면별 인라인 바깥 여백을 봅니다.
// 여백 값은 같은 순수 함수에서 만들고, 국면 판정은 다시 적지 않습니다.

const ios: SafeAreaInsets = { top: 59, bottom: 34, left: 0, right: 0 };
const wide: SafeAreaInsets = { top: 24, bottom: 48, left: 44, right: 44 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(insets: SafeAreaInsets, target = keyboardConversation) {
  render(
    <MessengerScreen
      insets={insets}
      conversation={target}
      completionStatus="available"
      onExit={vi.fn<() => void>()}
      onComplete={vi.fn<() => void>()}
      onFinish={vi.fn<() => void>()}
    />,
  );
}

/** 요소가 없으면 `null`이라 단언이 실패로 말합니다. */
function marginsOf(testId: string) {
  const node = screen.queryByTestId(testId);
  if (node === null) return null;
  const { marginBottom, marginLeft, marginRight } = node.style;
  return { marginBottom, marginLeft, marginRight };
}

const bodyMargins = (insets: SafeAreaInsets, owner: KeyboardDockBottom) =>
  keyboardDockBodyStyle(keyboardDockEdgesOf(insets), owner);
const surface = () => marginsOf("messenger-screen-surface");
const childIds = (testId: string) =>
  Array.from(screen.getByTestId(testId).children).map((child) => child.getAttribute("data-testid"));

const tapTryAgain = () =>
  fireEvent.tap(screen.getByTestId("messenger-try-again").querySelector("view")!, {});

describe("MessengerScreen keyboard dock", () => {
  test("MU1. 첫 답장(자판)은 바깥 상자 안 [표면, 자판] 순서이고 자판이 답장 구역 밖이다", () => {
    mount(ios);

    expect(childIds("messenger-screen")).toEqual([
      "messenger-screen-surface",
      "messenger-keyboard",
    ]);
    expect(
      screen.getByTestId("messenger-reply").contains(screen.getByTestId("messenger-keyboard")),
    ).toBe(false);
    expect(surface()).toEqual(bodyMargins(ios, "keyboard"));
    expect(surface()?.marginBottom).toBe("0px");
    expect(marginsOf("messenger-keyboard-rows")?.marginBottom).toBe("34px");
  });

  test("MU2. 틀린 답은 자판 대신 Try Again이 서고 표면이 아래 인셋을 지며, 누르면 되돌아온다", () => {
    mount(ios);
    typeMessengerReply("조아요");

    expect(screen.getByTestId("messenger-try-again")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(surface()).toEqual(bodyMargins(ios, "body"));
    expect(surface()?.marginBottom).toBe("34px");

    tapTryAgain();
    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
    expect(surface()?.marginBottom).toBe("0px");
  });

  test("MU3. 판정 틈에는 자판이 남고, 틈 뒤 둘째 답장(보기)에서는 자판이 걷히고 표면이 인셋을 진다", () => {
    mount(ios);
    typeMessengerReply("좋아요!");

    expect(screen.getByTestId("messenger-keyboard")).toBeInTheDocument();
    expect(surface()?.marginBottom).toBe("0px");

    act(() => {
      vi.advanceTimersByTime(messengerCorrectDelayMs);
    });
    expect(screen.getByTestId("messenger-choices")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(surface()).toEqual(bodyMargins(ios, "body"));
    expect(surface()?.marginBottom).toBe("34px");
  });

  test("MU4. 대화가 끝나 See results가 서면 자판이 없고 표면이 아래 인셋을 진다", () => {
    mount(ios);
    sendMessengerReply("좋아요!");
    sendMessengerReply("고마워요!");

    expect(screen.getByTestId("messenger-finish")).toBeInTheDocument();
    expect(screen.queryByTestId("messenger-keyboard")).toBeNull();
    expect(surface()).toEqual(bodyMargins(ios, "body"));
    expect(surface()?.marginBottom).toBe("34px");
  });

  test("MU5. 좌우 인셋은 자판 국면에서 표면과 묶음 모두 같은 값이고 아래는 갈린다", () => {
    mount(wide);

    expect(surface()).toEqual({ marginBottom: "0px", marginLeft: "44px", marginRight: "44px" });
    expect(marginsOf("messenger-keyboard-rows")).toEqual({
      marginBottom: "48px",
      marginLeft: "44px",
      marginRight: "44px",
    });
  });

  test("MU6. 학습 문항 안내가 떠 있는 동안 바깥 상자가 가려지고 닫으면 풀린다", () => {
    stubGuideStorage();
    mount(ios, messengerConversationFor("appointment-confirmation"));
    const root = screen.getByTestId("messenger-screen");

    expect(guideRoots()).toHaveLength(1);
    expect(root).toHaveAttribute("accessibility-elements-hidden", "true");
    expect(root.contains(screen.getByTestId("messenger-choices"))).toBe(true);

    fireEvent.tap(screen.getByTestId("learning-item-guide-messenger"), {
      eventType: "catchEvent",
    });
    expect(root).toHaveAttribute("accessibility-elements-hidden", "false");
  });

  test("MU6. 자판이 서는 국면에서도 자판은 가림 속성을 진 바깥 상자의 자손이다", () => {
    mount(ios);
    const root = screen.getByTestId("messenger-screen");

    expect(root.getAttribute("accessibility-elements-hidden")).not.toBe("true");
    expect(root.contains(screen.getByTestId("messenger-keyboard"))).toBe(true);
  });
});
