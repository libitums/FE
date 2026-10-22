import type { ReactNode } from "@lynx-js/react";

import type { RomanizationSegment, TextRoleSize } from "../lib/romanization-segments";

import "./text-roles.css";

export type { RomanizationSegment, TextRoleSize, TextSpan } from "../lib/romanization-segments";

export type TextRolesRomanizationProps = {
  readonly segments: readonly RomanizationSegment[];
  readonly size: TextRoleSize;
  readonly testId: string;
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

function Romanization({
  segments,
  size,
  testId,
  accessibilityLabel,
}: TextRolesRomanizationProps): ReactNode {
  const named =
    accessibilityLabel === undefined
      ? {}
      : { "accessibility-element": true, "accessibility-label": accessibilityLabel };
  return (
    <text
      className={
        size === "s" ? "text-role-romanization text-role-romanization-s" : "text-role-romanization"
      }
      data-testid={testId}
      {...named}
    >
      {segments.map((segment, index) => (
        <text
          key={index}
          className={segment.emphasis === "answer" ? "text-role-romanization-answer" : undefined}
        >
          {segment.text}
        </text>
      ))}
    </text>
  );
}

// 장식 줄입니다 — 낭독에서 뺍니다.
function Divider({ testId }: TextRolesDividerProps): ReactNode {
  return (
    <view className="text-role-divider" data-testid={testId} accessibility-elements-hidden={true} />
  );
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
