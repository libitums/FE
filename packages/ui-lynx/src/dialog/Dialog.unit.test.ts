import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { getDialogContract } from "./dialog.contract";

describe("Dialog contract", () => {
  test("한 개 action은 brand이고 기본 motion은 standard다", () => {
    expect(
      getDialogContract({
        title: "학습을 계속할까요?",
        actions: [{ id: "continue", label: "계속 학습하기" }],
        bindaction: () => undefined,
      }),
    ).toMatchObject({
      title: "학습을 계속할까요?",
      description: undefined,
      motion: "standard",
      phase: "entering",
      cancelActionId: "continue",
      className: "ui-lynx-dialog ui-lynx-dialog-motion-standard ui-lynx-dialog-phase-entering",
      actions: [{ id: "continue", label: "계속 학습하기", variant: "brand" }],
    });
  });

  test("두 개 action은 위 brand, 아래 subtle이고 아래 action을 취소 경로로 노출한다", () => {
    expect(
      getDialogContract({
        title: "학습을 그만둘까요?",
        description: "지금까지의 진행 내용이 사라져요",
        actions: [
          { id: "continue", label: "계속 학습하기" },
          { id: "quit", label: "그만두기" },
        ],
        motion: "reduced",
        bindaction: () => undefined,
      }),
    ).toMatchObject({
      motion: "reduced",
      phase: "entering",
      cancelActionId: "quit",
      actions: [
        { id: "continue", variant: "brand" },
        { id: "quit", variant: "subtle" },
      ],
    });
  });

  test.each(["", "   ", "\n\t"])("빈 설명 %j은 undefined로 정규화한다", (description) => {
    expect(
      getDialogContract({
        title: "학습을 계속할까요?",
        description,
        actions: [{ id: "continue", label: "계속 학습하기" }],
        bindaction: () => undefined,
      }).description,
    ).toBeUndefined();
  });

  test.each([
    { title: "", actions: [{ id: "continue", label: "계속" }] },
    { title: "제목", actions: [] },
    {
      title: "제목",
      actions: [
        { id: "one", label: "하나" },
        { id: "two", label: "둘" },
        { id: "three", label: "셋" },
      ],
    },
    { title: "제목", actions: [{ id: "", label: "계속" }] },
    { title: "제목", actions: [{ id: "continue", label: "" }] },
    {
      title: "제목",
      actions: [
        { id: "same", label: "하나" },
        { id: "same", label: "둘" },
      ],
    },
    { title: "제목", actions: [{ id: "continue", label: "계속", disabled: true }] },
  ])("진행 불가능한 계약을 거부한다: %#", ({ title, actions }) => {
    expect(() => getDialogContract({ title, actions, bindaction: () => undefined })).toThrow(
      /Dialog/,
    );
  });

  test("UDL1 로딩 액션과 비활성 액션 조합은 던지지 않고 취소 경로가 없다", () => {
    const contract = getDialogContract({
      title: "계정을 삭제할까요?",
      actions: [
        { id: "a", label: "삭제", loading: true },
        { id: "b", label: "취소", disabled: true },
      ],
      bindaction: () => undefined,
    });
    expect(contract.cancelActionId).toBeNull();
  });

  test("UDL2 누를 수도 로딩 중도 아닌 액션뿐이면 새 메시지로 던진다", () => {
    expect(() =>
      getDialogContract({
        title: "제목",
        actions: [
          { id: "a", label: "A", disabled: true },
          { id: "b", label: "B", disabled: true },
        ],
        bindaction: () => undefined,
      }),
    ).toThrow("Dialog requires at least one interactive or loading action");
  });

  test("UDL3 로딩 없는 한 · 두 액션은 마지막 id가 취소 경로이고 변형이 그대로다", () => {
    const one = getDialogContract({
      title: "제목",
      actions: [{ id: "a", label: "A" }],
      bindaction: () => undefined,
    });
    expect(one.cancelActionId).toBe("a");
    const two = getDialogContract({
      title: "제목",
      actions: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      bindaction: () => undefined,
    });
    expect(two.cancelActionId).toBe("b");
    expect(two.actions.map((action) => action.variant)).toEqual(["brand", "subtle"]);
  });

  test("제품 결정의 white surface와 원본 radius, spacing, elevation, motion 토큰을 사용한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/dialog/dialog.css"), "utf8");
    expect(styles).toContain("var(--libitum-elevation-z-dialog)");
    expect(styles).toContain('@import "../overlay/overlay.css"');
    expect(styles).toContain("background-color: var(--libitum-color-white)");
    expect(styles).not.toContain("background-color: var(--libitum-elevation-surface-floating)");
    expect(styles).toContain("var(--libitum-elevation-shadow-s3)");
    expect(styles).toContain("var(--libitum-radius-lg)");
    expect(styles).toContain("var(--libitum-spacing-20)");
    expect(styles).toContain("var(--libitum-motion-duration-dialog)");
    expect(styles).toMatch(/\.ui-lynx-dialog \.ui-lynx-overlay\s*\{[^}]*z-index:\s*0/s);
    expect(styles).not.toContain(".ui-lynx-dialog > .ui-lynx-overlay");
    expect(styles).toContain("transform: scale(0.96)");
    expect(styles).toContain("ui-lynx-dialog-container-exit");
    expect(styles).toContain("var(--libitum-motion-easing-exit)");
  });

  test("명시한 퇴장 phase를 class와 계약에 보존한다", () => {
    expect(
      getDialogContract({
        title: "학습을 그만둘까요?",
        actions: [{ id: "continue", label: "계속 학습하기" }],
        phase: "exiting",
        bindaction: () => undefined,
      }),
    ).toMatchObject({
      phase: "exiting",
      className: "ui-lynx-dialog ui-lynx-dialog-motion-standard ui-lynx-dialog-phase-exiting",
    });
  });
});

describe("Dialog contract: 컨텍스트 motion", () => {
  const props = {
    title: "학습을 계속할까요?",
    actions: [{ id: "continue", label: "계속 학습하기" }],
    bindaction: () => undefined,
  };

  test("DGc1. 컨텍스트를 주지 않으면 standard 그대로다", () => {
    expect(getDialogContract(props)).toMatchObject({
      motion: "standard",
      className: "ui-lynx-dialog ui-lynx-dialog-motion-standard ui-lynx-dialog-phase-entering",
    });
  });

  test("DGc2. 컨텍스트 reduced면 motion이 reduced이고 className에 reduced 토큰이 든다", () => {
    const contract = getDialogContract(props, "reduced");
    expect(contract.motion).toBe("reduced");
    expect(contract.className).toContain("ui-lynx-dialog-motion-reduced");
  });

  test("DGc3. 명시한 motion이 컨텍스트를 이긴다", () => {
    expect(getDialogContract({ ...props, motion: "standard" }, "reduced").motion).toBe("standard");
  });
});
