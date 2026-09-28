import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

import { entryLoginMethods } from "../../lib/entry-flow";
import { canStartSocialSignIn, loginMethodLabel, loginMethodStatus } from "./login";
import type { LoginSocialMethodsProps, SocialLoginMethod } from "./login.contract";
import { appleLogo, facebookLogo, googleLogo } from "./login-logos";

// 소셜 수단만 남깁니다 — 전화번호를 뺀 어휘 순서를 그대로 씁니다(2026-09-21
// 디자인 반영 순서 승계).
function isSocialMethod(method: string): method is SocialLoginMethod {
  return method !== "phone";
}

const socialMethods: readonly SocialLoginMethod[] = entryLoginMethods.filter(isSocialMethod);

const socialLogo: Record<SocialLoginMethod, string> = {
  apple: appleLogo,
  google: googleLogo,
  facebook: facebookLogo,
};

/**
 * 소셜 버튼 셋입니다. `status`에서 순수 함수로 요소마다 `data-status`를 읽고,
 * 요청 중(어느 수단이든)이면 탭을 무시합니다(네 수단 상호 배제 — `LoginSocialMethodsProps`에
 * 불리언이 없는 이유). 누른 수단만 `Button loading`이 돕니다.
 */
export function LoginSocialMethods({ status, onSelect }: LoginSocialMethodsProps): ReactNode {
  function handleTap(method: SocialLoginMethod) {
    if (!canStartSocialSignIn(status)) return;
    onSelect(method);
  }

  return (
    <view className="login-screen-methods">
      {socialMethods.map((method) => {
        const methodStatus = loginMethodStatus(status, method);
        return (
          <view
            key={method}
            className="login-screen-method login-screen-social"
            data-testid={`login-screen-method-${method}`}
            data-status={methodStatus}
          >
            {/* Apple만 neutral(gray.900 면), 나머지는 outline입니다. */}
            <Button
              label={loginMethodLabel(method)}
              variant={method === "apple" ? "neutral" : "outline"}
              size="xl"
              width="fill"
              icon={socialLogo[method]}
              iconPosition="leading"
              loading={methodStatus === "requesting"}
              bindtap={() => handleTap(method)}
            />
          </view>
        );
      })}
    </view>
  );
}
