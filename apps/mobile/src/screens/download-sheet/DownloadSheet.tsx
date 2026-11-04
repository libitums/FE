import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import tick from "@libitums/icons/lynx/tick";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import type { BottomSheetAction } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import { formatDownloadedSize } from "../download-settings/download-settings";
import type { DownloadSheetProps } from "./download-sheet.contract";

import "./download-sheet.css";

/**
 * 에피소드를 열 때의 받기 시트(ADR-0095 D6 · D7, 시안 1 · 3) — 모바일 데이터에서 묻기 · Wi-Fi만 안내 · 오프라인.
 * 「다시 묻지 않기」 체크 행은 ui-lynx에 없어 업데이트 안내 창과 같은 모양으로 여기서 짓습니다.
 */
export function DownloadSheet({
  state,
  onDownloadNow,
  onWifiLater,
  onOpenAnyway,
  onClose,
}: DownloadSheetProps): ReactNode {
  const copy = useUiCopy().downloadSheet;
  const [dontAsk, setDontAsk] = useState(false);

  const view: { title: string; description: string; actions: BottomSheetAction[] } =
    state.kind === "ask"
      ? {
          title: copy.askTitle(state.ordinal),
          description: copy.askDescription,
          actions: [
            { id: "download-now", label: copy.downloadNow, bindtap: () => onDownloadNow(dontAsk) },
            { id: "wifi-later", label: copy.onWifi, bindtap: () => onWifiLater(dontAsk) },
          ],
        }
      : state.kind === "wifi-only"
        ? {
            title: copy.wifiOnlyTitle(state.ordinal),
            description: copy.wifiOnlyDescription,
            actions: [{ id: "ok", label: copy.ok, bindtap: onClose }],
          }
        : {
            title: copy.offlineTitle,
            description: copy.offlineDescription(state.ordinal),
            actions: [
              { id: "ok", label: copy.ok, bindtap: onClose },
              ...(state.canOpenAnyway
                ? [{ id: "open-anyway", label: copy.openAnyway, bindtap: onOpenAnyway }]
                : []),
            ],
          };

  return (
    <view data-testid="download-sheet">
      <BottomSheet
        title={view.title}
        description={view.description}
        closeAccessibilityLabel={copy.close}
        actions={view.actions}
        ondismiss={onClose}
      >
        {state.kind === "ask" ? (
          <view className="download-sheet-body">
            {state.sizeBytes === null ? null : (
              <text className="download-sheet-size" data-testid="download-sheet-size">
                {copy.size(formatDownloadedSize(state.sizeBytes))}
              </text>
            )}
            <view
              className="download-sheet-dont-ask"
              data-testid="download-sheet-dont-ask"
              accessibility-element={true}
              accessibility-label={`${copy.dontAskAgain}, ${dontAsk ? copy.checked : copy.unchecked}`}
              accessibility-traits="button"
              bindtap={() => setDontAsk((value) => !value)}
            >
              <view
                className={
                  dontAsk ? "download-sheet-box download-sheet-box-on" : "download-sheet-box"
                }
              >
                {dontAsk ? (
                  <svg
                    className="download-sheet-check"
                    content={tick}
                    current-color={color.white}
                  />
                ) : null}
              </view>
              <text className="download-sheet-dont-ask-label" accessibility-element={false}>
                {copy.dontAskAgain}
              </text>
            </view>
          </view>
        ) : null}
      </BottomSheet>
    </view>
  );
}
