import type { ReactNode } from "@lynx-js/react";
import { Button } from "@libitums/ui-lynx/button";
import { Dialog } from "@libitums/ui-lynx/dialog";

import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { ChatModalFrame } from "./ChatModalFrame";
import { myStoriesTestIds as ids } from "./my-stories.contract";

import "./chat-overlays.css";
import "./my-stories.css";

/**
 * 내 스토리 지우기 확인(ADR-0179, 시안 9번) — 하나(`replies` = 그 스토리의 반응 수) 또는 모두(null). 되돌릴 수 없고 대화 인용은
 * 「Deleted story」로 남는다고 알립니다. 주 버튼 면은 위험 색 덧씌움(`chat-delete-dialog`). 못 지웠으면 설명 자리에 까닭.
 */
export function MyStoryDeleteDialog({
  replies,
  failed,
  onConfirm,
  onCancel,
}: {
  readonly replies: number | null;
  readonly failed: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.remove;
  useLayerBack(onCancel);
  const handleAction = (id: string) => {
    "background only";
    if (id === "delete") onConfirm();
    else onCancel();
  };
  const body = failed ? copy.failed : replies === null ? copy.allBody : copy.body(replies);
  return (
    <view className="chat-dialog-centered chat-delete-dialog" data-testid={ids.deleteDialog}>
      <Dialog
        title={replies === null ? copy.allTitle : copy.title}
        description={body}
        actions={[
          { id: "delete", label: copy.confirm },
          { id: "cancel", label: copy.cancel },
        ]}
        bindaction={handleAction}
      />
    </view>
  );
}

/**
 * 처음 올리는 사람을 위한 안내(ADR-0179, 시안 8번 — 사진 대신 단어 · 카드). 세 걸음 · 「Make my first story」 · 「Not now」. 시스템 뒤로 = Not now.
 */
export function MyStoryGuide({
  onStart,
  onLater,
}: {
  readonly onStart: () => void;
  readonly onLater: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.guide;
  useLayerBack(onLater);
  return (
    <ChatModalFrame
      testId={ids.guide}
      title={copy.title}
      description={copy.body}
      align="start"
      actions={
        <>
          <view className="chat-modal-action" data-testid={ids.guideLater}>
            <Button
              label={copy.later}
              variant="outline"
              size="l"
              width="fill"
              bindtap={() => {
                "background only";
                onLater();
              }}
            />
          </view>
          <view className="chat-modal-action" data-testid={ids.guideStart}>
            <Button
              label={copy.start}
              variant="brand"
              size="l"
              width="fill"
              bindtap={() => {
                "background only";
                onStart();
              }}
            />
          </view>
        </>
      }
    >
      <view className="my-story-guide-steps">
        {copy.steps.map((step, index) => (
          <view
            key={step.title}
            className="my-story-guide-step"
            flatten={false}
            accessibility-element={true}
            accessibility-label={copy.stepLabel(index + 1, step.title, step.body)}
          >
            <view className="my-story-guide-num" accessibility-elements-hidden={true}>
              <text className="my-story-guide-num-text">{String(index + 1)}</text>
            </view>
            <view className="my-story-guide-step-body" accessibility-elements-hidden={true}>
              <text className="my-story-guide-step-title">{step.title}</text>
              <text className="my-story-guide-step-text">{step.body}</text>
            </view>
          </view>
        ))}
      </view>
    </ChatModalFrame>
  );
}
