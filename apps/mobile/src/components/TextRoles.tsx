import type { ReactNode } from "@lynx-js/react";

import type { RomanizationSegment, TextRoleSize } from "../lib/romanization-segments";

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

function Romanization({ segments, testId }: TextRolesRomanizationProps): ReactNode {
  return <text data-testid={testId}>{segments.map((segment) => segment.text).join("")}</text>;
}

function Divider({ testId }: TextRolesDividerProps): ReactNode {
  return <view data-testid={testId} />;
}

function Meaning({ text, testId }: TextRolesMeaningProps): ReactNode {
  return <text data-testid={testId}>{text}</text>;
}

// 글 역할(로마자 · 구분선 · 뜻) 부품입니다. 껍데기만 있는 단계입니다 — 모양 · 접근성은 아직 없습니다.
export const TextRoles = { Romanization, Divider, Meaning };
