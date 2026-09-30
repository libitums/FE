import type { ReactNode } from "@lynx-js/react";

import type { LoginScreenProps } from "./login.contract";

// 약관 안내. 두 문서 이름만 gray.800으로 구분하고, 누르면 그 문서를 앱 위
// 브라우저로 엽니다(ADR-0033). 인라인 글자는 탭 · 낭독 단위가 될 수 없어 문서
// 이름마다 따로 선 글자로 둡니다.
export function LoginLegalNotice({
  onOpenLegalDocument,
}: Pick<LoginScreenProps, "onOpenLegalDocument">): ReactNode {
  return (
    <view className="login-screen-legal" data-testid="login-screen-legal">
      <text className="login-screen-legal-text">By signing up, you agree to the</text>
      <view className="login-screen-legal-links">
        <text
          className="login-screen-legal-emphasis"
          data-testid="login-screen-legal-terms-of-use"
          accessibility-element={true}
          accessibility-label="Terms of Use"
          accessibility-traits="button"
          bindtap={() => onOpenLegalDocument("terms-of-use")}
        >
          Terms of Use
        </text>
        <text className="login-screen-legal-text"> & </text>
        <text
          className="login-screen-legal-emphasis"
          data-testid="login-screen-legal-privacy-policy"
          accessibility-element={true}
          accessibility-label="Privacy Policy"
          accessibility-traits="button"
          bindtap={() => onOpenLegalDocument("privacy-policy")}
        >
          Privacy Policy
        </text>
      </view>
    </view>
  );
}
