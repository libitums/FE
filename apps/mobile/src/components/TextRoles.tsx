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
        <text key={index} className={pieceClassName(size, segment.emphasis)}>
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
