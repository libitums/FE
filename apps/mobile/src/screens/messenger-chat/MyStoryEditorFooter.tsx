import type { ReactNode } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";

import { openExternalLink } from "../../lib/external-link";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { myStoriesTestIds as ids } from "./my-stories.contract";
import type { EditorShare } from "./my-story-editor";
import { ChatCrisisCard } from "./SafetyParts";
import type { RejectionView, StoryShare } from "./use-story-share";

import "./my-stories.css";

// 위기 카드의 전화 · 웹 주소는 호스트가 엽니다(ADR-0125, 대화 화면과 같음).
const openLink = (url: string): void => {
  "background only";
  openExternalLink(url);
};

/** 거절 판(ADR-0199) — 분류는 보이지 않고 한 문구, 「Ask for a review」(거절 id가 있을 때) → 고맙다 줄 · 실패 줄. */
function RejectedPanel({
  view,
  onReview,
}: {
  readonly view: RejectionView;
  readonly onReview: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.photo;
  return (
    <view className="my-story-rejected" data-testid={ids.photoRejected}>
      <text className="my-story-rejected-title" accessibility-traits="header" flatten={false}>
        {copy.rejectedTitle}
      </text>
      <text className="my-story-note">{copy.rejectedBody}</text>
      {view.review === "sent" ? (
        <text className="my-story-note" data-testid={ids.photoReviewSent}>
          {copy.reviewSent}
        </text>
      ) : view.rejection === null ? null : (
        <>
          {view.review === "failed" ? (
            <text className="my-story-note my-story-error">{copy.reviewFailed}</text>
          ) : null}
          <view data-testid={ids.photoReview}>
            <Button
              label={copy.review}
              variant="neutral"
              size="s"
              loading={view.review === "sending"}
              bindtap={() => {
                "background only";
                playSound("button");
                onReview();
              }}
            />
          </view>
        </>
      )}
    </view>
  );
}

/**
 * 편집 아래 줄 — 위기 카드 · 거절 판 · 안내(실패 · 올리는 중 · 얹은 것) · Share with friends. 거절된 사진은 다시 올리지 않습니다(같은 사진은
 * 같은 판정 — 다른 사진은 뒤로 가서 고름).
 */
export function MyStoryEditorFooter({
  sharing,
  share,
  hint,
  photo,
  hidden,
  bottom,
  onShare,
}: {
  readonly sharing: StoryShare;
  readonly share: EditorShare | null;
  /** 실패가 없을 때의 안내. */
  readonly hint: string;
  readonly photo: boolean;
  /** Aa로 쓰는 동안 가림. */
  readonly hidden: boolean;
  readonly bottom: number;
  readonly onShare: (share: EditorShare) => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories;
  const { busy, error, crisis, rejected } = sharing;
  const line = error ?? (busy && photo ? copy.photo.uploading : hint);
  const off = share === null || rejected !== null;
  return (
    <view
      className={`my-story-editor-footer${hidden ? " my-story-under-typing" : ""}`}
      style={{ paddingBottom: `${bottom}px` }}
    >
      {crisis === null ? null : <ChatCrisisCard resources={crisis} onOpen={openLink} />}
      {rejected === null ? (
        <text
          className={
            error === null ? "my-story-editor-hint" : "my-story-editor-hint my-story-error"
          }
          data-testid={error === null ? ids.editorHint : ids.composerError}
        >
          {line}
        </text>
      ) : (
        <RejectedPanel view={rejected} onReview={() => void sharing.requestReview()} />
      )}
      <view data-testid={ids.share}>
        <Button
          label={busy ? copy.editor.posting : copy.editor.share}
          variant="brand"
          size="xl"
          width="fill"
          disabled={off}
          loading={busy}
          bindtap={() => {
            "background only";
            if (!busy && !off && share !== null) onShare(share);
          }}
        />
      </view>
    </view>
  );
}
