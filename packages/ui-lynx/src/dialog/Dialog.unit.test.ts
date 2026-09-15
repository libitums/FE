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
      cancelActionId: "continue",
      className: "ui-lynx-dialog ui-lynx-dialog-motion-standard",
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
      cancelActionId: "quit",
      actions: [
        { id: "continue", variant: "brand" },
        { id: "quit", variant: "subtle" },
      ],
    });
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

  test("원본 디자인의 surface, radius, spacing, elevation과 motion 토큰을 사용한다", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/dialog/dialog.css"), "utf8");
    expect(styles).toContain("var(--libitum-elevation-z-dialog)");
    expect(styles).toContain("rgba(26, 28, 32, 0.45)");
    expect(styles).toContain("var(--libitum-elevation-surface-floating)");
    expect(styles).toContain("var(--libitum-elevation-shadow-s3)");
    expect(styles).toContain("var(--libitum-radius-lg)");
    expect(styles).toContain("var(--libitum-spacing-20)");
    expect(styles).toContain("var(--libitum-motion-duration-dialog)");
    expect(styles).toContain("transform: scale(0.96)");
  });
});
