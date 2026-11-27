import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { LearnerProfilePort } from "../../lib/learner-profile.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { LearnerNameScreen } from "./LearnerNameScreen";

// `ui` 계층: 가입 직후 ① 이름 — 미리 채운 이름 · Shuffle · 미리보기 · 오류 · Continue · 뒤로 · 진행 막대를 봅니다.

const copy = uiCopyEn.learnerProfile;

function portWith(names: readonly string[]): LearnerProfilePort & { calls: (string | null)[] } {
  const calls: (string | null)[] = [];
  let next = 0;
  return {
    calls,
    search: () => [],
    byCode: () => null,
    previewOf: (name) =>
      name === null
        ? { kind: "example", lines: [] }
        : {
            kind: "yours",
            lines: [{ ko: `${name}로 예약했어요.`, en: `I booked under ${name}.` }],
          },
    randomName: (previous) => {
      calls.push(previous);
      const name = names[next % names.length] ?? "";
      next += 1;
      return name;
    },
  };
}

function renderScreen(initialName: string, port = portWith(["Leo", "Mai"])) {
  const onContinue = vi.fn<(name: string) => void>();
  const onBack = vi.fn();
  render(
    <LearnerNameScreen
      initialName={initialName}
      port={port}
      onContinue={onContinue}
      onBack={onBack}
    />,
  );
  return { onContinue, onBack, port };
}

function stubAnnounceHost(): string[] {
  const contents: string[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (...args: readonly unknown[]) => {
        contents.push((args[0] as { content: string }).content);
      },
    },
  });
  return contents;
}

function typeName(value: string) {
  const input = screen.getByTestId("ui-lynx-text-field-input");
  const EventConstructor = input.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

const tapContinue = () =>
  fireEvent.tap(
    within(screen.getByTestId("learner-name-screen-next")).getByTestId("ui-lynx-button"),
    {},
  );
const tapShuffle = () => fireEvent.tap(screen.getByTestId("learner-name-screen-shuffle"), {});
const supporting = () =>
  within(screen.getByTestId("learner-name-screen-field")).queryByTestId(
    "ui-lynx-text-field-supporting-row",
  )?.textContent ?? "";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
});

describe("LearnerNameScreen", () => {
  it("LN1. 제목 · 설명 · 진행 막대 1/3 · 미리 채운 이름 · 도움말 · 그 이름의 미리보기가 선다", () => {
    renderScreen("Emma");

    expect(screen.getByTestId("learner-name-screen-title")).toHaveTextContent(
      copy.signup.name.title,
    );
    expect(screen.getByText(copy.signup.name.caption)).toBeInTheDocument();
    expect(screen.getByTestId("entry-step-bar")).toHaveAttribute(
      "accessibility-label",
      "Step 1 of 3",
    );
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "Emma");
    expect(supporting()).toContain(copy.signup.name.helper);
    const preview = screen.getByTestId("learner-name-screen-preview");
    expect(preview).toHaveTextContent(copy.signup.name.previewHeading);
    expect(preview).toHaveTextContent("Emma로 예약했어요.");
  });

  it("LN2. Continue는 정규화된 이름 하나로 onContinue를 부른다", () => {
    const { onContinue } = renderScreen("Emma");

    typeName("  Mia   Kim ");
    tapContinue();

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith("Mia Kim");
  });

  it("LN3. Shuffle은 지금 이름을 넘겨 다른 무작위 이름으로 칸 · 미리보기를 바꾼다", () => {
    const { port, onContinue } = renderScreen("Emma");

    tapShuffle();

    expect(port.calls).toEqual(["Emma"]);
    expect(screen.getByTestId("ui-lynx-text-field-input")).toHaveAttribute("default-value", "Leo");
    expect(screen.getByTestId("learner-name-screen-preview")).toHaveTextContent(
      "Leo로 예약했어요.",
    );
    tapContinue();
    expect(onContinue).toHaveBeenCalledWith("Leo");
  });

  it("LN4. Shuffle은 하는 일을 말하는 버튼 하나로 읽힌다", () => {
    renderScreen("Emma");

    const shuffle = screen.getByTestId("learner-name-screen-shuffle");
    expect(shuffle).toHaveAttribute("accessibility-traits", "button");
    expect(shuffle).toHaveAttribute("accessibility-label", copy.signup.name.shuffleLabel);
  });

  it("LN5. 빈 이름으로 Continue하면 머물고 빈 이름 오류를 칸에 세우고 읽는다", () => {
    const announced = stubAnnounceHost();
    const { onContinue } = renderScreen("Emma");

    typeName("   ");
    expect(supporting()).toContain(copy.signup.name.helper);
    tapContinue();

    expect(onContinue).not.toHaveBeenCalled();
    expect(supporting()).toContain(copy.nameIssue.empty);
    expect(announced).toEqual([copy.nameIssue.empty]);
    expect(screen.queryByTestId("learner-name-screen-preview")).not.toBeInTheDocument();
  });

  it("LN6. 금지 문자는 치는 즉시 오류이고 Continue가 머문다", () => {
    const { onContinue } = renderScreen("Emma");

    typeName("Em{ma}");
    expect(supporting()).toContain(copy.nameIssue["forbidden-character"]);
    tapContinue();

    expect(onContinue).not.toHaveBeenCalled();
  });

  it("LN7. 보이는 뒤로 · 시스템 뒤로가 같은 onBack이다", () => {
    const { onBack } = renderScreen("Emma");

    fireEvent.tap(
      within(screen.getByTestId("learner-name-screen-back")).getByTestId("ui-lynx-round-button"),
      {},
    );
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(backHandlers.runTop()).toBe(true);
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
