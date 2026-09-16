import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test } from "vitest";
import {
  dispatchBottomNavigatorStorySelect,
  normalizeBottomNavigatorStoryArgs,
} from "./bottom-navigator-story";
import { dispatchRoundButtonStoryTap, normalizeRoundButtonStoryArgs } from "./round-button-story";
import {
  dispatchCompactNumericInputStoryInput,
  normalizeCompactNumericInputStoryArgs,
} from "./compact-numeric-input-story";
import { normalizeStepIndicatorStoryArgs } from "./step-indicator-story";
import { dispatchOverlayStoryDismiss, normalizeOverlayStoryArgs } from "./overlay-story";
import { dispatchCardStoryTap, normalizeCardStoryArgs } from "./card-story";
import {
  dispatchBottomSheetStoryAction,
  dispatchBottomSheetStoryDismiss,
  normalizeBottomSheetStoryArgs,
} from "./bottom-sheet-story";
import { normalizeChatBubbleStoryArgs } from "./chat-bubble-story";
import { normalizeTextFieldStoryArgs } from "./text-field-story";
import { normalizeVisualNovelDialogStoryArgs } from "./visual-novel-dialog-story";
import { normalizeTooltipStoryArgs } from "./tooltip-story";
import { normalizeFogStoryArgs } from "./fog-story";

const appRoot = path.resolve(import.meta.dirname, "..");

async function readOutput(relativePath: string): Promise<string> {
  return readFile(path.join(appRoot, relativePath), "utf8");
}

async function readBinaryOutput(relativePath: string): Promise<Buffer> {
  return readFile(path.join(appRoot, relativePath));
}

async function outputExists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(appRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

describe("Storybook Lynx build outputs", () => {
  test("visual novel dialog init data는 독립 옵션을 직렬화 가능한 계약으로 정규화한다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeVisualNovelDialogStoryArgs({
            accessibilityLabel: " Aria's thought: مرحبا ",
            advance: "auto",
            contentLanguage: "learning",
            direction: "rtl",
            languageTag: " ar-SA ",
            line: "مرحبا",
            reveal: "typewriter",
            showAvatar: true,
            speakerName: "آريا",
            status: "revealing",
            surface: "translucent",
            variant: "thought",
            visibleCharacterCount: 99,
          }),
        ),
      ),
    ).toMatchObject({
      accessibilityLabel: "Aria's thought: مرحبا",
      advance: "auto",
      contentLanguage: "learning",
      direction: "rtl",
      languageTag: "ar-SA",
      line: "مرحبا",
      reveal: "typewriter",
      showAvatar: true,
      speakerName: "آريا",
      status: "revealing",
      surface: "translucent",
      variant: "thought",
      visibleCharacterCount: 5,
    });
  });

  test("tooltip init data는 독립 옵션을 JSON 직렬화 가능한 계약으로 정규화한다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeTooltipStoryArgs({
            alignment: "end",
            arrow: "off",
            contentLanguage: "learning",
            direction: "rtl",
            languageTag: " en-US ",
            message: "Try again",
            placement: "start",
            tone: "brand",
            visibility: "visible",
          }),
        ),
      ),
    ).toEqual({
      alignment: "end",
      arrow: "off",
      contentLanguage: "learning",
      direction: "rtl",
      languageTag: "en-US",
      message: "Try again",
      placement: "start",
      tone: "brand",
      visibility: "visible",
    });
  });

  test("tooltip init data는 불완전한 값을 안전한 기본값으로 바꾼다", () => {
    expect(
      normalizeTooltipStoryArgs({
        alignment: "bad",
        arrow: "bad",
        direction: "bad",
        message: " ",
        placement: "bad",
        tone: "bad",
        visibility: "bad",
      }),
    ).toEqual({
      alignment: "center",
      arrow: "on",
      contentLanguage: "ui",
      direction: "ltr",
      message: "이 기능에 대한 짧은 설명",
      placement: "top",
      tone: "neutral",
      visibility: "visible",
    });
  });

  test("fog init data는 직렬화 가능한 유효 옵션으로 정규화된다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeFogStoryArgs({
            direction: "start",
            size: "full",
            color: "surface-floating",
            visibility: "hidden",
            layoutDirection: "rtl",
          }),
        ),
      ),
    ).toEqual({
      direction: "start",
      size: "full",
      color: "surface-floating",
      visibility: "hidden",
      layoutDirection: "rtl",
    });
    expect(normalizeFogStoryArgs({ direction: "invalid", size: "xl" })).toEqual({
      direction: "bottom",
      size: "m",
      color: "surface-default",
      visibility: "visible",
      layoutDirection: "ltr",
    });
  });

  test("overlay init data는 JSON-only이고 잘못된 dismiss 조합을 none으로 보정한다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeOverlayStoryArgs({
            scope: "area",
            surface: "dialog",
            blur: "on",
            dismiss: "tap",
            phase: "entering",
            motion: "reduced",
            onDismiss: () => undefined,
          }),
        ),
      ),
    ).toEqual({
      scope: "area",
      surface: "dialog",
      blur: "on",
      dismiss: "none",
      phase: "entering",
      motion: "reduced",
    });
  });

  test("overlay dismiss bridge는 tap 가능한 Screen Sheet에만 Action을 보낸다", () => {
    const calls: unknown[] = [];
    expect(
      dispatchOverlayStoryDismiss(
        normalizeOverlayStoryArgs({ scope: "screen", surface: "sheet", dismiss: "tap" }),
        (value) => calls.push(value),
      ),
    ).toBe(true);
    expect(
      dispatchOverlayStoryDismiss(
        normalizeOverlayStoryArgs({ scope: "screen", surface: "dialog", dismiss: "tap" }),
        (value) => calls.push(value),
      ),
    ).toBe(false);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onDismiss", args: [] }]);
  });

  test("compact numeric input init data는 직렬화 가능한 한 자리 숫자 계약으로 정규화된다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeCompactNumericInputStoryArgs({
            accessibilityLabel: "반복 횟수",
            defaultValue: "a42",
            placeholder: "예: 0",
            size: "l",
            error: true,
          }),
        ),
      ),
    ).toEqual({
      accessibilityLabel: "반복 횟수",
      defaultValue: "2",
      placeholder: "0",
      size: "l",
      error: true,
      disabled: false,
    });
  });

  test("compact numeric input bridge는 활성 입력만 한 자리로 전달한다", () => {
    const calls: unknown[] = [];
    const active = normalizeCompactNumericInputStoryArgs({});
    const disabled = normalizeCompactNumericInputStoryArgs({ disabled: true });
    expect(dispatchCompactNumericInputStoryInput(active, "x57", (value) => calls.push(value))).toBe(
      true,
    );
    expect(dispatchCompactNumericInputStoryInput(disabled, "4", (value) => calls.push(value))).toBe(
      false,
    );
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onInput", args: ["7"] }]);
  });

  test("compact numeric input runtime은 빈 defaultValue도 native input에 반영한다", async () => {
    const runtime = await readOutput("src/lynx/compact-numeric-input.tsx");
    expect(runtime).not.toContain("if (!data.defaultValue) return");
    expect(runtime).toContain("params: { value: data.defaultValue }");
  });

  test("bottom sheet init data는 직렬화 가능한 시트 계약으로 정규화된다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeBottomSheetStoryArgs({
            title: "복습",
            overline: "학습 도구",
            description: "오디오를 다시 들어 보세요",
            primaryActionLabel: "다시 듣기",
            secondaryActionLabel: "문장 보기",
            showSecondaryAction: true,
            draggable: false,
            motion: "reduced",
          }),
        ),
      ),
    ).toEqual({
      title: "복습",
      overline: "학습 도구",
      description: "오디오를 다시 들어 보세요",
      primaryActionLabel: "다시 듣기",
      secondaryActionLabel: "문장 보기",
      showSecondaryAction: true,
      draggable: false,
      motion: "reduced",
    });
  });

  test("bottom sheet bridge는 dismiss reason과 action id를 전달한다", () => {
    const calls: unknown[] = [];
    dispatchBottomSheetStoryDismiss("scrim", (value) => calls.push(value));
    dispatchBottomSheetStoryAction("primary", (value) => calls.push(value));
    expect(calls).toEqual([
      { channel: "STORYBOOK_ACTION", name: "onDismiss", args: ["scrim"] },
      { channel: "STORYBOOK_ACTION", name: "onAction", args: ["primary"] },
    ]);
  });

  test("text-field init data는 native 입력 축과 optional slot을 직렬화 가능하게 정규화한다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeTextFieldStoryArgs({
            adornment: "action",
            availability: "read-only",
            counterMaxLength: 30,
            defaultValue: "hello",
            label: "검색",
            placeholder: "예: 말랑",
            purpose: "search",
            qualifier: "선택",
            supporting: "error",
            supportingMessage: "검색어를 확인해 주세요.",
          }),
        ),
      ),
    ).toEqual({
      adornment: "action",
      availability: "read-only",
      counterMaxLength: 30,
      defaultValue: "hello",
      label: "검색",
      placeholder: "예: 말랑",
      purpose: "search",
      qualifier: "선택",
      supporting: "error",
      supportingMessage: "검색어를 확인해 주세요.",
    });
  });

  test("text-field init data는 불완전한 값을 고정 fallback으로 바꾼다", () => {
    expect(
      normalizeTextFieldStoryArgs({
        adornment: "bad",
        availability: "bad",
        counterMaxLength: -1,
        label: " ",
        purpose: "bad",
        supporting: "bad",
      }),
    ).toEqual({
      adornment: "none",
      availability: "enabled",
      counterMaxLength: 0,
      defaultValue: "",
      label: "이메일 주소",
      placeholder: "예: name@example.com",
      purpose: "email",
      supporting: "helper",
      supportingMessage: "로그인할 때 사용할 이메일 주소를 입력해 주세요.",
    });
  });

  test("chat-bubble init data는 독립 옵션을 JSON 직렬화 가능한 계약으로 정규화한다", () => {
    expect(
      JSON.parse(
        JSON.stringify(
          normalizeChatBubbleStoryArgs({
            contentLanguage: "learning",
            delivery: "failed",
            direction: "outgoing",
            languageTag: " en-US ",
            message: "See you tomorrow.",
            size: "l",
            speaker: "Mina",
          }),
        ),
      ),
    ).toEqual({
      contentLanguage: "learning",
      delivery: "failed",
      direction: "outgoing",
      languageTag: "en-US",
      message: "See you tomorrow.",
      size: "l",
      speaker: "Mina",
    });
  });

  test("chat-bubble incoming은 delivery를 Default로 고정하고 불완전한 값을 기본화한다", () => {
    expect(
      normalizeChatBubbleStoryArgs({
        contentLanguage: "learning",
        delivery: "read",
        direction: "incoming",
        languageTag: " ",
        message: " ",
        size: "xl",
        speaker: " ",
      }),
    ).toEqual({
      contentLanguage: "learning",
      delivery: "default",
      direction: "incoming",
      languageTag: "en",
      message: "오늘 하루는 어땠어?",
      size: "m",
      speaker: "말랑이",
    });
  });

  test("step-indicator init data는 유효한 정수 계약으로 정규화되고 JSON 직렬화된다", () => {
    expect(
      JSON.parse(
        JSON.stringify(normalizeStepIndicatorStoryArgs({ currentStep: 3, totalSteps: 5 })),
      ),
    ).toEqual({
      currentStep: 3,
      totalSteps: 5,
    });
  });

  test("step-indicator init data는 잘못된 totalSteps만 기본값으로 되돌린다", () => {
    expect(normalizeStepIndicatorStoryArgs({ currentStep: 3, totalSteps: 9 })).toEqual({
      currentStep: 3,
      totalSteps: 4,
    });
  });

  test("step-indicator init data는 잘못된 currentStep만 기본값으로 되돌린다", () => {
    expect(normalizeStepIndicatorStoryArgs({ currentStep: 0, totalSteps: 5 })).toEqual({
      currentStep: 2,
      totalSteps: 5,
    });
  });

  test("step-indicator totalSteps 축소 시 범위를 벗어난 currentStep을 새 범위로 되돌린다", () => {
    expect(normalizeStepIndicatorStoryArgs({ currentStep: 4, totalSteps: 2 })).toEqual({
      currentStep: 2,
      totalSteps: 2,
    });
  });

  test.each([null, undefined, "invalid", 3])(
    "step-indicator init data는 object가 아니면 고정 fallback을 사용한다: %j",
    (input) => {
      expect(normalizeStepIndicatorStoryArgs(input)).toEqual({
        currentStep: 2,
        totalSteps: 4,
      });
    },
  );

  test("bottom-navigator init data is JSON-only and normalizes every preset", () => {
    const data = normalizeBottomNavigatorStoryArgs({
      preset: "all-items",
      selectedId: "roleplay",
      disabledLast: true,
      viewportWidth: 320,
      onSelect: () => undefined,
      rawSvg: "<svg>",
    });
    expect(JSON.parse(JSON.stringify(data))).toEqual({
      preset: "all-items",
      selectedId: "roleplay",
      disabledLast: true,
      viewportWidth: 320,
      items: [
        { id: "home", accessibilityLabel: "홈", icon: "house", availability: "enabled" },
        {
          id: "journey",
          accessibilityLabel: "여정",
          icon: "map",
          availability: "enabled",
          badge: { kind: "dot", accessibilityLabel: "새 소식 있음" },
        },
        {
          id: "roleplay",
          accessibilityLabel: "롤플레이",
          icon: "user-group",
          availability: "enabled",
          badge: { kind: "count", count: 108 },
        },
        { id: "settings", accessibilityLabel: "설정", icon: "settings", availability: "enabled" },
        {
          id: "notifications",
          accessibilityLabel: "알림",
          icon: "notification",
          availability: "disabled",
          disabledReason: "로그인 후 사용 가능",
        },
      ],
    });
    expect(data).not.toHaveProperty("onSelect");
    expect(JSON.stringify(data)).not.toContain("<svg");
  });

  test("bottom-navigator bridge dispatches enabled selection once and blocks disabled", () => {
    const calls: unknown[] = [];
    const data = normalizeBottomNavigatorStoryArgs({ preset: "all-items", disabledLast: true });
    expect(dispatchBottomNavigatorStorySelect(data, "journey", (value) => calls.push(value))).toBe(
      true,
    );
    expect(
      dispatchBottomNavigatorStorySelect(data, "notifications", (value) => calls.push(value)),
    ).toBe(false);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onSelect", args: ["journey"] }]);
  });

  test("round-button init data is JSON-roundtrip cloneable and contains no callback or raw SVG", () => {
    const data = normalizeRoundButtonStoryArgs({
      accessibilityLabel: "저장",
      variant: "brand",
      onTap: () => undefined,
      rawSvg: "<svg>",
    });
    expect(JSON.parse(JSON.stringify(data))).toEqual({
      accessibilityLabel: "저장",
      icon: "info-02",
      variant: "brand",
      size: "m",
      disabled: false,
      loading: false,
    });
    expect(data).not.toHaveProperty("onTap");
    expect(JSON.stringify(data)).not.toContain("<svg");
  });
  test("active round-button dispatches STORYBOOK_ACTION onTap once with its label", () => {
    const calls: unknown[] = [];
    const data = normalizeRoundButtonStoryArgs({ accessibilityLabel: "저장" });
    expect(dispatchRoundButtonStoryTap(data, (envelope) => calls.push(envelope))).toBe(true);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onTap", args: ["저장"] }]);
  });
  test("card init data는 JSON 직렬화 가능하고 interactive tap만 전달한다", () => {
    const calls: unknown[] = [];
    const interactive = normalizeCardStoryArgs({
      padding: "l",
      interaction: "interactive",
      direction: "rtl",
      title: "말하기 연습",
      showMedia: true,
      onTap: () => undefined,
    });
    expect(JSON.parse(JSON.stringify(interactive))).toEqual({
      padding: "l",
      interaction: "interactive",
      direction: "rtl",
      title: "말하기 연습",
      overline: "추천",
      body: "카페에서 자연스럽게 주문하는 표현을 연습해 보세요.",
      showMedia: true,
    });
    expect(dispatchCardStoryTap(interactive, (envelope) => calls.push(envelope))).toBe(true);
    expect(
      dispatchCardStoryTap(normalizeCardStoryArgs({ interaction: "static" }), (envelope) =>
        calls.push(envelope),
      ),
    ).toBe(false);
    expect(calls).toEqual([{ channel: "STORYBOOK_ACTION", name: "onTap", args: ["말하기 연습"] }]);
  });
  test.each([
    "button",
    "back-header",
    "status-indicator",
    "round-button",
    "compact-numeric-input",
    "fog",
    "progress-header",
    "page-indicator",
    "bottom-navigator",
    "bottom-sheet",
    "step-indicator",
    "overlay",
    "answer-label",
    "card",
    "chat-bubble",
    "visual-novel-dialog",
    "text-field",
    "tooltip",
  ])("%s story는 Rspeedy Lynx Web bundle을 갖는다", async (entry) => {
    const bundle = await readBinaryOutput(`dist/lynx/${entry}.web.bundle`);
    expect(bundle.byteLength).toBeGreaterThan(1_000);
    expect(bundle.subarray(0, 8).toString("ascii")).toBe("SDRAWROF");
  });

  test("정적 Storybook shell과 컴포넌트 story index를 갖는다", async () => {
    expect(await readOutput("dist/storybook/index.html")).toContain("storybook-root");

    const index = await readOutput("dist/storybook/index.json");
    expect(index).toContain("components-button--default");
    expect(index).toContain("components-back-header--default");
    expect(index).toContain("components-status-indicator--completed");
    expect(index).toContain("components-round-button--default");
    expect(index).toContain("components-round-button--brand");
    expect(index).toContain("components-round-button--loading");
    expect(index).toContain("components-round-button--disabled");
    expect(index).toContain("components-compact-numeric-input--empty");
    expect(index).toContain("components-compact-numeric-input--filled");
    expect(index).toContain("components-compact-numeric-input--error");
    expect(index).toContain("components-compact-numeric-input--disabled");
    expect(index).toContain("components-fog--bottom");
    expect(index).toContain("components-fog--horizontal-rtl");
    expect(index).toContain("components-fog--hidden");
    expect(index).toContain("components-fog--full");
    expect(index).toContain("components-bottom-sheet--default");
    expect(index).toContain("components-bottom-sheet--multiple-actions");
    expect(index).toContain("components-progress-header--default");
    expect(index).toContain("components-page-indicator--default");
    expect(index).toContain("components-bottom-navigator--default");
    expect(index).toContain("components-bottom-navigator--long-accessibility-label");
    expect(index).toContain("components-bottom-navigator--all-items");
    expect(index).toContain("components-bottom-navigator--disabled");
    expect(index).toContain("components-step-indicator--first");
    expect(index).toContain("components-step-indicator--middle");
    expect(index).toContain("components-step-indicator--last");
    expect(index).toContain("components-overlay--sheet-dismissible");
    expect(index).toContain("components-overlay--dialog-modal");
    expect(index).toContain("components-overlay--area");
    expect(index).toContain("components-overlay--area-blur");
    expect(index).toContain("components-overlay--reduced-motion");
    expect(index).toContain("components-answer-label--pending");
    expect(index).toContain("components-answer-label--correct");
    expect(index).toContain("components-answer-label--incorrect");
    expect(index).toContain("components-answer-label--subtle");
    expect(index).toContain("components-answer-label--large");
    expect(index).toContain("components-answer-label--long-label");
    expect(index).toContain("components-card--static");
    expect(index).toContain("components-card--interactive");
    expect(index).toContain("components-card--large-with-media");
    expect(index).toContain("components-card--right-to-left");
    expect(index).toContain("components-chat-bubble--incoming");
    expect(index).toContain("components-chat-bubble--outgoing");
    expect(index).toContain("components-chat-bubble--small");
    expect(index).toContain("components-chat-bubble--large");
    expect(index).toContain("components-chat-bubble--failed");
    expect(index).toContain("components-chat-bubble--learning-language");
    expect(index).toContain("components-chat-bubble--long-content");
    expect(index).toContain("components-visual-novel-dialog--speech");
    expect(index).toContain("components-visual-novel-dialog--narration");
    expect(index).toContain("components-visual-novel-dialog--thought");
    expect(index).toContain("components-visual-novel-dialog--translucent");
    expect(index).toContain("components-visual-novel-dialog--revealing");
    expect(index).toContain("components-visual-novel-dialog--auto-advance");
    expect(index).toContain("components-visual-novel-dialog--learning-language");
    expect(index).toContain("components-visual-novel-dialog--right-to-left");
    expect(index).toContain("components-visual-novel-dialog--long-content");
    expect(index).toContain("components-text-field--default");
    expect(index).toContain("components-text-field--filled");
    expect(index).toContain("components-text-field--error");
    expect(index).toContain("components-text-field--read-only");
    expect(index).toContain("components-text-field--disabled");
    expect(index).toContain("components-text-field--prefix-and-suffix");
    expect(index).toContain("components-text-field--trailing-action");
    expect(index).toContain("components-text-field--counter");
    expect(index).toContain("components-tooltip--top");
    expect(index).toContain("components-tooltip--bottom");
    expect(index).toContain("components-tooltip--start");
    expect(index).toContain("components-tooltip--end");
    expect(index).toContain("components-tooltip--brand");
    expect(index).toContain("components-tooltip--no-arrow");
    expect(index).toContain("components-tooltip--aligned-start");
    expect(index).toContain("components-tooltip--learning-language");
  });

  test("runtime은 공개 dist export를 소비하고 source mapping은 typecheck에만 격리한다", async () => {
    const baseTsconfig = JSON.parse(await readOutput("tsconfig.json")) as {
      compilerOptions: { paths?: Record<string, string[]> };
    };
    const typecheckTsconfig = JSON.parse(await readOutput("tsconfig.typecheck.json")) as {
      compilerOptions: { paths?: Record<string, string[]> };
    };
    const packageJson = JSON.parse(await readOutput("package.json")) as {
      scripts: { build: string; storybook: string };
    };

    expect(baseTsconfig.compilerOptions.paths).toBeUndefined();
    expect(typecheckTsconfig.compilerOptions.paths).toMatchObject({
      "@libitums/ui-lynx": ["../../packages/ui-lynx/src/index.ts"],
      "@libitums/ui-lynx/button": ["../../packages/ui-lynx/src/button/index.ts"],
      "@libitums/ui-lynx/back-header": ["../../packages/ui-lynx/src/back-header/index.ts"],
      "@libitums/ui-lynx/status-indicator": [
        "../../packages/ui-lynx/src/status-indicator/index.ts",
      ],
      "@libitums/ui-lynx/round-button": ["../../packages/ui-lynx/src/round-button/index.ts"],
      "@libitums/ui-lynx/compact-numeric-input": [
        "../../packages/ui-lynx/src/compact-numeric-input/index.ts",
      ],
      "@libitums/ui-lynx/fog": ["../../packages/ui-lynx/src/fog/index.ts"],
      "@libitums/ui-lynx/progress-header": ["../../packages/ui-lynx/src/progress-header/index.ts"],
      "@libitums/ui-lynx/page-indicator": ["../../packages/ui-lynx/src/page-indicator/index.ts"],
      "@libitums/ui-lynx/bottom-navigator": [
        "../../packages/ui-lynx/src/bottom-navigator/index.ts",
      ],
      "@libitums/ui-lynx/bottom-sheet": ["../../packages/ui-lynx/src/bottom-sheet/index.ts"],
      "@libitums/ui-lynx/step-indicator": ["../../packages/ui-lynx/src/step-indicator/index.ts"],
      "@libitums/ui-lynx/overlay": ["../../packages/ui-lynx/src/overlay/index.ts"],
      "@libitums/ui-lynx/answer-label": ["../../packages/ui-lynx/src/answer-label/index.ts"],
      "@libitums/ui-lynx/card": ["../../packages/ui-lynx/src/card/index.ts"],
      "@libitums/ui-lynx/chat-bubble": ["../../packages/ui-lynx/src/chat-bubble/index.ts"],
      "@libitums/ui-lynx/visual-novel-dialog": [
        "../../packages/ui-lynx/src/visual-novel-dialog/index.ts",
      ],
      "@libitums/ui-lynx/text-field": ["../../packages/ui-lynx/src/text-field/index.ts"],
      "@libitums/ui-lynx/tooltip": ["../../packages/ui-lynx/src/tooltip/index.ts"],
    });
    expect(packageJson.scripts.build).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
    expect(packageJson.scripts.storybook).toMatch(/^pnpm --filter @libitums\/ui-lynx build &&/);
  });

  test.each([
    ["button", "@libitums/ui-lynx/button"],
    ["back-header", "@libitums/ui-lynx/back-header"],
    ["status-indicator", "@libitums/ui-lynx/status-indicator"],
    ["round-button", "@libitums/ui-lynx/round-button"],
    ["compact-numeric-input", "@libitums/ui-lynx/compact-numeric-input"],
    ["fog", "@libitums/ui-lynx/fog"],
    ["progress-header", "@libitums/ui-lynx/progress-header"],
    ["page-indicator", "@libitums/ui-lynx/page-indicator"],
    ["bottom-navigator", "@libitums/ui-lynx/bottom-navigator"],
    ["bottom-sheet", "@libitums/ui-lynx/bottom-sheet"],
    ["step-indicator", "@libitums/ui-lynx/step-indicator"],
    ["overlay", "@libitums/ui-lynx/overlay"],
    ["answer-label", "@libitums/ui-lynx/answer-label"],
    ["card", "@libitums/ui-lynx/card"],
    ["chat-bubble", "@libitums/ui-lynx/chat-bubble"],
    ["visual-novel-dialog", "@libitums/ui-lynx/visual-novel-dialog"],
    ["text-field", "@libitums/ui-lynx/text-field"],
    ["tooltip", "@libitums/ui-lynx/tooltip"],
  ])("%s runtime entry consumes its public subpath export", async (entry, subpath) => {
    const runtime = await readOutput(`src/lynx/${entry}.tsx`);
    expect(runtime).toContain(`from "${subpath}"`);
  });
  test("catalog index에는 PageIndicator의 대표 story들이 등록된다", async () => {
    const index = await readOutput("dist/storybook/index.json");
    for (const storyId of ["default", "first", "last", "single", "empty"]) {
      expect(index).toContain(`components-page-indicator--${storyId}`);
    }
  });

  test("bottom-navigator runtime은 enabled tap 뒤 controlled selection을 갱신한다", async () => {
    const runtime = await readOutput("src/lynx/bottom-navigator.tsx");

    expect(runtime).toContain("useState(data.selectedId)");
    expect(runtime).toContain("setSelectedId(id)");
    expect(runtime).toContain("selectedId={selectedId}");
  });

  test("PageIndicator story args와 controls는 직렬화 가능한 숫자 계약을 유지한다", async () => {
    expect(await outputExists("src/PageIndicator.stories.ts")).toBe(true);
    const story = await readOutput("src/PageIndicator.stories.ts");
    expect(story).toMatch(/pageCount:\s*\d+/);
    expect(story).toMatch(/currentPage:\s*\d+/);
    expect(story).toMatch(
      /pageCount:\s*\{\s*control:\s*\{\s*type:\s*["']number["'][^}]*max:\s*100/,
    );
    expect(story).toMatch(
      /currentPage:\s*\{\s*control:\s*\{\s*type:\s*["']number["'][^}]*max:\s*100/,
    );
  });

  test("Rspeedy entry와 package 산출물은 최신 컴포넌트 구조와 docs를 노출한다", async () => {
    const config = await readOutput("lynx.config.ts");
    expect(config).toMatch(
      /["']?page-indicator["']?\s*:\s*["']\.\/src\/lynx\/page-indicator\.tsx["']/,
    );
    expect(config).toMatch(
      /["']?step-indicator["']?\s*:\s*["']\.\/src\/lynx\/step-indicator\.tsx["']/,
    );
    expect(config).toMatch(/["']?overlay["']?\s*:\s*["']\.\/src\/lynx\/overlay\.tsx["']/);
    expect(config).toMatch(/["']?answer-label["']?\s*:\s*["']\.\/src\/lynx\/answer-label\.tsx["']/);
    expect(config).toMatch(/["']?card["']?\s*:\s*["']\.\/src\/lynx\/card\.tsx["']/);
    expect(config).toMatch(
      /["']?compact-numeric-input["']?\s*:\s*["']\.\/src\/lynx\/compact-numeric-input\.tsx["']/,
    );
    expect(config).toMatch(/["']?fog["']?\s*:\s*["']\.\/src\/lynx\/fog\.tsx["']/);
    expect(config).toMatch(/["']?bottom-sheet["']?\s*:\s*["']\.\/src\/lynx\/bottom-sheet\.tsx["']/);
    expect(config).toMatch(/["']?text-field["']?\s*:\s*["']\.\/src\/lynx\/text-field\.tsx["']/);
    expect(config).toMatch(
      /["']?visual-novel-dialog["']?\s*:\s*["']\.\/src\/lynx\/visual-novel-dialog\.tsx["']/,
    );
    expect(config).toMatch(/["']?tooltip["']?\s*:\s*["']\.\/src\/lynx\/tooltip\.tsx["']/);

    const packageJson = JSON.parse(
      await readFile(path.resolve(appRoot, "../../packages/ui-lynx/package.json"), "utf8"),
    ) as {
      exports: Record<string, { types?: string; import?: string; default?: string }>;
    };
    expect(packageJson.exports["./page-indicator"]).toEqual({
      types: "./dist/page-indicator/index.d.ts",
      import: "./dist/page-indicator/index.js",
      default: "./dist/page-indicator/index.js",
    });
    expect(packageJson.exports["./step-indicator"]).toEqual({
      types: "./dist/step-indicator/index.d.ts",
      import: "./dist/step-indicator/index.js",
      default: "./dist/step-indicator/index.js",
    });
    expect(packageJson.exports["./overlay"]).toEqual({
      types: "./dist/overlay/index.d.ts",
      import: "./dist/overlay/index.js",
      default: "./dist/overlay/index.js",
    });
    expect(packageJson.exports["./answer-label"]).toEqual({
      types: "./dist/answer-label/index.d.ts",
      import: "./dist/answer-label/index.js",
      default: "./dist/answer-label/index.js",
    });
    expect(packageJson.exports["./card"]).toEqual({
      types: "./dist/card/index.d.ts",
      import: "./dist/card/index.js",
      default: "./dist/card/index.js",
    });
    expect(packageJson.exports["./compact-numeric-input"]).toEqual({
      types: "./dist/compact-numeric-input/index.d.ts",
      import: "./dist/compact-numeric-input/index.js",
      default: "./dist/compact-numeric-input/index.js",
    });
    expect(packageJson.exports["./fog"]).toEqual({
      types: "./dist/fog/index.d.ts",
      import: "./dist/fog/index.js",
      default: "./dist/fog/index.js",
    });
    expect(packageJson.exports["./bottom-sheet"]).toEqual({
      types: "./dist/bottom-sheet/index.d.ts",
      import: "./dist/bottom-sheet/index.js",
      default: "./dist/bottom-sheet/index.js",
    });
    expect(packageJson.exports["./text-field"]).toEqual({
      types: "./dist/text-field/index.d.ts",
      import: "./dist/text-field/index.js",
      default: "./dist/text-field/index.js",
    });
    expect(packageJson.exports["./visual-novel-dialog"]).toEqual({
      types: "./dist/visual-novel-dialog/index.d.ts",
      import: "./dist/visual-novel-dialog/index.js",
      default: "./dist/visual-novel-dialog/index.js",
    });
    expect(packageJson.exports["./tooltip"]).toEqual({
      types: "./dist/tooltip/index.d.ts",
      import: "./dist/tooltip/index.js",
      default: "./dist/tooltip/index.js",
    });
    expect(await outputExists("../../packages/ui-lynx/dist/styles.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/page-indicator/PageIndicator.jsx")).toBe(
      true,
    );
    expect(
      await outputExists("../../packages/ui-lynx/dist/page-indicator/page-indicator.css"),
    ).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/step-indicator/StepIndicator.jsx")).toBe(
      true,
    );
    expect(
      await outputExists("../../packages/ui-lynx/dist/step-indicator/step-indicator.contract.js"),
    ).toBe(true);
    expect(
      await outputExists("../../packages/ui-lynx/dist/step-indicator/step-indicator.css"),
    ).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/tooltip/Tooltip.jsx")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/tooltip/tooltip.contract.js")).toBe(
      true,
    );
    expect(await outputExists("../../packages/ui-lynx/dist/tooltip/tooltip.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/overlay/Overlay.jsx")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/overlay/overlay.contract.js")).toBe(
      true,
    );
    expect(await outputExists("../../packages/ui-lynx/dist/overlay/overlay.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/answer-label/AnswerLabel.jsx")).toBe(
      true,
    );
    expect(
      await outputExists("../../packages/ui-lynx/dist/answer-label/answer-label.contract.js"),
    ).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/answer-label/answer-label.css")).toBe(
      true,
    );
    expect(await outputExists("../../packages/ui-lynx/dist/card/Card.jsx")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/card/card.contract.js")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/card/card.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/fog/Fog.jsx")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/fog/fog.contract.js")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/fog/fog.css")).toBe(true);
    expect(await outputExists("../../packages/ui-lynx/dist/bottom-sheet/BottomSheet.jsx")).toBe(
      true,
    );
    expect(await outputExists("../../packages/ui-lynx/dist/bottom-sheet/bottom-sheet.css")).toBe(
      true,
    );

    const packVerifier = await readFile(
      path.resolve(appRoot, "../../packages/ui-lynx/scripts/check-pack.mjs"),
      "utf8",
    );
    expect(packVerifier).toContain("package/dist/index.js");
    expect(packVerifier).toContain("package/dist/index.d.ts");
    expect(packVerifier).toContain("package/dist/styles.css");
    expect(packVerifier).toContain("package/docs/component-file-conventions.md");
    expect(packVerifier).toContain('subpath: "progress-header"');
    expect(packVerifier).toContain('directory: "progress-header"');
    expect(packVerifier).toContain('component: "ProgressHeader"');
    for (const directory of [
      "answer-label",
      "back-header",
      "bottom-navigator",
      "bottom-sheet",
      "button",
      "card",
      "chat-bubble",
      "compact-numeric-input",
      "fog",
      "page-indicator",
      "progress-header",
      "round-button",
      "status-indicator",
      "step-indicator",
      "overlay",
      "text-field",
      "visual-novel-dialog",
      "tooltip",
    ]) {
      expect(packVerifier).toContain(`modules: ["${directory}.contract"]`);
    }
    expect(packVerifier).not.toContain('modules: ["contract"]');
    expect(packVerifier).not.toContain('modules: ["logic"]');
    expect(packVerifier).toContain('subpath: "page-indicator"');
    expect(packVerifier).toContain('directory: "page-indicator"');
    expect(packVerifier).toContain('component: "PageIndicator"');
    expect(packVerifier).toContain('modules: ["page-indicator.contract"]');
    expect(packVerifier).toContain('css: "page-indicator.css"');
    expect(packVerifier).toContain('subpath: "step-indicator"');
    expect(packVerifier).toContain('directory: "step-indicator"');
    expect(packVerifier).toContain('component: "StepIndicator"');
    expect(packVerifier).toContain('modules: ["step-indicator.contract"]');
    expect(packVerifier).toContain('css: "step-indicator.css"');
    expect(packVerifier).toContain('subpath: "overlay"');
    expect(packVerifier).toContain('directory: "overlay"');
    expect(packVerifier).toContain('component: "Overlay"');
    expect(packVerifier).toContain('modules: ["overlay.contract"]');
    expect(packVerifier).toContain('css: "overlay.css"');
    expect(packVerifier).toContain('subpath: "answer-label"');
    expect(packVerifier).toContain('directory: "answer-label"');
    expect(packVerifier).toContain('component: "AnswerLabel"');
    expect(packVerifier).toContain('modules: ["answer-label.contract"]');
    expect(packVerifier).toContain('css: "answer-label.css"');
    expect(packVerifier).toContain('subpath: "card"');
    expect(packVerifier).toContain('directory: "card"');
    expect(packVerifier).toContain('component: "Card"');
    expect(packVerifier).toContain('modules: ["card.contract"]');
    expect(packVerifier).toContain('css: "card.css"');
    expect(packVerifier).toContain("package/dist/${directory}/index.js");
    expect(packVerifier).toContain("package/dist/${directory}/${component}.jsx");
    expect(packVerifier).toContain("package/dist/${directory}/${module}.js");
    expect(packVerifier).toContain("package/dist/${directory}/${css}");
    expect(packVerifier).toContain('["contract.js", "contract.d.ts", "logic.js", "logic.d.ts"]');
    expect(packVerifier).toContain("files.includes(leaked)");
    expect(packVerifier).toContain("forbidden generic component module");
    expect(packVerifier).toContain("authored ReactLynx JSX");
  });
});
