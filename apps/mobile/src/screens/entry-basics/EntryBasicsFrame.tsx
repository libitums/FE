import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { EntryStepBar } from "../../components/EntryStepBar";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";

import "./entry-basics-frame.css";

export const ENTRY_BASICS_STEP_COUNT = 3;

export function EntryBasicsProgress({ current }: { readonly current: number }): ReactNode {
  const copy = useUiCopy().journeyEntry.firstSteps;
  return (
    <view className="entry-basics-progress">
      <EntryStepBar
        current={current}
        total={ENTRY_BASICS_STEP_COUNT}
        label={copy.progress(current, ENTRY_BASICS_STEP_COUNT)}
      />
    </view>
  );
}

/** 글자 · 합치기의 같은 틀 — 머리(뒤로 · 막대 · Skip) · 스크롤하는 가운데 · 고정된 아래. */
export function EntryBasicsFrame({
  testId,
  current,
  onBack,
  onSkip,
  footer,
  children,
}: {
  readonly testId: string;
  readonly current: number;
  readonly onBack: () => void;
  readonly onSkip: () => void;
  readonly footer: ReactNode;
  readonly children: ReactNode;
}): ReactNode {
  const copy = useUiCopy();
  useScreenBack(onBack);
  return (
    <view className="entry-basics-frame" data-testid={testId}>
      <view className="entry-basics-header">
        <view className="entry-basics-back" data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.common.back}
            icon={arrowLeft}
            variant="neutral"
            size="xl"
            bindtap={onBack}
          />
        </view>
        <EntryBasicsProgress current={current} />
        <view className="entry-basics-skip" data-testid={ids.skip}>
          <Button label={copy.common.skip} variant="text" size="l" bindtap={onSkip} />
        </view>
      </view>
      <scroll-view
        className="entry-basics-scroll"
        data-testid={`${testId}-scroll`}
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="entry-basics-content">{children}</view>
      </scroll-view>
      <view className="entry-basics-footer">{footer}</view>
    </view>
  );
}
