import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import type { BottomSheetAction } from "@libitums/ui-lynx/bottom-sheet";

import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { catalogUnitNodeTitle } from "../journey-map/catalog-map";
import type { DownloadSheetProps } from "./download-sheet.contract";
import { DownloadSheetBody } from "./DownloadSheetBody";

import "./download-sheet.css";

/**
 * 받기 시트(ADR-0095 D6 · D7, lesson-level-downloads) — 편 · 유닛 대상의 묻기 · Wi-Fi만 · 오프라인.
 */
export function DownloadSheet({
  state,
  onDownloadNow,
  onWifiLater,
  onUseMobileDataOnce,
  onOpenAnyway,
  onChangeSetting,
  onClose,
}: DownloadSheetProps): ReactNode {
  // 시스템 뒤로가기는 닫기와 같습니다 — 이 앱의 모든 겹침 층이 같은 규칙입니다(ADR-0043 D2).
  useLayerBack(onClose);
  const uiCopy = useUiCopy();
  const copy = uiCopy.downloadSheet;
  const { target } = state;
  const isUnit = target.kind === "unit";
  const label = target.kind === "unit" ? catalogUnitNodeTitle(target.unit, uiCopy) : "";

  const view: { title: string; description: string; actions: BottomSheetAction[] } =
    state.kind === "ask"
      ? {
          title: isUnit ? copy.askUnitTitle(label) : copy.askTitle(target.ordinal),
          description: isUnit ? copy.askUnitDescription : copy.askDescription,
          actions: [
            { id: "download-now", label: copy.downloadNow, bindtap: onDownloadNow },
            { id: "wifi-later", label: copy.onWifi, bindtap: onWifiLater },
          ],
        }
      : state.kind === "wifi-only"
        ? {
            title: isUnit ? copy.wifiOnlyUnitTitle(label) : copy.wifiOnlyTitle(target.ordinal),
            description: copy.wifiOnlyDescription,
            actions: [
              { id: "mobile-data-once", label: copy.mobileDataOnce, bindtap: onUseMobileDataOnce },
              { id: "open-anyway", label: copy.openWithout, bindtap: onOpenAnyway },
              { id: "change-setting", label: copy.changeSetting, bindtap: onChangeSetting },
            ],
          }
        : {
            title: copy.offlineTitle,
            description: isUnit
              ? copy.offlineUnitDescription(label)
              : copy.offlineDescription(target.ordinal),
            actions: state.canOpenAnyway
              ? [
                  { id: "open-anyway", label: copy.openAnyway, bindtap: onOpenAnyway },
                  { id: "ok", label: copy.ok, bindtap: onClose },
                ]
              : [{ id: "ok", label: copy.ok, bindtap: onClose }],
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
        <DownloadSheetBody state={state} />
      </BottomSheet>
    </view>
  );
}
