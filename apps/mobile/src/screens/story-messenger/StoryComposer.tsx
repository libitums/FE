import type { ReactNode } from "@lynx-js/react";

import arrowUp02 from "@libitums/icons/lynx/arrow-up-02";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useUiCopy } from "../../lib/ui-copy";
import { storyMessengerTestIds as ids } from "./story-messenger.contract";

// 메신저 아래 입력창입니다 — 글을 칠 수 없는 메신저다운 틀이고 늘 같은 모습입니다. 답장은 저절로 서는 시트에서 고릅니다.
export function StoryComposer({ bottomInset }: { readonly bottomInset: number }): ReactNode {
  const copy = useUiCopy().storyMessenger;
  return (
    <view
      className="story-composer"
      data-testid={ids.composer}
      style={{ paddingBottom: `${bottomInset + 8}px` }}
    >
      <view className="story-composer-field" data-testid={ids.composerField}>
        <text className="story-composer-placeholder">{copy.composerPlaceholder}</text>
      </view>
      <RoundButton
        accessibilityLabel={copy.send}
        icon={arrowUp02}
        variant="brand"
        size="m"
        disabled={true}
      />
    </view>
  );
}
