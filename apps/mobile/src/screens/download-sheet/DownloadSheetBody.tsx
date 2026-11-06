import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import clock from "@libitums/icons/lynx/clock";
import download from "@libitums/icons/lynx/download";
import tick from "@libitums/icons/lynx/tick";

import { useUiCopy } from "../../lib/ui-copy";
import { formatDownloadedSize } from "../download-settings/download-settings";
import { catalogUnitNodeTitle } from "../journey-map/catalog-map";
import type { DownloadSheetState } from "./download-sheet.contract";
import { downloadSheetRowsOf } from "./download-sheet-rows";
import type { DownloadSheetRowId, DownloadSheetRowStatus } from "./download-sheet-rows";

import "./download-sheet.css";

const icons: Readonly<Record<DownloadSheetRowStatus, { content: string; tint: string }>> = {
  done: { content: tick, tint: color.feedback["correct-text"] },
  pending: { content: download, tint: color.fg.neutral },
  wifi: { content: clock, tint: color.fg["neutral-muted"] },
};

/** 받기 시트 본문 — 크기 줄(편 대상) · 상태 행 · 안내 한 줄. */
export function DownloadSheetBody({ state }: { readonly state: DownloadSheetState }): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.downloadSheet;
  const { target } = state;
  const unitLabel = target.kind === "unit" ? catalogUnitNodeTitle(target.unit, uiCopy) : "";
  const rows = downloadSheetRowsOf(state);
  const labelOf = (id: DownloadSheetRowId): string =>
    id === "common"
      ? copy.rows.common
      : id === "rest"
        ? copy.rows.otherLessons
        : target.kind === "unit"
          ? unitLabel
          : copy.rows.allLessons;
  const hint =
    state.kind === "ask" ? copy.askHint : state.kind === "offline" ? copy.offlineHint : null;

  return (
    <view className="download-sheet-body">
      {target.kind === "episode" && target.sizeBytes !== null ? (
        <text className="download-sheet-size" data-testid="download-sheet-size">
          {copy.size(formatDownloadedSize(target.sizeBytes))}
        </text>
      ) : null}
      {rows.length > 0 ? (
        <view className="download-sheet-rows" data-testid="download-sheet-rows">
          {rows.map((row) => {
            const label = labelOf(row.id);
            const status = copy.rows.status[row.status];
            const icon = icons[row.status];
            return (
              <view
                key={row.id}
                className={`download-sheet-row download-sheet-row-${row.status}`}
                data-testid={`download-sheet-row-${row.id}`}
                data-status={row.status}
                accessibility-element
                accessibility-label={`${label}, ${status}`}
              >
                <svg
                  className="download-sheet-row-icon"
                  content={icon.content}
                  current-color={icon.tint}
                />
                <text className="download-sheet-row-label">{label}</text>
                <text className="download-sheet-row-status">{status}</text>
              </view>
            );
          })}
        </view>
      ) : null}
      {hint === null ? null : (
        <text className="download-sheet-hint" data-testid="download-sheet-hint">
          {hint}
        </text>
      )}
    </view>
  );
}
