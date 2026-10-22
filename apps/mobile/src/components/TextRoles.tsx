import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../lib/ui-copy";

import type { RomanizationSegment, TextRoleSize } from "../lib/romanization-segments";

import "./text-roles.css";

export type { RomanizationSegment, TextRoleSize, TextSpan } from "../lib/romanization-segments";

export type TextRolesRomanizationProps = {
  readonly segments: readonly RomanizationSegment[];
  readonly size: TextRoleSize;
  readonly testId: string;
  /** 낭독 이름을 통째로 대신합니다. 없으면 `Pronunciation: <로마자>`입니다. */
  readonly accessibilityLabel?: string;
};

export type TextRolesDividerProps = { readonly testId: string };

export type TextRolesMeaningProps = {
  readonly text: string;
  readonly size: TextRoleSize;
  readonly testId: string;
};

// 모양 채널은 색이 아니라 기울기 · 굵기 · 구분선입니다(WCAG 1.4.1). 로마자는 기울임 · medium · muted,
// 뜻은 구분선 아래 똑바로 · semibold · neutral입니다. 값은 `text-roles.css`가 집니다.

// Lynx에서 안쪽 `<text>`는 바깥의 글꼴을 물려받지 않아(기기 확인) 조각마다 같은 글 역할 클래스를 다시 줍니다. 정답 조각만 밑줄
// 클래스가 더 붙습니다.
function pieceClassName(size: TextRoleSize, emphasis: "none" | "answer"): string {
  const base =
    size === "s" ? "text-role-romanization text-role-romanization-s" : "text-role-romanization";
  return emphasis === "answer" ? `${base} text-role-romanization-answer` : base;
}

function Romanization({
  segments,
  size,
  testId,
  accessibilityLabel,
}: TextRolesRomanizationProps): ReactNode {
  const copy = useUiCopy();
  // 로마자는 모든 화면에서 「Pronunciation: …」 접두로 읽힙니다 — 한글 · 로마자 · 뜻의 역할 구별이 모양뿐 아니라
  // 낭독에도 서게 합니다. 부르는 쪽이 이름을 따로 주면(예: 빈칸을 말로 푼 문장) 그 이름이 먼저입니다.
  const spoken =
    accessibilityLabel ?? copy.readAloud.pronunciation(segments.map((s) => s.text).join(""));
  const named = { "accessibility-element": true, "accessibility-label": spoken };
  return (
    <text
      className={
        size === "s" ? "text-role-romanization text-role-romanization-s" : "text-role-romanization"
      }
      data-testid={testId}
      {...named}
    >
      {segments.map((segment, index) => (
        <text key={index} className={pieceClassName(size, segment.emphasis)}>
          {segment.text}
        </text>
      ))}
    </text>
  );
}

// 장식 줄입니다 — 자식 없는 view라 접근성 정지점이 아닙니다(ADR-0016 D5), 그래서 가림 속성을 붙이지 않습니다.
function Divider({ testId }: TextRolesDividerProps): ReactNode {
  return <view className="text-role-divider" data-testid={testId} />;
}

function Meaning({ text, size, testId }: TextRolesMeaningProps): ReactNode {
  return (
    <text
      className={size === "s" ? "text-role-meaning text-role-meaning-s" : "text-role-meaning"}
      data-testid={testId}
    >
      {text}
    </text>
  );
}

/** 글 역할(로마자 · 구분선 · 뜻) 부품입니다. 한글 주인공 줄 바로 아래에 이 순서로 놓습니다. */
export const TextRoles = { Romanization, Divider, Meaning };
