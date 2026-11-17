import { useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";
import type { BottomSheetProps } from "@libitums/ui-lynx/bottom-sheet";

import { sheetBottomInsetFrom } from "../../lib/safe-area";

export type AppBottomSheetProps = Omit<BottomSheetProps, "bottomInset">;

// 앱의 바텀 시트입니다 — ui-lynx `BottomSheet`에 호스트가 넘긴 아래 시스템 바 높이(`sheetBottomInsetFrom`)를 채워 넘깁니다.
// 시트는 화면 전체를 덮는 층이라 셸의 아래 여백을 받지 못하고, Lynx에서 `env(safe-area-inset-bottom)`은 0이라 Android 3버튼 ·
// 제스처 바가 시트 버튼을 가렸습니다(ADR-0044 D3 개정). 앱 화면은 ui-lynx 시트를 직접 쓰지 않고 이것을 씁니다(SB-RULE1).
export function AppBottomSheet(props: AppBottomSheetProps): ReactNode {
  const bottomInset = sheetBottomInsetFrom(useGlobalProps());
  return <BottomSheet {...props} bottomInset={bottomInset} />;
}
