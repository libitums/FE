import type { ReactNode } from "@lynx-js/react";

import type { BottomSheetAction } from "@libitums/ui-lynx/bottom-sheet";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { formatDownloadedSize } from "../download-settings/download-settings";
import type { LanguageDownloadSheetProps } from "./language-download.contract";

import "./language-download.css";

/**
 * 언어 바꿈 받기 시트(ADR-0102 개정 ⟨언어 바꿈 받기⟩) — 받는 중(진행 · 크기) · 오프라인(연결되면 받음) · 실패(다시 시도 · 나중에).
 */
export function LanguageDownloadSheet({
  state,
  onHide,
  onRetry,
  onClose,
}: LanguageDownloadSheetProps): ReactNode {
  // 시스템 뒤로가기는 닫기와 같습니다 — 받는 중이면 숨기기(받기는 이어 감)입니다(ADR-0043 D2).
  const dismiss = state.kind === "downloading" ? onHide : onClose;
  useLayerBack(dismiss);
  const copy = useUiCopy().languageDownload;
  const view: { title: string; description: string; actions: BottomSheetAction[] } =
    state.kind === "downloading"
      ? {
          title: copy.downloadingTitle,
          description: copy.downloadingBody,
          actions: [{ id: "hide", label: copy.hide, bindtap: onHide }],
        }
      : state.kind === "offline"
        ? {
            title: copy.offlineTitle,
            description: copy.offlineBody,
            actions: [{ id: "ok", label: copy.ok, bindtap: onClose }],
          }
        : {
            title: copy.failedTitle,
            description: copy.failedBody,
            actions: [
              { id: "retry", label: copy.retry, bindtap: onRetry },
              { id: "later", label: copy.later, bindtap: onClose },
            ],
          };
  const ratio =
    state.kind === "downloading" && state.total > 0 ? Math.min(1, state.done / state.total) : 0;

  return (
    <view data-testid="language-download-sheet">
      <AppBottomSheet
        title={view.title}
        description={view.description}
        closeAccessibilityLabel={copy.close}
        actions={view.actions}
        ondismiss={dismiss}
      >
        {state.kind === "downloading" ? (
          <view className="language-download-body">
            <view className="language-download-track" data-testid="language-download-track">
              <view
                className="language-download-fill"
                data-testid="language-download-fill"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </view>
            <text className="language-download-progress" data-testid="language-download-progress">
              {copy.progress(state.done, state.total, formatDownloadedSize(state.bytes))}
            </text>
          </view>
        ) : null}
      </AppBottomSheet>
    </view>
  );
}
