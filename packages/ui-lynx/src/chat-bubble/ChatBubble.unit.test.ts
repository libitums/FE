import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { chatBubbleDeliveryLabels, getChatBubbleContract } from "./chat-bubble.contract";

describe("getChatBubbleContract", () => {
  test("incoming 기본 계약은 M, Default, UI 언어와 실제 화자 이름을 사용한다", () => {
    expect(
      getChatBubbleContract({ direction: "incoming", message: "안녕하세요", speaker: "말랑이" }),
    ).toEqual({
      accessibilityLabel: "말랑이: 안녕하세요",
      className:
        "ui-lynx-chat-bubble ui-lynx-chat-bubble-incoming ui-lynx-chat-bubble-m ui-lynx-chat-bubble-delivery-default",
      contentLanguage: "ui",
      delivery: "default",
      direction: "incoming",
      size: "m",
    });
  });

  test.each([
    ["sending", "보내는 중…"],
    ["sent", "보냈어요"],
    ["read", "읽었어요"],
    ["failed", "보내지 못했어요"],
  ] as const)("outgoing %s 전송 상태를 문구와 함께 제공한다", (delivery, deliveryLabel) => {
    expect(
      getChatBubbleContract({
        direction: "outgoing",
        message: "곧 도착해요",
        speaker: "나",
        delivery,
      }),
    ).toMatchObject({ delivery, deliveryLabel });
    expect(chatBubbleDeliveryLabels[delivery]).toBe(deliveryLabel);
  });

  test.each(["s", "m", "l"] as const)("%s 크기를 독립 class로 유지한다", (size) => {
    expect(
      getChatBubbleContract({ direction: "outgoing", message: "네", speaker: "나", size })
        .className,
    ).toContain(`ui-lynx-chat-bubble-${size}`);
  });

  test("학습 언어는 비어 있지 않은 BCP 47 languageTag를 보존한다", () => {
    expect(
      getChatBubbleContract({
        direction: "incoming",
        message: "See you tomorrow.",
        speaker: "Mina",
        contentLanguage: "learning",
        languageTag: " en-US ",
      }),
    ).toMatchObject({ contentLanguage: "learning", languageTag: "en-US" });
  });

  test.each([
    [{ direction: "incoming", message: "", speaker: "말랑이" }, "message must not be empty"],
    [{ direction: "incoming", message: "안녕", speaker: "  " }, "speaker must not be empty"],
    [{ direction: "incoming", message: undefined, speaker: "말랑이" }, "message must not be empty"],
    [{ direction: "incoming", message: "안녕", speaker: null }, "speaker must not be empty"],
    [
      {
        direction: "incoming",
        message: "Hello",
        speaker: "Mina",
        contentLanguage: "learning",
      },
      "languageTag is required for learning content",
    ],
  ] as const)("불완전한 접근성·언어 입력을 거부한다: %j", (props, message) => {
    expect(() =>
      getChatBubbleContract(props as unknown as Parameters<typeof getChatBubbleContract>[0]),
    ).toThrow(message);
  });
});

describe("chat-bubble.css", () => {
  const styles = readFileSync(resolve(process.cwd(), "src/chat-bubble/chat-bubble.css"), "utf8");

  test("280px 상한, 논리 방향 정렬과 12px 일반 모서리를 고정한다", () => {
    expect(styles).toMatch(/\.ui-lynx-chat-bubble\s*\{[^}]*max-width:\s*280px/);
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble\s*\{[^}]*border-radius:\s*var\(--libitum-radius-md\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble-incoming\s*\{[^}]*align-self:\s*flex-start[^}]*border-end-start-radius:\s*var\(--libitum-spacing-0\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble-outgoing\s*\{[^}]*align-self:\s*flex-end[^}]*border-end-end-radius:\s*var\(--libitum-spacing-0\)/,
    );
  });

  test("S/M/L padding과 body typography를 token으로 연결한다", () => {
    for (const [size, vertical, horizontal] of [
      ["s", "8", "12"],
      ["m", "12", "16"],
      ["l", "16", "20"],
    ]) {
      expect(styles).toMatch(
        new RegExp(
          `\\.ui-lynx-chat-bubble-${size}\\s*\\{[^}]*padding:\\s*var\\(--libitum-spacing-${vertical}\\) var\\(--libitum-spacing-${horizontal}\\)`,
        ),
      );
      expect(styles).toContain(`var(--libitum-typography-body-${size}-font-size)`);
      expect(styles).toContain(`var(--libitum-typography-body-${size}-line-height)`);
    }
  });

  test("direction surface와 message 전경은 design-system semantic token을 사용한다", () => {
    expect(styles).toContain("var(--libitum-color-gray-100)");
    expect(styles).toContain("var(--libitum-color-fg-neutral)");
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble-outgoing\s*\{[^}]*background-color:\s*var\(--libitum-color-brand-primary\)/,
    );
    expect(styles).toContain("var(--libitum-color-fg-neutral-inverted)");
    expect(styles).toMatch(/word-break:\s*break-all/);
  });

  test("번역이 있으면 계약에 싣고 접근성 이름 뒤에 잇는다", () => {
    const contract = getChatBubbleContract({
      direction: "incoming",
      speaker: "직원",
      message: "어서 오세요",
      translation: "  Welcome  ",
    });
    expect(contract.translation).toBe("Welcome");
    expect(contract.accessibilityLabel).toBe("직원: 어서 오세요, Welcome");
  });

  test("공백뿐인 번역은 없는 것으로 본다", () => {
    const contract = getChatBubbleContract({
      direction: "incoming",
      speaker: "직원",
      message: "어서 오세요",
      translation: "   ",
    });
    expect(contract.translation).toBeUndefined();
    expect(contract.accessibilityLabel).toBe("직원: 어서 오세요");
  });

  test("번역 색은 incoming gray.700, outgoing gray.200이다", () => {
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble-translation\s*\{[^}]*color:\s*var\(--libitum-color-gray-700\)/,
    );
    expect(styles).toMatch(
      /\.ui-lynx-chat-bubble-outgoing \.ui-lynx-chat-bubble-translation\s*\{[^}]*color:\s*var\(--libitum-color-gray-200\)/,
    );
  });
});
