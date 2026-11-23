import type { ReactNode } from "@lynx-js/react";

import { AnswerReveal } from "../../components/AnswerReveal";
import { TextRoles } from "../../components/TextRoles";
import { useUiCopy } from "../../lib/ui-copy";
import { romanizationSegmentsOf } from "../../lib/romanization-segments";
import type { SentenceOrderReveal } from "./sentence-order-layout";

import "./sentence-order-lines.css";

/** 판정 뒤 정답 공개 — `null`이면(판정 전 · 듣기 문항이 아님) 아무것도 그리지 않습니다. */
export type SentenceOrderListenRevealProps = { readonly reveal: SentenceOrderReveal | null };

// 듣고 조립의 판정 뒤 정답 공개입니다(QA 2026-11-20) — 답 줄 아래 정답 상자(타자 입력 · 음절 조립과 같은 `AnswerReveal`,
// 「Answer: …」), 그 아래 로마자(보기 로마자 설정이 켜졌을 때) · 학습자 언어 뜻입니다. 순서가 곧 읽는 순서입니다.
export function SentenceOrderListenReveal({ reveal }: SentenceOrderListenRevealProps): ReactNode {
  const copy = useUiCopy();
  if (reveal === null) return null;
  return (
    <view className="sentence-order-reveal">
      <AnswerReveal testId="sentence-order-reveal" text={copy.typing.answerReveal(reveal.korean)} />
      {reveal.romanization === null ? null : (
        <TextRoles.Romanization
          segments={romanizationSegmentsOf(reveal.romanization, undefined)}
          size="m"
          testId="sentence-order-reading"
        />
      )}
      {reveal.meaning === null ? null : (
        <TextRoles.Meaning text={reveal.meaning} size="m" testId="sentence-order-reveal-meaning" />
      )}
    </view>
  );
}
