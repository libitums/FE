import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { useUiCopy } from "../../lib/ui-copy";
import type { ChatCorrection } from "./chat-feedback.contract";
import { chatFeedbackTestIds as ids } from "./chat-feedback.contract";
import { correctionSpoken } from "./chat-feedback-rules";
import { correctionSegmentsOf } from "./correction-segments";

import "./my-message.css";
import "./chat-feedback.css";

export type CorrectionCardProps = {
  readonly correction: ChatCorrection;
  /** 고친 문장으로 다시 보내기 — 마지막 내 글이 아니면 null이고 단추가 없습니다(ADR-0129). */
  readonly onResend: (() => void) | null;
};

function CorrectedText({ correction }: { readonly correction: ChatCorrection }): ReactNode {
  const segments = correctionSegmentsOf(correction.corrected, correction.changes);
  return (
    <text className="my-message-fix-text">
      {segments.map((segment, index) => (
        <text
          key={index}
          className={segment.kind === "changed" ? "my-message-seg-changed" : undefined}
          data-testid={ids.cardSegment(index)}
          data-kind={segment.kind}
        >
          {segment.text}
        </text>
      ))}
    </text>
  );
}

// 종류별 본문 — correction: 고친 문장 · 고친 곳 줄 · 더 나은 표현(있으면). better: 더 나은 글 · 뜻 · 설명. l1_to_ko: 한국어 글 · 뜻.
function CardBody({ correction }: { readonly correction: ChatCorrection }): ReactNode {
  const copy = useUiCopy().messengerChat.feedback;
  const { better } = correction;
  switch (correction.kind) {
    case "correction":
      return (
        <>
          <CorrectedText correction={correction} />
          {correction.items.length > 0 ? (
            <view className="chat-fix-items">
              {correction.items.map((item, index) => (
                <text key={index} className="chat-fix-item" data-testid={ids.cardItem(index)}>
                  <text className="chat-fix-item-from">{item.original}</text>
                  {" → "}
                  <text className="chat-fix-item-to">{item.corrected}</text>
                  {` · ${item.reason}`}
                </text>
              ))}
            </view>
          ) : null}
          {better === null ? null : (
            <view className="chat-fix-section" data-testid={ids.cardBetter}>
              <text className="chat-fix-subtitle">{copy.titles.better}</text>
              <text className="my-message-fix-text">{better.text}</text>
              <text className="my-message-fix-explanation">{better.meaning}</text>
            </view>
          )}
        </>
      );
    case "better":
      return better === null ? (
        <CorrectedText correction={correction} />
      ) : (
        <>
          <text className="my-message-fix-text" data-testid={ids.cardBetter}>
            {better.text}
          </text>
          <text className="my-message-fix-explanation" data-testid={ids.cardMeaning}>
            {better.meaning}
          </text>
          <text className="chat-fix-item">{better.explanation}</text>
        </>
      );
    case "l1_to_ko":
      return (
        <>
          <CorrectedText correction={correction} />
          {correction.meaning === null ? null : (
            <text className="my-message-fix-explanation" data-testid={ids.cardMeaning}>
              {correction.meaning}
            </text>
          )}
        </>
      );
    default: {
      const unreachable: never = correction.kind;
      return unreachable;
    }
  }
}

// 연필 카드(ADR-0129) — 제목이 종류를 말하고(FIX · MORE NATURAL · IN KOREAN), 마지막 내 글이면 다시 보내기 단추가 섭니다.
// 본문은 한 낭독 요소로 묶고 단추는 그 밖 형제로 둡니다 — 안드로이드에서 단추가 따로 초점을 받습니다.
export function CorrectionCard({ correction, onResend }: CorrectionCardProps): ReactNode {
  const copy = useUiCopy().messengerChat.feedback;
  return (
    <view className="my-message-fix-card" data-testid={ids.card} data-kind={correction.kind}>
      <view
        className="chat-fix-items"
        data-testid={ids.cardContent}
        flatten={false}
        accessibility-element={true}
        accessibility-label={correctionSpoken(correction, copy)}
      >
        <text className="my-message-better" data-testid={ids.cardTitle}>
          {copy.titles[correction.kind]}
        </text>
        <CardBody correction={correction} />
      </view>
      {onResend === null ? null : (
        <view className="chat-fix-resend" data-testid={ids.resend}>
          <Button
            label={correction.kind === "l1_to_ko" ? copy.sendInKorean : copy.sendCorrected}
            variant="brand"
            size="m"
            width="fill"
            bindtap={onResend}
          />
        </view>
      )}
    </view>
  );
}
