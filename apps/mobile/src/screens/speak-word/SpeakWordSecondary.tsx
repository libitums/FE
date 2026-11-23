import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import type { SpeechControl } from "../../lib/speech-attempt";

/** 고정 버튼 행(또는 그림 로딩 중 작업 영역)의 보조 조작입니다 — 준비에서는 Skip, 받아쓰기 오류에서는 Try again. */
export function SpeakWordSecondary({
  control,
  label,
  onTap,
}: {
  readonly control: SpeechControl;
  readonly label: string;
  readonly onTap: () => void;
}): ReactNode {
  return (
    <view
      className="speak-word-activity-secondary"
      data-testid="speak-word-secondary"
      data-control={control}
    >
      <Button label={label} variant="outline" size="xl" width="hug" bindtap={onTap} />
    </view>
  );
}
