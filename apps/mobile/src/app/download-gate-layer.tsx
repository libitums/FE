import { allowEpisodes, allowEpisodeUnits } from "../lib/download-policy";
import { DownloadSheet } from "../screens/download-sheet/DownloadSheet";
import type { DownloadSheetState } from "../screens/download-sheet/download-sheet.contract";
import type { DownloadGateTarget } from "./download-gate-target";
import type { DownloadControls } from "./download-wiring";

export type OpenDownloadSheet = {
  readonly state: DownloadSheetState;
  readonly target: DownloadGateTarget;
  readonly open: (() => void) | null;
};

type Props = {
  readonly sheet: OpenDownloadSheet;
  readonly controls: DownloadControls | undefined;
  readonly nav: { readonly openDownloadSettings: () => void };
  readonly close: () => void;
};

/** 받기 시트와 그 핸들러입니다 — 어느 핸들러도 연결 정책을 저장하지 않습니다(허락만 씁니다). */
export function DownloadGateLayer({ sheet, controls, nav, close }: Props) {
  const { target, open } = sheet;
  const allow = () => {
    if (target.kind === "episode") allowEpisodes([target.episodeId]);
    else allowEpisodeUnits(target.episodeId, [target.unitKey]);
    controls?.requestSync();
    close();
    // 열린 편 · 유닛은 받는 동안 엽니다 — 받는 대로 그림 · 소리가 채워집니다. 「준비 중」 편은 다 받으면 맵에 열립니다.
    open?.();
  };
  const openAnyway = () => {
    close();
    open?.();
  };
  return (
    <DownloadSheet
      state={sheet.state}
      onDownloadNow={allow}
      onWifiLater={close}
      onUseMobileDataOnce={allow}
      onChangeSetting={() => {
        close();
        nav.openDownloadSettings();
      }}
      onOpenAnyway={openAnyway}
      onClose={close}
    />
  );
}
