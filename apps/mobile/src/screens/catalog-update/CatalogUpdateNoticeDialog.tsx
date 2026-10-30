import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import tick from "@libitums/icons/lynx/tick";
import { Button } from "@libitums/ui-lynx/button";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import {
  catalogUpdateNoticeTestIds as ids,
  type CatalogUpdateNoticeDialogProps,
} from "./catalog-update-notice.contract";

import "./catalog-update-notice.css";

// 끝낸 에피소드가 업데이트됐을 때 지도 위 가운데 뜨는 안내입니다(시안 G-A). 어느 에피소드 · 무엇이 바뀌었는지는
// 적지 않습니다(사용자 결정 — 바뀐 곳이 여럿일 수 있음). ui-lynx `Dialog`는 체크 행을 받지 못해 티켓 대화상자처럼 같은 딤(`Overlay`)
// 위에 앱 쪽 상자를 짓고, 체크 행도 ui-lynx에 없어 여기서 짓습니다. 시스템 뒤로는 「Cool, got it」과 같습니다.
export function CatalogUpdateNoticeDialog({ onClose }: CatalogUpdateNoticeDialogProps): ReactNode {
  const copy = useUiCopy().catalogUpdateNotice;
  const [muted, setMuted] = useState(false);

  const handleClose = () => {
    "background only";
    onClose(muted);
  };
  const handleToggle = () => {
    "background only";
    setMuted((value) => !value);
  };
  useLayerBack(handleClose);

  return (
    <view className="update-notice" data-testid={ids.dialog} event-through={false}>
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view className="update-notice-container" accessibility-role-description="dialog">
        <text className="update-notice-title" accessibility-traits="header">
          {copy.title}
        </text>
        <text className="update-notice-body">{copy.body}</text>
        <view className="update-notice-confirm" data-testid={ids.confirm}>
          <Button
            label={copy.confirm}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={handleClose}
          />
        </view>
        <view
          className="update-notice-mute"
          data-testid={ids.mute}
          accessibility-element={true}
          accessibility-label={`${copy.dontShowAgain}, ${muted ? copy.checked : copy.unchecked}`}
          accessibility-traits="button"
          bindtap={handleToggle}
        >
          <view className={muted ? "update-notice-box update-notice-box-on" : "update-notice-box"}>
            {muted ? (
              <svg className="update-notice-check" content={tick} current-color={color.white} />
            ) : null}
          </view>
          <text className="update-notice-mute-label" accessibility-element={false}>
            {copy.dontShowAgain}
          </text>
        </view>
      </view>
    </view>
  );
}
