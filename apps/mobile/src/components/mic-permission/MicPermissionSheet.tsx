// 마이크 사전 안내(P1) · 거부(P2) 시트입니다(ADR-0206). 고를 때까지 머무는 시트라 닫기 단추 · 바깥 누름으로 닫지 않습니다 —
// 사전 안내는 Allow microphone(시스템 창) · Not now(이 레슨의 말하기 건너뜀), 거부는 Open Settings · Continue without speaking.
// 설정을 연 뒤에도 시트는 그대로 서 있고, 앱이 앞으로 돌아와 허용이 확인되면 결선(`useMicPermission`)이 닫습니다.

import type { ReactNode } from "@lynx-js/react";

import { useUiCopy } from "../../lib/ui-copy";
import { AppBottomSheet } from "../app-bottom-sheet/AppBottomSheet";
import type { MicPermission } from "./use-mic-permission";

export function MicPermissionSheet({ mic }: { readonly mic: MicPermission }): ReactNode {
  const copy = useUiCopy().micPermission;
  if (mic.sheet === null) return null;
  const prime = mic.sheet === "prime";
  const tap = (run: () => void) => (): void => {
    "background only";
    run();
  };
  return (
    <view data-testid="mic-permission-sheet" data-sheet={mic.sheet}>
      <AppBottomSheet
        title={prime ? copy.primeTitle : copy.deniedTitle}
        description={prime ? copy.primeBody : copy.deniedBody}
        closeAccessibilityLabel={copy.close}
        dismissible={false}
        ondismiss={() => {}}
        actions={
          prime
            ? [
                {
                  id: "allow",
                  label: copy.allow,
                  loading: mic.waiting,
                  bindtap: tap(mic.allow),
                },
                {
                  id: "not-now",
                  label: copy.notNow,
                  disabled: mic.waiting,
                  bindtap: tap(mic.notNow),
                },
              ]
            : [
                { id: "settings", label: copy.openSettings, bindtap: tap(mic.openSettings) },
                { id: "continue", label: copy.continueWithout, bindtap: tap(mic.continueWithout) },
              ]
        }
      />
    </view>
  );
}
