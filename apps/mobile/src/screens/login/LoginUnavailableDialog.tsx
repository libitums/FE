import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { socialProviderName, unavailableDialogActions } from "./login";
import type { GuestSignInVisibility, LoginCopy, SocialLoginMethod } from "./login.contract";

// 사용 불가 수단을 눌렀을 때의 안내 대화상자입니다(ADR-0111 개정 2). settings의 로그아웃
// 대화상자와 같은 패턴 — 래퍼 testid, Dialog 기본 액션 모양. 뒤로가기는 화면이 `useLayerBack`으로 잇습니다.
export function LoginUnavailableDialog({
  notice,
  guestSignIn,
  copy,
  onAction,
}: {
  readonly notice: SocialLoginMethod | null;
  readonly guestSignIn: GuestSignInVisibility;
  readonly copy: LoginCopy;
  readonly onAction: (id: string) => void;
}): ReactNode {
  if (notice === null) return null;
  return (
    <view data-testid="login-screen-unavailable-dialog">
      <Dialog
        title={copy.unavailable.title(socialProviderName[notice])}
        description={
          guestSignIn === "visible"
            ? copy.unavailable.description
            : copy.unavailable.descriptionWithoutGuest
        }
        actions={unavailableDialogActions(copy)}
        bindaction={onAction}
      />
    </view>
  );
}
